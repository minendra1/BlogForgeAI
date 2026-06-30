import os
import re
import requests
from datetime import date, timedelta
from pathlib import Path
from typing import List, Optional

# 1. Swapped Groq for Ollama
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Send
from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults

import urllib.request
import urllib.parse

# Import the schemas and state
from agent.state import (
    State, Task, Plan, EvidenceItem, RouterDecision, 
    EvidencePack, GlobalImagePlan
)

load_dotenv()

# -----------------------------
# LLM Initialization (Local Desktop)
# -----------------------------
# We completely remove ChatGroq. No API keys needed!
llm = ChatOllama(
    model="llama3.1",
    temperature=0.7,
)

# -----------------------------
# Router Logic
# -----------------------------
ROUTER_SYSTEM = """You are a routing module for a technical blog planner.
Decide whether web research is needed BEFORE planning.

Modes:
- closed_book (needs_research=false): evergreen concepts.
- hybrid (needs_research=true): evergreen + needs up-to-date examples/tools/models.
- open_book (needs_research=true): volatile weekly/news/"latest"/pricing/policy.

If needs_research=true:
- Output 3–10 high-signal, scoped queries.
- For open_book weekly roundup, include queries reflecting last 7 days.
"""

def router_node(state: State) -> dict:
    # 2. Upgraded to method="json_schema" to physically lock the output structure
    decider = llm.with_structured_output(RouterDecision, method="json_schema")
    decision = decider.invoke([
        SystemMessage(content=ROUTER_SYSTEM),
        HumanMessage(content=f"Topic: {state['topic']}\nAs-of date: {state['as_of']}"),
    ])

    if decision.mode == "open_book":
        recency_days = 7
    elif decision.mode == "hybrid":
        recency_days = 45
    else:
        recency_days = 3650

    return {
        "needs_research": decision.needs_research,
        "mode": decision.mode,
        "queries": decision.queries,
        "recency_days": recency_days,
    }

def route_next(state: State) -> str:
    return "research" if state["needs_research"] else "orchestrator"

# -----------------------------
# Research Logic (Tavily)
# -----------------------------
def _tavily_search(query: str, max_results: int = 5) -> List[dict]:
    if not os.getenv("TAVILY_API_KEY"):
        return []
    try:
        # Modern import that removes the deprecation warning
        from langchain_tavily import TavilySearchResults
        
        tool = TavilySearchResults(max_results=max_results)
        results = tool.invoke({"query": query})
        out: List[dict] = []
        for r in results or []:
            out.append({
                "title": r.get("title") or "",
                "url": r.get("url") or "",
                "snippet": r.get("content") or r.get("snippet") or "",
                "published_at": r.get("published_date") or r.get("published_at"),
                "source": r.get("source"),
            })
        return out
    except Exception:
        return []

def _iso_to_date(s: Optional[str]) -> Optional[date]:
    if not s: return None
    try: return date.fromisoformat(s[:10])
    except Exception: return None

RESEARCH_SYSTEM = """You are a research synthesizer.
Given raw web search results, produce EvidenceItem objects.
Rules:
- Only include items with a non-empty url.
- Prefer relevant + authoritative sources.
- Normalize published_at to ISO YYYY-MM-DD if reliably inferable; else null (do NOT guess).
- Keep snippets short.
- Deduplicate by URL.
"""

def research_node(state: State) -> dict:
    queries = (state.get("queries") or [])[:10]
    raw: List[dict] = []
    for q in queries:
        raw.extend(_tavily_search(q, max_results=6))

    if not raw:
        return {"evidence": []}

    # Upgraded to method="json_schema"
    extractor = llm.with_structured_output(EvidencePack, method="json_schema")
    pack = extractor.invoke([
        SystemMessage(content=RESEARCH_SYSTEM),
        HumanMessage(content=f"As-of date: {state['as_of']}\nRecency days: {state['recency_days']}\n\nRaw results:\n{raw}"),
    ])

    dedup = {e.url: e for e in pack.evidence if e.url}
    evidence = list(dedup.values())

    if state.get("mode") == "open_book":
        as_of = date.fromisoformat(state["as_of"])
        cutoff = as_of - timedelta(days=int(state["recency_days"]))
        evidence = [e for e in evidence if (d := _iso_to_date(e.published_at)) and d >= cutoff]

    return {"evidence": evidence}

# -----------------------------
# Orchestrator Logic (Plan)
# -----------------------------
ORCH_SYSTEM = """You are a senior technical writer and developer advocate.
Produce a highly actionable outline for a technical blog post.
Requirements:
- 3-4 tasks, each with goal + 3-6 bullets + target_words.
- Tags are flexible; do not force a fixed taxonomy.
Grounding:
- closed_book: evergreen, no evidence dependence.
- hybrid: use evidence for up-to-date examples; mark those tasks requires_research=True and requires_citations=True.
- open_book: weekly/news roundup (Set blog_kind="news_roundup").
"""

def orchestrator_node(state: State) -> dict:
    # Upgraded to method="json_schema"
    planner = llm.with_structured_output(Plan, method="json_schema")
    mode = state.get("mode", "closed_book")
    evidence = state.get("evidence", [])
    forced_kind = "news_roundup" if mode == "open_book" else None

    plan = planner.invoke([
        SystemMessage(content=ORCH_SYSTEM),
        HumanMessage(content=(
            f"Topic: {state['topic']}\nMode: {mode}\nAs-of: {state['as_of']} (recency_days={state['recency_days']})\n"
            f"{'Force blog_kind=news_roundup' if forced_kind else ''}\n\nEvidence:\n{[e.model_dump() for e in evidence][:16]}"
        )),
    ])
    if forced_kind:
        plan.blog_kind = "news_roundup"
    return {"plan": plan}

def fanout(state: State):
    assert state["plan"] is not None
    return [
        Send("worker", {
            "task": task.model_dump(), "topic": state["topic"], "mode": state["mode"], 
            "as_of": state["as_of"], "recency_days": state["recency_days"], 
            "plan": state["plan"].model_dump(), "evidence": [e.model_dump() for e in state.get("evidence", [])]
        }) for task in state["plan"].tasks
    ]

# -----------------------------
# Worker Logic (Writing)
# -----------------------------
WORKER_SYSTEM = """You are a senior technical writer and developer advocate.
Write ONE section of a technical blog post in Markdown.
Constraints: Cover ALL bullets in order. Target words ±15%. Output only section markdown starting with "## <Section Title>".
If mode=="open_book", cite provided Evidence URLs as Markdown links ([Source](URL)).
"""

def worker_node(payload: dict) -> dict:
    task, plan = Task(**payload["task"]), Plan(**payload["plan"])
    evidence = [EvidenceItem(**e) for e in payload.get("evidence", [])]

    bullets_text = "\n- " + "\n- ".join(task.bullets)
    evidence_text = "\n".join(f"- {e.title} | {e.url} | {e.published_at or 'date:unknown'}" for e in evidence[:20])

    section_md = llm.invoke([
        SystemMessage(content=WORKER_SYSTEM),
        HumanMessage(content=(
            f"Blog title: {plan.blog_title}\nAudience: {plan.audience}\nTone: {plan.tone}\n"
            f"Section title: {task.title}\nGoal: {task.goal}\nTarget words: {task.target_words}\n"
            f"requires_research: {task.requires_research}\nrequires_citations: {task.requires_citations}\n"
            f"Bullets:{bullets_text}\n\nEvidence:\n{evidence_text}\n"
        )),
    ]).content.strip()

    return {"sections": [(task.id, section_md)]}

# -----------------------------
# Reducer Logic (Images & Stitching)
# -----------------------------
def merge_content(state: State) -> dict:
    plan = state["plan"]
    ordered_sections = [md for _, md in sorted(state["sections"], key=lambda x: x[0])]
    return {"merged_md": f"# {plan.blog_title}\n\n" + "\n\n".join(ordered_sections).strip() + "\n"}

# --- CRITICAL FIX APPLIED HERE ---
DECIDE_IMAGES_SYSTEM = """You are an expert technical editor and graphic director.
Analyze the provided blog post content and plan exact images or technical diagrams to explain the concepts better.

CRITICAL CONSTRAINTS:
1. You MUST plan exactly 2 to 3 images. Returning an empty list or skipping this task is strictly forbidden.
2. For each image, choose an exact heading string present in the text (e.g., "## Challenges Faced by Indian Businesses in Adopting AI") to insert the image after.
3. Provide high-quality, descriptive text prompts for generating clean visual graphics (do not use generic descriptions).
"""

def decide_images(state: State) -> dict:
    # Upgraded to method="json_schema"
    planner = llm.with_structured_output(GlobalImagePlan, method="json_schema")
    image_plan = planner.invoke([
        SystemMessage(content=DECIDE_IMAGES_SYSTEM),
        HumanMessage(content=f"Blog kind: {state['plan'].blog_kind}\nTopic: {state['topic']}\n\nContent:\n{state['merged_md']}"),
    ])
    return {
        "image_specs": [img.model_dump() for img in image_plan.images],
    }

def _gemini_generate_image_bytes(prompt: str) -> bytes:
    """
    Drop-in replacement: Uses Pollinations.ai to bypass Hugging Face network blocks.
    No API key required.
    """
    safe_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width=1024&height=1024&nologo=true"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'BlogForgeAI/1.0'})
    with urllib.request.urlopen(req) as response:
        return response.read()

def _safe_slug(title: str) -> str:
    s = re.sub(r"[^a-z0-9 _-]+", "", title.strip().lower())
    return re.sub(r"\s+", "_", s).strip("_") or "blog"

def generate_and_place_images(state: State) -> dict:
    md = state["merged_md"]
    image_specs = state.get("image_specs", []) or []
    
    # Create a dedicated folder for the markdown blogs
    blogs_dir = Path("blogs")
    blogs_dir.mkdir(exist_ok=True)
    
    # Define the final file path inside the new folder
    final_filename = f"{_safe_slug(state['plan'].blog_title)}.md"
    final_path = blogs_dir / final_filename

    # If no images were planned, save and exit
    if not image_specs:
        final_path.write_text(md, encoding="utf-8")
        return {"final": md}

    images_dir = Path("images")
    images_dir.mkdir(exist_ok=True)

    for spec in image_specs:
        filename = spec["filename"]
        out_path = images_dir / filename
        
        # Download/Generate image bytes if it doesn't exist
        if not out_path.exists():
            try:
                out_path.write_bytes(_gemini_generate_image_bytes(spec["prompt"]))
                img_element = f"\n\n![{spec['alt']}](../images/{filename})\n*{spec['caption']}*\n"
            except Exception as e:
                img_element = f"\n\n> **[IMAGE GENERATION FAILED]** Error: {e}\n"
        else:
            img_element = f"\n\n![{spec['alt']}](../images/{filename})\n*{spec['caption']}*\n"

        # Safe replacement logic
        heading = spec.get("insert_after_heading", "")
        if heading and heading in md:
            md = md.replace(heading, f"{heading}{img_element}", 1)
        else:
            md += f"\n\n{img_element}"

    # Save finalized file to the blogs/ directory
    final_path.write_text(md, encoding="utf-8")
    
    return {"final": md}
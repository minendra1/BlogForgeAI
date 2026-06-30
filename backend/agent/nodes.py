import os
import re
from datetime import date, timedelta
from pathlib import Path
from typing import List, Optional

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Send
from dotenv import load_dotenv

# Import the schemas and state we just created
from agent.state import (
    State, Task, Plan, EvidenceItem, RouterDecision, 
    EvidencePack, GlobalImagePlan
)

load_dotenv()

# -----------------------------
# LLM Initialization
# -----------------------------


llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.7,
    max_retries=2
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
    decider = llm.with_structured_output(RouterDecision)
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
        from langchain_community.tools.tavily_search import TavilySearchResults
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

    extractor = llm.with_structured_output(EvidencePack)
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
- 5–9 tasks, each with goal + 3–6 bullets + target_words.
- Tags are flexible; do not force a fixed taxonomy.
Grounding:
- closed_book: evergreen, no evidence dependence.
- hybrid: use evidence for up-to-date examples; mark those tasks requires_research=True and requires_citations=True.
- open_book: weekly/news roundup (Set blog_kind="news_roundup").
Output must match Plan schema.
"""

def orchestrator_node(state: State) -> dict:
    planner = llm.with_structured_output(Plan)
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

DECIDE_IMAGES_SYSTEM = """You are an expert technical editor.
Decide if images/diagrams are needed for THIS blog.
Rules: Max 3 images total. Insert placeholders exactly: [[IMAGE_1]], [[IMAGE_2]], [[IMAGE_3]].
Return strictly GlobalImagePlan.
"""

def decide_images(state: State) -> dict:
    planner = llm.with_structured_output(GlobalImagePlan)
    image_plan = planner.invoke([
        SystemMessage(content=DECIDE_IMAGES_SYSTEM),
        HumanMessage(content=f"Blog kind: {state['plan'].blog_kind}\nTopic: {state['topic']}\n\n{state['merged_md']}"),
    ])
    return {
        "md_with_placeholders": image_plan.md_with_placeholders,
        "image_specs": [img.model_dump() for img in image_plan.images],
    }

def _gemini_generate_image_bytes(prompt: str) -> bytes:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
    resp = client.models.generate_content(
        model="gemini-2.5-flash-image", contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            safety_settings=[types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_ONLY_HIGH")]
        ),
    )
    parts = getattr(resp, "parts", None) or resp.candidates[0].content.parts
    return parts[0].inline_data.data

def _safe_slug(title: str) -> str:
    s = re.sub(r"[^a-z0-9 _-]+", "", title.strip().lower())
    return re.sub(r"\s+", "_", s).strip("_") or "blog"

def generate_and_place_images(state: State) -> dict:
    md = state.get("md_with_placeholders") or state["merged_md"]
    image_specs = state.get("image_specs", []) or []

    if not image_specs:
        Path(f"{_safe_slug(state['plan'].blog_title)}.md").write_text(md, encoding="utf-8")
        return {"final": md}

    images_dir = Path("images")
    images_dir.mkdir(exist_ok=True)

    for spec in image_specs:
        out_path = images_dir / spec["filename"]
        if not out_path.exists():
            try:
                out_path.write_bytes(_gemini_generate_image_bytes(spec["prompt"]))
            except Exception as e:
                md = md.replace(spec["placeholder"], f"> **[IMAGE FAILED]** Error: {e}\n")
                continue
        md = md.replace(spec["placeholder"], f"![{spec['alt']}](images/{spec['filename']})\n*{spec['caption']}*")

    Path(f"{_safe_slug(state['plan'].blog_title)}.md").write_text(md, encoding="utf-8")
    return {"final": md}
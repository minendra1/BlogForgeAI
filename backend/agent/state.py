from typing import TypedDict, List, Optional, Literal, Annotated
import operator
from pydantic import BaseModel, Field

# -----------------------------
# Agent Core Schemas
# -----------------------------
class Task(BaseModel):
    id: int
    title: str
    goal: str = Field(..., description="One sentence describing what the reader should do/understand.")
    bullets: List[str] = Field(..., min_length=3, max_length=6)
    target_words: int = Field(..., description="Target words (120–550).")
    tags: List[str] = Field(default_factory=list)
    requires_research: bool = False
    requires_citations: bool = False
    requires_code: bool = False

class Plan(BaseModel):
    blog_title: str
    audience: str
    tone: str
    blog_kind: Literal["explainer", "tutorial", "news_roundup", "comparison", "system_design"] = "explainer"
    constraints: List[str] = Field(default_factory=list)
    tasks: List[Task]

class EvidenceItem(BaseModel):
    title: str
    url: str
    published_at: Optional[str] = None
    snippet: Optional[str] = None
    source: Optional[str] = None

class RouterDecision(BaseModel):
    needs_research: bool
    mode: Literal["closed_book", "hybrid", "open_book"]
    reason: str
    queries: List[str] = Field(default_factory=list)
    max_results_per_query: int = Field(5)

class EvidencePack(BaseModel):
    evidence: List[EvidenceItem] = Field(default_factory=list)

# -----------------------------
# Image & Reducer Schemas
# -----------------------------
class ImageSpec(BaseModel):
    filename: str = Field(..., description="Unique filename, e.g., 'ai_healthcare.png'")
    prompt: str = Field(..., description="Detailed visual prompt for generating the image.")
    alt: str = Field(..., description="Alt text description.")
    caption: str = Field(..., description="Caption text to show under the image.")
    insert_after_heading: str = Field(..., description="The exact text of the heading (e.g., '## AI Applications in India') this image should follow.")

class GlobalImagePlan(BaseModel):
    images: List[ImageSpec] = Field(default_factory=list, description="List of planned images.")

# -----------------------------
# LangGraph Memory State
# -----------------------------
class State(TypedDict):
    topic: str
    temperature: float
    mode: str
    needs_research: bool
    queries: List[str]
    evidence: List[EvidenceItem]
    plan: Optional[Plan]
    as_of: str
    recency_days: int
    sections: Annotated[List[tuple[int, str]], operator.add] 
    merged_md: str
    md_with_placeholders: str 
    image_specs: List[dict]
    final: str
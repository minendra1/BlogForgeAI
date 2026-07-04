<p align="center">
  <img src="https://img.shields.io/badge/LangGraph-Multi--Agent-blueviolet?style=for-the-badge" alt="LangGraph" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React%2019-Frontend-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Groq-LLM-FF6600?style=for-the-badge" alt="Groq" />
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk" alt="Clerk" />
</p>

# 🔥 BlogForgeAI

**An AI-powered, multi-agent blog generation platform that plans, researches, writes, and illustrates professional-grade blog posts — with human-in-the-loop control.**

BlogForgeAI uses a **LangGraph state machine** with parallel worker agents to produce citation-backed, image-rich Markdown blogs from a single topic prompt. The user reviews and edits the AI-generated outline before writing begins, ensuring full creative control.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Workflow Diagrams (Mermaid)](#-workflow-diagrams)
- [Complete Agent Workflow](#-complete-agent-workflow)
- [Project Folder Structure](#-project-folder-structure)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Environment Variables](#-environment-variables)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [API Reference](#-api-reference)
- [Frontend Components](#-frontend-components)
- [Data Persistence](#-data-persistence)
- [Configuration Reference](#-configuration-reference)
- [Deployment Guide](#-deployment-guide)
- [License](#-license)

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Multi-Agent Architecture** | LangGraph orchestrates Router → Researcher → Orchestrator → Workers → Reducer pipeline |
| **Live Web Research** | Tavily API searches the web in real-time to ground blogs with citations and hyperlinks |
| **Human-in-the-Loop (HITL)** | The agent pauses after planning so users can edit the blog title, sections, and bullet points before writing begins |
| **Parallel Section Writing** | Each blog section is written concurrently by independent worker agents via LangGraph's `Send` API |
| **AI Image Generation** | Pollinations.ai generates photorealistic images placed contextually after relevant headings |
| **Real-Time Streaming (SSE)** | Server-Sent Events stream step-by-step progress to the frontend — no polling required |
| **Tone Presets** | 6 tone modes (Balanced, Technical, Casual, Marketing, Academic, Storytelling) control writing style and LLM temperature |
| **Inline Markdown Editor** | Edit the generated blog directly in the browser with live preview and syntax highlighting |
| **Export Options** | Download as `.md`, copy to clipboard, or print/save as PDF |
| **Authentication** | Clerk JWT-based authentication secures all API endpoints |
| **Per-User History** | IndexedDB stores full blog content locally; localStorage stores metadata — scoped per Clerk user |
| **Persistent Checkpoints** | PostgreSQL-backed LangGraph checkpointing enables interrupt/resume across server restarts |
| **Dark Mode** | System-aware dark/light theme with manual toggle |

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                       │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Navbar   │  │ Sidebar  │  │ PlanReviewer │  │   BlogOutput     │ │
│  │(Auth/Theme│  │(History) │  │   (HITL)     │  │(Markdown Render) │ │
│  └──────────┘  └──────────┘  └──────────────┘  └──────────────────┘ │
│                        │                                             │
│              services/api.js (SSE Client)                            │
└─────────────────────────┬────────────────────────────────────────────┘
                          │ HTTP / SSE (Bearer JWT)
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Uvicorn)                      │
│                                                                      │
│  main.py ─── Clerk JWT Verification ─── CORS Middleware              │
│      │                                                               │
│      ▼                                                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                  LangGraph State Machine                       │  │
│  │                                                                │  │
│  │  START → Router → Research → Orchestrator ──interrupt──→       │  │
│  │                                   │                            │  │
│  │                    ┌──────────────┤ (fanout via Send)          │  │
│  │                    ▼              ▼              ▼             │  │
│  │                Worker[0]     Worker[1]     Worker[N]           │  │
│  │                    │              │              │             │  │
│  │                    └──────────────┤──────────────┘             │  │
│  │                                   ▼                            │  │
│  │                    Reducer Subgraph                             │  │
│  │                    ├── merge_content                            │  │
│  │                    ├── decide_images                            │  │
│  │                    └── generate_and_place_images → END          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  External Services:  Groq API  │  Tavily API  │  Pollinations.ai     │
└──────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │  PostgreSQL Database  │
              │  (LangGraph Checkpts) │
              └──────────────────────┘
```

---

## 📊 Workflow Diagrams

### Main Agent Pipeline

```mermaid
flowchart TD
    A(["🟢 START"]) --> B["🧭 Router Node"]
    B -->|"needs_research = true"| C["🔍 Research Node"]
    B -->|"needs_research = false"| D["📋 Orchestrator Node"]
    C --> D
    D -->|"Generate Plan"| INT{{"⏸️ INTERRUPT\n(Human-in-the-Loop)"}}

    INT -->|"User reviews & edits plan\nin PlanReviewer UI"| RESUME(["▶️ RESUME"])
    RESUME --> FAN{"🔀 Fanout\n(LangGraph Send API)"}

    FAN --> W1["✍️ Worker 1\nSection 1"]
    FAN --> W2["✍️ Worker 2\nSection 2"]
    FAN --> W3["✍️ Worker 3\nSection 3"]
    FAN --> WN["✍️ Worker N\nSection N"]

    W1 --> R["🔧 Reducer Subgraph"]
    W2 --> R
    W3 --> R
    WN --> R

    R --> Z(["🏁 END"])

    style A fill:#10b981,stroke:#059669,color:#fff
    style INT fill:#f59e0b,stroke:#d97706,color:#fff
    style RESUME fill:#3b82f6,stroke:#2563eb,color:#fff
    style Z fill:#6366f1,stroke:#4f46e5,color:#fff
    style FAN fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style B fill:#0ea5e9,stroke:#0284c7,color:#fff
    style C fill:#14b8a6,stroke:#0d9488,color:#fff
    style D fill:#f97316,stroke:#ea580c,color:#fff
    style R fill:#ec4899,stroke:#db2777,color:#fff
    style W1 fill:#64748b,stroke:#475569,color:#fff
    style W2 fill:#64748b,stroke:#475569,color:#fff
    style W3 fill:#64748b,stroke:#475569,color:#fff
    style WN fill:#64748b,stroke:#475569,color:#fff
```

### Reducer Subgraph (Post-Processing Pipeline)

```mermaid
flowchart LR
    S(["START"]) --> M["📝 merge_content\nSort sections by ID\nAssemble full Markdown"]
    M --> DI["🎨 decide_images\nLLM plans 2-3 images\nwith prompts & placement"]
    DI --> G["🖼️ generate_and_place_images\nPollinations.ai generation\nInsert into Markdown"]
    G --> E(["END"])

    style S fill:#10b981,stroke:#059669,color:#fff
    style M fill:#3b82f6,stroke:#2563eb,color:#fff
    style DI fill:#f59e0b,stroke:#d97706,color:#fff
    style G fill:#ec4899,stroke:#db2777,color:#fff
    style E fill:#6366f1,stroke:#4f46e5,color:#fff
```

### Full-Stack Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (React)
    participant API as FastAPI Backend
    participant LG as LangGraph Engine
    participant Groq as Groq LLM
    participant Tavily as Tavily Search
    participant Poll as Pollinations.ai
    participant PG as PostgreSQL

    User->>FE: Enter topic + tone
    FE->>API: POST /api/generate/stream (SSE)
    API->>LG: stream(initial_state, config)
    
    rect rgb(14, 165, 233, 0.1)
        Note over LG: Step 1 — Router
        LG->>Groq: Classify topic (RouterDecision)
        Groq-->>LG: mode, queries
        LG-->>API: SSE: progress (step 1)
        API-->>FE: SSE: "Analyzing topic..."
    end

    rect rgb(20, 184, 166, 0.1)
        Note over LG: Step 2 — Research
        LG->>Tavily: Search queries (3-6)
        Tavily-->>LG: Raw results (up to 30)
        LG-->>API: SSE: progress (step 2)
        API-->>FE: SSE: "Searching the web..."
    end

    rect rgb(249, 115, 22, 0.1)
        Note over LG: Step 3 — Orchestrator
        LG->>Groq: Generate Plan (structured output)
        Groq-->>LG: Plan with 3-4 tasks
        LG->>PG: Save checkpoint
        LG-->>API: SSE: progress (step 3)
        API-->>FE: SSE: "Planning blog structure..."
    end

    rect rgb(245, 158, 11, 0.1)
        Note over LG,FE: Step 4 — HITL Interrupt
        LG-->>API: Graph paused (interrupt_before worker)
        API-->>FE: SSE: interrupt {thread_id, plan}
        FE->>User: Show PlanReviewer UI
        User->>FE: Edit & approve plan
        FE->>API: POST /api/generate/resume
        API->>LG: update_state + resume stream
    end

    rect rgb(100, 116, 139, 0.1)
        Note over LG: Step 5 — Parallel Workers
        par Worker 1
            LG->>Groq: Write Section 1
        and Worker 2
            LG->>Groq: Write Section 2
        and Worker N
            LG->>Groq: Write Section N
        end
        Groq-->>LG: Section Markdown (×N)
        LG-->>API: SSE: progress (steps 4-5)
        API-->>FE: SSE: "Writing section X of N..."
    end

    rect rgb(236, 72, 153, 0.1)
        Note over LG: Step 6 — Reducer Subgraph
        LG->>LG: merge_content (sort & join)
        LG->>Groq: decide_images (plan 2-3 visuals)
        Groq-->>LG: ImageSpec[]
        LG->>Poll: Generate images (1024×1024)
        Poll-->>LG: Image bytes
        LG->>LG: Insert images into Markdown
        LG-->>API: SSE: progress (step 6)
        API-->>FE: SSE: "Generating visuals..."
    end

    rect rgb(99, 102, 241, 0.1)
        Note over LG,FE: Step 7 — Complete
        LG-->>API: Final state {markdown, images}
        API-->>FE: SSE: complete {title, markdown, image_specs}
        FE->>FE: Render Markdown + Save to IndexedDB
        FE->>User: Display blog with images
    end
```

---

## 🔄 Complete Agent Workflow

The blog generation pipeline has **7 sequential steps**, streamed in real-time to the user via SSE:

### Step 1 — Router Node (`router_node`)
> *"Analyzing topic & deciding strategy..."*

- Receives the user's topic and date context.
- Uses the LLM with **structured output** (`RouterDecision` schema) to classify the topic.
- Decides between `hybrid` (evergreen + live data) or `open_book` (volatile/news) mode.
- Generates 3–6 targeted web search queries.
- **Guarantee:** Research is *always* enabled to ensure every blog contains live citations.

### Step 2 — Research Node (`research_node`)
> *"Searching the web for live sources..."*

- Executes all search queries against the **Tavily API** (with retry logic).
- Collects up to 30 raw results, deduplicates by URL, normalizes dates.
- In `open_book` mode, filters results to the configured `recency_days` window (default: 7 days).
- Caps the final evidence to **6 items** to stay within Groq's free-tier token budget.
- Returns a list of `EvidenceItem` objects (title, URL, snippet, date, source).

### Step 3 — Orchestrator Node (`orchestrator_node`)
> *"Planning blog structure & sections..."*

- Receives the topic, evidence, tone preset, and mode.
- Uses the LLM with **structured output** (`Plan` schema) to create a detailed blog outline:
  - Blog title, audience, tone, blog kind (explainer, tutorial, news, comparison, system design).
  - 3–4 `Task` objects, each with a section title, goal, 3–6 bullet points, and target word count.
- **HITL Interrupt:** The graph pauses here (`interrupt_before=["worker"]`). The plan is sent to the frontend for human review.

### Step 4 — Human Review (Frontend `PlanReviewer`)
> *The user reviews and edits the proposed outline.*

- Users can modify: blog title, section titles, goals, bullet points, word count targets.
- Users can add or remove bullet points from any section.
- On approval, the frontend calls `POST /api/generate/resume` with the edited plan.
- The backend updates LangGraph's checkpoint state and resumes the graph.

### Step 5 — Worker Nodes (`worker_node`) — Parallel Execution
> *"Writing section 1 of 4..."*

- The `fanout` function uses LangGraph's `Send` API to dispatch **parallel worker agents** — one per section.
- Each worker receives: its `Task`, the full `Plan`, and all `EvidenceItem`s.
- Workers write Markdown sections following strict rules:
  - Cover all bullet points in order, targeting ±15% of the specified word count.
  - Embed 1–2 reference links inline as Markdown hyperlinks.
  - If the LLM fails to embed links, a programmatic fallback appends a "Further Reading" block.
- Returns `(task_id, section_markdown)` tuples for ordered reassembly.

### Step 6 — Reducer Subgraph (3 sub-steps)
> *"Generating visuals & final polish..."*

A compiled **LangGraph subgraph** that handles post-processing:

1. **`merge_content`**: Sorts sections by `task_id`, prepends the blog title as an `# H1`, and joins everything into a single Markdown document.
2. **`decide_images`**: Uses the LLM with **structured output** (`GlobalImagePlan` schema) to plan 2–3 images with detailed prompts, captions, alt text, and target heading placement.
3. **`generate_and_place_images`**: Calls **Pollinations.ai** to generate images (1024×1024, Flux model). Inserts `![alt](url)` tags after the specified headings. Saves generated images to `backend/images/` and the final Markdown to `backend/blogs/`.

### Step 7 — Completion
> *"Blog generation complete!"*

- The final Markdown (with embedded image URLs) is returned to the frontend.
- The frontend renders it with `react-markdown` + syntax highlighting.
- The blog is saved to the user's local history (IndexedDB + localStorage).

---

## 📁 Project Folder Structure

```
BlogForgeAI/
├── .gitignore                          # Git ignore rules
├── README.md                           # ← You are here
│
├── backend/                            # Python FastAPI Backend
│   ├── .env                            # Backend secrets (git-ignored)
│   ├── main.py                         # FastAPI app, SSE endpoints, Clerk auth, lifespan
│   ├── requirements.txt                # Python dependencies
│   ├── venv/                           # Python virtual environment (git-ignored)
│   │
│   ├── agent/                          # LangGraph Multi-Agent Core
│   │   ├── __init__.py                 # Package marker
│   │   ├── state.py                    # Pydantic schemas & LangGraph TypedDict state
│   │   ├── graph.py                    # StateGraph definition, edges, subgraph, compile
│   │   └── nodes.py                    # All node logic: router, research, orchestrator,
│   │                                   #   worker, merge, image planning & generation
│   │
│   ├── api/                            # API module (extensible)
│   │   └── __init__.py                 # Package marker
│   │
│   ├── blogs/                          # Generated blog .md files (git-ignored)
│   │   └── *.md                        # e.g., the_impact_of_ai_on_world_cricket.md
│   │
│   └── images/                         # Generated blog images (git-ignored)
│       └── *.png                       # e.g., ai_cricket_analysis.png
│
├── frontend/                           # React + Vite Frontend
│   ├── .env.local                      # Clerk publishable key (git-ignored)
│   ├── .gitignore                      # Frontend-specific ignores
│   ├── index.html                      # HTML entry point
│   ├── package.json                    # npm dependencies & scripts
│   ├── package-lock.json               # Dependency lock file
│   ├── vite.config.js                  # Vite + React + TailwindCSS v4 plugin config
│   ├── eslint.config.js                # ESLint configuration
│   │
│   ├── public/                         # Static assets (favicon, etc.)
│   │
│   └── src/
│       ├── main.jsx                    # React DOM mount + ClerkProvider
│       ├── App.jsx                     # Root component: routing, state, SSE handlers
│       ├── App.css                     # Global prose/image styling overrides
│       ├── index.css                   # TailwindCSS v4 imports + base reset
│       │
│       ├── services/
│       │   └── api.js                  # SSE streaming client: generateBlogStream,
│       │                               #   resumeBlogStream, generateBlog (legacy)
│       │
│       ├── hooks/
│       │   ├── useTheme.js             # Dark/light mode toggle (localStorage)
│       │   └── useHistory.js           # Blog history (IndexedDB + localStorage)
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.jsx          # Top bar: auth, theme toggle, hamburger menu
│       │   │   └── Sidebar.jsx         # Collapsible sidebar: history, search, new gen
│       │   │
│       │   └── workspace/
│       │       ├── PlanReviewer.jsx     # HITL outline editor (edit plan before writing)
│       │       └── BlogOutput.jsx      # Markdown renderer + editor + export toolbar
│       │
│       └── assets/                     # Static frontend assets
│
└── .vscode/                            # VS Code workspace settings
```

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **[FastAPI](https://fastapi.tiangolo.com/)** | Async REST API framework with SSE streaming support |
| **[LangGraph](https://langchain-ai.github.io/langgraph/)** | Multi-agent state machine orchestration with checkpointing |
| **[LangChain](https://www.langchain.com/)** | LLM abstraction layer with structured output parsing |
| **[Groq](https://groq.com/)** | Ultra-fast LLM inference (Llama 3.3 70B Versatile) |
| **[Tavily](https://tavily.com/)** | Real-time web search API for research grounding |
| **[Pollinations.ai](https://pollinations.ai/)** | Free AI image generation (Flux model) |
| **[PostgreSQL](https://www.postgresql.org/)** | LangGraph checkpoint persistence for interrupt/resume |
| **[psycopg](https://www.psycopg.org/psycopg3/)** | Async PostgreSQL driver with connection pooling |
| **[PyJWT](https://pyjwt.readthedocs.io/)** | Clerk JWT token verification (RS256) |
| **[Tenacity](https://tenacity.readthedocs.io/)** | Retry logic with exponential backoff for LLM/API calls |
| **[Uvicorn](https://www.uvicorn.org/)** | ASGI server for running FastAPI |

### Frontend
| Technology | Purpose |
|---|---|
| **[React 19](https://react.dev/)** | UI framework with hooks and functional components |
| **[Vite 8](https://vite.dev/)** | Lightning-fast development server and build tool |
| **[TailwindCSS v4](https://tailwindcss.com/)** | Utility-first CSS framework |
| **[Clerk](https://clerk.com/)** | Drop-in user authentication (sign-in, sign-up, JWT) |
| **[react-markdown](https://github.com/remarkjs/react-markdown)** | Markdown-to-React renderer |
| **[react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)** | Code block syntax highlighting (VS Code Dark+ theme) |
| **[Lucide React](https://lucide.dev/)** | Icon library |
| **IndexedDB** | Client-side storage for full blog content |

---

## ✅ Prerequisites

- **Python** 3.10+
- **Node.js** 18+ and **npm**
- **PostgreSQL** database (or the app falls back to in-memory checkpointing)
- API keys for: **Groq**, **Tavily**, and **Clerk**

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
# LLM Provider
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Web Search
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Authentication (Clerk)
CLERK_PEM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBI...\n-----END PUBLIC KEY-----"

# LangGraph Checkpoint Persistence
DATABASE_URL=postgresql://user:password@localhost:5432/blogforge

# Image serving base URL (change for deployment)
PUBLIC_BASE_URL=http://localhost:8000

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend (`frontend/.env.local`)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/BlogForgeAI.git
cd BlogForgeAI
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create the `backend/.env` file with your API keys (see [Environment Variables](#-environment-variables)).

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

Create the `frontend/.env.local` file with your Clerk publishable key.

### 4. Database Setup (Optional)

If using PostgreSQL for persistent checkpointing:

```sql
CREATE DATABASE blogforge;
```

The application will automatically create the required LangGraph checkpoint tables on startup.

If `DATABASE_URL` is not set, the app gracefully falls back to **in-memory checkpointing** (state is lost on server restart).

---

## ▶️ Running the Application

### Start the Backend

```bash
cd backend
python main.py
```

The API server starts at **http://localhost:8000**.

### Start the Frontend

```bash
cd frontend
npm run dev
```

The development server starts at **http://localhost:5173**.

---

## 📡 API Reference

All endpoints require a valid **Clerk JWT** in the `Authorization: Bearer <token>` header.

### `POST /api/generate/stream`

**Primary endpoint.** Generates a blog via SSE streaming with HITL interrupt.

**Request Body:**
```json
{
  "topic": "The future of quantum computing",
  "tone": "Technical"
}
```

**SSE Event Types:**

| Event Type | Description | Payload |
|---|---|---|
| `progress` | Step-by-step pipeline updates | `{ step, total, message }` |
| `interrupt` | Paused for human plan review | `{ thread_id, plan }` |
| `complete` | Blog generation finished | `{ data: { status, title, markdown, image_specs } }` |
| `error` | Pipeline failure | `{ message }` |

---

### `POST /api/generate/resume`

Resumes generation after human plan approval.

**Request Body:**
```json
{
  "thread_id": "uuid-from-interrupt-event",
  "plan": { /* edited Plan object */ }
}
```

**SSE Event Types:** Same as `/api/generate/stream` (minus `interrupt`).

---

### `POST /api/generate`

Non-streaming endpoint (legacy). Returns the complete blog synchronously.

**Request Body:**
```json
{
  "topic": "Introduction to vector databases",
  "tone": "Balanced"
}
```

**Response:**
```json
{
  "status": "success",
  "title": "Understanding Vector Databases: A Comprehensive Guide",
  "markdown": "# Understanding Vector Databases...",
  "image_specs": [...]
}
```

---

### `GET /images/{filename}`

Serves generated blog images as static files.

---

## 🧩 Frontend Components

| Component | File | Responsibility |
|---|---|---|
| **App** | `src/App.jsx` | Root state manager, SSE event handling, view routing |
| **Navbar** | `src/components/layout/Navbar.jsx` | Top bar with auth (Clerk `UserButton`), theme toggle, sidebar trigger |
| **Sidebar** | `src/components/layout/Sidebar.jsx` | Collapsible history panel with search, "New Generation" button |
| **PlanReviewer** | `src/components/workspace/PlanReviewer.jsx` | HITL editor for reviewing/editing the AI-proposed blog outline |
| **BlogOutput** | `src/components/workspace/BlogOutput.jsx` | Markdown renderer, inline editor, export toolbar (download, copy, print) |
| **useTheme** | `src/hooks/useTheme.js` | Dark mode state synced to `localStorage` and `<html>` class |
| **useHistory** | `src/hooks/useHistory.js` | Per-user blog history with IndexedDB (content) + localStorage (metadata) |
| **api.js** | `src/services/api.js` | SSE streaming client for `generateBlogStream` and `resumeBlogStream` |

---

## 💾 Data Persistence

| Layer | Technology | What it Stores |
|---|---|---|
| **Backend Checkpoints** | PostgreSQL (via `langgraph-checkpoint-postgres`) | Full LangGraph state at each node, enabling interrupt/resume |
| **Backend Files** | Filesystem (`blogs/`, `images/`) | Generated `.md` blog files and `.png` images |
| **Frontend Metadata** | localStorage (keyed by `blog_history_{userId}`) | History list: id, topic, title, date (max 50 items) |
| **Frontend Content** | IndexedDB (`BlogForgeDB` → `blogs` store) | Full blog result objects (markdown, images, title) |

---

## ⚙️ Configuration Reference

### Tone Presets & LLM Temperature

| Tone Preset | Temperature | Use Case |
|---|---|---|
| Technical | 0.2 | Precise, factual engineering content |
| Academic | 0.2 | Research-oriented, formal writing |
| Balanced | 0.7 | General-purpose blog content |
| Casual | 0.7 | Conversational, easy-to-read style |
| Marketing | 0.8 | Persuasive, engaging copy |
| Storytelling | 0.9 | Narrative, creative writing |

### LLM Model

- **Provider:** Groq
- **Model:** `llama-3.3-70b-versatile`
- **Structured Output:** Used for `RouterDecision`, `Plan`, and `GlobalImagePlan` schemas

### Retry Strategy

All LLM calls use **Tenacity** retry logic:
- **Max attempts:** 3
- **Backoff:** Exponential (1s → 2s → 4s, capped at 10s)
- **Tavily searches:** 2 attempts with exponential backoff (1s → 5s)
- **Image generation:** 2 attempts with exponential backoff (2s → 8s)

---

## 🌐 Deployment Guide

Deploy BlogForgeAI for free using **Render** (backend) + **Vercel** (frontend) + **Neon** (database).

### Step 1 — Set Up Neon PostgreSQL (Free Database)

1. Go to [neon.tech](https://neon.tech) and sign up.
2. Create a new project (e.g., `blogforge`).
3. Copy the **connection string** from the dashboard. It looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/blogforge?sslmode=require
   ```
4. Save this — you'll need it for the Render backend.

### Step 2 — Deploy Backend on Render

1. Push your code to a **GitHub** repository.
2. Go to [render.com](https://render.com) → **Dashboard** → **New** → **Web Service**.
3. Connect your GitHub repo.
4. Configure the service:

   | Setting | Value |
   |---|---|
   | **Name** | `blogforgeai-api` |
   | **Region** | Oregon (US West) |
   | **Runtime** | Docker |
   | **Dockerfile Path** | `./backend/Dockerfile` |
   | **Docker Context** | `./backend` |
   | **Instance Type** | Free |

5. Add **Environment Variables** in the Render dashboard:

   | Variable | Value |
   |---|---|
   | `GROQ_API_KEY` | Your Groq API key |
   | `TAVILY_API_KEY` | Your Tavily API key |
   | `CLERK_PEM_PUBLIC_KEY` | Your Clerk PEM public key (full block with newlines) |
   | `DATABASE_URL` | Your Neon connection string from Step 1 |
   | `PUBLIC_BASE_URL` | `https://blogforgeai-api.onrender.com` (your Render URL) |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` (your Vercel URL — set after Step 3) |

6. Click **Create Web Service**. Render will build the Docker image and deploy.
7. Note your backend URL: `https://blogforgeai-api.onrender.com`

> **💡 Tip:** On the free tier, the service sleeps after 15 minutes of inactivity. The first request after sleep takes ~50 seconds to cold-start.

### Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo.
2. Configure the project:

   | Setting | Value |
   |---|---|
   | **Framework Preset** | Vite |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

3. Add **Environment Variables**:

   | Variable | Value |
   |---|---|
   | `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
   | `VITE_API_URL` | `https://blogforgeai-api.onrender.com` (your Render URL from Step 2) |

4. Click **Deploy**.
5. Note your frontend URL: `https://your-app.vercel.app`

### Step 4 — Update CORS on Render

Go back to your Render dashboard and update the `CORS_ORIGINS` environment variable:

```
https://your-app.vercel.app
```

Render will automatically redeploy with the updated CORS setting.

### Step 5 — Configure Clerk for Production

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com).
2. Under **Domains**, add your Vercel frontend URL (`https://your-app.vercel.app`).
3. Make sure JWT templates are configured for your production domain.

### Post-Deployment Checklist

- [ ] Neon database created and connection string saved
- [ ] Render backend deployed and health check passing (`/docs` returns 200)
- [ ] Vercel frontend deployed and loading the sign-in page
- [ ] `CORS_ORIGINS` on Render points to your Vercel URL
- [ ] `VITE_API_URL` on Vercel points to your Render URL
- [ ] `PUBLIC_BASE_URL` on Render matches your Render URL
- [ ] Clerk production domain configured
- [ ] End-to-end test: generate a blog and verify images load

### ⚠️ Production Notes

| Concern | Detail |
|---|---|
| **Cold Starts** | Render free tier sleeps after 15 min of inactivity. First request takes ~50s. Consider upgrading to Render Starter ($7/mo) for always-on. |
| **Ephemeral Filesystem** | Generated images in `backend/images/` are lost on redeploy. Images persist while the service is running and are embedded via URL in the blog markdown. For persistent images, consider uploading to Cloudinary or S3. |
| **Neon Free Limits** | 0.5 GB storage, 190 compute hours/month. More than sufficient for LangGraph checkpoints. |
| **Groq Free Limits** | The free tier has token-per-day limits. Evidence is capped at 6 items to stay within budget. |
| **Vercel Free Limits** | 100 GB bandwidth/month, unlimited deploys. More than enough for a personal project. |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Built with ❤️ using LangGraph, Groq, and React</sub>
</p>

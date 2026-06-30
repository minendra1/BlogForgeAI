import os
import asyncio
import json
import jwt
import traceback
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles

# FIX 1: Rename the LangGraph import to avoid conflict with FastAPI
from agent.graph import app as agent_workflow

load_dotenv()

# FIX 2: Name the FastAPI instance 'app' (This is what Uvicorn looks for by default!)
app = FastAPI(title="BlogForgeAI Orchestration API")

# Mount the images directory so the React frontend can see them
os.makedirs("images", exist_ok=True)
app.mount("/images", StaticFiles(directory="images"), name="images")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BlogRequest(BaseModel):
    topic: str

# --- AUTHENTICATION SETUP ---
security = HTTPBearer()
CLERK_PUBLIC_KEY = os.getenv("CLERK_PEM_PUBLIC_KEY")

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Decodes the Clerk JWT using the PEM Public Key.
    Returns the user_id if valid, or raises a 401 Unauthorized.
    """
    if not CLERK_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="Server missing Clerk Public Key.")
        
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, 
            CLERK_PUBLIC_KEY, 
            algorithms=["RS256"]
        )
        return payload.get("sub") # The Clerk user ID
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# --- ENDPOINTS ---

# The Depends(verify_token) parameter locks down this endpoint
@app.post("/api/generate")
async def generate_blog(request: BlogRequest, user_id: str = Depends(verify_token)):
    try:
        # Setup the initial state payload
        initial_state = {
            "topic": request.topic,
            "as_of": str(date.today()),
            "mode": "",
            "needs_research": False,
            "queries": [],
            "evidence": [],
            "plan": None,
            "recency_days": 7,
            "sections": [],
            "merged_md": "",
            "md_with_placeholders": "",
            "image_specs": [],
            "final": ""
        }
        
        # FIX 3: Execute the LangGraph agent using the new name
        final_output = await asyncio.to_thread(agent_workflow.invoke, initial_state)
        
        return {
            "status": "success",
            "title": final_output.get("plan").blog_title if final_output.get("plan") else request.topic,
            "markdown": final_output.get("final", ""),
            "image_specs": final_output.get("image_specs", [])
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- STREAMING ENDPOINT (Real-time progress via SSE) ---

STEP_LABELS = {
    "router": {"step": 1, "message": "Analyzing topic & deciding strategy..."},
    "research": {"step": 2, "message": "Searching the web for live sources..."},
    "orchestrator": {"step": 3, "message": "Planning blog structure & sections..."},
    "worker": {"step": 4, "message": "Drafting blog sections..."},
    "reducer": {"step": 6, "message": "Generating visuals & final polish..."},
}
TOTAL_STEPS = 7

@app.post("/api/generate/stream")
async def generate_blog_stream(request: BlogRequest, user_id: str = Depends(verify_token)):
    initial_state = {
        "topic": request.topic,
        "as_of": str(date.today()),
        "mode": "",
        "needs_research": False,
        "queries": [],
        "evidence": [],
        "plan": None,
        "recency_days": 7,
        "sections": [],
        "merged_md": "",
        "md_with_placeholders": "",
        "image_specs": [],
        "final": ""
    }

    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def run_pipeline():
        try:
            accumulated = {}
            worker_count = 0
            total_workers = 0

            for event in agent_workflow.stream(initial_state):
                node_name = list(event.keys())[0]
                node_output = event[node_name]

                # Accumulate state (handle the 'sections' list reducer)
                if isinstance(node_output, dict):
                    for key, value in node_output.items():
                        if key == "sections":
                            accumulated.setdefault("sections", [])
                            accumulated["sections"].extend(value)
                        else:
                            accumulated[key] = value

                # Track parallel workers for dynamic messaging
                if node_name == "orchestrator" and isinstance(node_output, dict) and "plan" in node_output:
                    total_workers = len(node_output["plan"].tasks)

                if node_name == "worker":
                    worker_count += 1
                    progress = {
                        "type": "progress",
                        "step": 4 + (worker_count / max(total_workers, 1)),
                        "total": TOTAL_STEPS,
                        "message": f"Writing section {worker_count} of {total_workers}..."
                    }
                else:
                    label = STEP_LABELS.get(node_name, {"step": 0, "message": f"Processing {node_name}..."})
                    progress = {"type": "progress", "step": label["step"], "total": TOTAL_STEPS, "message": label["message"]}

                asyncio.run_coroutine_threadsafe(queue.put(json.dumps(progress)), loop)

            # Build and send the final result
            plan = accumulated.get("plan")
            result = {
                "status": "success",
                "title": plan.blog_title if plan else request.topic,
                "markdown": accumulated.get("final", ""),
                "image_specs": accumulated.get("image_specs", []),
            }
            asyncio.run_coroutine_threadsafe(
                queue.put(json.dumps({"type": "complete", "data": result})), loop
            )
        except Exception as e:
            traceback.print_exc()
            asyncio.run_coroutine_threadsafe(
                queue.put(json.dumps({"type": "error", "message": str(e)})), loop
            )
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)

    loop.run_in_executor(None, run_pipeline)

    async def event_stream():
        while True:
            data = await queue.get()
            if data is None:
                break
            yield f"data: {data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date

# Import the compiled LangGraph agent from your new modular architecture
from agent.graph import app

# Initialize the production FastAPI app
app_api = FastAPI(title="BlogForgeAI Orchestration API")

# Configure CORS for the future React frontend
app_api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BlogRequest(BaseModel):
    topic: str

@app_api.post("/api/generate")
async def generate_blog(request: BlogRequest):
    try:
        # 1. Setup the initial state payload
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
        
        # 2. Execute the modular LangGraph agent
        final_output = app.invoke(initial_state)
        
        # 3. Return the processed blog data to the client
        return {
            "status": "success",
            "title": final_output.get("plan").blog_title if final_output.get("plan") else request.topic,
            "markdown": final_output.get("final", ""),
            "image_specs": final_output.get("image_specs", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app_api, host="0.0.0.0", port=8000)
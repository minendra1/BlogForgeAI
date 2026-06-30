import os
import jwt
import traceback
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles


# Import the compiled LangGraph agent
from agent.graph import app

load_dotenv()

app_api = FastAPI(title="BlogForgeAI Orchestration API")

os.makedirs("images", exist_ok=True)
app_api.mount("/images", StaticFiles(directory="images"), name="images")

# Updated CORS Middleware to include both localhost and 127.0.0.1
app_api.add_middleware(
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
@app_api.post("/api/generate")
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
        
        # Execute the modular LangGraph agent
        final_output = app.invoke(initial_state)
        
        return {
            "status": "success",
            "title": final_output.get("plan").blog_title if final_output.get("plan") else request.topic,
            "markdown": final_output.get("final", ""),
            "image_specs": final_output.get("image_specs", [])
        }
    except Exception as e:
        traceback.print_exc()  # <--- ADD THIS LINE
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app_api, host="0.0.0.0", port=8000)
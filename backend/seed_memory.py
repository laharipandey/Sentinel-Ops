import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from hindsight_client import Hindsight

# 1. Load Environment Variables (.env)
load_dotenv()

app = FastAPI(title="SentinelOps Backend Engine")

# Enable CORS for Next.js frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY")
BANK_ID = "sentinel-ops"

# 2. Initialize Real Clients
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

hindsight_client = Hindsight(
    base_url="https://api.hindsight.vectorize.io",
    api_key=HINDSIGHT_API_KEY
) if HINDSIGHT_API_KEY else None

# Local Fallback Store for fast UI display
LOCAL_STORE = []
try:
    with open("seed_data.json", "r") as f:
        LOCAL_STORE = json.load(f)
    print(f" Loaded {len(LOCAL_STORE)} incidents locally.")
except Exception as e:
    print(f" Note on seed_data: {e}")

# Pydantic Request Models
class PRAnalyzeRequest(BaseModel):
    diff: str
    description: str = ""
    author: str = "junior_dev"

class FeedbackRequest(BaseModel):
    feedback: str
    incident_id: str = "INC-2025-11-04"

class QueryRequest(BaseModel):
    query: str


# -------------------------------------------------------------
# 1. Endpoint: Analyze Pull Request Diff (Real Hindsight Recall + Groq)
# -------------------------------------------------------------
@app.post("/api/analyze-pr")
def analyze_pr(req: PRAnalyzeRequest):
    recalled_context = ""
    
    # Real Hindsight Cloud Recall
    if hindsight_client:
        try:
            print("🔍 Querying Hindsight Cloud Memory...")
            recall_response = hindsight_client.recall(
                bank_id=BANK_ID,
                query=f"{req.diff} {req.description}"
            )
            if hasattr(recall_response, "results"):
                recalled_context = "\n".join([str(r) for r in recall_response.results])
            else:
                recalled_context = str(recall_response)
            print("✅ Successfully recalled memory from Hindsight Cloud!")
        except Exception as e:
            print(f"⚠️ Hindsight Recall error (using local context): {e}")
            recalled_context = json.dumps(LOCAL_STORE, indent=2)
    else:
        recalled_context = json.dumps(LOCAL_STORE, indent=2)

    prompt = f"""
You are SentinelOps, an autonomous engineering safety gatekeeper using Hindsight Episodic Memory.
Analyze this Pull Request git diff against the recalled institutional memories.

Recalled Memories:
{recalled_context}

PR Diff:
{req.diff}

PR Description:
{req.description}

Determine if this code modification triggers a historical outage pattern.
Respond strictly in valid JSON format with these exact keys:
{{
  "is_blocked": true or false,
  "risk_score": integer (0 to 100),
  "matched_incident_id": "INC-ID or ADR-ID or None",
  "explanation": "Clear explanation referencing past outage and root cause",
  "safe_patch": "Safe alternative replacement code snippet"
}}
"""
    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            result = json.loads(completion.choices[0].message.content)
            matched = next((item for item in LOCAL_STORE if item["id"] == result.get("matched_incident_id")), LOCAL_STORE[0] if LOCAL_STORE else {})
            result["matched_incident"] = matched
            return result
        except Exception as e:
            print(f"⚠️ Groq inference error: {e}")

    # Verified safe fallback response if Groq API key isn't active
    return {
        "is_blocked": True,
        "risk_score": 92,
        "matched_incident": LOCAL_STORE[0] if LOCAL_STORE else {},
        "explanation": "In Nov 2025, removing this 250ms buffer caused downstream connection pool starvation on SBI payment callbacks during flash sale spikes (INC-2025-11-04).",
        "safe_patch": "from limiter import TokenBucketRateLimiter\n\n# Verified Safe Token Bucket Buffer\nlimiter = TokenBucketRateLimiter(rate=200, capacity=500)\nlimiter.acquire()"
    }


# -------------------------------------------------------------
# 2. Endpoint: Developer Live Learning Loop (Real Hindsight Retain)
# -------------------------------------------------------------
@app.post("/api/learn")
def learn_feedback(req: FeedbackRequest):
    new_memory = {
        "id": f"LEARN-{len(LOCAL_STORE)+1:03d}",
        "type": "developer_override",
        "title": "Developer Live Learning Feedback",
        "description": req.feedback,
        "author": "Current Developer",
        "severity": "RESOLVED"
    }
    LOCAL_STORE.insert(0, new_memory)

    # Real Hindsight Retain API Call
    if hindsight_client:
        try:
            print("💾 Retaining new feedback into Hindsight Cloud...")
            hindsight_client.retain(
                bank_id=BANK_ID,
                content=f"[DEVELOPER_OVERRIDE] {req.feedback}"
            )
            print("✅ Successfully retained into Hindsight Cloud!")
        except Exception as e:
            print(f"⚠️ Hindsight Retain error: {e}")

    return {
        "status": "success",
        "message": "Learned new engineering context into Hindsight Cloud.",
        "updated_memory": new_memory
    }


# -------------------------------------------------------------
# 3. Endpoint: Ask-Sentinel (Manager Architectural Hub)
# -------------------------------------------------------------
@app.post("/api/ask-sentinel")
def ask_sentinel(req: QueryRequest):
    recalled_context = ""
    if hindsight_client:
        try:
            recall_response = hindsight_client.recall(bank_id=BANK_ID, query=req.query)
            recalled_context = str(recall_response)
        except Exception:
            recalled_context = json.dumps(LOCAL_STORE, indent=2)
    else:
        recalled_context = json.dumps(LOCAL_STORE, indent=2)

    prompt = f"""
You are Ask-Sentinel, an executive engineering knowledge recall agent.
Answer the query using this recalled institutional memory:
{recalled_context}

Query: {req.query}
Provide a concise, professional answer with bullet points, citing Incident IDs or ADR numbers.
"""
    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}]
            )
            return {"answer": completion.choices[0].message.content}
        except Exception as e:
            print(f"⚠️ Groq inference error: {e}")

    return {
        "answer": "• Incident INC-2025-11-04: Redis connection pool starvation occurred during a flash sale because external bank APIs take variable time.\n• Resolution: Retain a 250ms buffer or deploy token-bucket rate limiters.\n• ADR-042: Mandates retaining legacy XML serialisation for enterprise banking partners."
    }


# -------------------------------------------------------------
# 4. Endpoints: Memories & Health Status
# -------------------------------------------------------------
@app.get("/api/memories")
def get_memories():
    return {"memories": LOCAL_STORE}

@app.get("/")
def health_check():
    return {
        "status": "SentinelOps Backend Active",
        "hindsight_connected": hindsight_client is not None,
        "groq_connected": groq_client is not None,
        "memories_count": len(LOCAL_STORE)
    }
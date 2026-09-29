import os
import json
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load Environment Variables (.env)
load_dotenv()

app = FastAPI(title="SentinelOps Enterprise Governance Engine")

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
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
BANK_ID = "sentinel-ops"

# Enterprise Security Config
COMPANY_DOMAIN = "@sentinelops.io"
COMPANY_CHEATCODE = "SENTINEL-HYD-2026"

# In-Memory Corporate User Store
USERS_DB = {
    "staff_engineer@sentinelops.io": "SentinelPass2026!",
    "lead_dev@sentinelops.io": "AdminPass2026!"
}

# Safe initialization of AI / Memory clients
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Notice on Groq init: {e}")

hindsight_client = None
if HINDSIGHT_API_KEY:
    try:
        from hindsight_client import Hindsight
        hindsight_client = Hindsight(
            base_url="https://api.hindsight.vectorize.io",
            api_key=HINDSIGHT_API_KEY
        )
    except Exception as e:
        print(f"Notice on Hindsight init: {e}")

# Local Fallback Store
LOCAL_STORE = []
try:
    with open("seed_data.json", "r") as f:
        LOCAL_STORE = json.load(f)
    print(f"✅ Loaded {len(LOCAL_STORE)} incidents locally.")
except Exception as e:
    print(f"Note on seed_data: {e}")


# -------------------------------------------------------------
# Request Models
# -------------------------------------------------------------
class AuthRequest(BaseModel):
    email: str
    password: str
    cheatcode: str

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
# Helper Functions
# -------------------------------------------------------------
def compute_financial_blast_radius(risk_score: int, is_blocked: bool) -> dict:
    """Calculates enterprise downtime losses and downstream component failure impact."""
    if is_blocked or risk_score > 60:
        cost_per_min = 14500
        recovery_time = 42
        total_loss = cost_per_min * recovery_time
        return {
            "services_affected_count": 4,
            "services_affected": [
                "sbi-callback-gateway",
                "redis-session-pool",
                "checkout-transaction-worker",
                "inventory-sync-service"
            ],
            "cost_per_minute": "$14,500/min",
            "projected_downtime_minutes": f"{recovery_time} mins",
            "total_estimated_exposure": f"${total_loss:,}",
            "sla_tier_impact": "Tier-0 Critical Outage (SEV-1)"
        }
    return {
        "services_affected_count": 0,
        "services_affected": ["All 4 critical downstream services safe"],
        "cost_per_minute": "$0/min",
        "projected_downtime_minutes": "0 mins",
        "total_estimated_exposure": "$0",
        "sla_tier_impact": "Zero SLA Degradation"
    }


def run_sentinel_analysis(diff: str, description: str = "") -> dict:
    """Core reasoning engine combining Hindsight Cloud memory recall with Groq LLaMA-3.3."""
    recalled_context = ""

    if hindsight_client:
        try:
            recall_response = hindsight_client.recall(
                bank_id=BANK_ID,
                query=f"{diff} {description}"
            )
            if hasattr(recall_response, "results"):
                recalled_context = "\n".join([str(r) for r in recall_response.results])
            else:
                recalled_context = str(recall_response)
        except Exception as e:
            print(f"⚠️ Hindsight Recall notice: {e}")
            recalled_context = json.dumps(LOCAL_STORE, indent=2)
    else:
        recalled_context = json.dumps(LOCAL_STORE, indent=2)

    prompt = f"""
You are SentinelOps, an autonomous engineering safety gatekeeper using Hindsight Episodic Memory.
Analyze this Pull Request git diff against the recalled institutional memories.

Recalled Memories:
{recalled_context}

PR Diff:
{diff}

PR Description:
{description}

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
    result = None
    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            result = json.loads(completion.choices[0].message.content)
            matched = next(
                (item for item in LOCAL_STORE if item["id"] == result.get("matched_incident_id")),
                LOCAL_STORE[0] if LOCAL_STORE else {}
            )
            result["matched_incident"] = matched
        except Exception as e:
            print(f"⚠️ Groq inference notice: {e}")

    if not result:
        result = {
            "is_blocked": True,
            "risk_score": 92,
            "matched_incident": LOCAL_STORE[0] if LOCAL_STORE else {},
            "explanation": "In Nov 2025, removing this 250ms buffer caused downstream connection pool starvation on SBI payment callbacks during flash sale spikes (INC-2025-11-04).",
            "safe_patch": "from limiter import TokenBucketRateLimiter\n\n# Verified Safe Token Bucket Buffer\nlimiter = TokenBucketRateLimiter(rate=200, capacity=500)\nlimiter.acquire()"
        }

    # Inject financial impact calculation
    result["financial_blast_radius"] = compute_financial_blast_radius(
        result.get("risk_score", 0),
        result.get("is_blocked", False)
    )
    return result


def send_github_post(url: str, data: dict, token: str) -> bool:
    """Helper using standard library urllib."""
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "SentinelOps-Engine",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            return response.status in (200, 201)
    except Exception as e:
        print(f"GitHub API call info: {e}")
        return False


# -------------------------------------------------------------
# 1. Corporate Authentication Endpoints
# -------------------------------------------------------------
@app.post("/api/auth/signup")
def company_signup(req: AuthRequest):
    email = req.email.strip().lower()

    if not email.endswith(COMPANY_DOMAIN):
        raise HTTPException(
            status_code=403,
            detail=f"Registration Denied: Only corporate {COMPANY_DOMAIN} addresses are permitted."
        )

    if req.cheatcode.strip() != COMPANY_CHEATCODE:
        raise HTTPException(
            status_code=401,
            detail="Invalid Company Security Clearance Code."
        )

    if email in USERS_DB:
        raise HTTPException(
            status_code=400,
            detail="Account already exists for this corporate email. Please sign in."
        )

    if len(req.password.strip()) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long."
        )

    USERS_DB[email] = req.password
    return {
        "status": "created",
        "email": email,
        "message": "Corporate credentials registered successfully."
    }


@app.post("/api/auth/login")
def company_login(req: AuthRequest):
    email = req.email.strip().lower()

    if not email.endswith(COMPANY_DOMAIN):
        raise HTTPException(
            status_code=403,
            detail=f"Access Denied: Only corporate {COMPANY_DOMAIN} addresses are permitted."
        )

    if req.cheatcode.strip() != COMPANY_CHEATCODE:
        raise HTTPException(
            status_code=401,
            detail="Invalid Company Security Clearance Code."
        )

    if email in USERS_DB:
        if USERS_DB[email] != req.password:
            raise HTTPException(
                status_code=401,
                detail="Incorrect corporate account password."
            )
    else:
        USERS_DB[email] = req.password

    return {
        "status": "authorized",
        "email": email,
        "role": "Staff Engineering Reviewer",
        "clearance_level": "Tier-1 Governance"
    }


# -------------------------------------------------------------
# 2. PR Analysis Endpoint
# -------------------------------------------------------------
@app.post("/api/analyze-pr")
def analyze_pr_endpoint(req: PRAnalyzeRequest):
    return run_sentinel_analysis(diff=req.diff, description=req.description)


# -------------------------------------------------------------
# 3. GitHub PR Webhook Gatekeeper
# -------------------------------------------------------------
@app.post("/api/webhooks/github")
def github_webhook(payload: dict = {}):
    """Clean webhook endpoint handling GitHub events safely."""
    pull_request = payload.get("pull_request")
    if not pull_request:
        return {"status": "success", "message": "SentinelOps Webhook Listener Active. (No PR payload in test)"}

    pr_number = pull_request.get("number")
    repo_full_name = payload.get("repository", {}).get("full_name")
    commit_sha = pull_request.get("head", {}).get("sha")
    pr_title = pull_request.get("title", "")
    pr_body = pull_request.get("body", "")

    eval_result = run_sentinel_analysis(diff=f"Title: {pr_title}\n{pr_body}", description=pr_title)

    is_blocked = eval_result.get("is_blocked", False)
    risk_score = eval_result.get("risk_score", 0)
    blast = eval_result.get("financial_blast_radius", {})
    explanation = eval_result.get("explanation", "")
    safe_patch = eval_result.get("safe_patch", "")
    matched = eval_result.get("matched_incident", {})

    gate_label = "🚫 MERGE BLOCKED" if is_blocked else "✅ MERGE APPROVED"
    matched_id = matched.get("id", "N/A")
    matched_title = matched.get("title", "N/A")
    cost_min = blast.get("cost_per_minute", "$0/min")
    total_exposure = blast.get("total_estimated_exposure", "$0")

    status_comment = (
        "### 🛡️ SentinelOps Autonomous Engineering Governance Check\n\n"
        "| Metric | Evaluation Status |\n"
        "| :--- | :--- |\n"
        f"| **Gate Status** | {gate_label} |\n"
        f"| **Outage Risk Score** | `{risk_score}%` |\n"
        f"| **Recalled Memory** | `{matched_id}: {matched_title}` |\n"
        f"| **Projected Downtime Cost** | `{cost_min}` |\n"
        f"| **Total Outage Exposure** | `{total_exposure}` |\n\n"
        f"#### Forensic Analysis:\n> {explanation}\n\n"
        f"#### Mandatory Safe Patch:\n```python\n{safe_patch}\n```"
    )

    comment_posted = False
    status_posted = False

    if GITHUB_TOKEN and repo_full_name and commit_sha:
        # 1. Post comment
        c_url = f"https://api.github.com/repos/{repo_full_name}/issues/{pr_number}/comments"
        comment_posted = send_github_post(c_url, {"body": status_comment}, GITHUB_TOKEN)

        # 2. Hard Gate Commit Status (Disables GitHub merge button on failure)
        s_url = f"https://api.github.com/repos/{repo_full_name}/statuses/{commit_sha}"
        status_posted = send_github_post(
            s_url,
            {
                "state": "failure" if is_blocked else "success",
                "context": "SentinelOps / Episodic Gate",
                "description": f"Risk {risk_score}% - {'Blocked' if is_blocked else 'Approved'}",
                "target_url": "http://localhost:3000"
            },
            GITHUB_TOKEN
        )

    return {
        "status": "evaluated",
        "pr_number": pr_number,
        "is_blocked": is_blocked,
        "risk_score": risk_score,
        "github_comment_posted": comment_posted,
        "github_status_posted": status_posted,
        "financial_blast_radius": blast
    }


# -------------------------------------------------------------
# 4. Learning Loop & Ask-Sentinel Hub
# -------------------------------------------------------------
@app.post("/api/learn")
def learn_feedback(req: FeedbackRequest):
    new_memory = {
        "id": f"LEARN-{len(LOCAL_STORE)+1:03d}",
        "type": "developer_override",
        "title": "Developer Live Learning Feedback",
        "description": req.feedback,
        "author": "Corporate Engineer",
        "severity": "RESOLVED"
    }
    LOCAL_STORE.insert(0, new_memory)

    if hindsight_client:
        try:
            hindsight_client.retain(
                bank_id=BANK_ID,
                content=f"[DEVELOPER_OVERRIDE] {req.feedback}"
            )
        except Exception as e:
            print(f"⚠️ Hindsight Retain notice: {e}")

    return {
        "status": "success",
        "message": "Learned new engineering context into Hindsight Cloud.",
        "updated_memory": new_memory
    }


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
            print(f"⚠️ Groq inference notice: {e}")

    return {
        "answer": "• Incident INC-2025-11-04: Redis connection pool starvation occurred during a flash sale because external bank APIs take variable time.\n• Resolution: Retain a 250ms buffer or deploy token-bucket rate limiters.\n• ADR-042: Mandates retaining legacy XML serialisation for enterprise banking partners."
    }


# -------------------------------------------------------------
# 5. Memories & Health Check
# -------------------------------------------------------------
@app.get("/api/memories")
def get_memories():
    return {"memories": LOCAL_STORE}

@app.get("/")
def health_check():
    return {
        "status": "SentinelOps Backend Active",
        "enterprise_domain": COMPANY_DOMAIN,
        "github_bot_enabled": bool(GITHUB_TOKEN),
        "hindsight_connected": hindsight_client is not None,
        "groq_connected": groq_client is not None,
        "memories_count": len(LOCAL_STORE)
    }
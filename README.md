# 🛡️ SentinelOps

> **Autonomous CI/CD Engineering Governance Engine Powered by Hindsight Episodic Memory & Groq LLaMA-3.3**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq](https://img.shields.io/badge/Inference-Groq_LLaMA--3.3-f55036?style=flat)](https://groq.com/)
[![Hindsight](https://img.shields.io/badge/Memory-Hindsight_Cloud-6366f1?style=flat)](https://github.com/vectorize-io/hindsight)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Problem: The Blindspot of Modern CI/CD

Standard CI/CD pipelines, unit tests, and linters only validate **syntax and localized logic**—they have **zero institutional memory**. 

When an engineer removes a seemingly redundant `sleep(0.25)` or latency buffer in a payment callback pipeline, traditional test suites turn green. However, production breaks due to downstream thundering herds—the exact same outage that occurred six months earlier.

---

## 💡 The Solution: SentinelOps

**SentinelOps** acts as an autonomous governance gatekeeper embedded in the pull request review lifecycle. Utilizing **Hindsight Episodic Memory Banks**, SentinelOps recalls historical outage post-mortems, evaluates financial blast radius, blocks high-risk merges, and suggests verified 1-click safe remediation patches before deployment.

---

## 🚀 Key Features

* **Monaco Side-by-Side Diff Inspector**: Interactive split-diff viewer with raw git diff toggling for direct code inspection.
* **Hindsight Gate Check**: Analyzes diff semantics against institutional incident history in real time.
* **Risk & Financial Blast Radius Quantification**: Automatically models outage likelihood (e.g., `92% Outage Risk`) and financial impact (e.g., `$14,500/min downstream loss`).
* **1-Click Verified Safe Patching**: Injects architectural mitigation (e.g., token-bucket rate limiter) to drop risk scores down to 5% and approve pull requests safely.
* **Commit Architectural Memory**: Direct interface for senior engineers to retain new ADRs and incident rules into Hindsight Cloud without code redeployments.
* **Hindsight Memory Inspector**: Full visibility into stored operational post-mortems, trigger conditions, and failure patterns.
* **Conversational Root-Cause Forensics ("Ask AI")**: Interactive query agent powered by Groq LLaMA-3.3 for instant incident analysis.

---

## 🛠️ Architecture & Tech Stack

```text
[ Developer PR Diff ]
         │
         ▼
[ Next.js 15 Control Plane ] ──(REST API)──► [ FastAPI Backend ]
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
    [ Hindsight Episodic Memory ]                                            [ Groq LLaMA-3.3-70B ]
  - Recalls past outages (INC-2025-11-04)                                  - High-throughput reasoning
  - Maps architectural failure patterns                                    - Safe remediation synthesis
  - Calculates blast radius & confidence                                   - Root-cause forensics

Frontend: Next.js 15, TypeScript, Tailwind CSS, Monaco Editor, Lucide Icons

Backend: Python 3.11+, FastAPI, Uvicorn, Pydantic

AI & Memory: Hindsight Client API (Episodic Memory Bank), Groq Cloud API (LLaMA-3.3)

🏁 Quickstart & Local Setup
1. Prerequisites
Python 3.11+

Node.js 18+ & npm

Groq API Key & Hindsight Cloud API Key

2. Backend Setup

cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
Create a .env file inside backend/:

Code snippet
GROQ_API_KEY=your_groq_api_key
HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_HOST=[https://api.hindsight.vectorize.io](https://api.hindsight.vectorize.io)
Seed initial post-mortems and start the server:

Bash
python seed_memory.py
python main.py
Backend runs at http://127.0.0.1:8000.

3. Frontend Setup
In a separate terminal:

Bash
cd frontend
npm install
npm run dev
Frontend runs at http://localhost:3000.

🔗 Project Links
Technical Article: Dev.to Article

Demo Video: Google Drive Demo

GitHub Repository: laharipandey/Sentinel-Ops

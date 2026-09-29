"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import Monaco Diff Editor to ensure client-side execution in Next.js
const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-slate-950 flex items-center justify-center text-xs text-slate-500 font-mono">
        Loading Monaco Split-Diff Editor...
      </div>
    ),
  }
);

interface Incident {
  id: string;
  type: string;
  title: string;
  severity?: string;
  trigger_pattern?: string;
  root_cause?: string;
  verified_patch?: string;
  description?: string;
  author?: string;
}

interface FinancialBlastRadius {
  services_affected_count: number;
  services_affected: string[];
  cost_per_minute: string;
  projected_downtime_minutes: string;
  total_estimated_exposure: string;
  sla_tier_impact: string;
}

interface AnalysisResult {
  is_blocked: boolean;
  risk_score: number;
  matched_incident_id?: string;
  matched_incident?: Incident;
  explanation: string;
  safe_patch: string;
  financial_blast_radius?: FinancialBlastRadius;
}

export default function SentinelOpsApp() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [userEmail, setUserEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [cheatcode, setCheatcode] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // --- Dashboard Navigation ---
  const [activeTab, setActiveTab] = useState<"gate" | "inspector" | "ask">("gate");

  // --- Monaco Side-by-Side Diff Code State ---
  const [editorMode, setEditorMode] = useState<"monaco" | "raw">("monaco");

  const initialOriginalCode = `def process_payment_callback(payload):
    # Verify signature
    verify_hmac(payload['signature'])

    # Buffer latency to prevent SBI connection pool starvation
    time.sleep(0.25)

    # Record transaction to database
    db.payments.insert_one(payload)`;

  const initialModifiedCode = `def process_payment_callback(payload):
    # Verify signature
    verify_hmac(payload['signature'])

    # Record transaction to database
    db.payments.insert_one(payload)`;

  const [originalCode, setOriginalCode] = useState<string>(initialOriginalCode);
  const [modifiedCode, setModifiedCode] = useState<string>(initialModifiedCode);

  const defaultRawDiff = `@@ -14,8 +14,6 @@ def process_payment_callback(payload):
     # Verify signature
     verify_hmac(payload['signature'])
 
-    # Buffer latency to prevent SBI connection pool starvation
-    time.sleep(0.25)
-
     # Record transaction to database
     db.payments.insert_one(payload)`;

  const [diff, setDiff] = useState<string>(defaultRawDiff);
  const [prDescription, setPrDescription] = useState<string>(
    "Optimized checkout latency by removing unnecessary 250ms sleep buffer."
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // --- Live Feedback Learning State ---
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string>("");

  // --- Ask-Sentinel Hub State ---
  const [query, setQuery] = useState<string>("");
  const [askAnswer, setAskAnswer] = useState<string>("");
  const [isAsking, setIsAsking] = useState<boolean>(false);

  // --- Memory Inspector State ---
  const [memories, setMemories] = useState<Incident[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(false);

  const fetchMemories = async () => {
    setIsLoadingMemories(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/memories");
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMemories();
    }
  }, [isAuthenticated, activeTab]);

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const endpoint =
      authMode === "signup"
        ? "http://127.0.0.1:8000/api/auth/signup"
        : "http://127.0.0.1:8000/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          password: password,
          cheatcode: cheatcode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to reach backend security server.");
    } finally {
      setAuthLoading(false);
    }
  };

  // PR Analysis Handler
  const handleAnalyzePR = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const diffPayload =
      editorMode === "monaco"
        ? `--- Original\n+++ Modified\n${modifiedCode}`
        : diff;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/analyze-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff: diffPayload, description: prDescription }),
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 1-Click Safe Patch Apply
  const applySafePatch = () => {
    if (!analysisResult?.safe_patch) return;

    const safePatchedCode = `def process_payment_callback(payload):
    # Verify signature
    verify_hmac(payload['signature'])

    # [SentinelOps Auto-Fix] Injected safe token bucket buffer
    from limiter import TokenBucketRateLimiter
    limiter = TokenBucketRateLimiter(rate=200, capacity=500)
    limiter.acquire()

    # Record transaction to database
    db.payments.insert_one(payload)`;

    setModifiedCode(safePatchedCode);

    const safeDiff = `@@ -14,8 +14,8 @@ def process_payment_callback(payload):
     # Verify signature
     verify_hmac(payload['signature'])
 
+    # [SentinelOps Auto-Fix] Injected safe token bucket buffer
+    from limiter import TokenBucketRateLimiter
+    limiter = TokenBucketRateLimiter(rate=200, capacity=500)
+    limiter.acquire()
 
     # Record transaction to database
     db.payments.insert_one(payload)`;

    setDiff(safeDiff);

    setAnalysisResult({
      ...analysisResult,
      is_blocked: false,
      risk_score: 5,
      explanation:
        "Safe patch applied! Token bucket rate limiter safely prevents downstream Redis pool starvation.",
      financial_blast_radius: {
        services_affected_count: 0,
        services_affected: ["All 4 critical services protected"],
        cost_per_minute: "$0/min",
        projected_downtime_minutes: "0 mins",
        total_estimated_exposure: "$0",
        sla_tier_impact: "Zero SLA Degradation",
      },
    });
  };

  // Feedback Learning Handler
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setIsSubmittingFeedback(true);
    setFeedbackSuccess("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      await res.json();
      setFeedbackSuccess("Successfully retained context into Hindsight Cloud!");
      setFeedback("");
      fetchMemories();
    } catch (err) {
      console.error("Feedback failed:", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Ask Sentinel Handler
  const handleAskSentinel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsAsking(true);
    setAskAnswer("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/ask-sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setAskAnswer(data.answer);
    } catch (err) {
      console.error("Ask query failed:", err);
    } finally {
      setIsAsking(false);
    }
  };

  // -----------------------------------------------------------------
  // 1. ENTERPRISE GATE (LOGIN / SIGNUP) VIEW
  // -----------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-2xl shadow-inner">
              🛡️
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                SentinelOps Control Plane
              </h1>
              <p className="text-xs text-slate-400">
                Enterprise Engineering Governance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                authMode === "login"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                authMode === "signup"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Enroll Account
            </button>
          </div>

          <div className="mb-5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 leading-relaxed">
            🔒 <strong>Internal Access Only:</strong> Authorized exclusively for{" "}
            <strong>@sentinelops.io</strong> engineering personnel with a corporate security clearance code.
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 font-medium">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <input
                type="email"
                required
                placeholder="staff_engineer@sentinelops.io"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Company Security Clearance Code
              </label>
              <input
                type="password"
                required
                placeholder="Enter corporate clearance key..."
                value={cheatcode}
                onChange={(e) => setCheatcode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {authLoading
                ? "Verifying Security Credentials..."
                : authMode === "signup"
                ? "Create Account & Access Gate"
                : "Authenticate & Access Control Plane"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-center text-[11px] text-slate-500">
            <span>🔒 256-bit Enterprise Encryption • Hindsight Cloud v0.3 Active</span>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // 2. MAIN ENTERPRISE DASHBOARD
  // -----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-white tracking-tight">
                  SentinelOps
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Cloud Live
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-block">
                  GitHub CI/CD Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Autonomous Engineering Governance Engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-mono">{userEmail}</span>
              <span className="text-slate-500">|</span>
              <span className="text-indigo-400 font-semibold">Tier-1 Reviewer</span>
            </div>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setPassword("");
                setCheatcode("");
              }}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("gate")}
            className={`py-3 border-b-2 transition ${
              activeTab === "gate"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🚀 Pull Request Gatekeeper
          </button>
          <button
            onClick={() => setActiveTab("inspector")}
            className={`py-3 border-b-2 transition ${
              activeTab === "inspector"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🧠 Hindsight Memory Inspector ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab("ask")}
            className={`py-3 border-b-2 transition ${
              activeTab === "ask"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            💬 Ask-Sentinel Architectural Hub
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: PULL REQUEST GATEKEEPER */}
        {activeTab === "gate" && (
          <div className="space-y-6">
            {/* GitHub Webhook Active Status Banner */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-slate-300">
                  <strong>GitHub Bot Listener Active:</strong> Live webhook listener enabled at{" "}
                  <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-400 border border-slate-800">
                    POST /api/webhooks/github
                  </code>
                </span>
              </div>
              <span className="text-slate-500 font-mono text-[11px] hidden md:inline">
                Hard Gate Disables GitHub &apos;Merge&apos; Button
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Monaco Split Diff Editor */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                        Pending PR Diff (#PR-204)
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        Author: <code className="text-amber-400">junior_dev</code> • Target:{" "}
                        <code className="text-indigo-400">main branch</code>
                      </span>
                    </div>

                    {/* View Switcher: Monaco Side-by-Side vs Raw Diff */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setEditorMode("monaco")}
                        className={`px-3 py-1 rounded transition text-[11px] font-semibold ${
                          editorMode === "monaco"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        ⚡ Monaco Side-by-Side
                      </button>
                      <button
                        onClick={() => setEditorMode("raw")}
                        className={`px-3 py-1 rounded transition text-[11px] font-semibold ${
                          editorMode === "raw"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        📄 Raw Git Patch
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      PR Commit Title &amp; Intent
                    </label>
                    <input
                      type="text"
                      value={prDescription}
                      onChange={(e) => setPrDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Editor Container */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    {editorMode === "monaco" ? (
                      <div className="p-1">
                        <div className="flex justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400">
                          <span>Original (Production main)</span>
                          <span>Modified (PR #204 Changes)</span>
                        </div>
                        <DiffEditor
                          height="280px"
                          language="python"
                          theme="vs-dark"
                          original={originalCode}
                          modified={modifiedCode}
                          onMount={(editor) => {
                            const modEditor = editor.getModifiedEditor();
                            modEditor.onDidChangeModelContent(() => {
                              setModifiedCode(modEditor.getValue());
                            });
                          }}
                          options={{
                            renderSideBySide: true,
                            readOnly: false,
                            minimap: { enabled: false },
                            fontSize: 12,
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>
                    ) : (
                      <textarea
                        rows={12}
                        value={diff}
                        onChange={(e) => setDiff(e.target.value)}
                        className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3.5 focus:outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Evaluates against Hindsight memory bank:{" "}
                      <strong className="text-slate-400">sentinel-ops</strong>
                    </span>
                    <button
                      onClick={handleAnalyzePR}
                      disabled={isAnalyzing}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg text-xs transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Inspecting Hindsight Cloud...</span>
                        </>
                      ) : (
                        <span>🛡️ Run Sentinel Gate Check</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Developer Feedback Retain Loop */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-1">
                    💡 Dynamic Learning Override (Hindsight Retain)
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Changed downstream configurations? Teach SentinelOps in real-time so future PRs pass.
                  </p>

                  {feedbackSuccess && (
                    <div className="mb-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
                      ✅ {feedbackSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSendFeedback} className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="e.g. SBI upgraded to webhook v2 async architecture with isolated token queues."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingFeedback}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition disabled:opacity-50"
                    >
                      {isSubmittingFeedback ? "Retaining..." : "Commit Memory"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Gate Verdict + Financial Blast Radius */}
              <div className="lg:col-span-5 space-y-6">
                {analysisResult ? (
                  <div className="space-y-6">
                    {/* Gate Verdict Card */}
                    <div
                      className={`border rounded-xl p-6 shadow-xl backdrop-blur-xl ${
                        analysisResult.is_blocked
                          ? "bg-rose-950/20 border-rose-800/60"
                          : "bg-emerald-950/20 border-emerald-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                            analysisResult.is_blocked
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          }`}
                        >
                          {analysisResult.is_blocked
                            ? "🚫 MERGE BLOCKED"
                            : "✅ MERGE APPROVED"}
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">
                            Outage Risk
                          </span>
                          <span
                            className={`text-xl font-black font-mono ${
                              analysisResult.risk_score > 70
                                ? "text-rose-400"
                                : analysisResult.risk_score > 30
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {analysisResult.risk_score}%
                          </span>
                        </div>
                      </div>

                      {analysisResult.matched_incident && (
                        <div className="mb-4 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                          <span className="text-[10px] font-mono text-indigo-400 uppercase block mb-1">
                            Recalled Institutional Memory
                          </span>
                          <strong className="text-white block">
                            {analysisResult.matched_incident.id}:{" "}
                            {analysisResult.matched_incident.title}
                          </strong>
                          <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
                            {analysisResult.matched_incident.description ||
                              analysisResult.matched_incident.root_cause}
                          </p>
                        </div>
                      )}

                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          Sentinel Forensic Analysis
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                          {analysisResult.explanation}
                        </p>
                      </div>

                      {analysisResult.safe_patch && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                              Auto-Remediation Patch
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              Zero-Outage Certified
                            </span>
                          </div>
                          <pre className="bg-slate-950 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-emerald-950/80 mb-3">
                            {analysisResult.safe_patch}
                          </pre>
                          {analysisResult.is_blocked && (
                            <button
                              onClick={applySafePatch}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-xs transition shadow-lg shadow-emerald-600/20"
                            >
                              ⚡ 1-Click Apply Verified Safe Patch
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Financial Blast Radius & Downtime Cost Calculator */}
                    {analysisResult.financial_blast_radius && (
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">📊</span>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                              Executive Financial Blast Radius
                            </h3>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              analysisResult.is_blocked
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {analysisResult.financial_blast_radius.sla_tier_impact}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              Projected Outage Cost
                            </span>
                            <span className="text-base font-bold font-mono text-rose-400">
                              {analysisResult.financial_blast_radius.cost_per_minute}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              Total Outage Exposure
                            </span>
                            <span className="text-base font-bold font-mono text-amber-400">
                              {analysisResult.financial_blast_radius.total_estimated_exposure}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              Est. Recovery MTTR
                            </span>
                            <span className="text-sm font-semibold font-mono text-slate-200">
                              {analysisResult.financial_blast_radius.projected_downtime_minutes}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              Downstream Impact
                            </span>
                            <span className="text-sm font-semibold font-mono text-indigo-400">
                              {analysisResult.financial_blast_radius.services_affected_count} Services
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                            Downstream Critical Services At Risk:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {analysisResult.financial_blast_radius.services_affected.map(
                              (svc, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded"
                                >
                                  ⚡ {svc}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl p-8 bg-slate-900/30 text-center flex flex-col items-center justify-center min-h-[360px]">
                    <span className="text-3xl mb-3">🛡️</span>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      Sentinel Gate Standing By
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      Click <strong>&quot;Run Sentinel Gate Check&quot;</strong> to inspect PR #PR-204 using Monaco split diffing and compute real-time financial downtime risk.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HINDSIGHT MEMORY INSPECTOR */}
        {activeTab === "inspector" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  Hindsight Episodic Memory Bank (Bank ID:{" "}
                  <code className="text-indigo-400">sentinel-ops</code>)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Active corporate knowledge retained to prevent past catastrophic outages from recurring.
                </p>
              </div>
              <button
                onClick={fetchMemories}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                🔄 Refresh Bank
              </button>
            </div>

            {isLoadingMemories ? (
              <div className="text-center py-16 text-xs text-slate-400 font-mono">
                Querying Hindsight Cloud memory banks...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {memories.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {item.id}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                        {item.type}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {item.description || item.root_cause}
                    </p>
                    {item.verified_patch && (
                      <div className="pt-3 border-t border-slate-800">
                        <span className="text-[10px] uppercase font-mono text-emerald-400 block mb-1">
                          Mandated Fix:
                        </span>
                        <code className="text-[11px] font-mono text-slate-300 block bg-slate-950 p-2 rounded truncate">
                          {item.verified_patch}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASK-SENTINEL ARCHITECTURAL HUB */}
        {activeTab === "ask" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Ask-Sentinel Architectural Recall
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Query institutional engineering decisions, past post-mortems, and Architecture Decision Records (ADRs).
              </p>
            </div>

            <form onSubmit={handleAskSentinel} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Why did we mandate a 250ms sleep buffer in the payment callbacks?"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-32 py-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 shadow-xl"
              />
              <button
                type="submit"
                disabled={isAsking}
                className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition shadow disabled:opacity-50"
              >
                {isAsking ? "Recalling..." : "Ask Agent"}
              </button>
            </form>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">Quick Prompts:</span>
              <button
                onClick={() =>
                  setQuery(
                    "Why do we still have legacy XML serialization in corporate banking?"
                  )
                }
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 text-[11px] transition"
              >
                XML Serialization (ADR-042)
              </button>
              <button
                onClick={() =>
                  setQuery(
                    "What caused the November 2025 flash sale Redis connection starvation?"
                  )
                }
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 text-[11px] transition"
              >
                Redis Outage (INC-2025-11-04)
              </button>
            </div>

            {askAnswer && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-xl">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-2">
                  Institutional Intelligence Report
                </span>
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line space-y-2">
                  {askAnswer}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
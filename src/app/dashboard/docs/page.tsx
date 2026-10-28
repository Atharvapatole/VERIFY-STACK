"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { BookOpen, Terminal, ShieldCheck, Key } from "lucide-react";

export default function DashboardDocsPage() {
  const [activeTab, setActiveTab] = useState<"curl" | "typescript" | "python">("curl");

  const sendCurl = `curl -X POST https://api.verifystack.dev/api/v1/otp/send \\
  -H "Authorization: Bearer vs_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: req_982341908234" \\
  -d '{
    "phone": "+14155552671",
    "purpose": "login"
  }'`;

  const verifyCurl = `curl -X POST https://api.verifystack.dev/api/v1/otp/verify \\
  -H "Authorization: Bearer vs_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "challenge_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "code": "482019"
  }'`;

  const sendTs = `import fetch from "node-fetch";

const res = await fetch("https://api.verifystack.dev/api/v1/otp/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vs_live_YOUR_API_KEY",
    "Content-Type": "application/json",
    "Idempotency-Key": "client-uuid-" + Date.now(),
  },
  body: JSON.stringify({
    phone: "+14155552671",
    purpose: "login",
  }),
});

const data = await res.json();
console.log("Challenge ID:", data.challenge_id);`;

  const verifyTs = `const verifyRes = await fetch("https://api.verifystack.dev/api/v1/otp/verify", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vs_live_YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    challenge_id: challengeId,
    code: userSuppliedCode,
  }),
});

const result = await verifyRes.json();
if (result.verified) {
  // Sign user in safely
}`;

  const sendPy = `import requests

headers = {
    "Authorization": "Bearer vs_live_YOUR_API_KEY",
    "Content-Type": "application/json",
    "Idempotency-Key": "unique-request-id-12345",
}

payload = {
    "phone": "+14155552671",
    "purpose": "login",
}

response = requests.post(
    "https://api.verifystack.dev/api/v1/otp/send",
    headers=headers,
    json=payload,
)
data = response.json()
print("Challenge ID:", data.get("challenge_id"))`;

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Developer Quick Reference"
        description="Integrate Verify Stack OTP dispatch and verification into your application stack in minutes."
      />

      <div className="p-8 space-y-8 max-w-5xl">
        {/* Key Difference Notice */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <span className="font-mono text-emerald-400 font-bold block mb-1">vs_live_...</span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Dispatches real WhatsApp messages through your Meta Business Manager. Requires verified credentials and approved template.
            </p>
          </div>
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <span className="font-mono text-amber-400 font-bold block mb-1">vs_test_...</span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Operates in an isolated sandbox. No real WhatsApp messages are dispatched, and zero delivery charges are incurred.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <button
            onClick={() => setActiveTab("curl")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "curl"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            cURL / Shell
          </button>
          <button
            onClick={() => setActiveTab("typescript")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "typescript"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            TypeScript / Node.js
          </button>
          <button
            onClick={() => setActiveTab("python")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "python"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Python
          </button>
        </div>

        {/* Step 1: Send OTP */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">1. Request OTP Code Dispatch</h3>
          <p className="text-xs text-zinc-400">
            Generates a cryptographically random 6-digit OTP, records a keyed HMAC challenge, and sends the WhatsApp message.
          </p>
          <CodeBlock
            code={activeTab === "curl" ? sendCurl : activeTab === "typescript" ? sendTs : sendPy}
            language={activeTab}
            title={`POST /api/v1/otp/send (${activeTab})`}
          />
        </div>

        {/* Step 2: Verify OTP */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">2. Verify User Code</h3>
          <p className="text-xs text-zinc-400">
            Verifies the user-supplied 6-digit code in constant time with 5-attempt lockout and replay prevention.
          </p>
          <CodeBlock
            code={activeTab === "curl" ? verifyCurl : activeTab === "typescript" ? verifyTs : sendPy}
            language={activeTab}
            title={`POST /api/v1/otp/verify (${activeTab})`}
          />
        </div>
      </div>
    </div>
  );
}

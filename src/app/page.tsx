"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/ui/CodeBlock";
import {
  ShieldCheck,
  Terminal,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Server,
  DollarSign,
  HelpCircle,
  Cpu,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "typescript" | "python">("curl");

  const sendExampleCurl = `curl -X POST https://api.verifystack.dev/api/v1/otp/send \\
  -H "Authorization: Bearer vs_live_9f8e21a..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: req_c9812903810" \\
  -d '{
    "phone": "+14155552671",
    "purpose": "login"
  }'`;

  const verifyExampleCurl = `curl -X POST https://api.verifystack.dev/api/v1/otp/verify \\
  -H "Authorization: Bearer vs_live_9f8e21a..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "challenge_id": "83fb8b01-1b77-440f-90e1-4c55e9ba4cb8",
    "code": "729104"
  }'`;

  const tsExample = `// 1. Dispatch 6-Digit WhatsApp OTP
const challenge = await fetch("https://api.verifystack.dev/api/v1/otp/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vs_live_9f8e21a...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ phone: "+14155552671", purpose: "login" }),
}).then(r => r.json());

// 2. Verify User Code (Constant-time, 5-attempt lockout)
const result = await fetch("https://api.verifystack.dev/api/v1/otp/verify", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vs_live_9f8e21a...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    challenge_id: challenge.challenge_id,
    code: userInputCode,
  }),
}).then(r => r.json());

if (result.verified) {
  // Authentication verified
}`;

  const pyExample = `import requests

# 1. Dispatch OTP
res = requests.post(
    "https://api.verifystack.dev/api/v1/otp/send",
    headers={"Authorization": "Bearer vs_live_9f8e21a..."},
    json={"phone": "+14155552671", "purpose": "login"}
)
challenge_id = res.json()["challenge_id"]

# 2. Verify OTP
verify = requests.post(
    "https://api.verifystack.dev/api/v1/otp/verify",
    headers={"Authorization": "Bearer vs_live_9f8e21a..."},
    json={"challenge_id": challenge_id, "code": user_code}
)
print("Verified:", verify.json()["verified"])`;

  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36 border-b border-zinc-800/80">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-400 mb-8 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Meta WhatsApp Cloud API Infrastructure
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
              WhatsApp OTP Infrastructure <br />
              <span className="text-emerald-400">for Developers</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Connect your own Meta WhatsApp Business Account, issue API keys, and verify users with cryptographically secure one-time passwords.
              Zero platform markup. Full control over delivery and templates.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
              >
                Start in Sandbox (Free) <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs/quickstart"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-6 py-3 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
              >
                <Terminal className="h-4 w-4" /> View Quickstart
              </Link>
            </div>

            {/* Limitations Notice Pill */}
            <div className="mt-8 text-xs text-zinc-500 flex items-center justify-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span>WhatsApp OTP only. Live delivery is billed directly by Meta to your own WABA.</span>
            </div>
          </div>
        </section>

        {/* Interactive Code & Architecture Section */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Two REST Endpoints. Complete Lifecycle.
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl mx-auto">
              Send and verify OTPs with strict 5-attempt rate limits, constant-time HMAC validation, and automatic replay rejection.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Code Box */}
            <div className="rounded-xl border border-zinc-800 bg-[#0c0e12] p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Integration Snippet</span>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                  <button
                    onClick={() => setActiveCodeTab("curl")}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      activeCodeTab === "curl" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setActiveCodeTab("typescript")}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      activeCodeTab === "typescript" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setActiveCodeTab("python")}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      activeCodeTab === "python" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Python
                  </button>
                </div>
              </div>

              {activeCodeTab === "curl" ? (
                <>
                  <CodeBlock code={sendExampleCurl} language="bash" title="1. Send OTP Request" />
                  <CodeBlock code={verifyExampleCurl} language="bash" title="2. Verify Code Request" />
                </>
              ) : activeCodeTab === "typescript" ? (
                <CodeBlock code={tsExample} language="typescript" title="Complete Flow (TypeScript)" />
              ) : (
                <CodeBlock code={pyExample} language="python" title="Complete Flow (Python)" />
              )}
            </div>

            {/* Architecture Explanations */}
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <Lock className="h-4 w-4" />
                  <span>Keyed HMAC-SHA256 OTP Storage</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Numeric 6-digit codes have low entropy (000000–999999). An ordinary unkeyed hash can be cracked in milliseconds.
                  Verify Stack computes a keyed HMAC using a dedicated server-side secret, preventing rainbow table attacks even in the event of database disclosure.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>5-Attempt Lockout & Replay Prevention</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every challenge strictly locks out after 5 consecutive failed attempts. Once verified, the challenge is immediately and atomically invalidated
                  to prevent replay and concurrent verification race conditions.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <Cpu className="h-4 w-4" />
                  <span>AES-256-GCM Credential Encryption</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Meta System User Access Tokens and App Secrets are encrypted at rest with unique 96-bit nonces, 128-bit authentication tags, and key-version metadata.
                  Plaintext secrets are never returned over read APIs.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <Server className="h-4 w-4" />
                  <span>Persistent Distributed Rate Limiting</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Rate limiting runs on PostgreSQL token buckets with atomic operations across distributed serverless instances.
                  Protects per-phone, per-IP, and per-API-key boundaries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Real-World Cost Disclosures */}
        <section className="py-20 border-t border-zinc-800/80 bg-[#0c0e12]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Transparent Cost Structure
              </h2>
              <p className="mt-2 text-sm text-zinc-400 max-w-xl mx-auto">
                No middleman markups. Direct-to-Meta billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <Zap className="h-4 w-4" />
                  <span>Verify Stack Platform</span>
                </div>
                <div className="text-2xl font-bold text-white">$0 <span className="text-xs font-normal text-zinc-500">platform fee</span></div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  No monthly subscription or mandatory platform charge for the core software stack. Subject to hosting and infrastructure fair-use tiers.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <DollarSign className="h-4 w-4" />
                  <span>Meta WhatsApp Delivery</span>
                </div>
                <div className="text-2xl font-bold text-white">Billed by Meta</div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Meta bills authentication conversation charges directly to your Meta Business Manager. Pricing varies by destination country code and currency.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sandbox Testing</span>
                </div>
                <div className="text-2xl font-bold text-white">100% Free</div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Full simulation environment with <code className="text-amber-400 font-mono">vs_test_</code> keys. Test your end-to-end integration without sending real messages or paying Meta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 border-t border-zinc-800/80 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 space-y-2">
              <h3 className="text-sm font-semibold text-white">Does Verify Stack send SMS OTPs?</h3>
              <p className="text-zinc-400 leading-relaxed">
                No. Verify Stack is strictly built for the official Meta WhatsApp Business Platform/Cloud API. We do not provide or market SMS fallback or SMS aggregators.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 space-y-2">
              <h3 className="text-sm font-semibold text-white">Can I send arbitrary plain-text OTP messages?</h3>
              <p className="text-zinc-400 leading-relaxed">
                No. Outside of an active 24-hour customer service window, Meta strictly requires pre-approved Authentication Templates with a one-time password button or parameter. Verify Stack enforces compliant template formatting.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 space-y-2">
              <h3 className="text-sm font-semibold text-white">Does connecting Phone ID and WABA ID automatically grant sending permissions?</h3>
              <p className="text-zinc-400 leading-relaxed">
                No. A Phone Number ID and WABA ID alone do not grant access. You must generate a System User Access Token in your Meta Business Suite with the required permissions and register your webhook callback URL.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 space-y-2">
              <h3 className="text-sm font-semibold text-white">How does Sandbox mode differ from Live mode?</h3>
              <p className="text-zinc-400 leading-relaxed">
                Sandbox mode uses <code className="text-amber-400 font-mono">vs_test_</code> API keys. It performs the complete OTP lifecycle (expiry, hashing, lockout, rate limiting) without making outbound HTTP calls to Meta, so you never incur billing during automated tests.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

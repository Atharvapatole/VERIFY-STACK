import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/ui/CodeBlock";
import Link from "next/link";
import { Terminal, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function QuickstartPage() {
  const step2Code = `curl -X POST https://api.verifystack.dev/api/v1/otp/send \\
  -H "Authorization: Bearer vs_test_YOUR_TEST_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+14155552671",
    "purpose": "login"
  }'`;

  const step2Response = `{
  "challenge_id": "4b9e28f3-8b7a-4c2e-9d8e-1f2a3b4c5d6e",
  "status": "simulated",
  "phone_masked": "+1415****671",
  "expires_at": "2026-10-28T12:05:00.000Z",
  "is_sandbox": true,
  "sandbox_notice": "Simulated sandbox delivery: no Meta WhatsApp charge incurred.",
  "_test_code_for_sandbox_only": "489201"
}`;

  const step3Code = `curl -X POST https://api.verifystack.dev/api/v1/otp/verify \\
  -H "Authorization: Bearer vs_test_YOUR_TEST_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "challenge_id": "4b9e28f3-8b7a-4c2e-9d8e-1f2a3b4c5d6e",
    "code": "489201"
  }'`;

  const step3Response = `{
  "verified": true,
  "status": "verified",
  "challenge_id": "4b9e28f3-8b7a-4c2e-9d8e-1f2a3b4c5d6e"
}`;

  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <Link href="/docs" className="hover:underline">Docs</Link>
            <span>/</span>
            <span>Quickstart</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Quickstart: Send & Verify in 5 Minutes</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Follow this guide to issue an API key, request a simulated OTP challenge in Sandbox mode, and verify the user response.
          </p>
        </div>

        {/* Step 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">1</span>
            <h2>Create an Account & Obtain an API Key</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Sign up at <Link href="/signup" className="text-emerald-400 hover:underline">/signup</Link>. Verification is instant. Navigate to the <strong>API Keys</strong> tab in the dashboard and create a Test key (<code className="text-amber-400 font-mono">vs_test_...</code>). Copy the key token immediately.
          </p>
        </section>

        {/* Step 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">2</span>
            <h2>Dispatch a Verification OTP</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Make an authenticated POST request to <code className="text-zinc-300 font-mono">/api/v1/otp/send</code> with your recipient phone number in international E.164 format.
          </p>
          <CodeBlock code={step2Code} language="bash" title="Send Request (cURL)" />
          <CodeBlock code={step2Response} language="json" title="Response (Sandbox)" />
        </section>

        {/* Step 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">3</span>
            <h2>Verify the Code</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            When the user enters the 6-digit code in your app, send it alongside the <code className="text-zinc-300 font-mono">challenge_id</code> to <code className="text-zinc-300 font-mono">/api/v1/otp/verify</code>.
          </p>
          <CodeBlock code={step3Code} language="bash" title="Verify Request (cURL)" />
          <CodeBlock code={step3Response} language="json" title="Response" />
        </section>

        {/* Step 4 */}
        <section className="space-y-3 border-t border-zinc-800/80 pt-8">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">4</span>
            <h2>Transition to Live WhatsApp Delivery</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ready to send real messages to WhatsApp users? Follow these steps:
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
            <li>Open the <strong>Integrations</strong> tab in your dashboard.</li>
            <li>Connect your Meta WhatsApp Cloud API credentials (Phone Number ID, WABA ID, Permanent Access Token, and App Secret).</li>
            <li>Register your unique Verify Stack Webhook Callback URL in your Meta App Dashboard.</li>
            <li>Issue a live API key (<code className="text-emerald-400 font-mono">vs_live_...</code>). Live requests will now dispatch through your official Meta Business Account.</li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}

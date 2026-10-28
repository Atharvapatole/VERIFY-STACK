import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/ui/CodeBlock";
import Link from "next/link";
import { Terminal, Lock, Key, ShieldCheck, ArrowRight } from "lucide-react";

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <Link href="/docs" className="hover:underline">Docs</Link>
            <span>/</span>
            <span>API Reference</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Verify Stack REST API Reference</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            All endpoints require standard HTTP Bearer token authentication in the <code className="text-zinc-300 font-mono">Authorization</code> header.
          </p>
        </div>

        {/* Global Authentication Standard */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Lock className="h-4 w-4" />
            Authorization Header Specification
          </div>
          <div className="font-mono bg-zinc-950 p-2.5 rounded border border-zinc-800 text-zinc-300">
            Authorization: Bearer vs_live_YOUR_API_KEY
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Use <code className="text-emerald-400 font-mono">vs_live_...</code> for production WhatsApp delivery and <code className="text-amber-400 font-mono">vs_test_...</code> for isolated sandbox testing.
          </p>
        </div>

        {/* Endpoint 1: Send OTP */}
        <section className="space-y-4 border-t border-zinc-800/80 pt-8">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 font-mono">POST</span>
            <h2 className="text-base font-semibold text-white font-mono">/api/v1/otp/send</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Generates a cryptographically random 6-digit OTP, records a keyed HMAC challenge, and initiates message delivery.
          </p>

          <div className="text-xs space-y-2">
            <h3 className="font-semibold text-zinc-300">Request Headers</h3>
            <ul className="list-disc pl-5 text-zinc-400 space-y-1 font-mono">
              <li>Authorization: Bearer vs_... (Required)</li>
              <li>Content-Type: application/json (Required)</li>
              <li>Idempotency-Key: &lt;string&gt; (Optional, prevents duplicate sends on retries)</li>
            </ul>
          </div>

          <CodeBlock
            code={`{
  "phone": "+14155552671",
  "purpose": "login" // Allowed: "login", "signup", "password_reset", "transaction_verification", "account_update"
}`}
            language="json"
            title="Request Body Schema"
          />

          <CodeBlock
            code={`{
  "challenge_id": "83fb8b01-1b77-440f-90e1-4c55e9ba4cb8",
  "status": "accepted", // "accepted" | "simulated" | "queued"
  "phone_masked": "+1415****671",
  "expires_at": "2026-10-28T12:35:00.000Z",
  "is_sandbox": false
}`}
            language="json"
            title="Response (200 OK)"
          />
        </section>

        {/* Endpoint 2: Verify OTP */}
        <section className="space-y-4 border-t border-zinc-800/80 pt-8">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 font-mono">POST</span>
            <h2 className="text-base font-semibold text-white font-mono">/api/v1/otp/verify</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Verifies the user-entered 6-digit code in constant time. Enforces 5-attempt lockout, expiration checking, and atomic replay prevention.
          </p>

          <CodeBlock
            code={`{
  "challenge_id": "83fb8b01-1b77-440f-90e1-4c55e9ba4cb8",
  "code": "729104"
}`}
            language="json"
            title="Request Body Schema"
          />

          <CodeBlock
            code={`{
  "verified": true,
  "status": "verified",
  "challenge_id": "83fb8b01-1b77-440f-90e1-4c55e9ba4cb8"
}`}
            language="json"
            title="Response (200 OK)"
          />
        </section>

        {/* Endpoint 3: Usage */}
        <section className="space-y-4 border-t border-zinc-800/80 pt-8">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 font-mono">GET</span>
            <h2 className="text-base font-semibold text-white font-mono">/api/v1/usage</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Retrieves aggregate delivery and verification volume metrics for the owning project.
          </p>
        </section>

        {/* Endpoint 4: Logs */}
        <section className="space-y-4 border-t border-zinc-800/80 pt-8">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 font-mono">GET</span>
            <h2 className="text-base font-semibold text-white font-mono">/api/v1/logs</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Returns tenant-scoped challenge records with phone numbers masked. Supports <code className="text-zinc-300 font-mono">limit</code> and <code className="text-zinc-300 font-mono">status</code> query parameters.
          </p>
        </section>

        {/* Standard HTTP Status Codes */}
        <section className="space-y-3 border-t border-zinc-800/80 pt-8 text-xs">
          <h2 className="text-sm font-semibold text-white">HTTP Error Status Codes</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Status Code</th>
                  <th className="py-2.5 px-3">Error Code</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono text-[11px]">
                <tr>
                  <td className="py-2 px-3 text-amber-400">400 Bad Request</td>
                  <td className="py-2 px-3">INVALID_CODE</td>
                  <td className="py-2 px-3 font-sans">Supplied code does not match challenge.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-rose-400">401 Unauthorized</td>
                  <td className="py-2 px-3">INVALID_API_KEY</td>
                  <td className="py-2 px-3 font-sans">API key is missing, malformed, or revoked.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">403 Forbidden</td>
                  <td className="py-2 px-3">ENVIRONMENT_MISMATCH</td>
                  <td className="py-2 px-3 font-sans">Sandbox key used on live resource or vice versa.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">409 Conflict</td>
                  <td className="py-2 px-3">ALREADY_VERIFIED</td>
                  <td className="py-2 px-3 font-sans">Challenge was already verified (replay attack prevention).</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">410 Gone</td>
                  <td className="py-2 px-3">CHALLENGE_EXPIRED</td>
                  <td className="py-2 px-3 font-sans">Challenge exceeded 5-minute expiry window.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">429 Too Many Requests</td>
                  <td className="py-2 px-3">RATE_LIMITED / MAX_ATTEMPTS</td>
                  <td className="py-2 px-3 font-sans">Rate limit exceeded or 5-attempt verification lockout triggered.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-rose-400">502 Bad Gateway</td>
                  <td className="py-2 px-3">PROVIDER_DELIVERY_FAILED</td>
                  <td className="py-2 px-3 font-sans">Meta WhatsApp Cloud API rejected the outbound message.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

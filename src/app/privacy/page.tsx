import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-xs leading-relaxed text-zinc-300">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Privacy Policy</h1>
          <p className="text-zinc-500">Last updated: October 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">1. Overview & Data Ownership</h2>
          <p>
            Verify Stack is an infrastructure platform that facilitates developer access to the Meta WhatsApp Cloud API.
            You (the tenant) maintain full ownership of your customer data, phone numbers, and WhatsApp Business Account assets.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">2. Credential Encryption & Storage</h2>
          <p>
            Sensitive provider credentials, including Meta System User Permanent Access Tokens and Meta App Secrets, are encrypted at rest using AES-256-GCM.
            These credentials are decrypted only in memory during authenticated outbound API dispatch and webhook signature validation.
            Plaintext provider secrets are never stored in databases, never written to production logs, and never returned in read API responses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">3. Phone Number Masking & OTP Redaction</h2>
          <p>
            Recipient phone numbers are automatically redacted and masked in persistent delivery logs.
            One-time passwords (OTPs) are hashed using a keyed HMAC with a server-side secret before storage, and are never logged or exposed in analytics.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">4. Third-Party Sub-Processors</h2>
          <p>
            When live sending is activated, message payloads are transmitted securely via TLS 1.3 to Meta Platforms, Inc. (Meta WhatsApp Cloud API).
            Tenant authentication data is processed by Supabase PostgreSQL under strict Row Level Security policies.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

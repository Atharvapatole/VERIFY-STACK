import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-xs leading-relaxed text-zinc-300">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Terms of Service</h1>
          <p className="text-zinc-500">Last updated: October 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">1. Provision of Service</h2>
          <p>
            Verify Stack provides developer APIs for generating, dispatching, and verifying WhatsApp one-time passwords via your own connected Meta Business Account.
            You must be an authorized administrator of the WhatsApp Business Account and Meta Apps connected to the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">2. Meta Policies & Billing</h2>
          <p>
            You acknowledge that Meta Platforms, Inc. independently sets pricing, message delivery limits, quality ratings, and template approval criteria.
            Verify Stack does not subsidize message charges, bypass Meta billing, or provide phone number assets. You are solely responsible for all conversation charges billed to your Meta account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">3. API Key Security & Tenant Liability</h2>
          <p>
            You are responsible for securing all API keys issued to your projects. Any requests authenticated with your API key are deemed authorized by you.
            If an API key is compromised, you must immediately revoke or rotate it via the dashboard or REST API.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">4. Fair Use & Abuse Prevention</h2>
          <p>
            We reserve the right to throttle, suspend, or terminate access for any account engaging in unsolicited messaging, spam, OTP pumping fraud, or violations of Meta&apos;s Business Policies.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

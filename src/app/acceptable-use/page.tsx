import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-xs leading-relaxed text-zinc-300">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Acceptable Use Policy</h1>
          <p className="text-zinc-500">Last updated: October 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">1. Permitted Uses</h2>
          <p>
            Verify Stack is authorized exclusively for legitimate identity authentication, transaction authorization, multi-factor login verification,
            and authorized password resets requested directly by your end-users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">2. Prohibited Activities</h2>
          <p>The following activities are strictly prohibited:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
            <li>Unsolicited outbound promotional or marketing broadcasts.</li>
            <li>OTP pumping, toll fraud, or artificial traffic generation.</li>
            <li>Using unauthorized, spoofed, or stolen Meta Business Manager credentials.</li>
            <li>Circumventing Meta authentication template category guidelines.</li>
            <li>Automated high-frequency verification brute-forcing or dictionary attacks.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">3. Reporting Violations</h2>
          <p>
            If you suspect an API key or connected tenant is engaging in abusive dispatch behavior, contact our security operations team at <code className="text-emerald-400 font-mono">abuse@verifystack.dev</code>.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

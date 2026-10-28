import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Check, ShieldCheck, DollarSign, HelpCircle, ArrowRight } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-400 mb-4">
            Zero Vendor Markups
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Honest, Developer-First Pricing
          </h1>
          <p className="mt-4 text-base text-zinc-400 leading-relaxed">
            Verify Stack does not charge a mandatory platform fee for initial development and usage.
            You connect your own Meta WhatsApp Business Account and pay Meta directly at wholesale authentication rates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {/* Community / Self-Service Plan */}
          <div className="rounded-xl border border-emerald-500/30 bg-[#0f1117] p-8 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active Initial Model
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Verify Stack Platform</h3>
              <p className="text-xs text-zinc-400 mt-1">Core OTP lifecycle, key management & encryption.</p>

              <div className="my-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-xs text-zinc-500 ml-2">platform fee</span>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Sandbox simulated verification requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Connect your own Meta WhatsApp Cloud API credentials</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>AES-256-GCM authenticated credential encryption</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Keyed HMAC-SHA256 OTP security & 5-attempt lockout</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>High-entropy API key management (<code className="text-emerald-400 font-mono">vs_live_</code> / <code className="text-amber-400 font-mono">vs_test_</code>)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Persistent distributed rate limiting</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800">
              <Link
                href="/signup"
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
              >
                Get Started for Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Meta WhatsApp Delivery Charges */}
          <div className="rounded-xl border border-zinc-800 bg-[#0c0e12] p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Meta WhatsApp Delivery</h3>
              <p className="text-xs text-zinc-400 mt-1">Paid directly to Meta Platforms, Inc.</p>

              <div className="my-6">
                <span className="text-2xl font-bold text-zinc-200">Wholesale Meta Rates</span>
                <span className="text-xs text-zinc-500 block mt-1">Zero vendor markup added by Verify Stack</span>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Billed directly to your connected Meta Business Account</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Authentication template conversation pricing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Rates vary by country code (e.g. ~$0.005–$0.04 per delivery)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>You maintain 100% control over Meta payment methods</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>No message routing through shared third-party pools</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800 text-xs text-zinc-500">
              <p>Meta Cloud API requires an active credit card or line of credit in your Meta Business Suite.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { BookOpen, Terminal, ShieldCheck, Key, ArrowRight, PlugZap } from "lucide-react";

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Documentation</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
            Verify Stack Developer Guide
          </h1>
          <p className="mt-3 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Learn how to connect your Meta WhatsApp Cloud API integration, issue API keys, and implement secure two-step verification in your web and mobile applications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link
            href="/docs/quickstart"
            className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 hover:border-emerald-500/50 transition-colors group space-y-3"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
              <Terminal className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-white group-hover:text-emerald-400 flex items-center gap-1.5">
              Quickstart Guide <ArrowRight className="h-4 w-4" />
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Step-by-step instructions to create your first API key, send a sandbox OTP, and verify it in under 5 minutes.
            </p>
          </Link>

          <Link
            href="/docs/api"
            className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 hover:border-emerald-500/50 transition-colors group space-y-3"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-white group-hover:text-emerald-400 flex items-center gap-1.5">
              REST API Reference <ArrowRight className="h-4 w-4" />
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Complete specification for <code className="text-zinc-300 font-mono">/api/v1/otp/send</code> and <code className="text-zinc-300 font-mono">/api/v1/otp/verify</code> with copyable curl, TypeScript, and Python snippets.
            </p>
          </Link>
        </div>

        {/* Core Architecture Concepts */}
        <div className="space-y-6 border-t border-zinc-800/80 pt-10">
          <h2 className="text-xl font-bold text-white">Key Architectural Concepts</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-5 rounded-xl border border-zinc-800 bg-[#0c0e12] space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Keyed HMAC Security
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Because 6-digit numeric OTPs have low entropy, Verify Stack computes a keyed HMAC using a server-side secret before storing challenge records in PostgreSQL.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-800 bg-[#0c0e12] space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <PlugZap className="h-4 w-4 text-emerald-400" />
                Tenant Own-WABA Model
              </div>
              <p className="text-zinc-400 leading-relaxed">
                You bring your own Meta Cloud API credentials. Verify Stack never routes customer traffic through shared phone numbers, preventing account bans or shared rate-limit depletion.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-800 bg-[#0c0e12] space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-emerald-400" />
                Prefix-Indexed Keys
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Keys use distinct prefixes (<code className="text-emerald-400 font-mono">vs_live_</code> vs <code className="text-amber-400 font-mono">vs_test_</code>) to enforce sandbox isolation at the API gateway layer.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

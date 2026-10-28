"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push("/platform-admin");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during admin authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0d] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-amber-500/20 selection:text-amber-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-500/60 transition-colors">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Verify Stack</span>
        </Link>
        <div className="inline-block px-2.5 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-[11px] font-mono text-amber-400 mb-2">
          RESTRICTED PORTAL
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-white">Platform Administration</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Sign in with authorized administrator credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />

          {errorMsg && (
            <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Administrator Email / User ID
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-white focus:border-amber-500 focus:outline-none placeholder-zinc-600 font-mono text-xs"
                  placeholder="admin@verifystack.dev"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-10 py-2 text-white focus:border-amber-500 focus:outline-none placeholder-zinc-600 text-xs"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-sm shadow-amber-500/20"
              >
                {loading ? "Authenticating..." : "Authorize Admin Access"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-zinc-800/80 pt-4 flex items-center justify-between text-xs text-zinc-500">
            <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200">
              ← Return to Developer Dashboard
            </Link>
            <div className="flex items-center gap-1 text-[11px] text-zinc-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>TLS Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

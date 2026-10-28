"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Lock, Mail, User, AlertCircle, Info } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      // Auto sign-in or redirect to login
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login?notice=account_created");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0d] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Verify Stack</span>
        </Link>
        <h2 className="text-xl font-semibold tracking-tight text-white">Create your developer account</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Immediate access. No mandatory signup email confirmation required.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Security Disclosure Notice */}
        <div className="mb-4 rounded-xl border border-zinc-800 bg-[#0f1117] p-3 text-xs text-zinc-400 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-zinc-200">Immediate Activation:</strong> Accounts are instantly activated to maximize developer setup velocity. Supabase project settings have email confirmation disabled for this flow.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Full Name</label>
              <div className="relative">
                <User className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
                  placeholder="Ada Lovelace"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Email address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
                  placeholder="developer@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20"
              >
                {loading ? "Creating Account..." : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center text-xs text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

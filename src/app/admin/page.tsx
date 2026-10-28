"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Users,
  Activity,
  AlertTriangle,
  Search,
  Lock,
  CheckCircle2,
  Ban,
  RotateCcw,
  Sliders,
} from "lucide-react";

export default function PlatformAdminPage() {
  const [searchEmail, setSearchEmail] = useState("");
  const [accounts, setAccounts] = useState([
    {
      id: "usr_10293848",
      email: "tenant.alpha@company.com",
      fullName: "Alpha Operations",
      status: "active",
      totalSends: 1420,
      createdAt: "2026-09-12",
    },
    {
      id: "usr_59382019",
      email: "security.lead@fintech.io",
      fullName: "Fintech Auth Team",
      status: "active",
      totalSends: 8940,
      createdAt: "2026-10-01",
    },
    {
      id: "usr_99281726",
      email: "suspicious.sender@domain.xyz",
      fullName: "Suspicious Tenant",
      status: "suspended",
      totalSends: 45,
      createdAt: "2026-10-25",
    },
  ]);

  const [abuseReports] = useState([
    {
      id: "rep-01",
      reportedProject: "Suspicious Tenant (usr_99281726)",
      reason: "Potential high-frequency OTP spray targeting invalid number range.",
      status: "resolved",
      timestamp: "2026-10-26 14:22",
    },
  ]);

  const toggleAccountStatus = (id: string) => {
    setAccounts(
      accounts.map((a) => {
        if (a.id === id) {
          const next = a.status === "active" ? "suspended" : "active";
          return { ...a, status: next };
        }
        return a;
      })
    );
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
      a.fullName.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col">
      {/* Admin Header */}
      <header className="h-16 border-b border-zinc-800 bg-[#0c0e12] px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Platform Administration</h1>
            <span className="text-[10px] text-zinc-500">Security & Multi-Tenant Oversight</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Security Notice */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-4 text-xs text-zinc-400 flex items-start gap-3">
          <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Admin Zero-Knowledge Policy:</strong> Platform administrators cannot view stored plaintext Meta Access Tokens or App Secrets. Administrative actions are logged to the tamper-evident audit log.
          </p>
        </div>

        {/* System Health Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>System Health</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400">100% Operational</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Graph API v22.0 active</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Managed Tenants</span>
              <Users className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-xl font-bold text-white">{accounts.length} Accounts</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Active across all regions</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Abuse Flags</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400">{abuseReports.length} Reviewed</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">0 pending resolution</span>
          </div>
        </div>

        {/* Account Oversight */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-white">Multi-Tenant Account Management</h3>
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search tenant or email..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-zinc-400 border-b border-zinc-800 pb-2 bg-zinc-900/30">
                <tr>
                  <th className="py-2.5 px-3">Tenant</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Dispatched OTPs</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-zinc-800/20">
                    <td className="py-3 px-3 font-medium text-white">{acc.fullName}</td>
                    <td className="py-3 px-3 text-zinc-400">{acc.email}</td>
                    <td className="py-3 px-3 font-mono">{acc.totalSends}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          acc.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => toggleAccountStatus(acc.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          acc.status === "active"
                            ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                        }`}
                      >
                        {acc.status === "active" ? (
                          <>
                            <Ban className="h-3 w-3" /> Suspend
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3" /> Restore
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Abuse Reports Section */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-3 text-xs">
          <h3 className="text-sm font-semibold text-white">Abuse & High-Frequency Spike Reports</h3>
          <div className="space-y-2">
            {abuseReports.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">{r.reportedProject}</span>
                  <span className="text-zinc-400 text-[11px]">{r.reason}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

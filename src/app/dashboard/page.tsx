"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/Header";
import {
  ShieldCheck,
  SendHorizontal,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Key,
  PlugZap,
  Clock,
  Sparkles,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSends: 0,
    totalVerifications: 0,
    failedSends: 0,
    activeIntegrations: 0,
    activeKeys: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [setupStep, setSetupStep] = useState(2); // Progress state

  useEffect(() => {
    // Load local metrics from usage/logs endpoints
    async function loadData() {
      try {
        const res = await fetch("/api/v1/logs?limit=5");
        if (res.ok) {
          const data = await res.json();
          setRecentLogs(data.logs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Infrastructure Overview"
        description="Monitor WhatsApp OTP challenges, delivery health, and provider integrations."
      />

      <div className="p-8 space-y-8 max-w-7xl">
        {/* Onboarding Checklist Card */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Integration Setup Progress</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Complete the checklist below to transition from Sandbox simulator to live Meta Cloud delivery.
              </p>
            </div>
            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Configure WhatsApp <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> 1. Project
              </div>
              <span className="text-[11px] text-zinc-400">Default project initialized</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> 2. Credentials
              </div>
              <span className="text-[11px] text-zinc-500">Add WABA & Phone ID</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium mb-1">
                <span className="h-2 w-2 rounded-full bg-zinc-700" /> 3. Webhook URL
              </div>
              <span className="text-[11px] text-zinc-500">Register in Meta app</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium mb-1">
                <span className="h-2 w-2 rounded-full bg-zinc-700" /> 4. Verify Token
              </div>
              <span className="text-[11px] text-zinc-500">Pass GET challenge</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium mb-1">
                <span className="h-2 w-2 rounded-full bg-zinc-700" /> 5. Test Send
              </div>
              <span className="text-[11px] text-zinc-500">Dispatch test OTP</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium mb-1">
                <span className="h-2 w-2 rounded-full bg-zinc-700" /> 6. Live Ready
              </div>
              <span className="text-[11px] text-zinc-500">Production traffic</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
              <span>Total Dispatched</span>
              <SendHorizontal className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.totalSends}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Live & Sandbox attempts</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
              <span>Verified OTPs</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.totalVerifications}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Successful validations</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
              <span>Failed / Expired</span>
              <AlertCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.failedSends}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Provider rejections & lockouts</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
              <span>Active Environment</span>
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">Sandbox / Live</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Hybrid routing ready</span>
          </div>
        </div>

        {/* Action Shortcuts & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Developer Shortcuts</h3>
            <div className="space-y-2">
              <Link
                href="/dashboard/test-message"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors text-xs text-zinc-300"
              >
                <div className="flex items-center gap-2.5">
                  <SendHorizontal className="h-4 w-4 text-emerald-400" />
                  <span>Send Test OTP Code</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </Link>

              <Link
                href="/dashboard/api-keys"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors text-xs text-zinc-300"
              >
                <div className="flex items-center gap-2.5">
                  <Key className="h-4 w-4 text-emerald-400" />
                  <span>Manage API Keys</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </Link>

              <Link
                href="/dashboard/integrations"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors text-xs text-zinc-300"
              >
                <div className="flex items-center gap-2.5">
                  <PlugZap className="h-4 w-4 text-emerald-400" />
                  <span>Connect WhatsApp Account</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </Link>

              <Link
                href="/dashboard/docs"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors text-xs text-zinc-300"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>View Code Examples</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </Link>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-[#0f1117] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Recent OTP Verification Requests</h3>
              <Link href="/dashboard/logs" className="text-xs text-emerald-400 hover:text-emerald-300">
                View all logs →
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <SendHorizontal className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                <p>No OTP challenges dispatched yet.</p>
                <p className="text-zinc-600 mt-1">Use the Test Message console or dispatch an OTP via API.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 border-b border-zinc-800 pb-2">
                    <tr>
                      <th className="py-2">Phone (Masked)</th>
                      <th className="py-2">Purpose</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Mode</th>
                      <th className="py-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 font-mono">{log.phone_masked}</td>
                        <td className="py-2.5 capitalize">{log.purpose}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              log.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : log.status === "failed"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {log.is_sandbox ? (
                            <span className="text-amber-400 text-[11px]">Sandbox</span>
                          ) : (
                            <span className="text-emerald-400 text-[11px]">Live</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-zinc-500">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

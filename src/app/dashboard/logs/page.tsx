"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import { ListTree, Search, Filter, ShieldCheck, AlertCircle } from "lucide-react";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchPhone, setSearchPhone] = useState<string>("");

  useEffect(() => {
    async function loadLogs() {
      try {
        const url = filterStatus
          ? `/api/v1/logs?status=${filterStatus}`
          : "/api/v1/logs";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [filterStatus]);

  const filteredLogs = logs.filter((item) => {
    if (searchPhone && !item.phone_masked.includes(searchPhone)) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Audit & OTP Delivery Logs"
        description="Inspect tamper-evident verification challenge records with encrypted identity masking."
      />

      <div className="p-8 space-y-6 max-w-7xl">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Search masked phone..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-[#0f1117] text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none w-56 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Filter className="h-4 w-4 text-zinc-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-[#0f1117] px-3 py-1.5 text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed / Locked</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <span className="text-xs text-zinc-500">
            {filteredLogs.length} challenge records displayed
          </span>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Challenge ID</th>
                <th className="py-3 px-4">Destination (Masked)</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-sans">
                    No matching challenge records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-4 text-zinc-400">{log.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4 text-white font-medium">{log.phone_masked}</td>
                    <td className="py-3 px-4 font-sans capitalize">{log.purpose}</td>
                    <td className="py-3 px-4 font-sans">
                      {log.is_sandbox ? (
                        <span className="text-amber-400 text-[11px]">Sandbox</span>
                      ) : (
                        <span className="text-emerald-400 text-[11px]">Live</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.attempts} / {log.max_attempts}
                    </td>
                    <td className="py-3 px-4 font-sans">
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
                    <td className="py-3 px-4 text-right text-zinc-500 font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

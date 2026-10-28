"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import { BarChart3, SendHorizontal, CheckCircle2, ShieldAlert, DollarSign, Info } from "lucide-react";

export default function UsagePage() {
  const [summary, setSummary] = useState({
    total_sends: 0,
    total_verifications: 0,
    live_sends: 0,
    sandbox_sends: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch("/api/v1/usage");
        if (res.ok) {
          const data = await res.json();
          if (data.summary) {
            setSummary(data.summary);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Usage & Analytics"
        description="Inspect OTP delivery volumes, validation conversion rates, and live vs sandbox message accounting."
      />

      <div className="p-8 space-y-8 max-w-7xl">
        {/* Cost & Transparency Notice */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <DollarSign className="h-4 w-4" />
            Transparent Pricing Model: Zero Platform Markup
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Verify Stack does not charge a mandatory platform fee for initial development and usage.
            When sending live OTPs, you pay Meta directly based on WhatsApp Cloud API Authentication template rates for your recipient countries.
            Sandbox simulated messages are 100% free and incur zero delivery charges.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <span className="text-xs text-zinc-400 block mb-2">Total OTP Challenges</span>
            <div className="text-2xl font-bold text-white tracking-tight">{summary.total_sends}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">All dispatch requests</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <span className="text-xs text-zinc-400 block mb-2">Live WhatsApp Sends</span>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">{summary.live_sends}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Meta Cloud API billable</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <span className="text-xs text-zinc-400 block mb-2">Sandbox Simulations</span>
            <div className="text-2xl font-bold text-amber-400 tracking-tight">{summary.sandbox_sends}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Zero cost mock tests</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
            <span className="text-xs text-zinc-400 block mb-2">Successful Verifications</span>
            <div className="text-2xl font-bold text-white tracking-tight">{summary.total_verifications}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">
              {summary.total_sends > 0
                ? `${Math.round((summary.total_verifications / summary.total_sends) * 100)}% Conversion`
                : "Awaiting traffic"}
            </span>
          </div>
        </div>

        {/* Visual Breakdown Card */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Delivery Mode Allocation</h3>
          <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden flex">
            <div
              style={{
                width: `${summary.total_sends > 0 ? (summary.live_sends / summary.total_sends) * 100 : 50}%`,
              }}
              className="bg-emerald-500 h-full"
            />
            <div
              style={{
                width: `${summary.total_sends > 0 ? (summary.sandbox_sends / summary.total_sends) * 100 : 50}%`,
              }}
              className="bg-amber-500 h-full"
            />
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Live Meta Delivery ({summary.live_sends})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Sandbox Simulated ({summary.sandbox_sends})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

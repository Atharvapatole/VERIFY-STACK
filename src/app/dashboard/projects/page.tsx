"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import { Layers, Plus, CheckCircle2, Shield, Calendar } from "lucide-react";

export default function ProjectsPage() {
  const [projects] = useState([
    {
      id: "default-project",
      name: "Default Project",
      slug: "default",
      is_default: true,
      created_at: new Date().toISOString(),
      integrations_count: 1,
      api_keys_count: 2,
    },
  ]);

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Project Management"
        description="Organize your WhatsApp integrations, API keys, and OTP logs into isolated multi-tenant workspaces."
      />

      <div className="p-8 space-y-8 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Your Projects</h2>
            <p className="text-xs text-zinc-400">All data and rate limits are strictly isolated per project.</p>
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div key={proj.id} className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{proj.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">slug: {proj.slug}</span>
                  </div>
                </div>
                {proj.is_default && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Default
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/60">
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 block">Integrations</span>
                  <span className="font-semibold text-white">{proj.integrations_count} Active</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 block">API Keys</span>
                  <span className="font-semibold text-white">{proj.api_keys_count} Active</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Created {new Date(proj.created_at).toLocaleDateString()}
                </span>
                <span className="text-emerald-400 font-medium">Selected</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

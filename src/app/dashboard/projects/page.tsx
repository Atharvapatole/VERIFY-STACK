"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import { Layers, Plus, CheckCircle2, Shield, Calendar, AlertCircle } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
  created_at: string;
  integrations_count?: number;
  api_keys_count?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/dashboard/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/dashboard/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setProjectName("");
      setShowModal(false);
      fetchProjects();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred creating the project");
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={() => {
              setErrorMsg(null);
              setProjectName("");
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading your projects...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-8 text-center text-xs">
            <Layers className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="font-semibold text-white mb-1">No Projects Found</h3>
            <p className="text-zinc-500 mb-4">Create your first project to start connecting WhatsApp integrations.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> Create Project
            </button>
          </div>
        ) : (
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

                <div className="text-[11px] text-zinc-500 font-mono bg-zinc-950 p-2 rounded border border-zinc-800/80 break-all select-all">
                  ID: {proj.id}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Created {new Date(proj.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Project */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#0f1117] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Create New Project</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-zinc-400 hover:text-white text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. Production Mobile App"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    A unique workspace slug will be generated automatically.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !projectName.trim()}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

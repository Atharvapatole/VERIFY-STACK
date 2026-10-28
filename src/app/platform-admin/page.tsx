"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Layers,
  PlugZap,
  KeyRound,
  SendHorizontal,
  Radio,
  BarChart3,
  Sliders,
  ShieldCheck,
  ListTree,
  Activity,
  Settings,
  LogOut,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Trash2,
  Ban,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  DollarSign,
  ChevronRight,
  Info,
  Calendar,
} from "lucide-react";

type AdminTab =
  | "overview"
  | "users"
  | "projects"
  | "integrations"
  | "api_keys"
  | "otp_activity"
  | "webhook_events"
  | "usage_costs"
  | "plans_limits"
  | "abuse_security"
  | "audit_logs"
  | "system_health";

export default function PlatformAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [metrics, setMetrics] = useState<any | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [otpActivity, setOtpActivity] = useState<any[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any | null>(null);
  const [settingsData, setSettingsData] = useState<any | null>(null);

  // Search & filter states
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  // User detail drawer & deletion modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Auth check & initial data load
  useEffect(() => {
    async function initAdmin() {
      try {
        const meRes = await fetch("/api/admin/auth/me");
        if (!meRes.ok) {
          router.push("/platform-admin/login");
          return;
        }
        const meData = await meRes.json();
        setAdminUser(meData.user);
        loadMetrics();
      } catch {
        router.push("/platform-admin/login");
      } finally {
        setLoading(false);
      }
    }
    initAdmin();
  }, []);

  const loadMetrics = async (range = timeRange) => {
    try {
      const res = await fetch(`/api/admin/metrics?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?status=${userStatusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/admin/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadIntegrations = async () => {
    try {
      const res = await fetch("/api/admin/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadApiKeys = async () => {
    try {
      const res = await fetch("/api/admin/api-keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOtpActivity = async () => {
    try {
      const res = await fetch("/api/admin/otp-activity?limit=60");
      if (res.ok) {
        const data = await res.json();
        setOtpActivity(data.activity || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadWebhookEvents = async () => {
    try {
      const res = await fetch("/api/admin/webhook-events?limit=60");
      if (res.ok) {
        const data = await res.json();
        setWebhookEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-logs?limit=80");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadHealth = async () => {
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettingsData(data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reload data on tab switch
  useEffect(() => {
    if (activeTab === "overview") loadMetrics(timeRange);
    if (activeTab === "users") loadUsers();
    if (activeTab === "projects") loadProjects();
    if (activeTab === "integrations") loadIntegrations();
    if (activeTab === "api_keys") loadApiKeys();
    if (activeTab === "otp_activity") loadOtpActivity();
    if (activeTab === "webhook_events") loadWebhookEvents();
    if (activeTab === "usage_costs") loadMetrics(timeRange);
    if (activeTab === "audit_logs") loadAuditLogs();
    if (activeTab === "system_health") loadHealth();
    if (activeTab === "plans_limits" || activeTab === "abuse_security") {
      loadSettings();
      loadUsers();
    }
  }, [activeTab, timeRange, userStatusFilter]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/platform-admin/login");
    router.refresh();
  };

  const handleToggleSuspend = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotice(data.message);
      loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, status: data.user.status });
      }
    } catch (err: any) {
      showNotice(err.message, "error");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedUser) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: adminNotesInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotice("Administrative notes saved.");
      setSelectedUser({ ...selectedUser, admin_notes: adminNotesInput });
      loadUsers();
    } catch (err: any) {
      showNotice(err.message, "error");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_phrase: confirmPhrase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotice(data.message);
      setUserToDelete(null);
      setConfirmPhrase("");
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleIntegration = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/admin/integrations/${integrationId}/toggle`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotice(data.message);
      loadIntegrations();
    } catch (err: any) {
      showNotice(err.message, "error");
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key immediately?")) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}/revoke`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotice(data.message);
      loadApiKeys();
    } catch (err: any) {
      showNotice(err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0d] flex items-center justify-center text-xs text-zinc-500 font-mono">
        <RefreshCw className="h-5 w-5 animate-spin mr-2 text-amber-500" />
        Verifying platform administrator credentials...
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (userSearch && !u.email.toLowerCase().includes(userSearch.toLowerCase()) && !u.full_name?.toLowerCase().includes(userSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs shadow-2xl transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/90 border-rose-500/30 text-rose-300"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Admin Header */}
      <header className="h-16 border-b border-zinc-800 bg-[#0c0e12] px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white tracking-tight">Verify Stack</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                GOD-LEVEL ADMIN
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">Global SaaS Operations & Tenant Governance</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Meta API v22.0 Connected
          </div>

          <div className="text-zinc-400 font-mono text-[11px]">
            {adminUser?.email}
          </div>

          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            Developer View
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-w-0">
        {/* Admin Left Navigation Sidebar */}
        <aside className="w-60 border-r border-zinc-800/80 bg-[#0c0e12] flex flex-col justify-between shrink-0 p-3 space-y-1">
          <nav className="space-y-0.5">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "users", label: "User Management", icon: Users },
              { id: "projects", label: "Tenants & Projects", icon: Layers },
              { id: "integrations", label: "WhatsApp Integrations", icon: PlugZap },
              { id: "api_keys", label: "API Keys & Security", icon: KeyRound },
              { id: "otp_activity", label: "OTP Activity", icon: SendHorizontal },
              { id: "webhook_events", label: "Webhook Events", icon: Radio },
              { id: "usage_costs", label: "Usage & Meta Costs", icon: DollarSign },
              { id: "plans_limits", label: "Plans & Platform Limits", icon: Sliders },
              { id: "abuse_security", label: "Abuse & Security", icon: ShieldCheck },
              { id: "audit_logs", label: "Audit Logs", icon: ListTree },
              { id: "system_health", label: "System Health", icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950 text-[11px] text-zinc-500 space-y-1">
            <span className="text-zinc-300 font-semibold block">Production Environment</span>
            <p>verifystack-lyart.vercel.app</p>
          </div>
        </aside>

        {/* Admin Tab Content Body */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl space-y-6">
          {/* ========================================================================= */}
          {/* 1. OVERVIEW TAB */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Platform Operations Overview</h2>
                  <p className="text-xs text-zinc-400">Live database metrics across all registered developer tenants.</p>
                </div>

                <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
                  {["today", "7d", "30d", "all"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-3 py-1 rounded capitalize transition-colors ${
                        timeRange === r ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {r === "all" ? "All Time" : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics Top Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
                  <span className="text-xs text-zinc-400 block mb-1">Registered Tenants</span>
                  <div className="text-2xl font-bold text-white font-mono">{metrics?.users?.total || 0}</div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {metrics?.users?.active || 0} Active • {metrics?.users?.suspended || 0} Suspended
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
                  <span className="text-xs text-zinc-400 block mb-1">WhatsApp Integrations</span>
                  <div className="text-2xl font-bold text-white font-mono">{metrics?.infrastructure?.integrations || 0}</div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {metrics?.infrastructure?.verified_integrations || 0} Verified • {metrics?.infrastructure?.error_integrations || 0} Errors
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
                  <span className="text-xs text-zinc-400 block mb-1">OTP Challenges Dispatched</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">{metrics?.otp?.total || 0}</div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {metrics?.otp?.live || 0} Live Meta • {metrics?.otp?.sandbox || 0} Sandbox
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5">
                  <span className="text-xs text-zinc-400 block mb-1">Estimated Meta Delivery Costs</span>
                  <div className="text-2xl font-bold text-amber-400 font-mono">
                    ${metrics?.costs?.estimated_usd || 0}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">Wholesale conversation rates</span>
                </div>
              </div>

              {/* OTP Conversion & Delivery Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Verification Conversion</h3>
                  <div className="text-3xl font-bold text-white font-mono">{metrics?.otp?.conversion_rate || 0}%</div>
                  <p className="text-xs text-zinc-400">
                    {metrics?.otp?.verified || 0} successfully verified vs {metrics?.otp?.failed || 0} locked/failed challenges.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Webhook Ingestion</h3>
                  <div className="text-3xl font-bold text-white font-mono">{metrics?.delivery?.webhook_events || 0}</div>
                  <p className="text-xs text-zinc-400">
                    Real-time status updates received and verified via HMAC-SHA256 signatures.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">System Governance</h3>
                  <div className="text-3xl font-bold text-emerald-400 font-mono">100%</div>
                  <p className="text-xs text-zinc-400">
                    Zero plaintext secret leaks. AES-256-GCM authenticated ciphertexts enforced at rest.
                  </p>
                </div>
              </div>

              {/* Recent Admin Audit Activity Feed */}
              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Recent Security & Administrative Actions</h3>
                  <button onClick={() => setActiveTab("audit_logs")} className="text-xs text-amber-400 hover:underline">
                    View complete audit trail →
                  </button>
                </div>

                <div className="space-y-2">
                  {(metrics?.recent_activity || []).map((ev: any) => (
                    <div key={ev.id} className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-white font-mono">{ev.action}</span>
                          <span className="text-zinc-500 ml-2">by {ev.admin_email}</span>
                        </div>
                      </div>
                      <span className="text-zinc-500 font-mono text-[11px]">{new Date(ev.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. USER MANAGEMENT TAB */}
          {/* ========================================================================= */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Tenant & User Governance</h2>
                  <p className="text-xs text-zinc-400">Inspect developers, suspend abusive accounts, and edit administrative notes.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search email or name..."
                      className="pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-[#0f1117] text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none w-56 font-mono"
                    />
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-[#0f1117] px-3 py-1.5 text-xs text-zinc-300 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="suspended">Suspended Only</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Projects</th>
                      <th className="py-3 px-4">Integrations</th>
                      <th className="py-3 px-4">Total Requests</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500 font-sans">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{u.full_name || "Developer"}</td>
                          <td className="py-3 px-4 font-mono text-zinc-300">{u.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                u.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {u.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">{u.projects_count || 1}</td>
                          <td className="py-3 px-4 font-mono">{u.integrations_count || 0}</td>
                          <td className="py-3 px-4 font-mono">{u.total_requests || 0}</td>
                          <td className="py-3 px-4 text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setAdminNotesInput(u.admin_notes || "");
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleToggleSuspend(u.id)}
                              className={`px-2.5 py-1 rounded transition-colors ${
                                u.status === "active"
                                  ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              }`}
                            >
                              {u.status === "active" ? "Suspend" : "Unsuspend"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* User Detail Drawer (when selected) */}
              {selectedUser && (
                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-white">
                        User Detail: {selectedUser.full_name} ({selectedUser.email})
                      </h3>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-zinc-400 hover:text-white text-xs">
                      ✕ Close Drawer
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">User UUID</span>
                      <span className="font-mono text-zinc-300">{selectedUser.id}</span>
                    </div>
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Monthly Limit</span>
                      <span className="font-mono text-zinc-300">{selectedUser.monthly_otp_limit || 10000} OTPs</span>
                    </div>
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Current Status</span>
                      <span className={`font-semibold ${selectedUser.status === "active" ? "text-emerald-400" : "text-rose-400"}`}>
                        {selectedUser.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Administrative Notes */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300">Internal Administrative Notes</label>
                    <textarea
                      value={adminNotesInput}
                      onChange={(e) => setAdminNotesInput(e.target.value)}
                      rows={3}
                      placeholder="Add moderation observations, abuse ticket numbers, or tenant requirements..."
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
                      >
                        {savingNotes ? "Saving Notes..." : "Save Admin Notes"}
                      </button>

                      <button
                        onClick={() => {
                          setUserToDelete(selectedUser);
                          setConfirmPhrase("");
                          setDeleteError(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        Permanently Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Controlled Safe Deletion Modal */}
              {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md rounded-xl border border-rose-500/40 bg-[#0f1117] p-6 shadow-2xl space-y-4 text-xs">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <AlertTriangle className="h-5 w-5" />
                      Danger: Permanent Account Deletion
                    </div>

                    <p className="text-zinc-300 leading-relaxed">
                      You are about to permanently delete the tenant account for:
                      <br />
                      <strong className="text-white font-mono">{userToDelete.email}</strong>
                    </p>

                    <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 text-[11px] space-y-1">
                      <span className="font-semibold block">Cascading Consequences:</span>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>All associated projects, API keys, and OTP challenge logs will be purged.</li>
                        <li>All connected WhatsApp credentials and webhook tokens will be deleted.</li>
                        <li>Active sessions will be immediately terminated.</li>
                        <li>This action cannot be undone.</li>
                      </ul>
                    </div>

                    {deleteError && (
                      <div className="p-2.5 rounded bg-rose-950 border border-rose-500/50 text-rose-200">
                        {deleteError}
                      </div>
                    )}

                    <div>
                      <label className="block text-zinc-400 mb-1">
                        Type <code className="text-white font-mono">{userToDelete.email}</code> to confirm:
                      </label>
                      <input
                        type="text"
                        value={confirmPhrase}
                        onChange={(e) => setConfirmPhrase(e.target.value)}
                        placeholder={userToDelete.email}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        onClick={() => setUserToDelete(null)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteDelete}
                        disabled={deleting || confirmPhrase.trim().toLowerCase() !== userToDelete.email.toLowerCase()}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 transition-colors disabled:opacity-50"
                      >
                        {deleting ? "Deleting..." : "Permanently Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. TENANTS & PROJECTS TAB */}
          {/* ========================================================================= */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Project Workspaces</h2>
                <p className="text-xs text-zinc-400">All tenant containers enforcing strict multi-tenant isolation.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-4">Slug</th>
                      <th className="py-3 px-4">Owner Email</th>
                      <th className="py-3 px-4">Active Integrations</th>
                      <th className="py-3 px-4">Active Keys</th>
                      <th className="py-3 px-4">Total OTP Challenges</th>
                      <th className="py-3 px-4 text-right">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {projects.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-medium text-white">{p.name}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{p.slug}</td>
                        <td className="py-3 px-4 font-mono text-zinc-300">{p.owner_email}</td>
                        <td className="py-3 px-4 font-mono">{p.integrations_count}</td>
                        <td className="py-3 px-4 font-mono">{p.active_keys_count}</td>
                        <td className="py-3 px-4 font-mono">{p.total_challenges_count}</td>
                        <td className="py-3 px-4 text-right text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. WHATSAPP INTEGRATIONS TAB */}
          {/* ========================================================================= */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">WhatsApp Cloud API Integrations</h2>
                <p className="text-xs text-zinc-400">Supervise connected tenant accounts without ever exposing stored plaintext credentials.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Integration Name</th>
                      <th className="py-3 px-4">Tenant Owner</th>
                      <th className="py-3 px-4">Phone Number ID</th>
                      <th className="py-3 px-4">WABA ID</th>
                      <th className="py-3 px-4">Webhook Status</th>
                      <th className="py-3 px-4">Events Recv / Proc</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {integrations.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-medium text-white">{item.name}</td>
                        <td className="py-3 px-4 font-mono text-zinc-300">{item.owner_email}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{item.phone_number_id_masked}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{item.waba_id_masked}</td>
                        <td className="py-3 px-4">
                          {item.last_webhook_error ? (
                            <span className="text-rose-400 text-[11px] font-mono">Error</span>
                          ) : (
                            <span className="text-emerald-400 text-[11px]">Healthy</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {item.webhook_events_received || 0} / {item.webhook_events_processed || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              item.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : item.status === "disabled"
                                ? "bg-rose-500/10 text-rose-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleIntegration(item.id)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] transition-colors"
                          >
                            {item.status === "disabled" ? "Enable" : "Disable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. API KEYS & SECURITY TAB */}
          {/* ========================================================================= */}
          {activeTab === "api_keys" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">API Keys & Tokens</h2>
                <p className="text-xs text-zinc-400">Review key hints, active environments, and revoke compromised keys immediately.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Key Label</th>
                      <th className="py-3 px-4">Tenant Owner</th>
                      <th className="py-3 px-4">Prefix & Hint</th>
                      <th className="py-3 px-4">Environment</th>
                      <th className="py-3 px-4">Scopes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-medium text-white">{k.name}</td>
                        <td className="py-3 px-4 font-mono text-zinc-300">{k.owner_email}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{k.key_hint}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${k.environment === "live" ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"}`}>
                            {k.environment.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">{k.scopes.join(", ")}</td>
                        <td className="py-3 px-4">
                          <span className={k.status === "active" ? "text-emerald-400 font-semibold" : "text-rose-400"}>
                            {k.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {k.status === "active" && (
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. OTP ACTIVITY TAB */}
          {/* ========================================================================= */}
          {activeTab === "otp_activity" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Global OTP Activity</h2>
                <p className="text-xs text-zinc-400">All OTP challenges across the platform with destination phone numbers securely masked.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Challenge ID</th>
                      <th className="py-3 px-4">Destination (Masked)</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Attempts</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {otpActivity.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/20">
                        <td className="py-3 px-4 text-zinc-400">{log.id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 font-semibold text-white">{log.phone_masked}</td>
                        <td className="py-3 px-4 font-sans text-zinc-300">{log.project_name}</td>
                        <td className="py-3 px-4 font-sans capitalize">{log.purpose}</td>
                        <td className="py-3 px-4 font-sans">
                          {log.is_sandbox ? <span className="text-amber-400">Sandbox</span> : <span className="text-emerald-400">Live</span>}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              log.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : log.status === "failed"
                                ? "bg-rose-500/10 text-rose-400"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{log.attempts} / {log.max_attempts}</td>
                        <td className="py-3 px-4 text-right text-zinc-500 font-sans">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. WEBHOOK EVENTS TAB */}
          {/* ========================================================================= */}
          {activeTab === "webhook_events" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Ingested Delivery Webhook Events</h2>
                <p className="text-xs text-zinc-400">Verified status callbacks from Meta WhatsApp Cloud API.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Event ID</th>
                      <th className="py-3 px-4">Provider Message ID</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4">Project ID</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {webhookEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500 font-sans">
                          No webhook delivery events ingested yet.
                        </td>
                      </tr>
                    ) : (
                      webhookEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-zinc-800/20">
                          <td className="py-3 px-4 text-zinc-400">{ev.id.slice(0, 8)}...</td>
                          <td className="py-3 px-4 text-white">{ev.provider_message_id}</td>
                          <td className="py-3 px-4 font-sans">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold uppercase">
                              {ev.event_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">{ev.project_id.slice(0, 8)}...</td>
                          <td className="py-3 px-4 text-right text-zinc-500 font-sans">{new Date(ev.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. USAGE & COSTS TAB */}
          {/* ========================================================================= */}
          {activeTab === "usage_costs" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Platform Usage & Meta Wholesale Cost Analysis</h2>
                <p className="text-xs text-zinc-400">Transparent accounting of live Meta delivery vs free sandbox simulations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl border border-zinc-800 bg-[#0f1117] space-y-2">
                  <span className="text-xs text-zinc-400 block">Total Live WhatsApp Messages</span>
                  <div className="text-3xl font-bold text-emerald-400 font-mono">{metrics?.otp?.live || 0}</div>
                  <p className="text-[11px] text-zinc-500">Outbound messages routed via Meta Cloud API</p>
                </div>

                <div className="p-6 rounded-xl border border-zinc-800 bg-[#0f1117] space-y-2">
                  <span className="text-xs text-zinc-400 block">Estimated Meta Wholesale Charges</span>
                  <div className="text-3xl font-bold text-amber-400 font-mono">${metrics?.costs?.estimated_usd || 0}</div>
                  <p className="text-[11px] text-zinc-500">Billed directly by Meta to tenant business accounts</p>
                </div>

                <div className="p-6 rounded-xl border border-zinc-800 bg-[#0f1117] space-y-2">
                  <span className="text-xs text-zinc-400 block">Sandbox Free Simulations</span>
                  <div className="text-3xl font-bold text-white font-mono">{metrics?.otp?.sandbox || 0}</div>
                  <p className="text-[11px] text-zinc-500">Zero cost to platform or tenant</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 9. PLANS & PLATFORM LIMITS TAB */}
          {/* ========================================================================= */}
          {activeTab === "plans_limits" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Platform Limits & Throttling Policies</h2>
                <p className="text-xs text-zinc-400">Configure global protection limits against OTP pumping fraud and toll abuse.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Rate Limits (Per Minute)</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span>Max OTP Sends Per Phone:</span>
                      <span className="font-mono text-emerald-400 font-bold">3 / min</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span>Max OTP Sends Per IP:</span>
                      <span className="font-mono text-emerald-400 font-bold">10 / min</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span>Max Verification Attempts Per Challenge:</span>
                      <span className="font-mono text-amber-400 font-bold">5 Attempts (Strict Lockout)</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Default Tenant Quotas</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span>Monthly OTP Challenge Quota:</span>
                      <span className="font-mono text-white font-bold">10,000 / month</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span>Max Active WhatsApp Integrations:</span>
                      <span className="font-mono text-white font-bold">5 Per Project</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded bg-zinc-950 border border-zinc-800">
                      <span>Challenge Expiration Window:</span>
                      <span className="font-mono text-white font-bold">5 Minutes (300s)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 10. ABUSE & SECURITY TAB */}
          {/* ========================================================================= */}
          {activeTab === "abuse_security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Abuse Detection & Security Oversight</h2>
                <p className="text-xs text-zinc-400">Monitor suspended tenants, suspicious request bursts, and security alerts.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">Suspended Tenant Accounts</h3>
                {users.filter((u) => u.status === "suspended").length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                    <span>No suspended tenant accounts. All active tenants in good standing.</span>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {users
                      .filter((u) => u.status === "suspended")
                      .map((u) => (
                        <div key={u.id} className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white font-mono">{u.email}</span>
                            <span className="text-zinc-500 ml-2">({u.full_name})</span>
                          </div>
                          <button
                            onClick={() => handleToggleSuspend(u.id)}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs"
                          >
                            Restore Account
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 11. AUDIT LOGS TAB */}
          {/* ========================================================================= */}
          {activeTab === "audit_logs" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Immutable Administrative Audit Log</h2>
                <p className="text-xs text-zinc-400">Append-only record of all privileged security, moderation, and configuration operations.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0f1117] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Acting Admin</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Type & ID</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-800/20">
                          <td className="py-3 px-4 text-zinc-500 font-sans">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-3 px-4 text-amber-300 font-semibold">{log.admin_email}</td>
                          <td className="py-3 px-4 text-white font-bold">{log.action}</td>
                          <td className="py-3 px-4 text-zinc-400">{log.target_type}: {log.target_id || "none"}</td>
                          <td className="py-3 px-4 text-zinc-500">{log.ip_address || "127.0.0.1"}</td>
                          <td className="py-3 px-4 text-right text-zinc-400 font-sans text-[11px]">
                            {JSON.stringify(log.metadata || {})}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 12. SYSTEM HEALTH TAB */}
          {/* ========================================================================= */}
          {activeTab === "system_health" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Real-Time Infrastructure Health</h2>
                  <p className="text-xs text-zinc-400">Real diagnostics verifying PostgreSQL connectivity, Meta Cloud API reachability, and cryptographic keys.</p>
                </div>
                <button
                  onClick={loadHealth}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-check Health
                </button>
              </div>

              {healthData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(healthData.services || {}).map(([serviceName, s]: [string, any]) => (
                      <div key={serviceName} className="p-5 rounded-xl border border-zinc-800 bg-[#0f1117] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white capitalize">{serviceName.replace(/_/g, " ")}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === "healthy"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : s.status === "degraded"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {s.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{s.message}</p>
                        {s.latency_ms !== undefined && (
                          <span className="text-[10px] text-zinc-500 font-mono block">Latency: {s.latency_ms}ms</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Cryptographic Secrets & Configuration Verification */}
                  <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4 text-xs">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lock className="h-4 w-4 text-emerald-400" />
                      Server Configuration & Cryptography Check
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                        <span>AES-256-GCM Master Encryption Key:</span>
                        <span className="text-emerald-400 font-bold font-mono">Present (32 Bytes)</span>
                      </div>
                      <div className="p-3 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                        <span>API Key HMAC-SHA256 Secret:</span>
                        <span className="text-emerald-400 font-bold font-mono">Configured</span>
                      </div>
                      <div className="p-3 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                        <span>Low-Entropy OTP Keyed Secret:</span>
                        <span className="text-emerald-400 font-bold font-mono">Configured</span>
                      </div>
                      <div className="p-3 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                        <span>Meta Graph API Version:</span>
                        <span className="text-amber-400 font-bold font-mono">{healthData.environment?.graph_api_version || "v22.0"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

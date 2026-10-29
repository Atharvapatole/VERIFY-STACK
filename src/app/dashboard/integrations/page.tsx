"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import {
  PlugZap,
  Plus,
  ShieldCheck,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Lock,
  RefreshCw,
  Info,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Radio,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { getCanonicalAppUrl, CANONICAL_PRODUCTION_URL } from "@/lib/base-url";

interface IntegrationItem {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  phone_number_id: string;
  waba_id: string;
  template_name: string;
  template_language: string;
  webhook_verify_token?: string;
  status: string;
  is_sandbox: boolean;
  last_tested_at?: string | null;
  last_webhook_received_at?: string | null;
  last_webhook_verified_at?: string | null;
  last_webhook_error?: string | null;
  webhook_events_received?: number;
  webhook_events_processed?: number;
  webhook_events_ignored?: number;
  webhook_events_failed?: number;
  created_at: string;
}

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

  // Diagnostic state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);

  // Token rotation state
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotatedTokenData, setRotatedTokenData] = useState<{
    id: string;
    token: string;
  } | null>(null);

  // Modal draft state (pre-allocated integration ID & secure verification token)
  const [modalDraft, setModalDraft] = useState<{
    id: string;
    verifyToken: string;
  } | null>(null);

  const [newlyCreatedData, setNewlyCreatedData] = useState<{
    id: string;
    name: string;
    webhookUrl: string;
    verifyToken: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "Production WhatsApp Cloud API",
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    appSecret: "",
    templateName: "otp_authentication",
    templateLanguage: "en_US",
    isSandbox: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Production base URL resolution enforced via canonical base URL helper
  const appBaseUrl = getCanonicalAppUrl();

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/dashboard/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/dashboard/projects");
      if (res.ok) {
        const data = await res.json();
        const list: ProjectItem[] = data.projects || [];
        setProjects(list);
        if (list.length > 0) {
          setSelectedProjectId((prev) => {
            if (prev && list.some((p) => p.id === prev)) return prev;
            const def = list.find((p) => p.is_default) || list[0];
            return def.id;
          });
        }
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchProjects();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const openConnectModal = async () => {
    if (projects.length === 0) {
      await fetchProjects();
    }

    // Generate secure pre-allocated UUID
    let newId = "";
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      newId = crypto.randomUUID();
    } else {
      newId = "00000000-0000-4000-8000-" + Math.random().toString(16).substring(2, 14);
    }

    // Generate secure random verify token
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const newVerifyToken = "whsec_" + randomHex;

    setModalDraft({
      id: newId,
      verifyToken: newVerifyToken,
    });
    setFormError(null);
    setNewlyCreatedData(null);
    setFormData({
      name: "Production WhatsApp Cloud API",
      phoneNumberId: "",
      wabaId: "",
      accessToken: "",
      appSecret: "",
      templateName: "otp_authentication",
      templateLanguage: "en_US",
      isSandbox: false,
    });
    setShowModal(true);
  };

  const handleRotateToken = async (integrationId: string) => {
    if (
      !confirm(
        "Are you sure you want to regenerate this webhook verification token? Any existing webhook connection in Meta Developers using the old token will fail until you update it."
      )
    ) {
      return;
    }

    setRotatingId(integrationId);
    try {
      const res = await fetch(`/api/dashboard/integrations/${integrationId}/rotate-webhook-token`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to rotate token");
      }

      setRotatedTokenData({
        id: integrationId,
        token: data.token,
      });
      fetchIntegrations();
    } catch (err: any) {
      alert("Error rotating token: " + (err.message || "Unknown error"));
    } finally {
      setRotatingId(null);
    }
  };

  const handleRunDiagnostic = async (integrationId: string) => {
    setTestingId(integrationId);
    setDiagnosticResult(null);
    try {
      const res = await fetch(`/api/dashboard/integrations/${integrationId}/test-webhook`, {
        method: "POST",
      });
      const data = await res.json();
      setDiagnosticResult(data);
      fetchIntegrations();
    } catch (err: any) {
      setDiagnosticResult({
        success: false,
        error: err.message || "Failed to execute webhook diagnostic",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDraft) return;

    if (!selectedProjectId) {
      setFormError("Please select a valid target project for this integration.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/dashboard/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: modalDraft.id,
          webhookVerifyToken: modalDraft.verifyToken,
          projectId: selectedProjectId,
          ...formData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to save integration.");
      }

      const generatedUrl = `${appBaseUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/${modalDraft.id}`;
      setNewlyCreatedData({
        id: modalDraft.id,
        name: formData.name,
        webhookUrl: generatedUrl,
        verifyToken: resData.raw_webhook_verify_token || modalDraft.verifyToken,
      });

      fetchIntegrations();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration? Live sending and webhook processing will be immediately stopped.")) return;
    try {
      const res = await fetch(`/api/dashboard/integrations?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchIntegrations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (item: IntegrationItem) => {
    if (item.last_webhook_error || ((item.webhook_events_failed || 0) > 0 && !item.last_webhook_verified_at)) {
      return {
        label: "Error",
        colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        desc: "Webhook error encountered or invalid challenge",
      };
    }
    if ((item.webhook_events_processed || 0) > 0) {
      return {
        label: "Receiving events",
        colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        desc: "Actively receiving and processing signed Meta webhook events",
      };
    }
    if (item.status === "verified" || item.last_webhook_verified_at) {
      return {
        label: "Verified",
        colorClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        desc: "Meta GET challenge successfully verified",
      };
    }
    if (item.status === "pending") {
      return {
        label: "Awaiting Meta verification",
        colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        desc: "Token generated; awaiting Meta Hub GET challenge",
      };
    }
    return {
      label: "Not configured",
      colorClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
      desc: "Webhook not yet configured in Meta Developers",
    };
  };

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="WhatsApp Cloud API Integrations & Webhooks"
        description="Connect your Meta Business WhatsApp Cloud credentials and configure integration-specific webhook endpoints."
      />

      <div className="p-8 space-y-8 max-w-7xl">
        {/* Meta Official Limitation & Setup Banner */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-xs text-amber-300 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-200">Important Meta Connection Requirements</h4>
            <p className="text-zinc-400 leading-relaxed">
              A Phone Number ID and WABA ID alone do not grant permission to send messages. You must generate a System User Access Token with{" "}
              <code className="text-amber-300 font-mono">whatsapp_business_messaging</code> permissions, register an eligible phone number in your Meta App,
              and have an approved WhatsApp Authentication Template.
            </p>
          </div>
        </div>

        {/* Integration Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Connected Providers</h2>
            <p className="text-xs text-zinc-400">View callback URLs, verification tokens, and live telemetry for your integrations.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                fetchIntegrations();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh integrations list and live webhook verification status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              Refresh Status
            </button>
            <button
              onClick={openConnectModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
            >
              <Plus className="h-3.5 w-3.5" /> Connect WhatsApp Account
            </button>
          </div>
        </div>

        {/* Rotated Token One-Time Alert Modal / Card */}
        {rotatedTokenData && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3 text-xs shadow-xl animate-in fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">New Webhook Verification Token Generated</h4>
              </div>
              <button
                onClick={() => setRotatedTokenData(null)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-0.5"
              >
                ✕ Dismiss
              </button>
            </div>
            <p className="text-emerald-200 leading-relaxed">
              ⚠️ <strong className="text-white">Save or copy this token now.</strong> For security, stored verification tokens are masked once you close this alert. You must immediately update this in your Meta App Dashboard to prevent webhook delivery interruptions.
            </p>
            <div className="flex items-center gap-3 bg-[#090a0d] p-3 rounded-lg border border-emerald-500/30">
              <span className="font-mono text-emerald-300 text-xs font-semibold select-all break-all flex-1">
                {rotatedTokenData.token}
              </span>
              <button
                onClick={() => handleCopy(rotatedTokenData.token, "rotated-token")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 text-zinc-950 font-semibold text-xs hover:bg-emerald-400 shrink-0"
              >
                {copiedKey === "rotated-token" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedKey === "rotated-token" ? "Copied Token" : "Copy New Token"}
              </button>
            </div>
          </div>
        )}

        {/* Integrations List */}
        {integrations.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-12 text-center text-xs">
            <PlugZap className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
            <h3 className="font-semibold text-white mb-1">No WhatsApp Integrations Connected</h3>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Connect your Meta WhatsApp Cloud API credentials to enable live OTP delivery and generate a dedicated webhook endpoint.
            </p>
            <button
              onClick={openConnectModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" /> Add Integration
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {integrations.map((item) => {
              const webhookUrl = `${appBaseUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/${item.id}`;
              const statusInfo = getStatusBadge(item);

              return (
                <div key={item.id} className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-6 shadow-xl">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <PlugZap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusInfo.colorClass}`}
                            title={statusInfo.desc}
                          >
                            {statusInfo.label.toUpperCase()}
                          </span>
                          {item.is_sandbox && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 font-mono">
                              SANDBOX
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Project: {item.project_name || "Default Project"} • ID: {item.id} • Phone ID: {item.phone_number_id} • WABA: {item.waba_id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunDiagnostic(item.id)}
                        disabled={testingId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${testingId === item.id ? "animate-spin" : ""}`} />
                        {testingId === item.id ? "Running Diagnostic..." : "Verify Webhook Setup"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                        title="Delete integration"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Dedicated Webhook Configuration Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                          Webhook Configuration
                        </h4>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        Route: <code className="text-emerald-400">/api/webhooks/whatsapp/{item.id}</code>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Webhook Callback URL */}
                      <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="font-semibold text-zinc-200">Production Webhook Callback URL</span>
                          <button
                            onClick={() => handleCopy(webhookUrl, `url-${item.id}`)}
                            className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                          >
                            {copiedKey === `url-${item.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedKey === `url-${item.id}` ? "Copied URL" : "Copy URL"}
                          </button>
                        </div>
                        <div className="font-mono text-zinc-200 break-all bg-[#090a0d] p-2.5 rounded border border-zinc-800/90 text-xs select-all">
                          {webhookUrl}
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          Enter this exact URL into Meta App Dashboard → WhatsApp → Configuration. Ensure the domain is strictly <span className="text-zinc-300 font-mono">verifystack-lyart.vercel.app</span> (do not omit <span className="text-emerald-400 font-mono">-lyart</span>).
                        </p>
                      </div>

                      {/* Webhook Verification Token (Masked with Rotation Action) */}
                      <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2">
                        <div className="flex items-center justify-between text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-200">Webhook Verification Token</span>
                            <span className="text-[10px] text-zinc-500 font-mono">(Masked)</span>
                          </div>
                          <button
                            onClick={() => handleRotateToken(item.id)}
                            disabled={rotatingId === item.id}
                            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
                            title="Regenerate verification token"
                          >
                            <RotateCcw className={`h-3 w-3 ${rotatingId === item.id ? "animate-spin" : ""}`} />
                            {rotatingId === item.id ? "Regenerating..." : "Regenerate Token"}
                          </button>
                        </div>
                        <div className="font-mono text-zinc-400 break-all bg-[#090a0d] p-2.5 rounded border border-zinc-800/90 text-xs flex items-center justify-between">
                          <span>{item.webhook_verify_token || "whsec_••••••••••••••••••••••••"}</span>
                          <Lock className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          Verified during Meta&apos;s GET challenge. Stored tokens are masked for security. Click <strong>Regenerate Token</strong> to generate and copy a new token.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live Webhook Telemetry & Status Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/70">
                      <span className="text-[10px] text-zinc-500 block">Events Received</span>
                      <span className="text-lg font-bold text-white font-mono">{item.webhook_events_received || 0}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">Total incoming hits</span>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/70">
                      <span className="text-[10px] text-zinc-500 block">Processed & Recorded</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{item.webhook_events_processed || 0}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">Valid status updates</span>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/70">
                      <span className="text-[10px] text-zinc-500 block">Ignored (Duplicate)</span>
                      <span className="text-lg font-bold text-zinc-400 font-mono">{item.webhook_events_ignored || 0}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">Idempotent deduplication</span>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/70">
                      <span className="text-[10px] text-zinc-500 block">Failures / Invalid</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">{item.webhook_events_failed || 0}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">Bad tokens or signatures</span>
                    </div>
                  </div>

                  {/* Webhook History & Diagnostics Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 text-[11px] text-zinc-400">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        Last Webhook Received:{" "}
                        <span className="text-zinc-200 font-mono">
                          {item.last_webhook_received_at ? new Date(item.last_webhook_received_at).toLocaleString() : "Never"}
                        </span>
                      </div>
                      <div>
                        Last Verification Challenge:{" "}
                        <span className="text-zinc-200 font-mono">
                          {item.last_webhook_verified_at ? new Date(item.last_webhook_verified_at).toLocaleString() : "Never"}
                        </span>
                      </div>
                    </div>

                    <div>
                      {item.last_webhook_error ? (
                        <span className="text-rose-400 flex items-center gap-1 font-mono">
                          <AlertTriangle className="h-3 w-3" /> Error: {item.last_webhook_error}
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Healthy Webhook Pipeline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Diagnostic Test Results Drawer (when run) */}
                  {diagnosticResult && diagnosticResult.integration_id === item.id && (
                    <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-emerald-300">
                          <Activity className="h-4 w-4" />
                          <span>Real Integration Diagnostic Report</span>
                        </div>
                        <button
                          onClick={() => setDiagnosticResult(null)}
                          className="text-zinc-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {Object.entries(diagnosticResult.diagnostics || {}).map(([key, value]: [string, any]) => (
                          <div key={key} className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-zinc-300 capitalize">{key.replace(/_/g, " ")}</span>
                              {value.status === "passed" ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" /> PASSED
                                </span>
                              ) : (
                                <span className="text-rose-400 font-bold flex items-center gap-1 text-[10px]">
                                  <XCircle className="h-3 w-3" /> FAILED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500">{value.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta Developer Setup Instructions Accordion */}
                  <div className="border-t border-zinc-800/80 pt-4">
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-colors flex items-center justify-between">
                        <span>Meta Developer Webhook Setup Guide (Step-by-Step)</span>
                        <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>

                      <div className="mt-4 p-4 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 space-y-3 leading-relaxed">
                        <ol className="list-decimal pl-5 space-y-2 text-zinc-400">
                          <li>
                            Open Meta Developers at{" "}
                            <a
                              href="https://developers.facebook.com/"
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 underline hover:text-emerald-300 inline-flex items-center gap-0.5"
                            >
                              https://developers.facebook.com/ <ExternalLink className="h-3 w-3 inline" />
                            </a>
                            .
                          </li>
                          <li>
                            Select your App associated with this integration.
                          </li>
                          <li>
                            Go to <strong className="text-white">WhatsApp → Configuration</strong>.
                          </li>
                          <li>
                            Find the <strong className="text-white">Webhook</strong> section and click <strong className="text-white">Edit</strong>.
                          </li>
                          <li>
                            Enter the exact <strong className="text-white">Production Webhook Callback URL</strong> shown above:
                            <code className="text-emerald-400 font-mono block mt-1 break-all bg-zinc-900 p-1.5 rounded">{webhookUrl}</code>
                          </li>
                          <li>
                            Enter the <strong className="text-white">Webhook Verification Token</strong> configured for this integration. (If you need the plaintext token, click <em>Regenerate Token</em> above to rotate and copy a fresh token).
                          </li>
                          <li>
                            Click <strong className="text-white">Verify and Save</strong>, then subscribe to the <code className="text-amber-300 font-mono">messages</code> webhook field.
                          </li>
                        </ol>
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Connect WhatsApp Account with Prominent Webhook Setup */}
        {showModal && modalDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-[#0f1117] p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <PlugZap className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-base font-semibold text-white">
                    {newlyCreatedData ? "WhatsApp Integration Active" : "Connect WhatsApp Account & Webhook"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-zinc-400 hover:text-white text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{formError}</span>
                </div>
              )}

              {/* SUCCESS STATE VIEW */}
              {newlyCreatedData ? (
                <div className="space-y-5 text-xs">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">Integration Saved & Ready in Verify Stack!</h4>
                    <p className="text-zinc-300 max-w-md mx-auto text-xs">
                      Now finish the connection inside Meta Developers by pasting the exact Webhook Callback URL and Verification Token below.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
                    <h5 className="font-semibold text-white flex items-center gap-2">
                      <Radio className="h-4 w-4 text-emerald-400" /> Webhook Configuration (Meta Setup)
                    </h5>

                    {/* URL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 font-medium">Production Webhook Callback URL</span>
                        <button
                          onClick={() => handleCopy(newlyCreatedData.webhookUrl, "created-url")}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          {copiedKey === "created-url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === "created-url" ? "Copied" : "Copy URL"}
                        </button>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-emerald-300 text-xs break-all select-all">
                        {newlyCreatedData.webhookUrl}
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Notice: The canonical domain is <strong className="text-zinc-200 font-mono">verifystack-lyart.vercel.app</strong>. Do NOT omit the <code className="text-emerald-400 font-mono">-lyart</code> suffix in Meta Developers.
                      </p>
                    </div>

                    {/* Token */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 font-medium">Webhook Verification Token (Shown Once)</span>
                        <button
                          onClick={() => handleCopy(newlyCreatedData.verifyToken, "created-tok")}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          {copiedKey === "created-tok" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === "created-tok" ? "Copied" : "Copy Token"}
                        </button>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-emerald-300 text-xs break-all select-all">
                        {newlyCreatedData.verifyToken}
                      </div>
                      <p className="text-[11px] text-amber-300">
                        ⚠️ Please copy this token now. After you close this dialog, the token will be masked for security.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRunDiagnostic(newlyCreatedData.id)}
                      disabled={testingId === newlyCreatedData.id}
                      className="px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium hover:bg-emerald-500/20 text-xs inline-flex items-center gap-2"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${testingId === newlyCreatedData.id ? "animate-spin" : ""}`} />
                      {testingId === newlyCreatedData.id ? "Verifying..." : "Verify Webhook Setup"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-xs hover:bg-emerald-400"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : (
                /* CREATION FORM WITH VISIBLE WEBHOOK CONFIGURATION */
                <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                  {/* Target Project Selector */}
                  <div>
                    {loadingProjects ? (
                      <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 text-xs">
                        Loading workspaces...
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-xs space-y-1.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-400" /> No Active Project Found
                        </div>
                        <p className="text-zinc-400 leading-relaxed">
                          Integrations must be associated with a valid project. Please create a project before connecting WhatsApp credentials.
                        </p>
                        <a
                          href="/dashboard/projects"
                          className="inline-flex items-center gap-1 font-semibold text-emerald-400 underline hover:text-emerald-300"
                        >
                          Go to Project Management <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : projects.length === 1 ? (
                      <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                            Target Project Workspace
                          </span>
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
                            <Layers className="h-3.5 w-3.5 text-emerald-400" />
                            {projects[0].name}
                            {projects[0].is_default && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                Default
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">ID: {projects[0].id}</span>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">
                          Target Project / Workspace
                        </label>
                        <div className="relative">
                          <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-xs"
                          >
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.is_default ? "(Default)" : ""} ({p.slug})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Webhook Configuration Preview Box */}
                  {(() => {
                    const draftWebhookUrl = `${appBaseUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/${modalDraft.id}`;
                    return (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-emerald-400" />
                            <h4 className="font-semibold text-white">Webhook Configuration (Copy to Meta Developers)</h4>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono">Live Callback Endpoint</span>
                        </div>

                        {/* Callback URL */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-zinc-300">
                            <span className="font-medium text-[11px]">Production Webhook Callback URL</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(draftWebhookUrl, "draft-url")}
                              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-[11px]"
                            >
                              {copiedKey === "draft-url" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedKey === "draft-url" ? "Copied" : "Copy URL"}
                            </button>
                          </div>
                          <div className="p-2 rounded bg-[#090a0d] border border-zinc-800 text-emerald-300 font-mono text-[11px] break-all select-all">
                            {draftWebhookUrl}
                          </div>
                          <span className="text-[10px] text-zinc-400 block">
                            Ensure you copy this full URL including <code className="text-emerald-400 font-mono">verifystack-lyart.vercel.app</code> and your integration ID.
                          </span>
                        </div>

                        {/* Verification Token */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-zinc-300">
                            <span className="font-medium text-[11px]">Webhook Verification Token</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(modalDraft.verifyToken, "draft-tok")}
                              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-[11px]"
                            >
                              {copiedKey === "draft-tok" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedKey === "draft-tok" ? "Copied" : "Copy Token"}
                            </button>
                          </div>
                          <div className="p-2 rounded bg-[#090a0d] border border-zinc-800 text-emerald-300 font-mono text-[11px] break-all select-all">
                            {modalDraft.verifyToken}
                          </div>
                          <span className="text-[10px] text-zinc-400 block">
                            Cryptographically secure random secret generated for Meta GET verification.
                          </span>
                        </div>

                        {/* Step by step guide */}
                        <div className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/70 space-y-1.5 text-[11px] text-zinc-400">
                          <span className="font-semibold text-zinc-200 block">Step-by-Step Meta Developer Instructions:</span>
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>
                              Open Meta Developers at{" "}
                              <a
                                href="https://developers.facebook.com/"
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 underline hover:text-emerald-300 inline-flex items-center gap-0.5"
                              >
                                https://developers.facebook.com/ <ExternalLink className="h-2.5 w-2.5 inline" />
                              </a>
                            </li>
                            <li>Select your App.</li>
                            <li>Go to <strong className="text-zinc-300">WhatsApp → Configuration</strong>.</li>
                            <li>Find the Webhook section and click <strong className="text-zinc-300">Edit</strong>.</li>
                            <li>Enter the exact <strong className="text-zinc-300">Production Webhook Callback URL</strong> shown above.</li>
                            <li>Enter the <strong className="text-zinc-300">Webhook Verification Token</strong> shown above.</li>
                            <li>Click <strong className="text-zinc-300">Verify and Save</strong>, then subscribe to the <code className="text-amber-300 font-mono">messages</code> webhook field.</li>
                          </ol>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Basic Metadata */}
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Integration Label</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="e.g. Production WABA"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Phone Number ID</label>
                      <input
                        type="text"
                        required
                        value={formData.phoneNumberId}
                        onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="e.g. 105849204918231"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">WABA Account ID</label>
                      <input
                        type="text"
                        required
                        value={formData.wabaId}
                        onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="e.g. 293847592019283"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Meta System User Permanent Access Token
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.accessToken}
                      onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="EAA..."
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      Must have whatsapp_business_messaging permission. Stored encrypted with AES-256-GCM.
                    </span>
                  </div>

                  {/* App Secret with Status Indicator */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-300 font-medium">Meta App Secret</label>
                      <span className="text-[10px] text-zinc-500">
                        {formData.appSecret.length >= 32 ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Valid format (32+ chars)
                          </span>
                        ) : (
                          "Required for X-Hub-Signature-256"
                        )}
                      </span>
                    </div>
                    <input
                      type="password"
                      required
                      value={formData.appSecret}
                      onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="32-character App Secret from Meta App Dashboard → App Settings → Basic"
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      Used by Verify Stack to cryptographically verify X-Hub-Signature-256 on incoming message status webhooks.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Authentication Template Name</label>
                      <input
                        type="text"
                        required
                        value={formData.templateName}
                        onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Template Language</label>
                      <input
                        type="text"
                        required
                        value={formData.templateLanguage}
                        onChange={(e) => setFormData({ ...formData, templateLanguage: e.target.value })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !selectedProjectId || projects.length === 0}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      {submitting ? "Encrypting & Saving..." : "Connect & Save Integration"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
} from "lucide-react";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/v1/integrations");
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

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      // Fetch user's default project ID
      const projRes = await fetch("/api/v1/usage");
      let projectId = "";
      if (projRes.ok) {
        const pData = await projRes.json();
        projectId = pData.project_id;
      }

      if (!projectId) {
        // Fallback default UUID for testing
        projectId = "00000000-0000-0000-0000-000000000000";
      }

      const res = await fetch("/api/dashboard/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...formData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to save integration.");
      }

      setShowModal(false);
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
      fetchIntegrations();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration? Live sending will be immediately disabled.")) return;
    try {
      const res = await fetch(`/api/dashboard/integrations?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchIntegrations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="WhatsApp Cloud API Integrations"
        description="Connect your Meta Business WhatsApp Cloud credentials. Secrets are stored with AES-256-GCM encryption."
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Connected Providers</h2>
            <p className="text-xs text-zinc-400">View callback URLs and webhook tokens for your integrations.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Plus className="h-3.5 w-3.5" /> Connect WhatsApp Account
          </button>
        </div>

        {/* Integrations List */}
        {integrations.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-12 text-center text-xs">
            <PlugZap className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
            <h3 className="font-semibold text-white mb-1">No WhatsApp Integrations Connected</h3>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Connect your Meta WhatsApp Cloud API credentials to enable live OTP delivery to real recipient devices.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" /> Add Integration
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {integrations.map((item) => {
              const webhookUrl = `${appBaseUrl}/api/webhooks/whatsapp/${item.id}`;
              return (
                <div key={item.id} className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <PlugZap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              item.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Phone ID: {item.phone_number_id} • WABA ID: {item.waba_id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                        title="Delete integration"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Webhook Configuration Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="font-medium text-zinc-300">Webhook Callback URL</span>
                        <button
                          onClick={() => handleCopy(webhookUrl, `url-${item.id}`)}
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                        >
                          {copiedKey === `url-${item.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedKey === `url-${item.id}` ? "Copied" : "Copy URL"}
                        </button>
                      </div>
                      <div className="font-mono text-zinc-300 break-all bg-[#090a0d] p-2 rounded border border-zinc-800/80 text-[11px]">
                        {webhookUrl}
                      </div>
                      <span className="text-[10px] text-zinc-500 block">Paste this into Meta App Dashboard → WhatsApp → Configuration</span>
                    </div>

                    <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="font-medium text-zinc-300">Webhook Verify Token</span>
                        <button
                          onClick={() => handleCopy(item.webhook_verify_token, `tok-${item.id}`)}
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                        >
                          {copiedKey === `tok-${item.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedKey === `tok-${item.id}` ? "Copied" : "Copy Token"}
                        </button>
                      </div>
                      <div className="font-mono text-zinc-300 break-all bg-[#090a0d] p-2 rounded border border-zinc-800/80 text-[11px]">
                        {item.webhook_verify_token}
                      </div>
                      <span className="text-[10px] text-zinc-500 block">Secret string used for Meta GET challenge validation</span>
                    </div>
                  </div>

                  {/* Template & Encryption Security Status */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[11px] text-zinc-400 border-t border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Credentials Encrypted with AES-256-GCM (Ciphertext only at rest)</span>
                    </div>
                    <div className="font-mono">
                      Template: <span className="text-zinc-200">{item.template_name}</span> ({item.template_language})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add WhatsApp Integration */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-[#0f1117] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Connect WhatsApp Cloud API</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white text-xs">
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Meta App Secret</label>
                  <input
                    type="password"
                    required
                    value={formData.appSecret}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="32-character App Secret from Meta App Dashboard → Basic Settings"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Used to verify X-Hub-Signature-256 on incoming webhook delivery callbacks.
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
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Encrypting & Saving..." : "Save Credentials"}
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

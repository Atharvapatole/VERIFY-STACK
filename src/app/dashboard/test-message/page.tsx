"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import {
  SendHorizontal,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Phone,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  ExternalLink,
  PlugZap,
  Check,
} from "lucide-react";

interface IntegrationOption {
  id: string;
  name: string;
  phone_number_id: string;
  waba_id?: string;
  project_id?: string;
  project_name?: string;
  template_name?: string;
  template_language?: string;
  status: string;
  is_sandbox?: boolean;
}

export default function TestMessagePage() {
  const [integrations, setIntegrations] = useState<IntegrationOption[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);

  // Form State
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [phone, setPhone] = useState("+14155552671");
  const [templateName, setTemplateName] = useState("otp_authentication");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [isLiveSend, setIsLiveSend] = useState(false);

  // Execution & Confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true);
    setIntegrationsError(null);
    try {
      const res = await fetch("/api/dashboard/integrations");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retrieve WhatsApp integrations.");
      }
      const list: IntegrationOption[] = data.integrations || [];
      setIntegrations(list);

      if (list.length > 0) {
        setSelectedIntegration((prev) => {
          if (prev && list.some((i) => i.id === prev)) return prev;
          // Prefer active/verified integrations over disabled
          const active = list.find((i) => i.status !== "disabled") || list[0];
          return active.id;
        });
      } else {
        setSelectedIntegration("");
      }
    } catch (e: any) {
      console.error("Error loading integrations for test console:", e);
      setIntegrationsError(e.message || "An unexpected error occurred while loading integrations.");
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const activeIntegration = integrations.find((i) => i.id === selectedIntegration);

  const handleTriggerSend = () => {
    setErrorMsg(null);
    setErrorCategory(null);
    setErrorDetails(null);

    if (isLiveSend) {
      if (!selectedIntegration || selectedIntegration === "00000000-0000-0000-0000-000000000000") {
        setErrorMsg("Please select a connected WhatsApp integration before dispatching live messages.");
        return;
      }
      setShowConfirmModal(true);
    } else {
      executeSend();
    }
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setResult(null);
    setErrorMsg(null);
    setErrorCategory(null);
    setErrorDetails(null);

    try {
      const res = await fetch("/api/dashboard/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: isLiveSend ? selectedIntegration : selectedIntegration || null,
          phone: phone.trim(),
          templateName: templateName.trim(),
          templateLanguage: templateLanguage.trim(),
          isLiveSend,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorCategory(data.category || null);
        setErrorDetails(data.details || null);
        throw new Error(data.error || "Failed to dispatch test message.");
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Test Message Console"
        description="Verify WhatsApp message delivery directly using official Meta Cloud API or test risk-free in the Sandbox simulator."
      />

      <div className="p-8 space-y-8 max-w-4xl">
        {/* Mode Selector Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setIsLiveSend(false);
              setErrorMsg(null);
            }}
            className={`p-5 rounded-xl border text-left transition-all ${
              !isLiveSend
                ? "border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/5"
                : "border-zinc-800 bg-[#0f1117] hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white text-sm">Sandbox Simulator</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300">
                Free & Isolated
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Dispatches a simulated OTP challenge. No Meta credentials required, no real messages sent, and zero Meta billing.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLiveSend(true);
              setErrorMsg(null);
            }}
            className={`p-5 rounded-xl border text-left transition-all ${
              isLiveSend
                ? "border-emerald-500/80 bg-emerald-500/10 shadow-lg shadow-emerald-500/5"
                : "border-zinc-800 bg-[#0f1117] hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white text-sm">Live Meta Cloud API</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300">
                Live Delivery
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sends a real WhatsApp message to the destination device using your connected WhatsApp Business Platform credentials.
            </p>
          </button>
        </div>

        {/* Live Warning Notice */}
        {isLiveSend ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-emerald-300 flex items-start gap-3">
            <Info className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-white">Live WhatsApp Delivery Notice:</strong>
              <p className="text-zinc-300 leading-relaxed">
                Meta charges authentication conversation rates directly to your Meta Business Manager. Delivery requires an
                eligible phone number and an approved authentication template in your Meta App.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-300 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-white">Isolated Sandbox Simulator:</strong> Testing here simulates
              the end-to-end OTP challenge generation, token hashing, and audit attempts without calling external Meta Cloud API endpoints.
            </div>
          </div>
        )}

        {/* Dispatch Form Card */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <h3 className="text-sm font-semibold text-white">Configure Test Dispatch</h3>
            <button
              type="button"
              onClick={fetchIntegrations}
              disabled={loadingIntegrations}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              title="Refresh integrations list"
            >
              <RefreshCw className={`h-3 w-3 ${loadingIntegrations ? "animate-spin text-emerald-400" : ""}`} />
              Refresh Integrations
            </button>
          </div>

          <div className="space-y-5 text-xs">
            {/* Live WhatsApp Integration Selector */}
            {isLiveSend && (
              <div className="space-y-2">
                <label className="block text-zinc-300 font-medium">Select Connected WhatsApp Integration</label>

                {loadingIntegrations ? (
                  <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>Loading your WhatsApp credentials...</span>
                  </div>
                ) : integrationsError ? (
                  <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      Failed to Load Integrations
                    </div>
                    <p className="text-zinc-400">{integrationsError}</p>
                    <button
                      type="button"
                      onClick={fetchIntegrations}
                      className="px-3 py-1 rounded bg-zinc-900 border border-zinc-700 text-white font-medium hover:bg-zinc-800"
                    >
                      Retry Loading
                    </button>
                  </div>
                ) : integrations.length === 0 ? (
                  <div className="p-5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-300 space-y-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <PlugZap className="h-4 w-4 text-amber-400" />
                      No WhatsApp integrations configured
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                      Please connect your Meta WhatsApp Cloud API credentials in the Integrations tab before live testing.
                    </p>
                    <a
                      href="/dashboard/integrations"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-xs hover:bg-emerald-400 transition-colors"
                    >
                      Connect WhatsApp Account <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedIntegration}
                      onChange={(e) => setSelectedIntegration(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {integrations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.phone_number_id}) • {item.project_name || "Workspace"} [
                          {item.status.toUpperCase()}]
                        </option>
                      ))}
                    </select>

                    {/* Selected Integration Info Card */}
                    {activeIntegration && (
                      <div className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200">{activeIntegration.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-emerald-300">
                            ID: {activeIntegration.phone_number_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Workspace: <strong className="text-zinc-200">{activeIntegration.project_name || "Default"}</strong></span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              activeIntegration.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : activeIntegration.status === "disabled"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {activeIntegration.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Destination Phone Number (E.164 Format)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="+14155552671"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Must include country code and '+' prefix (e.g. +1 4155552671 or +91 9876543210).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Authentication Template Name</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Must match the approved template name in your Meta WhatsApp Manager.
                </span>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Language Code</label>
                <input
                  type="text"
                  required
                  value={templateLanguage}
                  onChange={(e) => setTemplateLanguage(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  e.g. en_US, en_GB, es_ES, or hi_IN.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTriggerSend}
                disabled={sending || (isLiveSend && (!selectedIntegration || integrations.length === 0))}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20"
              >
                <SendHorizontal className="h-4 w-4" />
                {sending ? "Dispatching..." : isLiveSend ? "Dispatch Live Test Message" : "Simulate Sandbox Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Error Output */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Delivery Request Failed
            </div>
            {errorCategory && (
              <div className="font-semibold text-rose-200">
                Category: <span className="font-mono">{errorCategory}</span>
              </div>
            )}
            <p className="text-zinc-300">{errorMsg}</p>
            {errorDetails && (
              <p className="text-[11px] text-zinc-400 bg-zinc-950 p-2.5 rounded border border-rose-500/20 font-mono">
                {errorDetails}
              </p>
            )}
          </div>
        )}

        {/* Result Output */}
        {result && (
          <div className="rounded-xl border border-emerald-500/30 bg-[#0f1117] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                {result.mode === "sandbox_simulated" ? "Sandbox Simulation Success" : "Meta Accepted Message"}
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Status: <strong className="text-white">{result.status}</strong>
              </span>
            </div>

            <div className="text-xs space-y-2 text-zinc-300">
              <p>{result.message}</p>
              {result.test_code && (
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">Sandbox Test OTP Code:</span>
                  <span className="font-mono text-lg font-bold text-amber-400 tracking-widest">{result.test_code}</span>
                </div>
              )}
              {result.provider_message_id && (
                <div className="font-mono text-[11px] text-zinc-400">
                  Meta Message ID: <span className="text-white">{result.provider_message_id}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deliberate Confirmation Modal for Live Sends */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#0f1117] p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <ShieldAlert className="h-5 w-5" />
                Confirm Live WhatsApp Dispatch
              </div>
              <p className="text-zinc-300 leading-relaxed">
                You are about to dispatch a live message to <code className="text-white font-mono">{phone}</code> via your connected Meta WhatsApp Cloud API integration:
              </p>

              {activeIntegration && (
                <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 space-y-1 text-[11px]">
                  <div className="text-white font-semibold">{activeIntegration.name}</div>
                  <div className="text-zinc-400 font-mono">Phone Number ID: {activeIntegration.phone_number_id}</div>
                  <div className="text-zinc-400">Workspace: {activeIntegration.project_name || "Default Project"}</div>
                </div>
              )}

              <ul className="list-disc pl-5 text-zinc-400 space-y-1 text-[11px]">
                <li>Meta conversation pricing rules and template approval requirements apply.</li>
                <li>Your Meta Business Manager will record and bill for this outbound message.</li>
                <li>This is a REAL outbound message sent through Meta WhatsApp Cloud API.</li>
              </ul>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSend}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 transition-colors"
                >
                  I Understand, Send Message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

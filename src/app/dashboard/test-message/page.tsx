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
  Key,
} from "lucide-react";

export default function TestMessagePage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function loadIntegrations() {
      try {
        const res = await fetch("/api/v1/integrations");
        if (res.ok) {
          const data = await res.json();
          const list = data.integrations || [];
          setIntegrations(list);
          if (list.length > 0) {
            setSelectedIntegration(list[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadIntegrations();
  }, []);

  const handleTriggerSend = () => {
    if (isLiveSend) {
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

    try {
      const res = await fetch("/api/dashboard/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: selectedIntegration || "00000000-0000-0000-0000-000000000000",
          phone,
          templateName,
          templateLanguage,
          isLiveSend,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
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
            onClick={() => setIsLiveSend(false)}
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
            onClick={() => setIsLiveSend(true)}
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
        {isLiveSend && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-emerald-300 flex items-start gap-3">
            <Info className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-white">Live WhatsApp Delivery Notice:</strong> Meta charges
              authentication conversation rates directly to your Meta Business Manager. Delivery requires an eligible phone number
              and an approved authentication template.
            </div>
          </div>
        )}

        {/* Dispatch Form Card */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-6">
          <h3 className="text-sm font-semibold text-white">Configure Test Dispatch</h3>

          <div className="space-y-4 text-xs">
            {isLiveSend && (
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Select Connected Integration</label>
                {integrations.length === 0 ? (
                  <p className="text-rose-400">
                    No WhatsApp integrations configured. Please connect your credentials in the Integrations tab before live testing.
                  </p>
                ) : (
                  <select
                    value={selectedIntegration}
                    onChange={(e) => setSelectedIntegration(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {integrations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.phone_number_id})
                      </option>
                    ))}
                  </select>
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
                Must include country code and '+' prefix (e.g. +91 9876543210 or +1 4155552671).
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
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTriggerSend}
                disabled={sending}
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
            <p className="text-zinc-300">{errorMsg}</p>
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
                You are about to dispatch a live message to <code className="text-white font-mono">{phone}</code> via your connected Meta WhatsApp Cloud API integration.
              </p>
              <ul className="list-disc pl-5 text-zinc-400 space-y-1 text-[11px]">
                <li>Meta conversation pricing rules and template approval requirements apply.</li>
                <li>Your Meta Business Manager will record and bill for this outbound message.</li>
                <li>This is NOT a simulated mock send.</li>
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

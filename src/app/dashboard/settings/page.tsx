"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/Header";
import { Settings, Shield, Lock, AlertTriangle, Key } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    fullName: "Developer",
    email: "developer@example.com",
    role: "Tenant Owner",
  });

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Settings & Credential Security"
        description="Review tenant profile details, encryption configuration, and security practices."
      />

      <div className="p-8 space-y-8 max-w-4xl">
        {/* Security Trade-off Notice */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-5 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Security Disclosure: Immediate Signup Flow
          </div>
          <p className="text-zinc-400 leading-relaxed">
            By design, Verify Stack allows immediate account activation without mandatory email confirmation or email OTP gates.
            This optimizes developer velocity during integration setup. To safeguard your account, we recommend using a high-entropy password
            and keeping your API keys and Meta App Secrets confidential.
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Tenant Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={profile.fullName}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Account Email</label>
              <input
                type="text"
                disabled
                value={profile.email}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300"
              />
            </div>
          </div>
        </div>

        {/* Cryptographic Key Architecture */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f1117] p-6 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Lock className="h-4 w-4 text-emerald-400" />
            Server-Side Key Rotation Architecture
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Verify Stack encrypts stored provider credentials using <code className="text-emerald-400 font-mono">AES-256-GCM</code> with a 32-byte master encryption key stored strictly in server-side environment variables (<code className="text-zinc-300 font-mono">INTEGRATION_ENCRYPTION_KEY</code>).
          </p>
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 text-zinc-400 space-y-1">
            <span className="font-semibold text-white block">Key Rotation Instructions:</span>
            <p>1. When rotating the master key, supply both the previous key and new key during migration.</p>
            <p>2. Run the credential re-encryption script on your backend.</p>
            <p>3. Update the production environment variable and deploy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

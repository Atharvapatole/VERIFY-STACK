import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#090a0d] py-12 text-sm text-zinc-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="font-semibold text-white">Verify Stack</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              WhatsApp OTP Infrastructure for Developers. Connect your own Meta Cloud API, eliminate vendor markups, and verify users securely.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-300 text-xs uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/docs/quickstart" className="hover:text-zinc-200">Quickstart Guide</Link></li>
              <li><Link href="/docs/api" className="hover:text-zinc-200">API Documentation</Link></li>
              <li><Link href="/pricing" className="hover:text-zinc-200">Pricing & Meta Costs</Link></li>
              <li><Link href="/dashboard/test-message" className="hover:text-zinc-200">Test Console</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-300 text-xs uppercase tracking-wider mb-3">Developers</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/docs/api" className="hover:text-zinc-200">REST Endpoints</Link></li>
              <li><Link href="/docs" className="hover:text-zinc-200">Webhook Signatures</Link></li>
              <li><Link href="/docs" className="hover:text-zinc-200">Authentication Templates</Link></li>
              <li><Link href="/dashboard/api-keys" className="hover:text-zinc-200">API Key Tokens</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-300 text-xs uppercase tracking-wider mb-3">Compliance & Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacy" className="hover:text-zinc-200">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-zinc-200">Terms of Service</Link></li>
              <li><Link href="/acceptable-use" className="hover:text-zinc-200">Acceptable Use Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800/60 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} Verify Stack. Designed for developers building on the Meta WhatsApp Business Platform.</p>
          <p className="text-zinc-600">Meta, WhatsApp, and WhatsApp Business are trademarks of Meta Platforms, Inc.</p>
        </div>
      </div>
    </footer>
  );
}

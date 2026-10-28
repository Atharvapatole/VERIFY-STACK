"use client";

import Link from "next/link";
import { ShieldCheck, Terminal, BookOpen, Key, DollarSign, ArrowRight } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#090a0d]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-white">Verify Stack</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400">
              v1.0
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <Link href="/docs" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <BookOpen className="h-4 w-4" /> Docs
          </Link>
          <Link href="/docs/api" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Terminal className="h-4 w-4" /> API Reference
          </Link>
          <Link href="/pricing" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <DollarSign className="h-4 w-4" /> Pricing & Meta Costs
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
          >
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

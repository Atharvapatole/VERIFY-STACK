"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = "bash", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0d0f14] overflow-hidden my-4 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2 bg-zinc-950/60">
        <span className="text-zinc-400 font-medium">{title || language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-zinc-300 leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

"use client";

import { useState } from "react";

/** Copies the post text so it can be pasted into LinkedIn by hand. */
export default function CopyButton({ text, label = "Copy post text" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // clipboard blocked (insecure origin / permissions) — leave the label alone
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className="btn secondary small" onClick={copy}>
      {copied ? "Copied ✓" : label}
    </button>
  );
}

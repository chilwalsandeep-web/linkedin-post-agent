"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  /** Label shown next to the spinner while the request is in flight. */
  pendingLabel?: string;
  className?: string;
}

/**
 * Submit button that flips to a spinner as soon as its form is submitted.
 *
 * The research/write/review steps each take Claude 20-60 seconds, and these are
 * plain HTML form posts (no client-side fetch), so without this the page just
 * sits there looking broken. Any in-flight submit on the page also disables the
 * other buttons, so a job can't be kicked off twice.
 */
export default function SubmitButton({ children, pendingLabel = "Working…", className = "btn" }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "blocked">("idle");

  useEffect(() => {
    const onSubmit = (event: Event) => {
      setState(event.target === ref.current?.form ? "pending" : "blocked");
    };
    // Back/forward navigation can restore this page from the bfcache mid-spinner.
    const onPageShow = () => setState("idle");

    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const busy = state !== "idle";
  return (
    <button ref={ref} type="submit" className={className} disabled={busy} aria-disabled={busy}>
      {state === "pending" ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

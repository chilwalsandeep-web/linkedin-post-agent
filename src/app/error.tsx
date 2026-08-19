"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Error boundary for page renders (route handlers redirect to /error instead). */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Render failed:", error.message);
  }, [error]);

  return (
    <>
      <h1>Something went wrong</h1>
      <div className="banner error" role="alert">
        {error.message || "This page failed to load."}
      </div>
      <p className="lede">Nothing was posted to LinkedIn.</p>
      <div className="actions">
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
        <Link className="btn ghost" href="/">
          Start over
        </Link>
      </div>
    </>
  );
}

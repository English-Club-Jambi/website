"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route] Render error", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="error-page">
      <div className="page-container error-inner">
        <h1>The page did not open.</h1>
        <p>The content is still here. Try the request once more or return home.</p>
        <div className="error-actions">
          <button type="button" className="button-link" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}

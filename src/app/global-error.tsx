"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        <h2>Global Error</h2>
        <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
          {error?.message || String(error)}
        </pre>
        <pre style={{ color: "#666", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
          {error?.stack}
        </pre>
        {error?.digest && <p>Digest: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}

"use client";

// Replaces the root layout entirely when the failure happens above it, so this
// file carries its own html/body and inline styling — none of the app's CSS is
// guaranteed to have loaded at this point.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#faf7f1",
          color: "#2b2723",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "24px",
              fontWeight: 600,
              color: "#8f3c21",
            }}
          >
            CaptureMoment sedang bermasalah
          </h1>
          <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>
            Aplikasi gagal dimuat sepenuhnya. Semua foto dan cerita tetap aman
            di Google Drive dan Sheets.
          </p>
          {error.digest && (
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b6257" }}>
              Kode kesalahan: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              borderRadius: "10px",
              background: "#b8502f",
              color: "#fff",
              padding: "10px 22px",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}

import type { NextConfig } from "next";

// The app asks for camera (Smart Inbox capture), microphone (story dictation),
// and geolocation (map picker), so those stay allowed for our own origin while
// everything else is denied.
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=(self)",
  "microphone=(self)",
  "geolocation=(self)",
  "gyroscope=()",
  "magnetometer=()",
  "payment=()",
  "usb=()",
  "interest-cohort=()",
].join(", ");

const securityHeaders = [
  // A password-gated family album should never be framable by another site.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Keeps the album URL out of the Referer sent to OpenStreetMap and any other
  // outbound link.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Keep the Google client libraries out of the bundler's dependency graph so
  // they load from node_modules at runtime instead of being traced and inlined.
  serverExternalPackages: ["@googleapis/drive", "@googleapis/sheets"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

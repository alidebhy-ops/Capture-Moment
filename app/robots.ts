import type { MetadataRoute } from "next";

// Belt and braces alongside the noindex metadata in the root layout: crawlers
// that never fetch a page still read this, and it covers the public assets
// under /demo as well as the login screen.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

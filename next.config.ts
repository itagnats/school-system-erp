import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Known limitation: `script-src` and `style-src` carry `unsafe-inline`.
 *   - Next injects an inline bootstrap script into every page, and blocking it
 *     breaks hydration. Removing `unsafe-inline` requires a per-request nonce
 *     issued from middleware, which forces every route to render dynamically.
 *   - Style is inline by design here: the shared components read density tokens
 *     through `style` attributes, which `style-src-attr` governs.
 *
 * Everything else is locked down: no plugins, no framing, no cross-origin form
 * posts, and no base-tag rewriting. Tightening script-src with a nonce is
 * tracked as an open item rather than quietly left undone.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // Stop the browser sniffing a response into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy clickjacking defence; frame-ancestors above covers modern browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin cross-site, the full URL same-origin, nothing downgrading.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No feature this application does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework version in every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

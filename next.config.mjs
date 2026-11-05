// next.config.mjs
/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Microphone is allowed for this site only (voice journaling); everything else is off.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be fresh so updates roll out promptly.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  async redirects() {
    // Legacy category URLs now live under /quotes/[category]
    return ["motivational", "romantic", "funny"].map((c) => ({
      source: `/${c}`,
      destination: `/quotes/${c}`,
      permanent: true,
    }));
  },
};

export default nextConfig;

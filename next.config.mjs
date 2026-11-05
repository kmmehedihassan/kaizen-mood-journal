// next.config.mjs
/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Only what the app actually uses: nothing (speech synthesis needs no permission).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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

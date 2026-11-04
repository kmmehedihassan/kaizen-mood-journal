// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

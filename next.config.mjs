/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      rules: {},
    },
    outputFileTracingIncludes: {
      "/(app)/api/dashboard-data/[dataset]/route": ["./data/**/*"],
      "/(app)/page": ["./data/**/*"],
    },
  },
};

export default nextConfig;

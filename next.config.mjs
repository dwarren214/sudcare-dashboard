/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      rules: {},
    },
  },
  outputFileTracingIncludes: {
    "/api/dashboard-data/[dataset]": ["./data/**/*"],
    "/": ["./data/**/*"],
  },
};

export default nextConfig;

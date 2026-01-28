/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  basePath: "/enzetsu-navi",
  experimental: {
    serverActions: {
      allowedOrigins: ["ktak.dev", "localhost:3000", "localhost:3300"],
    },
  },
};

module.exports = nextConfig;

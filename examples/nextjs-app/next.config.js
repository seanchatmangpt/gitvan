/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: true,
  },
  // Disable static generation for dynamic pages
  staticPageGenerationTimeout: undefined,
};

export default nextConfig;

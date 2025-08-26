import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['pawkklvezvrmtpqbztwb.supabase.co'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "placekitten.com",
      },
    ],
  },
  eslint: {
    // ✅ Don’t fail the Vercel build on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Don’t fail the Vercel build on TS type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

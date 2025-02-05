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
};

export default nextConfig;

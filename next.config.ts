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
  async redirects() {
    return [
      // Legacy HTML URLs → clean routes
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/gender-reveal.html', destination: '/gender-reveal', permanent: true },
      { source: '/my-journey/birthday/birthday.html', destination: '/my-journey/birthday', permanent: true },
      { source: '/my-journey/first-year/my-first-year.html', destination: '/my-journey/first-year', permanent: true },
      // Old about page → home
      { source: '/about/genealogy', destination: '/', permanent: true },
    ]
  },
};

export default nextConfig;

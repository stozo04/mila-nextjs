import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pawkklvezvrmtpqbztwb.supabase.co",
      },
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
  typescript: {
    // Was true. A type error that reaches production as a broken page costs more
    // than a failed build. Flipped during the Next 16 upgrade so the migration
    // could not hide behind a green deploy.
    ignoreBuildErrors: false,
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

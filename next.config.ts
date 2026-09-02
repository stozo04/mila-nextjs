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
  sassOptions: {
    quietDeps: true,
    // Every one of these fires inside Bootstrap 5.3's own source, which we
    // cannot fix. quietDeps alone does not catch them: public/scss/bootstrap.scss
    // reaches Bootstrap by relative path (../../node_modules/...), so Sass counts
    // it as our source rather than a dependency.
    // `import` is now needed ONLY for Bootstrap: public/scss has been migrated
    // to @use, and removing this entry still leaves 11 warnings, all from
    // Bootstrap's own internals. Drop it when Bootstrap stops using @import.
    silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"],
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

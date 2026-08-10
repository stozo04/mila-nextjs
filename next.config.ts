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
    // `import` also covers our own @import rules in public/scss. Dart Sass 3.0
    // removes @import for real; migrating those partials to @use is a genuine
    // refactor — module scoping changes which partial sees which variable — and
    // does not belong in a framework upgrade.
    silenceDeprecations: ["import", "global-builtin", "color-functions"],
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

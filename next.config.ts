import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false, // Shared framework guidance lives in docs/PROJECT_INSTRUCTIONS.md.
  images: {
    remotePatterns: [
      // Only the public bucket the app reads from. Every host the image optimizer
      // will fetch from is attack surface (see the Oct 2026 sharp/librsvg advisory).
      {
        protocol: "https",
        hostname: "pawkklvezvrmtpqbztwb.supabase.co",
        pathname: "/storage/v1/object/public/mila_storage_bucket/**",
      },
    ],
  },
  outputFileTracingIncludes: {
    // Transformers.js loads onnxruntime-node through createRequire, which the tracer cannot
    // follow, so without this the search route deploys without its inference engine. Only
    // the linux/x64 CPU binaries: Vercel has no GPU, and every platform together is ~300 MB
    // against the function's 250 MB cap.
    "/api/search/**": [
      "./node_modules/onnxruntime-node/{package.json,dist/*.js}",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/{onnxruntime_binding.node,libonnxruntime.so.1}",
    ],
  },
  outputFileTracingExcludes: {
    // sharp's tracer pulls in every libvips build; Vercel's Node runtime is glibc x64.
    "/api/search/**": [
      "./node_modules/@img/sharp-libvips-linuxmusl-*/**",
      "./node_modules/@img/sharp-linuxmusl-*/**",
      "./node_modules/@img/sharp-wasm32/**",
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

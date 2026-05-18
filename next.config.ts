import type { NextConfig } from "next";

const isMobile = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  // Static export for Capacitor native builds; web uses normal server mode
  ...(isMobile && { output: "export", distDir: "out" }),
  images: {
    // next/image requires a loader for static export
    ...(isMobile && { unoptimized: true }),
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;

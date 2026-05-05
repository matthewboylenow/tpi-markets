import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "taylorproducts.net" },
      { protocol: "https", hostname: "static.wixstatic.com" },
      { protocol: "https", hostname: "www.flavorburst.com" },
      { protocol: "https", hostname: "tpi-website-2026.vercel.app" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["bcrypt"],
};

export default nextConfig;

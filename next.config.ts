import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Images envoyées depuis la médiathèque (Vercel Blob, stockage public).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" }],
  },
};

export default nextConfig;

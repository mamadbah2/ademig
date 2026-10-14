import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Import CSV des membres : le fichier (1 Mo au plus, vérifié par l'action) voyage dans une Server Action.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // Les fiches individuelles des membres ont disparu : leurs anciennes adresses mènent à l'annuaire.
  // Un seul segment sans point : les portraits statiques (/membres/*.jpg) ne sont pas redirigés.
  async redirects() {
    return [{ source: "/membres/:slug([^/.]+)", destination: "/membres", permanent: true }];
  },
  images: {
    // Images envoyées depuis la médiathèque (Vercel Blob, stockage public).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" }],
  },
};

export default nextConfig;

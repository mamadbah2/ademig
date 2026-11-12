import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name}, ${site.shortDescription}`,
    short_name: site.name,
    description: site.description,
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e7",
    theme_color: "#f3f0e7",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

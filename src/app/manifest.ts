import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forage",
    short_name: "Forage",
    description: "Hunt smart. Eat better. AI-powered nutrition and grocery savings.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0c0e09",
    theme_color: "#0c0e09",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    categories: ["health", "food", "fitness"],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CaptureMoment — Ruang Kenangan Keluarga",
    short_name: "CaptureMoment",
    description:
      "Simpan, rencanakan, dan buka kembali cerita keluarga dari perangkat apa pun.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#b75638",
    categories: ["lifestyle", "photo", "family"],
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Abadikan momen",
        short_name: "Momen baru",
        description: "Buka studio untuk menyimpan cerita baru.",
        url: "/new",
        icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Smart Memory Inbox",
        short_name: "Inbox",
        description: "Impor beberapa foto sekaligus.",
        url: "/inbox",
        icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Kilas balik",
        short_name: "Kilas balik",
        description: "Buka kembali kenangan pilihan.",
        url: "/memories",
        icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}

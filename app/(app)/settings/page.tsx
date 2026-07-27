import type { Metadata } from "next";
import ThemeSettings from "@/components/ThemeSettings";

export const metadata: Metadata = {
  title: "Pengaturan Tampilan",
  description:
    "Atur mode terang, gelap, otomatis, dan warna aksen CaptureMoment.",
};

export default function SettingsPage() {
  return <ThemeSettings />;
}

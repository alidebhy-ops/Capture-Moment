import type { Metadata, Viewport } from "next";
import { DM_Sans, Lora } from "next/font/google";
import { cookies, headers } from "next/headers";
import ThemeProvider from "@/components/ThemeProvider";
import {
  parseThemeAccent,
  parseThemeMode,
  THEME_ACCENT_COOKIE,
  THEME_MODE_COOKIE,
} from "@/lib/theme";
import "./globals.css";
import "./features.css";

const sans = DM_Sans({
  variable: "--font-capture-sans",
  subsets: ["latin"],
});

const display = Lora({
  variable: "--font-capture-display",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  let metadataBase = new URL("http://localhost:3000");
  try {
    metadataBase = new URL(`${protocol}://${host}`);
  } catch {
    // Gunakan alamat lokal yang aman bila host tidak valid.
  }

  return {
    metadataBase,
    title: { default: "CaptureMoment — Ruang Kenangan Kita", template: "%s · CaptureMoment" },
    description: "Simpan foto, video, cerita, lokasi, serta rencana kita dalam satu ruang kenangan yang hangat.",
    applicationName: "CaptureMoment",
    // A private album behind a shared password has no business in search
    // results: the login page is publicly reachable and the deploy URL is
    // guessable, so being indexed is the difference between "unlisted" and
    // "findable by anyone".
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/pwa-192.png", type: "image/png", sizes: "192x192" },
      ],
      apple: [{ url: "/pwa-192.png", type: "image/png", sizes: "192x192" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "CaptureMoment",
    },
    openGraph: {
      title: "CaptureMoment — Cerita kita, tersimpan selamanya",
      description: "Foto, video, tempat, cerita, wishlist, dan rencana dalam satu ruang kita.",
      type: "website",
      locale: "id_ID",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "CaptureMoment — Cerita kita, tersimpan selamanya" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "CaptureMoment",
      description: "Ruang kenangan berdua yang hidup.",
      images: ["/og.jpg"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#171512" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialMode = parseThemeMode(
    cookieStore.get(THEME_MODE_COOKIE)?.value
  );
  const initialAccent = parseThemeAccent(
    cookieStore.get(THEME_ACCENT_COOKIE)?.value
  );

  return (
    <html
      lang="id"
      className={`${sans.variable} ${display.variable}`}
      // Opts into smooth in-page scrolling while telling Next to keep route
      // changes instant, so moving between pages does not animate the scroll.
      data-scroll-behavior="smooth"
      data-theme={initialMode}
      data-accent={initialAccent}
    >
      <body>
        <ThemeProvider
          initialMode={initialMode}
          initialAccent={initialAccent}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

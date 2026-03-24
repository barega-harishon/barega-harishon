import type { Metadata, Viewport } from "next";
import { Geist_Mono, Heebo } from "next/font/google";
import { getMotionPreference, getThemePreference } from "@/lib/ui-preferences-server";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ברגע הראשון",
  description: "מערכת ניהול השכרת ציוד לאירועים – עברית ו־RTL",
  icons: {
    icon: [{ url: "/brand/logo.png", type: "image/png" }],
    apple: "/brand/logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "ברגע הראשון",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  /** מאפשר שימוש ב־env(safe-area-inset-*) ב־PWA / אייפון */
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [motion, theme] = await Promise.all([getMotionPreference(), getThemePreference()]);
  return (
    <html
      lang="he"
      dir="rtl"
      data-theme={theme}
      className={`${heebo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`flex min-h-full flex-col bg-background text-foreground ${motion === "reduced" ? "motion-reduced" : ""}`}>
        {children}
      </body>
    </html>
  );
}

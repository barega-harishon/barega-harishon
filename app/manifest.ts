import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ברגע הראשון – ניהול השכרת ציוד",
    short_name: "ברגע הראשון",
    description: "מערכת ניהול השכרת ציוד לאירועים",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#171717",
    lang: "he",
    dir: "rtl",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

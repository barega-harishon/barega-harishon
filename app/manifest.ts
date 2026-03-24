import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ברגע הראשון – ניהול השכרת ציוד",
    short_name: "ברגע הראשון",
    description: "מערכת ניהול השכרת ציוד לאירועים",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f3",
    theme_color: "#2c2c2c",
    lang: "he",
    dir: "rtl",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brand/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** אייקון אפליקציה / מניפסט — אותיות לטיניות לתאימות רינדור ב־ImageResponse */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #171717 0%, #3f3f46 100%)",
          color: "#fafafa",
          fontSize: 200,
          fontWeight: 700,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          letterSpacing: "-0.05em",
        }}
      >
        BH
      </div>
    ),
    { ...size },
  );
}

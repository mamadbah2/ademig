import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}, ${site.shortDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f3f0e7",
          color: "#333233",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>ADEMIG</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 44, lineHeight: 1.2, maxWidth: 900 }}>
            Amicale des ingénieurs diplômés de l&apos;École nationale supérieure des mines et de la
            géologie
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: "#5d4433" }}>{site.motto}</div>
        </div>
        <div style={{ display: "flex", height: 18 }}>
          <div style={{ flex: 3, background: "#5d4433" }} />
          <div style={{ flex: 4, background: "#e3ad46" }} />
          <div style={{ flex: 3, background: "#bd9b68" }} />
          <div style={{ flex: 1, background: "#92b159" }} />
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";

export const alt = "English Club: English grows in company";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#fbfaf6",
        color: "#0c111d",
        fontFamily: "Arial, sans-serif",
        padding: "70px",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderTop: "3px solid #3d47da",
          paddingTop: "28px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          <span>ENGLISH / CLUB</span>
          <span>CONVERSATION RELAY</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
          <div
            style={{
              maxWidth: 890,
              display: "flex",
              fontSize: 96,
              lineHeight: 0.93,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              color: "#3d47da",
            }}
          >
            English grows in company.
          </div>
          <div
            style={{
              width: 78,
              height: 78,
              display: "flex",
              background: "#ef6506",
              borderRadius: 39,
            }}
          />
        </div>
      </div>
    </div>,
    size,
  );
}

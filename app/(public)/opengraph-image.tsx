import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Find Your Equipment — Taylor Products";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #F8F6F1 0%, #ffffff 60%, #fde6cf 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: "8px 16px",
            background: "#fff1e0",
            color: "#cc6200",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            borderRadius: 999,
            marginBottom: 32,
          }}
        >
          Taylor Company — 100 Years of Innovation
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#0E1620",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          Your{" "}
          <span style={{ color: "#0066b2", fontStyle: "italic", fontWeight: 400 }}>
            Business
          </span>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "#5C6470",
            maxWidth: 900,
          }}
        >
          Find the right Taylor and Icetro equipment — soft serve, grills, frozen
          cocktails, slush, milkshakes, and more.
        </div>
      </div>
    ),
    size
  );
}

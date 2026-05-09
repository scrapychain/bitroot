import { ImageResponse } from "next/og";

export const alt = "BitRoot · From Electrons to Code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          backgroundColor: "#0a0a0f",
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(139, 92, 255, 0.25), transparent 55%), radial-gradient(circle at 80% 90%, rgba(255, 43, 214, 0.18), transparent 55%)",
          color: "#e8e9f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#00f0ff",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              background: "#00f0ff",
              borderRadius: "50%",
              boxShadow: "0 0 18px #00f0ff",
            }}
          />
          bitroot
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>From electrons</span>
          <span>
            to{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #00f0ff, #ff2bd6)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              code.
            </span>
          </span>
        </div>
        <div
          style={{
            marginTop: 50,
            fontSize: 28,
            color: "#9598a8",
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          A layered field guide to the foundations of computing. Binary, ASCII, logic gates. Rust
          and C, side-by-side.
        </div>
      </div>
    ),
    { ...size },
  );
}

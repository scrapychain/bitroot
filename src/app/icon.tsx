import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
          background: "#0a0a0f",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            color: "#00f0ff",
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: 26,
            lineHeight: 1,
            textShadow: "0 0 6px #00f0ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {">"}
        </div>
      </div>
    ),
    { ...size },
  );
}

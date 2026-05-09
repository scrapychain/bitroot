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
            width: 14,
            height: 14,
            background: "#00f0ff",
            borderRadius: "50%",
            boxShadow: "0 0 10px #00f0ff",
          }}
        />
      </div>
    ),
    { ...size },
  );
}

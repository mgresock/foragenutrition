import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#4a8c38",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" stroke="white" strokeWidth="0.8" strokeOpacity="0.3" />
          <path d="M16 26 C16 26 7 21 7 13 C7 8.5 10 6 16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 20 C16 20 22 16.5 22 11 C22 8 20 6.5 16 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />
          <path d="M16 9 L16 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="26" r="1.5" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}

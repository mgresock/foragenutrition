import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  const size = 1024;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#2f9e44",
          borderRadius: 232,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size * 0.52}
          height={size * 0.52}
          viewBox="0 0 32 32"
          fill="none"
        >
          {/* Left leaf */}
          <path
            d="M16 26 C16 26 7 21 7 13 C7 8.5 10 6 16 9"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right leaf */}
          <path
            d="M16 20 C16 20 22 16.5 22 11 C22 8 20 6.5 16 9"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.85"
          />
          {/* Stem */}
          <path
            d="M16 9 L16 26"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Root dot */}
          <circle cx="16" cy="26" r="1.8" fill="white" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Content-Disposition": "attachment; filename=forage-logo.png",
        "Content-Type": "image/png",
      },
    }
  );
}

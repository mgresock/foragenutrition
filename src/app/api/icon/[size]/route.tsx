import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = sizeParam === "512" ? 512 : 192;
  const radius = size === 512 ? 120 : 46;
  const s = size / 32; // scale factor

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#2f9e44",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size * 0.58}
          height={size * 0.58}
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
    { width: size, height: size }
  );
}

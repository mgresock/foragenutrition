import { NextResponse } from "next/server";

// Returns a minimal SVG-based PNG placeholder icon until real icons are added to /public/icons/
export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="44" fill="#0c0e09"/>
  <circle cx="96" cy="96" r="88" fill="none" stroke="#b6f040" stroke-width="2" opacity="0.2"/>
  <!-- Forage mark: two leaves + stem -->
  <path d="M96 152 C96 152 58 128 58 88 C58 67 70 57 96 70" stroke="#b6f040" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M96 120 C96 120 124 106 124 74 C124 58 114 51 96 70" stroke="#b6f040" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.7"/>
  <line x1="96" y1="70" x2="96" y2="152" stroke="#b6f040" stroke-width="8" stroke-linecap="round"/>
  <circle cx="96" cy="152" r="6" fill="#b6f040"/>
</svg>`;
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}

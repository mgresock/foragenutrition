interface ForageLogoProps {
  size?: number;
  /** "mark" = icon only, "full" = icon + wordmark, "wordmark" = text only */
  variant?: "mark" | "full" | "wordmark";
  className?: string;
}

export function ForageLogo({ size = 32, variant = "full", className = "" }: ForageLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {variant !== "wordmark" && <LogoMark size={size} />}
      {variant !== "mark" && <LogoWordmark size={size} />}
    </div>
  );
}

function LogoMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring — subtle */}
      <circle cx="16" cy="16" r="15" stroke="#2f9e44" strokeWidth="1" strokeOpacity="0.3" />

      {/* Left leaf — curves from stem up-left */}
      <path
        d="M16 26 C16 26 7 21 7 13 C7 8.5 10 6 16 9"
        stroke="#2f9e44"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right leaf — shorter, curves up-right, offset higher */}
      <path
        d="M16 20 C16 20 22 16.5 22 11 C22 8 20 6.5 16 9"
        stroke="#2f9e44"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.7"
      />

      {/* Stem */}
      <path
        d="M16 9 L16 26"
        stroke="#2f9e44"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Root dot */}
      <circle cx="16" cy="26" r="1.5" fill="#2f9e44" />
    </svg>
  );
}

function LogoWordmark({ size }: { size: number }) {
  const scale = size / 32;
  const fontSize = Math.round(11 * scale * 10) / 10;
  const tracking = Math.round(3 * scale * 10) / 10;

  return (
    <span
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
        fontWeight: 800,
        fontSize: `${fontSize}px`,
        letterSpacing: `${tracking}px`,
        color: "#F2F2F7",
        lineHeight: 1,
        textTransform: "uppercase",
      }}
    >
      FORAGE
    </span>
  );
}

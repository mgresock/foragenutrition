/**
 * Forage branded spinner — logo mark with a rotating arc around it.
 * Use `onLight` when placed on a lime/bright background (e.g. inside buttons).
 */
export function ForageSpinner({
  size = 20,
  onLight = false,
  className = "",
}: {
  size?: number;
  onLight?: boolean;
  className?: string;
}) {
  const arc = onLight ? "#000000" : "#62e23f";
  const arcFade = onLight ? "rgba(0,0,0,0.25)" : "rgba(98,226,63,0.25)";
  const mark = onLight ? "#000000" : "#62e23f";

  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Rotating arc */}
      <svg
        className="absolute inset-0 animate-spin"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        style={{ animationDuration: "0.9s" }}
      >
        {/* Faint full track */}
        <circle cx="16" cy="16" r="14" stroke={arcFade} strokeWidth="2" />
        {/* Bright moving arc — ~75% of circumference */}
        <circle
          cx="16" cy="16" r="14"
          stroke={arc}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="66 22"
        />
      </svg>

      {/* Static logo mark */}
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 32 32"
        fill="none"
      >
        <path
          d="M16 26 C16 26 7 21 7 13 C7 8.5 10 6 16 9"
          stroke={mark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M16 20 C16 20 22 16.5 22 11 C22 8 20 6.5 16 9"
          stroke={mark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          strokeOpacity="0.65"
        />
        <path
          d="M16 9 L16 26"
          stroke={mark} strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx="16" cy="26" r="2" fill={mark} />
      </svg>
    </span>
  );
}

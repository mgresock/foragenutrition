export function AnonAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={{ borderRadius: "50%" }}
    >
      <rect width="40" height="40" rx="20" fill="#1a1f12" />
      {/* Head */}
      <circle cx="20" cy="15" r="7" fill="#3a4232" />
      {/* Body / shoulders */}
      <path d="M6 38 C6 28 34 28 34 38" fill="#3a4232" />
    </svg>
  );
}

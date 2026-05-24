const SparkLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="32" height="32" rx="8" fill="hsl(var(--foreground))" />
    <path
      d="M20 9V31M9 20H31M13.5 13.5L26.5 26.5M26.5 13.5L13.5 26.5"
      stroke="hsl(var(--background))"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="20" cy="20" r="4.5" fill="hsl(var(--primary))" />
  </svg>
);

export default SparkLogo;

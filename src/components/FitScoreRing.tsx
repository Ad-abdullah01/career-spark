import { useEffect, useState } from "react";

interface FitScoreRingProps {
  score: number;
  fitBand?: "strong" | "good" | "stretch";
  size?: number;
  strokeWidth?: number;
}

const FitScoreRing = ({ score, fitBand, size = 80, strokeWidth = 6 }: FitScoreRingProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const color = fitBand === "strong"
    ? "hsl(var(--primary))"
    : fitBand === "good"
      ? "hsl(var(--secondary))"
      : fitBand === "stretch"
        ? "hsl(var(--accent))"
        : score >= 75 ? "hsl(var(--primary))" : score >= 50 ? "hsl(var(--accent))" : "hsl(var(--destructive))";

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-foreground">
        {Math.round(animatedScore)}%
      </span>
    </div>
  );
};

export default FitScoreRing;

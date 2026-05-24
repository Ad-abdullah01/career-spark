import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const phases = ["Your Context", "Your Skills", "Interests", "Values"];

interface PhaseProgressProps {
  currentPhase: number;
  completedPhases: number[];
}

const PhaseProgress = ({ currentPhase, completedPhases }: PhaseProgressProps) => {
  return (
    <div className="space-y-2" aria-label="Assessment progress">
      {phases.map((phase, i) => {
        const isCompleted = completedPhases.includes(i);
        const isCurrent = i === currentPhase;
        return (
          <div
            key={phase}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors",
              !isCompleted && !isCurrent && "border-border/70 bg-background text-muted-foreground",
              isCompleted && "border-primary/25 bg-primary/5",
              isCurrent && "border-foreground bg-card shadow-sm"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                isCompleted && "bg-primary text-primary-foreground",
                isCurrent && !isCompleted && "bg-foreground text-background",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? <Check size={13} /> : i + 1}
            </div>
            <span className={cn(
              "min-w-0 text-sm font-medium",
              isCurrent ? "text-foreground" : "text-muted-foreground"
            )}
            >
              {phase}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default PhaseProgress;

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PathwayResource } from "@/lib/assessmentTypes";

interface Step {
  stepNumber?: number;
  title: string;
  duration?: string;
  durationLabel?: string;
  description?: string;
  summary?: string;
  detail: string;
  recommendation?: string;
  recommendedResources?: PathwayResource[];
  completed?: boolean;
}

interface PathwayTimelineProps {
  steps: Step[];
}

const PathwayTimeline = ({ steps }: PathwayTimelineProps) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const resourceLabel: Record<PathwayResource["type"], string> = {
    certification: "Certification",
    course: "Course",
    book: "Book",
    community: "Community",
    project: "Project",
  };

  return (
    <div className="relative">
      <div className="absolute bottom-4 left-4 top-4 w-px bg-border" />

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="relative pl-12 animate-float-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className={cn(
              "absolute left-[9px] top-4 flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
              step.completed
                ? "bg-accent border-accent"
                : "border-primary bg-background"
            )}>
              {step.completed && <Check size={10} className="text-accent-foreground" />}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Step {i + 1}</p>
                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {(step.durationLabel || step.duration) && (
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{step.durationLabel || step.duration}</span>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="rounded-md p-1 transition-colors hover:bg-muted"
                    aria-label={expanded === i ? "Collapse step" : "Expand step"}
                  >
                    <ChevronDown size={16} className={cn("transition-transform text-muted-foreground", expanded === i && "rotate-180")} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.summary || step.description}</p>

              {expanded === i && (
                <div className="mt-4 space-y-3 border-t border-border pt-4 animate-fade-in">
                  <p className="text-sm leading-6 text-foreground">{step.detail}</p>
                  {step.recommendation && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recommended</p>
                      <p className="text-sm text-foreground mt-1">{step.recommendation}</p>
                    </div>
                  )}
                  {step.recommendedResources && step.recommendedResources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {step.recommendedResources.map((resource, resourceIndex) => (
                        <span key={`${resource.name}-${resourceIndex}`} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                          {resourceLabel[resource.type]} · {resource.name}
                          {resource.provider && <span className="text-muted-foreground"> · {resource.provider}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PathwayTimeline;

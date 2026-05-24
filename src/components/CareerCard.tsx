import { CareerRecommendation } from "@/lib/assessmentTypes";
import FitScoreRing from "./FitScoreRing";
import { ArrowRight } from "lucide-react";

interface CareerCardProps {
  career: CareerRecommendation;
  onViewPathway: () => void;
}

const demandLabel: Record<CareerRecommendation["demandTrend"], string> = {
  growing: "Growing",
  stable: "Stable",
  declining: "Declining",
};

const CareerCard = ({ career, onViewPathway }: CareerCardProps) => {
  const salary = `£${career.indicativeSalary.min.toLocaleString()}–£${career.indicativeSalary.max.toLocaleString()}`;
  const initials = career.title
    .split(" ")
    .slice(0, 2)
    .map(part => part[0])
    .join("");

  return (
    <article className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-sm font-semibold text-foreground">
          {initials}
        </div>
        <FitScoreRing score={career.fitScore} fitBand={career.fitBand} size={58} strokeWidth={5} />
      </div>

      <h3 className="mb-1 text-lg font-semibold text-foreground">{career.title}</h3>
      <p className="text-sm text-muted-foreground">{career.fitScore}% match</p>
      {career.divergent && (
        <p className="mt-3 inline-flex w-fit rounded-md bg-accent/15 px-2.5 py-1 text-xs font-medium text-foreground">
          Stretch fit — worth knowing about
        </p>
      )}

      <div className="my-5 grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border bg-background p-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Demand</p>
          <p className="text-xs font-medium text-foreground">{demandLabel[career.demandTrend]}</p>
        </div>
        <div className="rounded-md border border-border bg-background p-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Salary</p>
          <p className="text-xs font-medium text-foreground">{salary}</p>
        </div>
        <div className="rounded-md border border-border bg-background p-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Entry</p>
          <p className="text-xs font-medium text-foreground">{career.entryAgeRange.min}–{career.entryAgeRange.max}</p>
        </div>
      </div>

      <p className="mb-5 text-sm leading-6 text-muted-foreground">{career.oneLineFit}</p>

      <button
        onClick={onViewPathway}
        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        View pathway
        <ArrowRight size={16} />
      </button>
    </article>
  );
};

export default CareerCard;

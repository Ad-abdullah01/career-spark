import { useCallback, useEffect, useState } from "react";
import FitScoreRing from "@/components/FitScoreRing";
import PathwayTimeline from "@/components/PathwayTimeline";
import { ArrowLeft, TrendingUp, Calendar, Banknote } from "lucide-react";
import { CareerPathway, CareerRecommendation, SessionV3 } from "@/lib/assessmentTypes";
import { SessionStore } from "@/lib/sessionStore";

interface PathwayPageProps {
  career: CareerRecommendation | null;
  onBack: () => void;
}

const PathwaySkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="h-28 rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="mb-3 h-4 w-1/3 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    ))}
  </div>
);

const formatSalary = (salary: CareerPathway["indicativeSalary"]) => `£${salary.min.toLocaleString()}–£${salary.max.toLocaleString()}`;
const formatDemand = (trend: CareerPathway["demandTrend"]) => trend.charAt(0).toUpperCase() + trend.slice(1);

const PathwayPage = ({ career, onBack }: PathwayPageProps) => {
  const [session, setSession] = useState<SessionV3>(() => SessionStore.load());
  const [pathway, setPathway] = useState<CareerPathway | null>(() => career ? session.pathways?.[career.id]?.payload || null : null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePathway = useCallback(async () => {
    if (!career) return;
    const cached = session.pathways?.[career.id]?.payload;
    if (cached) {
      setPathway(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pathway/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: session.profile, career }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "The pathway engine could not respond.");
      }

      const payload = (await response.json()) as CareerPathway;
      const nextSession: SessionV3 = {
        ...session,
        pathways: {
          ...(session.pathways || {}),
          [career.id]: { generatedAt: new Date().toISOString(), payload },
        },
      };
      SessionStore.save(nextSession);
      setSession(nextSession);
      setPathway(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The pathway engine could not respond.");
    } finally {
      setIsLoading(false);
    }
  }, [career, session]);

  useEffect(() => {
    void generatePathway();
  }, [generatePathway]);

  if (!career) {
    return (
      <div className="min-h-screen bg-background px-4 pb-12 pt-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <button onClick={onBack} className="mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft size={16} /> Back to results
          </button>
          <p className="text-sm text-muted-foreground">Choose a career recommendation first.</p>
        </div>
      </div>
    );
  }

  const display = pathway || {
    career: { title: career.title, emoji: career.emoji, fitScore: career.fitScore },
    whyThisFits: career.whyThisFitsYou,
    entryRoutes: [],
    indicativeSalary: career.indicativeSalary,
    entryAgeRange: career.entryAgeRange,
    demandTrend: career.demandTrend,
    steps: [],
    totalEstimatedDuration: "",
    caveats: career.risks,
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-12 pt-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to results
        </button>

        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pathway</p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">{display.career.title}</h1>
            </div>
            <FitScoreRing score={display.career.fitScore} fitBand={career.fitBand} size={64} strokeWidth={5} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Banknote, label: "Salary", value: formatSalary(display.indicativeSalary), source: "Indicative range" },
                { icon: Calendar, label: "Entry age", value: `${display.entryAgeRange.min}–${display.entryAgeRange.max}` },
                { icon: TrendingUp, label: "Demand", value: formatDemand(display.demandTrend), source: "Indicative range" },
              ].map((stat, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3">
                  <stat.icon size={16} className="mb-2 text-primary" />
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{stat.value}</p>
                  {stat.source && <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{stat.source}</p>}
                </div>
              ))}
            </div>

            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Why this fits</h2>
              <ul className="mt-4 space-y-3">
                {display.whyThisFits.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            {display.entryRoutes.length > 0 && (
              <section className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">Entry routes</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {display.entryRoutes.map((route, i) => (
                    <span key={i} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
                      {route}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Execution plan</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Your pathway</h2>
              </div>
              {display.totalEstimatedDuration && (
                <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {display.totalEstimatedDuration}
                </span>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm text-foreground">{error}</p>
                <button onClick={generatePathway} className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
                  Retry
                </button>
              </div>
            )}
            {isLoading && !pathway ? <PathwaySkeleton /> : <PathwayTimeline steps={display.steps} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathwayPage;

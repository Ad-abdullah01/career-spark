import { useCallback, useEffect, useMemo, useState } from "react";
import CareerCard from "@/components/CareerCard";
import { CareerRecommendation, RecommendationsPayload, SessionV3 } from "@/lib/assessmentTypes";
import { SessionStore } from "@/lib/sessionStore";

interface ResultsPageProps {
  onViewPathway: (career: CareerRecommendation) => void;
}

const ResultsSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="h-72 rounded-lg border border-border bg-card p-5 animate-pulse">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-10 w-10 rounded-md bg-muted" />
          <div className="h-16 w-16 rounded-full bg-muted" />
        </div>
        <div className="mb-3 h-5 w-2/3 rounded bg-muted" />
        <div className="mb-8 h-3 w-1/3 rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-8 rounded-md bg-muted" />
          <div className="h-8 rounded-md bg-muted" />
          <div className="h-8 rounded-md bg-muted" />
        </div>
      </div>
    ))}
  </div>
);

const ResultsPage = ({ onViewPathway }: ResultsPageProps) => {
  const [session, setSession] = useState<SessionV3>(() => SessionStore.load());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDebug = useMemo(() => new URLSearchParams(window.location.search).get("debug") === "1", []);
  const payload = session.recommendations?.payload;

  const generateRecommendations = useCallback(async (forceRefresh = false) => {
    if (session.recommendations && !forceRefresh) return;
    if (!session.isComplete) {
      setError("Complete the assessment before generating recommendations.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: session.profile }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "The recommendation engine could not respond.");
      }

      const nextPayload = (await response.json()) as RecommendationsPayload;
      const nextSession: SessionV3 = {
        ...session,
        recommendations: { generatedAt: nextPayload.generatedAt, payload: nextPayload },
      };
      SessionStore.save(nextSession);
      setSession(nextSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The recommendation engine could not respond.");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void generateRecommendations(false);
  }, [generateRecommendations]);

  return (
    <div className="min-h-screen bg-background px-4 pb-12 pt-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
          <div className="rounded-lg border border-border bg-card p-6 animate-fade-in">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Career matches</p>
            {payload ? (
              <p className="max-w-3xl text-lg leading-8 text-foreground">
                Based on your background in <strong>{payload.basedOn.signal1}</strong>, your interest in{" "}
                <strong>{payload.basedOn.signal2}</strong>, and your priority of{" "}
                <strong>{payload.basedOn.signal3}</strong>, here are your top matches.
              </p>
            ) : (
              <p className="text-muted-foreground">Generating career matches from your assessment profile...</p>
            )}
          </div>
          <button
            onClick={() => generateRecommendations(true)}
            disabled={isLoading}
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh recommendations
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-foreground">{error}</p>
            <button onClick={() => generateRecommendations(true)} className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
              Retry
            </button>
          </div>
        )}

        {isLoading && !payload ? (
          <ResultsSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {payload?.recommendations.map((career, i) => (
              <div key={career.id} className="animate-float-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <CareerCard career={career} onViewPathway={() => onViewPathway(career)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {isDebug && payload && (
        <aside className="fixed bottom-4 right-4 z-50 max-h-[70vh] w-[min(92vw,32rem)] overflow-auto rounded-lg border border-border bg-card/95 p-4 text-xs shadow-xl backdrop-blur">
          <p className="mb-2 font-semibold text-foreground">Recommendations debug</p>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-[11px] text-foreground">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </aside>
      )}
    </div>
  );
};

export default ResultsPage;

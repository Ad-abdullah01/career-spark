import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import PhaseProgress from "@/components/PhaseProgress";
import SparkLogo from "@/components/SparkLogo";
import { AssessmentEngineResponse, AssessmentOption, DrilledField, ProfileField, ProfileV3, PhaseName, SessionV3, TargetSlot, Turn } from "@/lib/assessmentTypes";
import { createTurn, SessionStore } from "@/lib/sessionStore";
import { cn } from "@/lib/utils";

interface AssessmentPageProps {
  onComplete: () => void;
}

const LAST_REASONING_KEY = "careerspark_last_reasoning_v3";
const PHASE_LABELS: Record<PhaseName, string> = {
  context: "Context",
  skills: "Skills",
  interests: "Interests",
  values: "Values",
};

const fieldIsFilled = <T,>(field: ProfileField<T>) => Boolean(field.value && field.confidence >= 0.7);
const arrayFieldIsFilled = (field: ProfileField<string[]>, minCount = 1) => Boolean(field.value && field.value.length >= minCount && field.confidence >= 0.7);
const drilledFieldIsFilled = (field: DrilledField<string[]>) => fieldIsFilled(field) && field.depth >= 2;

const getProgressState = (profile: ProfileV3, targetSlot?: TargetSlot) => {
  const completedPhases: number[] = [];
  const contextDone = [
    profile.context.educationLevel,
    profile.context.currentDomain,
    profile.context.geographicMobility,
    profile.context.financialConstraints,
    profile.context.timeHorizon,
  ].every(fieldIsFilled);
  const skillsDone = drilledFieldIsFilled(profile.skills.technicalSkills)
    && arrayFieldIsFilled(profile.skills.softSkills, 2)
    && fieldIsFilled(profile.skills.learningPreference);
  const interestsDone = drilledFieldIsFilled(profile.interests.domainInterests)
    && arrayFieldIsFilled(profile.interests.workActivities);
  const valuesDone = [
    profile.values.topPriority,
    profile.values.workLifeStance,
    profile.values.socialImpact,
  ].every(fieldIsFilled);
  const phaseStatus = [contextDone, skillsDone, interestsDone, valuesDone];

  phaseStatus.forEach((done, index) => {
    if (done) completedPhases.push(index);
  });

  const targetPhase = targetSlot?.split(".")[0] as PhaseName | undefined;
  const targetPhaseIndex = targetPhase ? (["context", "skills", "interests", "values"] as PhaseName[]).indexOf(targetPhase) : -1;
  const currentPhase = targetPhaseIndex >= 0 ? targetPhaseIndex : Math.max(0, phaseStatus.findIndex(done => !done));
  return {
    completedPhases,
    currentPhase: currentPhase === -1 ? 3 : currentPhase,
  };
};

const AiAvatar = () => (
  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border bg-card">
    <SparkLogo size={17} />
  </div>
);

const ThinkingBubble = () => (
  <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-3">
    {[0, 1, 2].map(dot => (
      <span
        key={dot}
        className="h-2 w-2 animate-bounce rounded-full bg-primary/70"
        style={{ animationDelay: `${dot * 0.12}s` }}
      />
    ))}
  </div>
);

const getLatestAssistantTurn = (session: SessionV3) => {
  return [...session.conversationHistory].reverse().find(turn => turn.role === "assistant");
};

const AssessmentPage = ({ onComplete }: AssessmentPageProps) => {
  const [session, setSession] = useState<SessionV3>(() => SessionStore.load());
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [lastReasoning, setLastReasoning] = useState(() => localStorage.getItem(LAST_REASONING_KEY) || "");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isDebug = useMemo(() => new URLSearchParams(window.location.search).get("debug") === "1", []);
  const latestAssistantTurn = getLatestAssistantTurn(session);
  const latestTargetSlot = latestAssistantTurn?.targetSlot;
  const progress = getProgressState(session.profile, latestTargetSlot);
  const activePhaseName = PHASE_LABELS[(["context", "skills", "interests", "values"] as PhaseName[])[progress.currentPhase]];
  const canAnswer = !session.isComplete && !isThinking && latestAssistantTurn?.optionsShown;
  const canUseCustom = !session.isComplete && !isThinking && session.turnCount > 0;

  useEffect(() => {
    SessionStore.save(session);
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session.conversationHistory.length, isThinking, error, session.isComplete]);

  const callNextTurn = async (nextSession: SessionV3) => {
    setIsThinking(true);
    setError(null);

    try {
      const response = await fetch("/api/assessment/next-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: nextSession }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "The assessment engine could not respond.");
      }

      const engineResponse = (await response.json()) as AssessmentEngineResponse;
      const updatedSession = SessionStore.applyEngineResponse(nextSession, engineResponse);
      setSession(updatedSession);
      setLastReasoning(engineResponse.reasoning);
      localStorage.setItem(LAST_REASONING_KEY, engineResponse.reasoning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assessment engine could not respond.");
      setSession(nextSession);
    } finally {
      setIsThinking(false);
    }
  };

  const submitAnswer = (content: string, selectedOptionId?: string, customAnswer?: string) => {
    if (!content.trim() || session.isComplete || isThinking) return;

    const userTurn = createTurn({
      role: "user",
      content,
      selectedOptionId,
      customText: customAnswer,
    });

    const nextSession = {
      ...SessionStore.appendTurn(session, userTurn),
      turnCount: session.turnCount + 1,
    };

    setSession(nextSession);
    setCustomText("");
    void callNextTurn(nextSession);
  };

  const handleOption = (option: AssessmentOption) => {
    submitAnswer(option.label, option.id);
  };

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitAnswer(customText, undefined, customText);
  };

  const handleRetry = () => {
    void callNextTurn(session);
  };

  const handleReset = () => {
    const nextSession = SessionStore.reset();
    localStorage.removeItem(LAST_REASONING_KEY);
    setLastReasoning("");
    setError(null);
    setCustomText("");
    setSession(nextSession);
  };

  const renderTurn = (turn: Turn, index: number) => {
    if (turn.role === "user") {
      return (
        <div key={`${turn.timestamp}-${index}`} className="flex justify-end animate-float-up">
          <div className="max-w-[82%] rounded-lg bg-foreground px-4 py-3 text-sm font-medium leading-6 text-background">
            {turn.content}
          </div>
        </div>
      );
    }

    return (
      <div key={`${turn.timestamp}-${index}`} className="flex items-start gap-3 animate-float-up">
        <AiAvatar />
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm leading-relaxed text-foreground">{turn.content}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-10 pt-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Assessment</p>
          {/* <h1 className="mt-3 text-2xl font-semibold leading-tight text-foreground">Build the signal.</h1> */}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The conversation narrows your context, skills, interests, and values into a career profile.
          </p>
          <div className="mt-6">
            <PhaseProgress currentPhase={progress.currentPhase} completedPhases={progress.completedPhases} />
          </div>
        </aside>

        <section className="min-h-[70vh] rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Question {Math.min(session.turnCount + 1, 22)}</p>
              <p className="mt-1 text-sm font-medium text-foreground">Phase: {activePhaseName}</p>
            </div>
            {session.conversationHistory.length > 1 && (
              <button onClick={handleReset} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                Start over
              </button>
            )}
          </div>

          <div className="space-y-5">
            {session.conversationHistory.map(renderTurn)}

            {isThinking && (
              <div className="flex items-start gap-3 animate-fade-in">
                <AiAvatar />
                <ThinkingBubble />
              </div>
            )}

            {error && (
              <div className="ml-12 rounded-lg border border-destructive/25 bg-destructive/5 p-4 animate-fade-in">
                <p className="text-sm text-foreground">{error}</p>
                <button onClick={handleRetry} className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
                  Retry
                </button>
              </div>
            )}

            {canAnswer && (
              <div className="ml-12 space-y-3 animate-float-up">
                <div className="flex flex-wrap gap-2.5">
                  {latestAssistantTurn.optionsShown?.map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleOption(option)}
                      className="rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-muted"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {canUseCustom && (
                  <form onSubmit={handleCustomSubmit} className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={customText}
                      onChange={event => setCustomText(event.target.value)}
                      placeholder="Or describe in your own words"
                      className={cn(
                        "min-h-11 flex-1 rounded-md border border-border bg-background px-4 text-sm outline-none transition-colors",
                        "focus:border-primary"
                      )}
                    />
                    <button
                      type="submit"
                      disabled={!customText.trim()}
                      className="rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            )}

            {session.isComplete && (
              <div className="ml-12 rounded-lg border border-primary/20 bg-primary/5 p-4 animate-fade-in">
                <p className="text-sm text-foreground">Assessment complete.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button onClick={onComplete} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
                    View career matches
                  </button>
                  <button onClick={handleReset} className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
                    Start over
                  </button>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </section>
      </div>

      {isDebug && (
        <aside className="fixed bottom-4 right-4 z-50 max-h-[70vh] w-[min(92vw,28rem)] overflow-auto rounded-lg border border-border bg-card/95 p-4 text-xs shadow-xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold text-foreground">Assessment debug</p>
            <p className="text-muted-foreground">Turn {session.turnCount}</p>
          </div>
          <p className="mb-2 font-medium text-muted-foreground">Current profile</p>
          <pre className="mb-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-[11px] text-foreground">
            {JSON.stringify(session.profile, null, 2)}
          </pre>
          <p className="mb-2 font-medium text-muted-foreground">Last reasoning</p>
          <p className="rounded-md bg-muted p-3 text-[11px] leading-relaxed text-foreground">
            {lastReasoning || "No Gemini turn yet."}
          </p>
        </aside>
      )}
    </div>
  );
};

export default AssessmentPage;

import {
  AssessmentEngineResponse,
  createEmptyProfile,
  firstQuestion,
  ProfileV3,
  SessionV3,
  Turn,
} from "./assessmentTypes";

export const SESSION_STORAGE_KEY = "careerspark_session_v3_recs1";
export const LEGACY_SESSION_STORAGE_KEYS = ["careerspark_session_v1", "careerspark_session_v2", "careerspark_session_v3"];

const nowIso = () => new Date().toISOString();

const createSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const createFirstAssistantTurn = (): Turn => ({
  role: "assistant",
  content: firstQuestion.questionText,
  targetSlot: firstQuestion.targetSlot,
  optionsShown: firstQuestion.options,
  timestamp: nowIso(),
});

const mergeProfile = (profile: ProfileV3, updates: Partial<ProfileV3>): ProfileV3 => ({
  context: { ...profile.context, ...updates.context },
  skills: { ...profile.skills, ...updates.skills },
  interests: { ...profile.interests, ...updates.interests },
  values: { ...profile.values, ...updates.values },
});

const clearLegacySessions = () => {
  LEGACY_SESSION_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
};

export class SessionStore {
  static create(): SessionV3 {
    return {
      sessionId: createSessionId(),
      startedAt: nowIso(),
      profile: createEmptyProfile(),
      conversationHistory: [createFirstAssistantTurn()],
      turnCount: 0,
      isComplete: false,
      pathways: {},
    };
  }

  static load(): SessionV3 {
    clearLegacySessions();
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!raw) {
      return this.create();
    }

    try {
      const parsed = JSON.parse(raw) as SessionV3;
      if (!parsed.sessionId || !parsed.profile?.context || !Array.isArray(parsed.conversationHistory)) {
        return this.create();
      }
      return parsed;
    } catch {
      return this.create();
    }
  }

  static save(session: SessionV3): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  static reset(): SessionV3 {
    clearLegacySessions();
    const session = this.create();
    this.save(session);
    return session;
  }

  static appendTurn(session: SessionV3, turn: Turn): SessionV3 {
    return {
      ...session,
      conversationHistory: [...session.conversationHistory, turn],
    };
  }

  static updateProfile(session: SessionV3, updates: Partial<ProfileV3>): SessionV3 {
    return {
      ...session,
      profile: mergeProfile(session.profile, updates),
    };
  }

  static applyEngineResponse(session: SessionV3, response: AssessmentEngineResponse): SessionV3 {
    const profileSession = this.updateProfile(session, response.profileUpdates);
    const nextHistory = !response.isComplete
      ? [
          ...profileSession.conversationHistory,
          {
            role: "assistant" as const,
            content: response.nextQuestion.questionText,
            targetSlot: response.nextQuestion.targetSlot,
            optionsShown: response.nextQuestion.options,
            timestamp: nowIso(),
          },
        ]
      : profileSession.conversationHistory;

    return {
      ...profileSession,
      conversationHistory: nextHistory,
      isComplete: response.isComplete,
    };
  }
}

export const createTurn = (turn: Omit<Turn, "timestamp">): Turn => ({
  ...turn,
  timestamp: nowIso(),
});

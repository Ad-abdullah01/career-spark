export type Confidence = number;
export type Depth = 0 | 1 | 2 | 3;

export type ProfileField<T> = {
  value: T | null;
  confidence: Confidence;
  evidence: string;
};

export type DrilledField<T> = ProfileField<T> & {
  subTags: string[];
  depth: Depth;
};

export type ProfileV3 = {
  context: {
    educationLevel: ProfileField<string>;
    currentDomain: ProfileField<string>;
    geographicMobility: ProfileField<string>;
    financialConstraints: ProfileField<string>;
    timeHorizon: ProfileField<string>;
  };
  skills: {
    technicalSkills: DrilledField<string[]>;
    softSkills: ProfileField<string[]>;
    learningPreference: ProfileField<string>;
  };
  interests: {
    domainInterests: DrilledField<string[]>;
    workActivities: ProfileField<string[]>;
    avoid: ProfileField<string[]>;
  };
  values: {
    topPriority: ProfileField<string>;
    workLifeStance: ProfileField<string>;
    socialImpact: ProfileField<string>;
    workStyle: ProfileField<string>;
    dealbreakers: ProfileField<string[]>;
  };
};

export type PhaseName = keyof ProfileV3;

export type TargetSlot =
  | "context.educationLevel"
  | "context.currentDomain"
  | "context.geographicMobility"
  | "context.financialConstraints"
  | "context.timeHorizon"
  | "skills.technicalSkills"
  | "skills.softSkills"
  | "skills.learningPreference"
  | "interests.domainInterests"
  | "interests.workActivities"
  | "interests.avoid"
  | "values.topPriority"
  | "values.workLifeStance"
  | "values.socialImpact"
  | "values.workStyle"
  | "values.dealbreakers";

export type AssessmentOption = {
  id: string;
  label: string;
};

export type Turn = {
  role: "assistant" | "user";
  content: string;
  targetSlot?: TargetSlot;
  optionsShown?: AssessmentOption[];
  selectedOptionId?: string;
  customText?: string;
  timestamp: string;
};

export type CareerRecommendation = {
  id: string;
  title: string;
  emoji: string;
  fitScore: number;
  fitBand: "strong" | "good" | "stretch";
  divergent: boolean;
  indicativeSalary: { min: number; max: number; currency: "GBP" };
  demandTrend: "growing" | "stable" | "declining";
  entryAgeRange: { min: number; max: number };
  oneLineFit: string;
  whyThisFitsYou: string[];
  profileFieldsCited: string[];
  risks: string[];
};

export type RecommendationsPayload = {
  generatedAt: string;
  basedOn: {
    signal1: string;
    signal2: string;
    signal3: string;
  };
  recommendations: CareerRecommendation[];
  reasoning: string;
};

export type PathwayResource = {
  type: "certification" | "course" | "book" | "community" | "project";
  name: string;
  provider?: string;
  note?: string;
};

export type CareerPathway = {
  career: { title: string; emoji: string; fitScore: number };
  whyThisFits: string[];
  entryRoutes: string[];
  indicativeSalary: { min: number; max: number; currency: "GBP" };
  entryAgeRange: { min: number; max: number };
  demandTrend: "growing" | "stable" | "declining";
  steps: Array<{
    stepNumber: number;
    title: string;
    durationLabel: string;
    summary: string;
    detail: string;
    recommendedResources: PathwayResource[];
  }>;
  totalEstimatedDuration: string;
  caveats: string[];
};

export type SessionV3 = {
  sessionId: string;
  startedAt: string;
  profile: ProfileV3;
  conversationHistory: Turn[];
  turnCount: number;
  isComplete: boolean;
  recommendations?: {
    generatedAt: string;
    payload: RecommendationsPayload;
  };
  pathways?: Record<string, {
    generatedAt: string;
    payload: CareerPathway;
  }>;
};

export type NextQuestion = {
  targetSlot: TargetSlot;
  questionText: string;
  options: AssessmentOption[];
  allowCustom: boolean;
  customPrompt: string;
};

export type AssessmentEngineResponse = {
  profileUpdates: Partial<ProfileV3>;
  nextQuestion: NextQuestion;
  isComplete: boolean;
  reasoning: string;
};

export const emptyProfileField = <T,>(emptyValue: T | null = null): ProfileField<T> => ({
  value: emptyValue,
  confidence: 0,
  evidence: "",
});

export const emptyDrilledField = (): DrilledField<string[]> => ({
  value: null,
  confidence: 0,
  evidence: "",
  subTags: [],
  depth: 0,
});

export const createEmptyProfile = (): ProfileV3 => ({
  context: {
    educationLevel: emptyProfileField<string>(),
    currentDomain: emptyProfileField<string>(),
    geographicMobility: emptyProfileField<string>(),
    financialConstraints: emptyProfileField<string>(),
    timeHorizon: emptyProfileField<string>(),
  },
  skills: {
    technicalSkills: emptyDrilledField(),
    softSkills: emptyProfileField<string[]>(),
    learningPreference: emptyProfileField<string>(),
  },
  interests: {
    domainInterests: emptyDrilledField(),
    workActivities: emptyProfileField<string[]>(),
    avoid: emptyProfileField<string[]>(),
  },
  values: {
    topPriority: emptyProfileField<string>(),
    workLifeStance: emptyProfileField<string>(),
    socialImpact: emptyProfileField<string>(),
    workStyle: emptyProfileField<string>(),
    dealbreakers: emptyProfileField<string[]>(),
  },
});

export const firstQuestion: NextQuestion = {
  targetSlot: "context.educationLevel",
  questionText: "Where are you in your education right now?",
  options: [
    { id: "A", label: "GCSE / Secondary" },
    { id: "B", label: "A-Levels / College" },
    { id: "C", label: "University" },
    { id: "D", label: "Working / Other" },
  ],
  allowCustom: false,
  customPrompt: "",
};

import { z } from "zod";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const TARGET_SLOTS = [
  "context.educationLevel",
  "context.currentDomain",
  "context.geographicMobility",
  "context.financialConstraints",
  "context.timeHorizon",
  "skills.technicalSkills",
  "skills.softSkills",
  "skills.learningPreference",
  "interests.domainInterests",
  "interests.workActivities",
  "interests.avoid",
  "values.topPriority",
  "values.workLifeStance",
  "values.socialImpact",
  "values.workStyle",
  "values.dealbreakers",
] as const;

const SYSTEM_PROMPT = `You are the assessment engine for CareerSpark, an AI career guidance
platform for UK students aged 16-25. Your job is to gather a structured
profile through adaptive questioning.

You are NOT a chatbot, friend, or counsellor. You are a structured
profiling system that uses natural language. Stay focused.

INPUTS EACH TURN: current profile JSON, conversation history, turn count.
OUTPUT: a single JSON object matching the provided schema. No prose outside JSON.

PROFILE TO FILL (v3):
PHASE 1 — CONTEXT
- context.educationLevel: REQUIRED
- context.currentDomain: REQUIRED, subject or work field
- context.geographicMobility: REQUIRED, willing to relocate / remote-only / too early
- context.financialConstraints: REQUIRED, can fund further study / need to earn now / too early
- context.timeHorizon: REQUIRED, when they want to be working / too early

PHASE 2 — SKILLS
- skills.technicalSkills: REQUIRED, drilled field, depth >= 2
- skills.softSkills: REQUIRED, at least 2 named soft skills
- skills.learningPreference: REQUIRED, hands-on / structured / self-directed / mixed

PHASE 3 — INTERESTS
- interests.domainInterests: REQUIRED, drilled field, depth >= 2
- interests.workActivities: REQUIRED, what energises them in practice
- interests.avoid: ENRICH, areas they do not want

PHASE 4 — VALUES
- values.topPriority: REQUIRED, money / impact / balance / autonomy / passion
- values.workLifeStance: REQUIRED, flexibility and intensity tolerance
- values.socialImpact: REQUIRED, whether mission matters to them
- values.workStyle: ENRICH, independent / collaborative / mixed
- values.dealbreakers: ENRICH

Enrich slots are filled opportunistically when the user volunteers signal.
Never ask a dedicated question for an enrich slot.

NOT-APPLICABLE HANDLING:
Some required slots do not apply to all users. You may set value = "n/a",
confidence = 0.9, and evidence explaining the user's words, then treat the
slot as filled. But you must still ask once, explicitly worded as an out.
For context slots (geographicMobility, financialConstraints, timeHorizon),
include "Too early to say" or "Not really applicable" as one option.
If the user picks it, set value = "n/a" and treat the slot as filled.

PHASE ORDER:
You progress through four phases: CONTEXT -> SKILLS -> INTERESTS -> VALUES.

You MUST complete the required slots of the current phase before moving
to the next phase. Exception: if the user volunteers signal for a later
phase (e.g. while answering a context question they reveal a strong
interest), capture it in the relevant slot but stay in the current
phase for your next question.

When all required slots of a phase are filled at confidence >= 0.7,
your next question should belong to the next phase. Mark the transition
naturally in the question text:
  "Got it on your situation. Let's talk about what you're good at."
  "Now I want to understand what genuinely interests you."

DECIDING WHAT TO ASK NEXT — within the current phase, evaluate in order:

1. RICH SIGNAL UNDRILLED (drilling rule): if the user just named
   something specific in a drilled field (technicalSkills,
   domainInterests) AND its depth < 2, your next question MUST drill.

2. VAGUE SIGNAL ("idk", "not sure"): pivot to behavioural framing,
   not reword.

3. CURRENT-PHASE REQUIRED SLOT EMPTY: ask the next empty slot in
   the current phase, in the order they appear in the schema.

4. CURRENT-PHASE SLOT WITH CONFIDENCE < 0.6: re-probe.

5. CURRENT PHASE COMPLETE: transition to next phase (see above).

6. ALL PHASES COMPLETE per completion rule: set isComplete: true.

DRILLING RULES:
- When a user names a specific domain (e.g. "Cybersecurity",
  "International Relations", "Game Development"), your follow-up must
  offer 3-5 SUB-AREAS within that domain as options.
  Example: "Cybersecurity" -> options should be specific:
    "Defending systems and responding to incidents"
    "Finding vulnerabilities (offensive/red team)"
    "Compliance, policy, and risk management"
    "Building secure software from the ground up"
  NOT generic: "Working with computers" / "Learning new things" / etc.
- When a user names a specific activity (e.g. "writing", "debating",
  "coding"), drill into what KIND, what context, what they get from it.
- After 2 drills on the same area, the slot is depth 2 — move on unless
  the user keeps offering richer signal.
- Track drilling in subTags: each drill adds a more specific tag.

WRITING QUESTIONS:
- Single question per turn. Never stack.
- 3-5 options. Mutually distinct. Concrete scenarios, not abstract labels.
- Options MUST be specific to the user's most recent answer.
- Reference the user's previous answer in the question text itself.
- Match the user's tone. Short user messages get short questions.
- Always allow custom answers (allowCustom: true).
- For vague users ("idk"): pivot to behavioural questions — what they
  actually do with their time, what they'd happily skip, what they'd
  miss if it disappeared. Do not ask the same self-knowledge question
  reworded.

EXTRACTION:
- Only update a field when evidence is clear. Leave a slot empty
  rather than guess.
- Always populate \`evidence\` with the user's actual words.
- Confidence: 0.9+ stated directly, 0.7 strongly implied, 0.5
  reasonable inference, <0.5 do not write the field.
- For array-valued required fields, do not mark the field complete until
  the array has enough substance. softSkills needs at least 2 named skills.

EXTRACTION FOR DRILLED FIELDS (skills.technicalSkills, interests.domainInterests):
- On first mention: set value, depth = 1, subTags = []
- On each successful drill: append a more specific tag to subTags,
  increment depth.
- Example progression:
  User says "I'm into computers"
    -> interests.domainInterests = { value: ["Computing"], depth: 1, subTags: [] }
  Drill -> user picks "Cybersecurity"
    -> interests.domainInterests = { value: ["Computing", "Cybersecurity"], depth: 2, subTags: [] }
  Drill -> user picks "Defending systems and responding to incidents"
    -> interests.domainInterests.subTags = ["defensive", "incident response"], depth = 3

WHEN TO SET isComplete: true:
- Set isComplete true ONLY IF:
  - Phase 1 CONTEXT: all 5 required slots filled at confidence >= 0.7; "n/a" counts
  - Phase 2 SKILLS: all 3 required slots filled at confidence >= 0.7
    AND skills.technicalSkills.depth >= 2
  - Phase 3 INTERESTS: both required slots filled at confidence >= 0.7
    AND interests.domainInterests.depth >= 2
  - Phase 4 VALUES: all 3 required slots filled at confidence >= 0.7
  - AND turnCount >= 12
- OR set isComplete true if turnCount >= 22 as the hard cap.
- Otherwise isComplete must be false and you must pick the next best question.

DO NOT:
- Recommend careers (out of scope for this engine)
- Reassure, flatter, or coach emotionally
- Ask demographic questions (gender, ethnicity, religion)
- Use jargon (RIASEC, Big Five) — the user must not see frameworks
- Repeat questions in different words`;

const stringFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});

const stringArrayFieldSchema = z.object({
  value: z.array(z.string()).nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});

const drilledFieldSchema = stringArrayFieldSchema.extend({
  subTags: z.array(z.string()),
  depth: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});

const profileSchema = z.object({
  context: z.object({
    educationLevel: stringFieldSchema,
    currentDomain: stringFieldSchema,
    geographicMobility: stringFieldSchema,
    financialConstraints: stringFieldSchema,
    timeHorizon: stringFieldSchema,
  }),
  skills: z.object({
    technicalSkills: drilledFieldSchema,
    softSkills: stringArrayFieldSchema,
    learningPreference: stringFieldSchema,
  }),
  interests: z.object({
    domainInterests: drilledFieldSchema,
    workActivities: stringArrayFieldSchema,
    avoid: stringArrayFieldSchema,
  }),
  values: z.object({
    topPriority: stringFieldSchema,
    workLifeStance: stringFieldSchema,
    socialImpact: stringFieldSchema,
    workStyle: stringFieldSchema,
    dealbreakers: stringArrayFieldSchema,
  }),
});

const turnSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string(),
  targetSlot: z.enum(TARGET_SLOTS).optional(),
  optionsShown: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
  selectedOptionId: z.string().optional(),
  customText: z.string().optional(),
  timestamp: z.string(),
});

const sessionSchema = z.object({
  sessionId: z.string(),
  startedAt: z.string(),
  profile: profileSchema,
  conversationHistory: z.array(turnSchema).min(1),
  turnCount: z.number().int().min(0).max(22),
  isComplete: z.boolean(),
});

const requestSchema = z.object({
  session: sessionSchema,
});

const optionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const engineResponseSchema = z.object({
  profileUpdates: profileSchema.deepPartial(),
  nextQuestion: z.object({
    targetSlot: z.enum(TARGET_SLOTS),
    questionText: z.string(),
    options: z.array(optionSchema).min(3).max(5),
    allowCustom: z.boolean(),
    customPrompt: z.string(),
  }),
  isComplete: z.boolean(),
  reasoning: z.string(),
});

const stringFieldResponseSchema = {
  type: "object",
  properties: {
    value: { type: "string" },
    confidence: { type: "number" },
    evidence: { type: "string" },
  },
  required: ["value", "confidence", "evidence"],
  propertyOrdering: ["value", "confidence", "evidence"],
};

const stringArrayFieldResponseSchema = {
  type: "object",
  properties: {
    value: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    evidence: { type: "string" },
  },
  required: ["value", "confidence", "evidence"],
  propertyOrdering: ["value", "confidence", "evidence"],
};

const drilledFieldResponseSchema = {
  type: "object",
  properties: {
    value: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    evidence: { type: "string" },
    subTags: { type: "array", items: { type: "string" } },
    depth: { type: "integer" },
  },
  required: ["value", "confidence", "evidence", "subTags", "depth"],
  propertyOrdering: ["value", "confidence", "evidence", "subTags", "depth"],
};

const optionResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
  },
  required: ["id", "label"],
  propertyOrdering: ["id", "label"],
};

const responseSchema = {
  type: "object",
  properties: {
    profileUpdates: {
      type: "object",
      properties: {
        context: {
          type: "object",
          properties: {
            educationLevel: stringFieldResponseSchema,
            currentDomain: stringFieldResponseSchema,
            geographicMobility: stringFieldResponseSchema,
            financialConstraints: stringFieldResponseSchema,
            timeHorizon: stringFieldResponseSchema,
          },
          propertyOrdering: ["educationLevel", "currentDomain", "geographicMobility", "financialConstraints", "timeHorizon"],
        },
        skills: {
          type: "object",
          properties: {
            technicalSkills: drilledFieldResponseSchema,
            softSkills: stringArrayFieldResponseSchema,
            learningPreference: stringFieldResponseSchema,
          },
          propertyOrdering: ["technicalSkills", "softSkills", "learningPreference"],
        },
        interests: {
          type: "object",
          properties: {
            domainInterests: drilledFieldResponseSchema,
            workActivities: stringArrayFieldResponseSchema,
            avoid: stringArrayFieldResponseSchema,
          },
          propertyOrdering: ["domainInterests", "workActivities", "avoid"],
        },
        values: {
          type: "object",
          properties: {
            topPriority: stringFieldResponseSchema,
            workLifeStance: stringFieldResponseSchema,
            socialImpact: stringFieldResponseSchema,
            workStyle: stringFieldResponseSchema,
            dealbreakers: stringArrayFieldResponseSchema,
          },
          propertyOrdering: ["topPriority", "workLifeStance", "socialImpact", "workStyle", "dealbreakers"],
        },
      },
      propertyOrdering: ["context", "skills", "interests", "values"],
    },
    nextQuestion: {
      type: "object",
      properties: {
        targetSlot: {
          type: "string",
          enum: [...TARGET_SLOTS],
        },
        questionText: { type: "string" },
        options: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: optionResponseSchema,
        },
        allowCustom: { type: "boolean" },
        customPrompt: { type: "string" },
      },
      required: ["targetSlot", "questionText", "options", "allowCustom", "customPrompt"],
      propertyOrdering: ["targetSlot", "questionText", "options", "allowCustom", "customPrompt"],
    },
    isComplete: { type: "boolean" },
    reasoning: { type: "string" },
  },
  required: ["profileUpdates", "nextQuestion", "isComplete", "reasoning"],
  propertyOrdering: ["profileUpdates", "nextQuestion", "isComplete", "reasoning"],
};

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

const readRequestBody = (req: ApiRequest) => {
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }
  return req.body;
};

const sendJson = (res: ApiResponse, status: number, body: unknown) => {
  res.status(status).json(body);
};

const compactDetail = (detail: string) => detail.replace(/\s+/g, " ").slice(0, 500);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 502, { error: "Gemini API key is not configured." });
  }

  let parsedRequest: z.infer<typeof requestSchema>;
  try {
    parsedRequest = requestSchema.parse(readRequestBody(req));
  } catch {
    return sendJson(res, 400, { error: "Invalid assessment request body." });
  }

  const { session } = parsedRequest;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  profile: session.profile,
                  conversationHistory: session.conversationHistory,
                  turnCount: session.turnCount,
                }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text().catch(() => "");
      return sendJson(res, 502, {
        error: `Gemini request failed with status ${geminiResponse.status}.`,
        detail: detail ? compactDetail(detail) : undefined,
      });
    }

    const geminiJson = await geminiResponse.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string") {
      return sendJson(res, 502, { error: "Gemini returned an empty structured response." });
    }

    const parsedGemini = engineResponseSchema.parse(JSON.parse(text));
    return sendJson(res, 200, parsedGemini);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Gemini request timed out."
      : "Gemini response could not be processed.";

    return sendJson(res, 502, {
      error: message,
      detail: error instanceof Error ? compactDetail(error.message) : undefined,
    });
  } finally {
    clearTimeout(timeout);
  }
}

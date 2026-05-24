import { z } from "zod";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are the recommendation engine for CareerSpark, an AI career
guidance platform for UK students aged 16-25. You receive a structured
user profile and produce 5 career recommendations with fit scores and
reasoning grounded in the profile.

You are NOT a chatbot. You output a single JSON object. No prose.

INPUT: a ProfileV3 with context, skills, interests, values fields,
each with evidence (the user's own words) and confidence scores.

OUTPUT: JSON matching the provided schema.

GENERATING RECOMMENDATIONS:

1. Read the FULL profile before deciding. Do not anchor on the first
   field. Pay particular attention to:
   - drilled subTags in technicalSkills and domainInterests
   - the user's evidence strings (their actual words)
   - declared dealbreakers and "avoid" entries
   - financial and time-horizon constraints

2. Produce exactly 5 recommendations, ordered by fitScore descending.

3. RECOMMENDATIONS 1–4: aligned with the profile. fitBand is "strong"
   (>=80) or "good" (65–79). Each must use signals from at least
   THREE different profile fields. Set divergent=false.

4. RECOMMENDATION 5: a deliberate stretch / divergent pick. fitBand
   is "stretch" (50–64). It should expand the user's horizon —
   pick something adjacent that uses 1–2 of their strongest signals
   in a non-obvious domain. Set divergent=true. Examples:
   - Profile says "cybersecurity + compliance + impact" -> divergent
     could be "Digital Rights Policy Researcher" (uses compliance +
     impact, drops cyber-technical)
   - Profile says "psychology + research + autonomy" -> divergent
     could be "UX Researcher" (uses psychology + research, drops
     clinical)
   The divergent pick proves the system is not just amplifying the
   obvious path.

5. AVOID:
   - The same 3 careers every CS student gets (Software Developer,
     Data Analyst, Product Manager). Only include these if they
     genuinely fit the specific subTags and values.
   - Inventing job titles. Use real, recognisable UK roles.
   - Salaries above £80k for entry-level. Be conservative and
     realistic. These are INDICATIVE — typical UK ranges for early
     career.
   - Ignoring stated dealbreakers, financial constraints, or
     mobility limits. If the user said "needs to earn now", do not
     recommend roles requiring 3 more years of unfunded study.

6. WHY-THIS-FITS-YOU BULLETS:
   Each bullet MUST reference a specific profile field by content.
   GOOD: "Your interest in compliance and risk management aligns
          directly with this role's regulatory focus."
   BAD:  "You have transferable skills."
   GOOD: "Your stated openness to longer hours for meaningful work
          fits the demanding consulting environment."
   BAD:  "You're hardworking."
   Populate profileFieldsCited with the actual field names you used,
   for verification.

7. RISKS:
   For each recommendation, include 1-2 honest concerns. Examples:
   "Entry-level roles in this field are competitive."
   "Most paths require a postgraduate qualification."
   "Salary growth is slower than adjacent tech roles."
   This is a feature, not a bug. Honest assessment beats hype.

8. SIGNAL PHRASES (basedOn):
   Pick 3 short phrases from the profile that summarise WHY these
   recommendations were chosen. Will display as: "Based on your
   background in {signal1}, your interest in {signal2}, and your
   priority of {signal3}, here are your top matches."
   Example: signal1="STEM and cybersecurity", signal2="compliance
   and entrepreneurship", signal3="meaningful impact"

DO NOT:
- Recommend the same career under different titles.
- Use jargon (RIASEC, Big Five) in the output.
- Promise salary or job certainty.`;

const stringFieldSchema = z.object({ value: z.string().nullable(), confidence: z.number(), evidence: z.string() });
const stringArrayFieldSchema = z.object({ value: z.array(z.string()).nullable(), confidence: z.number(), evidence: z.string() });
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

const recommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string(),
  fitScore: z.number().min(0).max(100),
  fitBand: z.enum(["strong", "good", "stretch"]),
  divergent: z.boolean(),
  indicativeSalary: z.object({ min: z.number().min(0).max(80000), max: z.number().min(0).max(80000), currency: z.literal("GBP") }),
  demandTrend: z.enum(["growing", "stable", "declining"]),
  entryAgeRange: z.object({ min: z.number(), max: z.number() }),
  oneLineFit: z.string(),
  whyThisFitsYou: z.array(z.string()).min(3).max(4),
  profileFieldsCited: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1).max(2),
});

const responseSchemaZod = z.object({
  generatedAt: z.string(),
  basedOn: z.object({ signal1: z.string(), signal2: z.string(), signal3: z.string() }),
  recommendations: z.array(recommendationSchema).length(5),
  reasoning: z.string(),
}).superRefine((payload, ctx) => {
  const divergentCount = payload.recommendations.filter(rec => rec.divergent).length;
  if (divergentCount !== 1 || !payload.recommendations[4]?.divergent) {
    ctx.addIssue({ code: "custom", message: "Exactly the fifth recommendation must be divergent." });
  }
  payload.recommendations.forEach((rec, index) => {
    if (index < 4 && rec.profileFieldsCited.length < 3) {
      ctx.addIssue({ code: "custom", message: "Aligned recommendations must cite at least three profile fields." });
    }
    if (rec.fitBand === "strong" && rec.fitScore < 80) ctx.addIssue({ code: "custom", message: "Strong fitScore must be >= 80." });
    if (rec.fitBand === "good" && (rec.fitScore < 65 || rec.fitScore > 79)) ctx.addIssue({ code: "custom", message: "Good fitScore must be 65-79." });
    if (rec.fitBand === "stretch" && (rec.fitScore < 50 || rec.fitScore > 64)) ctx.addIssue({ code: "custom", message: "Stretch fitScore must be 50-64." });
  });
});

const requestSchema = z.object({ profile: profileSchema });

const optionObject = (properties: Record<string, unknown>, required: string[], propertyOrdering = required) => ({
  type: "object",
  properties,
  required,
  propertyOrdering,
});

const salaryResponseSchema = optionObject({
  min: { type: "number" },
  max: { type: "number" },
  currency: { type: "string", enum: ["GBP"] },
}, ["min", "max", "currency"]);

const responseSchema = optionObject({
  generatedAt: { type: "string" },
  basedOn: optionObject({
    signal1: { type: "string" },
    signal2: { type: "string" },
    signal3: { type: "string" },
  }, ["signal1", "signal2", "signal3"]),
  recommendations: {
    type: "array",
    minItems: 5,
    maxItems: 5,
    items: optionObject({
      id: { type: "string" },
      title: { type: "string" },
      emoji: { type: "string" },
      fitScore: { type: "number" },
      fitBand: { type: "string", enum: ["strong", "good", "stretch"] },
      divergent: { type: "boolean" },
      indicativeSalary: salaryResponseSchema,
      demandTrend: { type: "string", enum: ["growing", "stable", "declining"] },
      entryAgeRange: optionObject({ min: { type: "number" }, max: { type: "number" } }, ["min", "max"]),
      oneLineFit: { type: "string" },
      whyThisFitsYou: { type: "array", items: { type: "string" } },
      profileFieldsCited: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
    }, ["id", "title", "emoji", "fitScore", "fitBand", "divergent", "indicativeSalary", "demandTrend", "entryAgeRange", "oneLineFit", "whyThisFitsYou", "profileFieldsCited", "risks"]),
  },
  reasoning: { type: "string" },
}, ["generatedAt", "basedOn", "recommendations", "reasoning"]);

type ApiRequest = { method?: string; body?: unknown };
type ApiResponse = { setHeader: (name: string, value: string) => void; status: (statusCode: number) => { json: (body: unknown) => void } };

const readRequestBody = (req: ApiRequest) => typeof req.body === "string" ? JSON.parse(req.body) : req.body;
const sendJson = (res: ApiResponse, status: number, body: unknown) => res.status(status).json(body);
const compactDetail = (detail: string) => detail.replace(/\s+/g, " ").slice(0, 500);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendJson(res, 502, { error: "Gemini API key is not configured." });

  let parsedRequest: z.infer<typeof requestSchema>;
  try {
    parsedRequest = requestSchema.parse(readRequestBody(req));
  } catch {
    return sendJson(res, 400, { error: "Invalid recommendations request body." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ profile: parsedRequest.profile }) }] }],
        generationConfig: { temperature: 0.35, responseMimeType: "application/json", responseSchema },
      }),
    });

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text().catch(() => "");
      return sendJson(res, 502, { error: `Gemini request failed with status ${geminiResponse.status}.`, detail: detail ? compactDetail(detail) : undefined });
    }

    const geminiJson = await geminiResponse.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return sendJson(res, 502, { error: "Gemini returned an empty structured response." });

    const parsedGemini = responseSchemaZod.parse(JSON.parse(text));
    return sendJson(res, 200, parsedGemini);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Gemini request timed out." : "Gemini response could not be processed.";
    return sendJson(res, 502, { error: message, detail: error instanceof Error ? compactDetail(error.message) : undefined });
  } finally {
    clearTimeout(timeout);
  }
}

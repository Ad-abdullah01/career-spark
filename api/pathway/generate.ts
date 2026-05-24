import { z } from "zod";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are the pathway engine for CareerSpark. You receive a user profile
and a chosen career, and produce a step-by-step educational and
practical pathway tailored to the user's specific constraints.

OUTPUT: a single JSON object matching the provided schema.

PATHWAY DESIGN RULES:

1. The pathway MUST respect the user's stated constraints:
   - financialConstraints: if they need to earn, prefer routes that
     allow earning (apprenticeships, junior roles + part-time study).
     Don't recommend full-time unfunded postgrad if they said they
     can't afford it.
   - geographicMobility: if regional, prefer routes available across
     the UK; flag if the role concentrates in one city.
   - timeHorizon: if "ASAP", front-load fastest viable route. If
     longer, allow degree-level paths.
   - educationLevel: don't recommend GCSE-level certifications to a
     university student.

2. STEPS: 4–6 steps. Each step has:
   - A clear named milestone.
   - A realistic duration (use ranges, not exact months).
   - 1–3 recommended resources. Resources MUST be real and
     UK-relevant. If you don't know a real resource for a step,
     leave the array empty rather than invent one.

3. RESOURCES — types:
   - certification: e.g. "CompTIA Security+", "ISC2 CC", "Google UX
     Design Certificate"
   - course: named, real
   - book: named, real
   - community: meetups, Slack groups, professional bodies
   - project: a self-directed project description

   AVOID inventing certifications or courses. If unsure, omit.

4. WHY-THIS-FITS bullets MUST cite the user's profile, same rule as
   the recommendation engine.

5. CAVEATS: 1-2 honest notes. Examples:
   "Demand for this role is concentrated in London and the South East."
   "Salary ranges shown are indicative; actual offers vary by employer."

DO NOT:
- Promise specific salaries or job placement.
- Recommend the same generic "build a portfolio" step for every career
  without context.
- Use jargon.
- Write more than 6 steps. If the path is longer, group sub-steps.`;

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

const careerSchema = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string(),
  fitScore: z.number(),
  fitBand: z.enum(["strong", "good", "stretch"]),
  divergent: z.boolean(),
  indicativeSalary: z.object({ min: z.number(), max: z.number(), currency: z.literal("GBP") }),
  demandTrend: z.enum(["growing", "stable", "declining"]),
  entryAgeRange: z.object({ min: z.number(), max: z.number() }),
  oneLineFit: z.string(),
  whyThisFitsYou: z.array(z.string()),
  profileFieldsCited: z.array(z.string()),
  risks: z.array(z.string()),
});

const resourceSchema = z.object({
  type: z.enum(["certification", "course", "book", "community", "project"]),
  name: z.string(),
  provider: z.string().optional(),
  note: z.string().optional(),
});

const pathwaySchema = z.object({
  career: z.object({ title: z.string(), emoji: z.string(), fitScore: z.number() }),
  whyThisFits: z.array(z.string()).length(3),
  entryRoutes: z.array(z.string()).min(1),
  indicativeSalary: z.object({ min: z.number(), max: z.number(), currency: z.literal("GBP") }),
  entryAgeRange: z.object({ min: z.number(), max: z.number() }),
  demandTrend: z.enum(["growing", "stable", "declining"]),
  steps: z.array(z.object({
    stepNumber: z.number(),
    title: z.string(),
    durationLabel: z.string(),
    summary: z.string(),
    detail: z.string(),
    recommendedResources: z.array(resourceSchema).max(3),
  })).min(4).max(6),
  totalEstimatedDuration: z.string(),
  caveats: z.array(z.string()).min(1).max(2),
});

const requestSchema = z.object({ profile: profileSchema, career: careerSchema });

const objectSchema = (properties: Record<string, unknown>, required: string[], propertyOrdering = required) => ({
  type: "object",
  properties,
  required,
  propertyOrdering,
});

const salarySchema = objectSchema({ min: { type: "number" }, max: { type: "number" }, currency: { type: "string", enum: ["GBP"] } }, ["min", "max", "currency"]);
const resourceResponseSchema = objectSchema({
  type: { type: "string", enum: ["certification", "course", "book", "community", "project"] },
  name: { type: "string" },
  provider: { type: "string" },
  note: { type: "string" },
}, ["type", "name"]);

const responseSchema = objectSchema({
  career: objectSchema({ title: { type: "string" }, emoji: { type: "string" }, fitScore: { type: "number" } }, ["title", "emoji", "fitScore"]),
  whyThisFits: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
  entryRoutes: { type: "array", items: { type: "string" } },
  indicativeSalary: salarySchema,
  entryAgeRange: objectSchema({ min: { type: "number" }, max: { type: "number" } }, ["min", "max"]),
  demandTrend: { type: "string", enum: ["growing", "stable", "declining"] },
  steps: {
    type: "array",
    minItems: 4,
    maxItems: 6,
    items: objectSchema({
      stepNumber: { type: "number" },
      title: { type: "string" },
      durationLabel: { type: "string" },
      summary: { type: "string" },
      detail: { type: "string" },
      recommendedResources: { type: "array", items: resourceResponseSchema },
    }, ["stepNumber", "title", "durationLabel", "summary", "detail", "recommendedResources"]),
  },
  totalEstimatedDuration: { type: "string" },
  caveats: { type: "array", items: { type: "string" } },
}, ["career", "whyThisFits", "entryRoutes", "indicativeSalary", "entryAgeRange", "demandTrend", "steps", "totalEstimatedDuration", "caveats"]);

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
    return sendJson(res, 400, { error: "Invalid pathway request body." });
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
        contents: [{ role: "user", parts: [{ text: JSON.stringify(parsedRequest) }] }],
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

    const parsedGemini = pathwaySchema.parse(JSON.parse(text));
    return sendJson(res, 200, parsedGemini);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Gemini request timed out." : "Gemini response could not be processed.";
    return sendJson(res, 502, { error: message, detail: error instanceof Error ? compactDetail(error.message) : undefined });
  } finally {
    clearTimeout(timeout);
  }
}

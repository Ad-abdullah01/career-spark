import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";

type ApiRequest = IncomingMessage & {
  body?: unknown;
};

const assessmentApiDevMiddleware = (): Plugin => ({
  name: "assessment-api-dev-middleware",
  configureServer(server) {
    const registerApiRoute = (route: string, modulePath: string) => {
      server.middlewares.use(route, async (req: ApiRequest, res: ServerResponse) => {
        const chunks: Buffer[] = [];

        req.on("data", chunk => chunks.push(Buffer.from(chunk)));
        req.on("end", async () => {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          req.body = rawBody ? JSON.parse(rawBody) : undefined;

          const moduleUrl = pathToFileURL(path.resolve(__dirname, modulePath)).href;
          const { default: handler } = await import(moduleUrl);
          await handler(req, {
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            status: (statusCode: number) => ({
              json: (body: unknown) => {
                res.statusCode = statusCode;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(body));
              },
            }),
          });
        });
      });
    };

    registerApiRoute("/api/assessment/next-turn", "api/assessment/next-turn.ts");
    registerApiRoute("/api/recommendations/generate", "api/recommendations/generate.ts");
    registerApiRoute("/api/pathway/generate", "api/pathway/generate.ts");
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      assessmentApiDevMiddleware(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});

import { kelKB } from "../src/data/kel_kb";
import { topK } from "../src/lib/rag";

export const config = { runtime: "edge" };

const ALLOWED_ORIGINS = new Set([
  "https://kelwu.com",
  "https://chat.kelwu.com"
  // add your Vercel preview URL during testing if needed (e.g., https://kel-chat.vercel.app)
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://kelwu.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders(req) });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500, headers: { ...corsHeaders(req), "content-type": "application/json" }
    });
  }

  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const userMsg = [...messages].reverse().find((m:any)=>m.role==="user")?.content || "site overview";

  const ctx = await topK(userMsg, kelKB, OPENAI_API_KEY, 5);
  const system =
    "You are Kel Wu’s site assistant (friendly, concise). " +
    "Answer ONLY using the provided site context; if unknown, say so and suggest a page. " +
    "Prefer mentioning internal routes like /portfolio or /product-management.";

  const contextBlock = ctx
    .map(d => `# ${d.title}\n${d.text}${d.url ? `\nRoute: ${d.url}` : ""}`)
    .join("\n\n");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 350,
      messages: [
        { role: "system", content: system },
        { role: "system", content: `Site context:\n\n${contextBlock}` },
        ...messages
      ]
    })
  });

  const j = await r.json();
  const content = j?.choices?.[0]?.message?.content ?? "Sorry, I couldn’t generate a response.";

  return new Response(JSON.stringify({ content, sources: ctx }), {
    status: 200,
    headers: { ...corsHeaders(req), "content-type": "application/json" }
  });
}

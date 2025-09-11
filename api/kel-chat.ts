// api/kel-chat.ts
// Edge function with mini-RAG over your KB

export const config = { runtime: "edge" };

// Models
const CHAT_MODEL = "gpt-4o-mini";
const EMBED_MODEL = "text-embedding-3-small";

// Import your KB
import { kel_kb } from "../../src/data/kel_kb";

type KBItem = { id?: string; title?: string; url?: string; content: string };

function dot(a: number[], b: number[]) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]*b[i]; return s; }
function norm(a: number[]) { return Math.sqrt(dot(a,a)) || 1; }
function cosine(a: number[], b: number[]) { return dot(a,b) / (norm(a)*norm(b)); }
function trim(t: string, max = 1200) { return !t ? "" : t.length > max ? t.slice(0,max) + " …" : t; }

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_BASE = "https://api.openai.com/v1";

async function openai<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${OPENAI_BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`OpenAI ${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function embed(text: string): Promise<number[]> {
  const res = await openai<{ data: { embedding: number[] }[] }>("embeddings", {
    model: EMBED_MODEL, input: text
  });
  return res.data[0].embedding;
}

// cache KB embeddings for this runtime
let kbEmbedsP: Promise<number[][]> | null = null;
async function getKBEmbeds(): Promise<number[][]> {
  if (!kbEmbedsP) {
    kbEmbedsP = (async () => {
      const inputs = kel_kb.map(k => trim([k.title, k.content].filter(Boolean).join("\n\n"), 2000));
      const out: number[][] = [];
      for (const t of inputs) out.push(await embed(t));
      return out;
    })();
  }
  return kbEmbedsP;
}

async function retrieve(query: string, k = 3) {
  const [q, kb] = await Promise.all([embed(query), getKBEmbeds()]);
  const scored = kb.map((v, i) => ({ item: kel_kb[i] as KBItem, score: cosine(q, v) }));
  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0, k);
}

function cors(origin: string | null) {
  const allow =
    origin?.startsWith("https://kelwu.com") ||
    origin?.startsWith("https://www.kelwu.com") ||
    (origin?.includes(".vercel.app") ?? false);
  return {
    "Access-Control-Allow-Origin": allow ? origin! : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type"
  };
}

export default async function handler(req: Request) {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers });

  try {
    const { messages } = await req.json();
    const user = (Array.isArray(messages) && messages.find((m: any) => m?.role === "user")?.content) || "";
    const query = String(user || "Tell me about Kel Wu.").slice(0, 2000);

    const top = await retrieve(query, 3);
    const context = top.map((t, i) =>
      `# Source ${i+1}: ${t.item.title || "Untitled"}${t.item.url ? ` (${t.item.url})` : ""}\n${trim(t.item.content, 1800)}`
    ).join("\n\n");

    const system = `
You are "Kel Wu’s AI assistant" on his portfolio. Prefer facts from the Context.
If a detail about Kel isn't in the context, be cautious and avoid fabrications.
Keep answers concise (2–6 sentences). End with a short "Sources:" list with titles/urls used.
`.trim();

    type ChatRes = { choices: { message: { content: string } }[] };
    const chat = await openai<ChatRes>("chat/completions", {
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Question:\n${query}\n\nContext:\n${context}\n\nAnswer now.` }
      ]
    });

    const content = chat.choices?.[0]?.message?.content?.trim() || "Sorry — I couldn't generate a reply.";
    const sources = top.map(t => ({ id: t.item.id ?? "", title: t.item.title ?? "Source", url: t.item.url ?? "" }));

    return new Response(JSON.stringify({ content, sources }), { headers: { "content-type": "application/json", ...headers } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500, headers: { "content-type": "application/json", ...headers }
    });
  }
}

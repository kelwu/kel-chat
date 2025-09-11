// api/kel-chat.ts
// Edge function + mini-RAG with an in-file KB to avoid import/bundling issues.

export const config = { runtime: "edge" };

// Silence TS about process in Edge
declare const process: any;

/* ------------------------------ YOUR KNOWLEDGE BASE ------------------------------
   Replace the sample entries with your real content. Keep each item short-ish but
   factual; this content is what the model cites as “Sources”.
----------------------------------------------------------------------------------*/
const kel_kb = [
  {
    id: "pm1",
    title: "Product Management Philosophy",
    url: "https://kelwu.com/product-management",
    content:
      "Kel Wu’s PM philosophy centers on user-first discovery, data-driven decisions, rapid iteration, and cross-functional alignment. He emphasizes measurable outcomes and clear success metrics, shipping small, testable increments.",
  },
  {
    id: "proj-bg",
    title: "Background Removal Tool",
    url: "https://example.com/background-removal",
    content:
      "An AI-powered image background removal tool built with React and TypeScript, integrating ML inference APIs. Focused on fast client-side previews, clean UX, and resilient error handling.",
  },
  {
    id: "brand-yt",
    title: "Product by Kel",
    url: "https://youtube.com/@productbykel",
    content:
      "Kel’s YouTube brand that explores product management, UX, and AI experimentation. Content includes hands-on demos, case studies, and PM strategy walkthroughs.",
  },
  {
    id: "dj",
    title: "DJ Kelton Banks",
    url: "https://kelwu.com/djing",
    content:
      "Kel DJs hip hop, R&B, house, and disco; mixes are available on SoundCloud. He focuses on crowd reading, smooth transitions, and genre blending.",
  },
];

/* --------------------------------- UTILITIES ---------------------------------- */
type KBItem = { id?: string; title?: string; url?: string; content: string };

function dot(a: number[], b: number[]) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm(a: number[]) { return Math.sqrt(dot(a, a)) || 1; }
function cosine(a: number[], b: number[]) { return dot(a, b) / (norm(a) * norm(b)); }
function trim(t: string, max = 1200) { return !t ? "" : t.length > max ? t.slice(0, max) + " …" : t; }

/* ------------------------------- OPENAI HELPERS ------------------------------- */
const CHAT_MODEL = "gpt-4o-mini";
const EMBED_MODEL = "text-embedding-3-small";
const OPENAI_API_KEY: string =
  (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : undefined) ||
  (globalThis as any).OPENAI_API_KEY ||
  "";

const OPENAI_BASE = "https://api.openai.com/v1";

async function openai<T>(path: string, body: any): Promise<T> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing at runtime");
  }
  const r = await fetch(`${OPENAI_BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => "");
    throw new Error(`OpenAI ${path} ${r.status}: ${err}`);
  }
  return r.json() as Promise<T>;
}

async function embed(text: string): Promise<number[]> {
  const res = await openai<{ data: { embedding: number[] }[] }>("embeddings", {
    model: EMBED_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

// Cache embeddings during the life of the Edge runtime
let kbEmbedsP: Promise<number[][]> | null = null;
async function getKBEmbeds(): Promise<number[][]> {
  if (!kbEmbedsP) {
    kbEmbedsP = (async () => {
      const inputs = kel_kb.map((k) => trim([k.title, k.content].filter(Boolean).join("\n\n"), 2000));
      const out: number[][] = [];
      // Sequential is fine for small KB size
      for (const t of inputs) out.push(await embed(t));
      return out;
    })();
  }
  return kbEmbedsP;
}

async function retrieve(query: string, k = 3) {
  const [q, kb] = await Promise.all([embed(query), getKBEmbeds()]);
  const scored = kb.map((v, i) => ({ item: kel_kb[i] as KBItem, score: cosine(q, v) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/* ----------------------------------- CORS ------------------------------------- */
function cors(origin: string | null) {
  const allow =
    origin?.startsWith("https://kelwu.com") ||
    origin?.startsWith("https://www.kelwu.com") ||
    (origin?.includes(".vercel.app") ?? false);
  return {
    "Access-Control-Allow-Origin": allow ? origin! : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

/* --------------------------------- HANDLER ------------------------------------ */
export default async function handler(req: Request) {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers });

  try {
    const { messages } = (await req.json()) ?? {};
    const user =
      (Array.isArray(messages) && messages.find((m: any) => m?.role === "user")?.content) || "";
    const query = String(user || "Tell me about Kel Wu.").slice(0, 2000);

    const top = await retrieve(query, 3);
    const context = top
      .map(
        (t, i) =>
          `# Source ${i + 1}: ${t.item.title || "Untitled"}${
            t.item.url ? ` (${t.item.url})` : ""
          }\n${trim(t.item.content, 1800)}`
      )
      .join("\n\n");

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
        { role: "user", content: `Question:\n${query}\n\nContext:\n${context}\n\nAnswer now.` },
      ],
    });

    const content =
      chat.choices?.[0]?.message?.content?.trim() || "Sorry — I couldn't generate a reply.";
    const sources = top.map((t) => ({
      id: t.item.id ?? "",
      title: t.item.title ?? "Source",
      url: t.item.url ?? "",
    }));

    return new Response(JSON.stringify({ content, sources }), {
      headers: { "content-type": "application/json", ...headers },
    });
  } catch (e: any) {
    // Helpful error text back to Postman + show in Vercel Runtime Logs
    console.error("kel-chat error:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "content-type": "application/json", ...headers },
    });
  }
}

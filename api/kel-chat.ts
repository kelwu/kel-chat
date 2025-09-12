// api/kel-chat.ts
// Edge function + RAG + guardrails + prefilter + recency scoring + "currently" scrub

export const config = { runtime: "edge" };
declare const process: any;

/* ------------------------------ KNOWLEDGE BASE ------------------------------ */
/* Update these facts as you like. Keep entries concise + factual. */
type KBItem = {
  id: string;
  title: string;
  url?: string;
  content: string;
  date?: string;      // YYYY-MM-DD for recency scoring
  current?: boolean;  // true if this reflects "what Kel is doing now"
  tags?: string[];
};

const kel_kb: KBItem[] = [
  {
    id: "summary",
    title: "Professional Summary",
    url: "https://www.linkedin.com/in/kelwu/",
    content:
      "Product leader with 6+ years across SaaS, digital marketing, e-commerce, and the creator economy. Blends user-first discovery, data-driven decisions, and rapid iteration. Public work includes Product by Kel (YouTube), Bay Area Diners Club (IG), and DJ Kelton Banks (SoundCloud).",
    date: "2025-09-01",
  },

  // ✅ Explicit end date at Social Native
  {
    id: "role-social-native",
    title: "Senior Product Manager — Social Native (ended Dec 2024)",
    url: "https://www.socialnative.com/",
    content:
      "Kel Wu worked as a Senior Product Manager at Social Native and LEFT the company in Dec 2024. Led the 0→1 Creator Discovery platform (20+ filters; 200K creators), expanded to TikTok/Instagram Paid Ads APIs, improved creator onboarding by 15%, and automated Ops/CS workflows saving 40+ hours/month.",
    date: "2024-12-15",
    tags: ["work", "employment"],
  },

  // ✅ Current status (adjust text as your situation evolves)
  {
    id: "current-status",
    title: "Current Focus (2025)",
    url: "https://kelwu.com",
    content:
      "As of 2025, Kel Wu is no longer at Social Native (left Dec 2024). He is actively building the Product by Kel brand and taking selective product/AI consulting and creator projects.",
    date: "2025-09-01",
    current: true,
    tags: ["current", "bio"],
  },

  {
    id: "philosophy",
    title: "Product Management Philosophy",
    url: "https://kelwu.com/product-management",
    content:
      "Empathy-driven discovery, crisp problem framing, smallest testable solutions, and ship/measure/iterate loops. Metrics: activation, retention, revenue, and efficiency. Partner deeply with Design/Eng; write clear PRDs; instrument analytics; run A/B tests.",
    date: "2025-06-01",
  },
  {
    id: "productbykel",
    title: "Product by Kel — YouTube & Instagram",
    url: "https://youtube.com/@productbykel",
    content:
      "Brand covering AI product builds, no/low-code tutorials, and PM lessons. Demos with GPTs, MidJourney, Replit, Zapier, Creatomate, and strategy breakdowns.",
    date: "2025-08-01",
  },
  {
    id: "badc",
    title: "Bay Area Diners Club (Instagram)",
    url: "https://instagram.com/bayareadinersclub",
    content:
      "Food discovery reels highlighting Bay Area gems, chef collaborations, and tastings.",
    date: "2025-08-15",
  },
  {
    id: "dj",
    title: "DJ Kelton Banks",
    url: "https://kelwu.com/djing",
    content:
      "Performs hip hop, R&B, house, and disco. Bookable for events. Mixes available on SoundCloud. Focus on crowd energy and seamless transitions.",
    date: "2025-05-01",
  },
];

/* ------------------------------ HARD PRE-FILTER ------------------------------ */
const BLOCK_PATTERNS: RegExp[] = [
  /\b(i\s*hate\s*kel)\b/i,
  /\bkel\s*(sucks|is\s*stupid|is\s*awful|is\s*terrible)\b/i,
  /\b(kill|harm)\s+(yourself|him|her|them)\b/i,
  /\b(ssn|social\s*security|home\s*address|phone\s*number|email)\b/i,
  /\b(nude|explicit\s*photos?)\b/i,
];

function preFilterResponse(userText: string | undefined) {
  const q = (userText || "").toLowerCase().trim();
  if (!q || q.length < 2) {
    return {
      content:
        "Hi! I’m here to talk about Kel’s work and projects. Try asking about his product philosophy or a recent project case study.",
      sources: [],
    };
  }
  if (BLOCK_PATTERNS.some((rx) => rx.test(q))) {
    return {
      content:
        "I’m here to share Kel’s professional work and projects. Would you like to hear about his product philosophy or a recent case study?",
      sources: [],
    };
  }
  const offTopicCues = [
    "politics",
    "religion",
    "celebrity gossip",
    "personal life details",
    "private info",
    "leak",
    "dox",
    "address",
    "phone",
    "email",
  ];
  if (offTopicCues.some((s) => q.includes(s))) {
    return {
      content:
        "Let’s keep it focused on Kel’s professional portfolio. Want to hear about his AI experiments or a product case study?",
      sources: [],
    };
  }
  return null;
}

/* ------------------------------ VECTORS / UTILS ------------------------------ */
function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a: number[]) {
  return Math.sqrt(dot(a, a)) || 1;
}
function cosine(a: number[], b: number[]) {
  return dot(a, b) / (norm(a) * norm(b));
}
function trim(t: string, max = 1200) {
  return !t ? "" : t.length > max ? t.slice(0, max) + " …" : t;
}

/* ------------------------------ OPENAI HELPERS ------------------------------ */
const CHAT_MODEL = "gpt-4o-mini";
const EMBED_MODEL = "text-embedding-3-small";
const OPENAI_API_KEY: string =
  (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : undefined) ||
  (globalThis as any).OPENAI_API_KEY ||
  "";

const OPENAI_BASE = "https://api.openai.com/v1";

async function openai<T>(path: string, body: any): Promise<T> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  const r = await fetch(`${OPENAI_BASE}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenAI ${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function embed(text: string): Promise<number[]> {
  const res = await openai<{ data: { embedding: number[] }[] }>("embeddings", {
    model: EMBED_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

/* ------------------------------ RECENCY-AWARE RETRIEVAL ------------------------------ */
// cache embeddings for the runtime
let kbEmbedsP: Promise<number[][]> | null = null;

function recencyBoost(item: KBItem) {
  if (!item.date) return 0;
  const months =
    (Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
  // 0..1 where 1 is very recent (~now), fades to 0 around 24 months
  return Math.max(0, 1 - months / 24);
}

async function getKBEmbeds(): Promise<number[][]> {
  if (!kbEmbedsP) {
    kbEmbedsP = (async () => {
      const inputs = kel_kb.map((k) =>
        trim([k.title, k.content].filter(Boolean).join("\n\n"), 2000)
      );
      const out: number[][] = [];
      for (const t of inputs) out.push(await embed(t)); // sequential is okay for small KBs
      return out;
    })();
  }
  return kbEmbedsP;
}

async function retrieve(query: string, k = 3) {
  const [q, kbVecs] = await Promise.all([embed(query), getKBEmbeds()]);
  const scored = kbVecs.map((v, i) => {
    const item = kel_kb[i];
    const sim = cosine(q, v);
    const rec = recencyBoost(item); // 0..1
    const cur = item.current ? 0.12 : 0; // small bump for current:true
    const score = sim * 0.8 + rec * 0.18 + cur; // 80% semantic, 18% recency, 12% current
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.item);
}

/* ------------------------------ "CURRENTLY" SCRUB ------------------------------ */
function scrubCurrently(docs: KBItem[], text: string) {
  const hasCurrent = docs.some((d) => d.current === true);
  if (!hasCurrent && /currently/i.test(text)) {
    return text.replace(/currently/gi, "most recently");
  }
  return text;
}

/* ------------------------------ CORS ------------------------------ */
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

/* ------------------------------ HANDLER ------------------------------ */
export default async function handler(req: Request) {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405, headers });

  try {
    const { messages } = (await req.json()) ?? {};
    const user =
      (Array.isArray(messages) &&
        messages.find((m: any) => m?.role === "user")?.content) ||
      "";

    // 1) Hard pre-filter (short-circuit)
    const pre = preFilterResponse(user);
    if (pre) {
      return new Response(JSON.stringify(pre), {
        headers: { "content-type": "application/json", ...headers },
      });
    }

    // 2) RAG flow
    const query = String(user || "Tell me about Kel Wu.").slice(0, 2000);
    const top = await retrieve(query, 3);
    const context = top
      .map(
        (t, i) =>
          `# Source ${i + 1}: ${t.title}${
            t.url ? ` (${t.url})` : ""
          }\n${trim(t.content, 1800)}`
      )
      .join("\n\n");

    const system = `
You are "Kel Wu’s AI assistant" on his portfolio.

Purpose:
- Answer questions about Kel’s professional background, product philosophy, projects, and public brand.
- Use the provided context as your main source of truth.
- Keep answers concise (2–6 sentences). End with a "Sources:" list of titles/urls used.

Temporal & phrasing rules:
- When describing roles, include dates if present (e.g., "Senior PM at Social Native (ended Dec 2024)").
- Do NOT say "currently" unless a source has current:true or explicit text marking it as current.
- If facts are ambiguous, prefer the most recent sources and say "most recently" rather than "currently".

Guardrails:
- If a user is hostile, insulting, or off-topic, respond calmly and redirect to professional topics.
- Never generate harmful, defamatory, or unsafe responses.
`.trim();

    type ChatRes = { choices: { message: { content: string } }[] };
    const chat = await openai<ChatRes>("chat/completions", {
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Question:\n${query}\n\nContext:\n${context}\n\nAnswer now.`,
        },
      ],
    });

    let content =
      chat.choices?.[0]?.message?.content?.trim() ||
      "Sorry — I couldn't generate a reply.";
    content = scrubCurrently(top, content); // post-fix “currently” if needed

    const sources = top.map((t) => ({
      id: t.id,
      title: t.title,
      url: t.url || "",
    }));

    return new Response(JSON.stringify({ content, sources }), {
      headers: { "content-type": "application/json", ...headers },
    });
  } catch (e: any) {
    console.error("kel-chat error:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "content-type": "application/json", ...headers },
    });
  }
}

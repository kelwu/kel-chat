// api/kel-chat.ts
// Edge function + RAG + guardrails + HARD PRE-FILTER (no-LLM short-circuit)

export const config = { runtime: "edge" };
declare const process: any;

/* ------------------------------ KNOWLEDGE BASE ------------------------------ */
/* TIP: Enrich these items over time. Keep each concise, factual, and include a URL for citing. */
const kel_kb = [
  {
    id: "summary",
    title: "Professional Summary",
    url: "https://www.linkedin.com/in/kelwu/",
    content:
      "Product leader with 6+ years across SaaS, digital marketing, e-commerce, and the creator economy. Blends user-first discovery, data-driven decisions, and rapid iteration. Public work includes Product by Kel (YouTube), Bay Area Diners Club (IG), and DJ Kelton Banks (SoundCloud)."
  },
  {
    id: "philosophy",
    title: "Product Management Philosophy",
    url: "https://kelwu.com/product-management",
    content:
      "Empathy-driven discovery, crisp problem framing, smallest testable solutions, and ship/measure/iterate loops. Metrics: activation, retention, revenue, and efficiency. Partner deeply with Design/Eng; write clear PRDs; instrument analytics; run A/B tests."
  },
  {
    id: "socialnative",
    title: "Senior Product Manager – Social Native",
    url: "https://www.socialnative.com/",
    content:
      "Launched 0→1 Creator Discovery platform (20+ filters; 200K creators). Expanded to TikTok/Instagram Paid Ads APIs (15+ ad metrics). Improved creator onboarding by 15%. Automated Ops/CS flows, saving 40+ hours/month."
  },
  {
    id: "productbykel",
    title: "Product by Kel – YouTube & Instagram",
    url: "https://youtube.com/@productbykel",
    content:
      "Brand covering AI product builds, no/low-code tutorials, and PM lessons. Demos with GPTs, Lovable, Nano Banana, Zapier, Creatomate, and strategy breakdowns."
  },
  {
    id: "dj",
    title: "DJ Kelton Banks",
    url: "https://kelwu.com/djing",
    content:
      "Performs hip hop, R&B, house, and disco. Bookable for events. Mixes available on SoundCloud. Focus on crowd energy and seamless transitions."
  },
  {
    id: "badc",
    title: "Bay Area Diners Club (Instagram)",
    url: "https://instagram.com/bayareadinersclub",
    content:
      "Food discovery reels highlighting Bay Area gems, chef collabs, and tastings."
  }
];

/* ------------------------------ HARD PRE-FILTER ------------------------------ */
/* Blocks hostile/off-topic or private/PII requests before hitting OpenAI. */
const BLOCK_PATTERNS: RegExp[] = [
  // Hostility/insults targeting Kel
  /\b(i\s*hate\s*kel)\b/i,
  /\bkel\s*(sucks|is\s*stupid|is\s*awful|is\s*terrible)\b/i,
  // Attempts to provoke harassment/abuse
  /\b(kill|harm)\s+(yourself|him|her|them)\b/i,
  // Private/PII probes
  /\b(ssn|social\s*security|home\s*address|phone\s*number|email)\b/i,
  // Irrelevant sexual or explicit info
  /\b(nude|explicit\s*photos?)\b/i
];

function preFilterResponse(userText: string | undefined) {
  const q = (userText || "").toLowerCase().trim();

  // Empty or very short noise
  if (!q || q.length < 2) {
    return {
      content:
        "Hi! I’m here to talk about Kel’s work and projects. Try asking about his product philosophy or a recent project case study.",
      sources: []
    };
  }

  // Hard blocklist
  if (BLOCK_PATTERNS.some(rx => rx.test(q))) {
    return {
      content:
        "I’m here to share Kel’s professional work and projects. If you’d like, I can walk you through his product philosophy or highlight a recent build.",
      sources: []
    };
  }

  // Generic off-topic cues (tweak as you like)
  const offTopicCues = [
    "politics", "religion", "celebrity gossip", "personal life details",
    "private info", "leak", "dox", "address", "phone", "email"
  ];
  if (offTopicCues.some(s => q.includes(s))) {
    return {
      content:
        "Let’s keep it focused on Kel’s professional portfolio. Want to hear about his AI experiments or a product case study?",
      sources: []
    };
  }

  return null; // OK to proceed to RAG/LLM
}

/* ------------------------------ UTILITIES ------------------------------ */
type KBItem = { id?: string; title?: string; url?: string; content: string };

function dot(a: number[], b: number[]) { let s=0; for (let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
function norm(a: number[]) { return Math.sqrt(dot(a,a)) || 1; }
function cosine(a: number[], b: number[]) { return dot(a,b) / (norm(a)*norm(b)); }
function trim(t: string, max=1200) { return !t ? "" : t.length > max ? t.slice(0,max)+" …" : t; }

/* ------------------------------ OPENAI HELPERS ------------------------------ */
const CHAT_MODEL = "gpt-4o-mini";
const EMBED_MODEL = "text-embedding-3-small";
const OPENAI_API_KEY: string =
  (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : undefined) ||
  (globalThis as any).OPENAI_API_KEY || "";

const OPENAI_BASE = "https://api.openai.com/v1";

async function openai<T>(path: string, body: any): Promise<T> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  const r = await fetch(`${OPENAI_BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`OpenAI ${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function embed(text: string): Promise<number[]> {
  const res = await openai<{ data:{embedding:number[]}[] }>("embeddings", {
    model: EMBED_MODEL, input: text
  });
  return res.data[0].embedding;
}

// Cache embeddings during the Edge runtime
let kbEmbedsP: Promise<number[][]>|null = null;
async function getKBEmbeds(): Promise<number[][]> {
  if (!kbEmbedsP) {
    kbEmbedsP = (async()=>{
      const inputs = kel_kb.map(k=>trim([k.title,k.content].filter(Boolean).join("\n\n"),2000));
      const out: number[][] = [];
      for (const t of inputs) out.push(await embed(t)); // sequential is fine for small KB
      return out;
    })();
  }
  return kbEmbedsP;
}

async function retrieve(query:string,k=3) {
  const [q,kb] = await Promise.all([embed(query),getKBEmbeds()]);
  const scored = kb.map((v,i)=>({ item: kel_kb[i] as KBItem, score: cosine(q,v) }));
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,k);
}

/* ------------------------------ CORS ------------------------------ */
function cors(origin:string|null) {
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

/* ------------------------------ HANDLER ------------------------------ */
export default async function handler(req:Request) {
  const origin=req.headers.get("origin");
  const headers=cors(origin);

  if (req.method==="OPTIONS") return new Response("ok",{headers});
  if (req.method!=="POST") return new Response("Method Not Allowed",{status:405,headers});

  try {
    const {messages} = (await req.json()) ?? {};
    const user = (Array.isArray(messages) && messages.find((m:any)=>m?.role==="user")?.content) || "";

    // 1) HARD PRE-FILTER: short-circuit for hostile/off-topic/PII probes
    const pre = preFilterResponse(user);
    if (pre) {
      return new Response(JSON.stringify(pre), {
        headers: { "content-type": "application/json", ...headers }
      });
    }

    // 2) Proceed with RAG + LLM
    const query = String(user||"Tell me about Kel Wu.").slice(0,2000);
    const top = await retrieve(query,3);
    const context = top.map((t,i)=>
      `# Source ${i+1}: ${t.item.title||"Untitled"}${t.item.url?` (${t.item.url})`:""}\n${trim(t.item.content,1800)}`
    ).join("\n\n");

    const system = `
You are "Kel Wu’s AI assistant" on his portfolio.

Purpose:
- Answer questions about Kel’s professional background, product philosophy, projects, and public brand.
- Use the provided context as your main source of truth.
- Keep answers concise (2–6 sentences). End with a "Sources:" list of titles/urls used.

Guardrails:
- If a user is hostile, insulting, or off-topic, respond calmly and redirect:
  Example: "I’m here to share Kel’s work and projects. Would you like his product philosophy or a recent case study?"
- Never generate harmful, defamatory, or unsafe responses.
- If asked something outside scope or private, politely decline and redirect to professional topics.
`.trim();

    type ChatRes = { choices: { message:{ content:string } }[] };
    const chat = await openai<ChatRes>("chat/completions", {
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role:"system", content: system },
        { role:"user", content: `Question:\n${query}\n\nContext:\n${context}\n\nAnswer now.` }
      ]
    });

    const content = chat.choices?.[0]?.message?.content?.trim() || "Sorry — I couldn't generate a reply.";
    const sources = top.map(t=>({ id:t.item.id??"", title:t.item.title??"Source", url:t.item.url??"" }));

    return new Response(JSON.stringify({ content, sources }), {
      headers:{ "content-type":"application/json", ...headers }
    });
  } catch (e:any) {
    console.error("kel-chat error:", e?.message||e);
    return new Response(JSON.stringify({ error:e?.message||"Unexpected error" }), {
      status:500, headers:{ "content-type":"application/json", ...headers }
    });
  }
}

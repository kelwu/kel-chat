// api/kel-chat.ts
// Edge function + RAG + guardrails for hostile/off-topic queries

export const config = { runtime: "edge" };
declare const process: any;

/* ------------------------------ KNOWLEDGE BASE ------------------------------ */
const kel_kb = [
  {
    id: "summary",
    title: "Professional Summary",
    url: "https://www.linkedin.com/in/kelwu/",
    content:
      "Product leader with 6+ years of experience driving SaaS, digital marketing, e-commerce, and creator economy growth. Known for user-first discovery, data-driven decision-making, and rapid iteration. Public work includes Product by Kel (YouTube), Bay Area Diners Club (IG), and DJ Kelton Banks (SoundCloud)."
  },
  {
    id: "philosophy",
    title: "Product Management Philosophy",
    url: "https://kelwu.com/product-management",
    content:
      "Empathy for users, rigorous discovery, and metrics-driven decisions. Bias for action through MVPs, A/B tests, and continuous learning. Partner closely with design and engineering, define clear PRDs, and measure success with activation, retention, and efficiency KPIs."
  },
  {
    id: "socialnative",
    title: "Senior Product Manager – Social Native",
    url: "https://www.socialnative.com/",
    content:
      "Launched 0→1 Creator Discovery platform with 20+ filters for 200K creators. Expanded to TikTok/Instagram Paid Ads APIs. Improved Instagram creator onboarding by 15%. Automated Ops & CS workflows, saving 40+ hours/month."
  },
  {
    id: "productbykel",
    title: "Product by Kel – YouTube & Instagram",
    url: "https://youtube.com/@productbykel",
    content:
      "Personal brand sharing AI product builds, no/low-code tutorials, and PM lessons. Covers AI tools (GPTs, MidJourney, Replit, Zapier, Creatomate) and PM strategy."
  },
  {
    id: "dj",
    title: "DJ Kelton Banks",
    url: "https://kelwu.com/djing",
    content:
      "Performs hip hop, R&B, house, and disco sets. Bookable for events. Shares mixes on SoundCloud."
  },
  {
    id: "badc",
    title: "Bay Area Diners Club (Instagram)",
    url: "https://instagram.com/bayareadinersclub",
    content:
      "Food discovery reels showcasing Bay Area restaurants, tastings, and hidden gems."
  }
];

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

let kbEmbedsP: Promise<number[][]>|null = null;
async function getKBEmbeds(): Promise<number[][]> {
  if (!kbEmbedsP) {
    kbEmbedsP = (async()=>{
      const inputs = kel_kb.map(k=>trim([k.title,k.content].filter(Boolean).join("\n\n"),2000));
      const out: number[][] = [];
      for (const t of inputs) out.push(await embed(t));
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
- If a user is hostile, insulting, or off-topic (e.g., "I hate Kel" or personal/private questions), respond calmly and redirect:
  Example: "I’m here to share Kel’s work and projects. Would you like to hear about his product philosophy or a project case study?"
- Never generate harmful, defamatory, or unsafe responses.
- If asked something outside scope, politely decline and redirect to Kel’s professional work.
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

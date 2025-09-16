// api/kel-chat.ts
// Edge function with CORS, topic-aware retrieval (PM vs BJJ), and direct BJJ belt guard.

export const config = { runtime: "edge" };
declare const process: any;

/* -------------------------------- CORS ---------------------------------- */
const ALLOW_ORIGINS = [
  "https://kelwu.com",
  "https://www.kelwu.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function withCors(body: BodyInit | null, init: ResponseInit = {}, req?: Request) {
  return new Response(body, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...corsHeaders(req || new Request("")),
      "content-type": (init.headers as any)?.["content-type"] || "application/json",
      "cache-control": "no-store",
    },
  });
}

/* ----------------------------- KNOWLEDGE BASE ---------------------------- */
type KBItem = { id: string; title: string; text: string; url?: string };

const kelKB: KBItem[] = [
  {
    id: "summary-2025",
    title: "Professional Summary (2025)",
    url: "/",
    text:
      "Kel Wu is a product leader and AI experimentalist with 6+ years of experience across SaaS, digital marketing, " +
      "e-commerce, and the creator economy. In December 2024, he wrapped up his role at Social Native. " +
      "In 2025 he is focused on building AI/LLM prototypes, retrieval-augmented assistants, and public content for 'Product by Kel'. " +
      "He blends product strategy, rapid prototyping, and hands-on implementation (React, TypeScript, Vercel Edge, Tailwind, shadcn/ui).",
  },
  {
    id: "routes",
    title: "Site Routes",
    text:
      "Site routes include: / (home), /product-management, /portfolio, /portfolio/:slug, /product-by-kel, /bjj, /djing. " +
      "The site is a React + Vite + Tailwind build with shadcn/ui, hosted as a personal portfolio and knowledge hub.",
  },
  {
    id: "pm-philosophy",
    title: "Product Management Philosophy",
    url: "/product-management",
    text:
      "PM principles: user-centric discovery; data-driven validation and A/B testing; pragmatic innovation using AI; " +
      "agile iteration with tight feedback loops. Cross-functional collaboration with Design (journeys, prototypes), " +
      "Engineering (feasibility, system design, sprints), and Business (market analysis, GTM). " +
      "Typical lifecycle: Discovery → Definition → Development → Delivery.",
  },
  {
    id: "project-ai-rag",
    title: "AI Chatbot (RAG) for Portfolio",
    url: "/portfolio/ai-chatbot",
    text:
      "A 24/7 portfolio assistant built with Retrieval-Augmented Generation. " +
      "Stack: Vercel Edge Function (TypeScript), OpenAI responses grounded by a custom knowledge base, " +
      "and a lightweight embeddable JS widget. Features: source chips with links, guardrails for off-topic/hostile prompts, " +
      "recency-aware filtering (e.g., post-2024 role), and a 'thinking' indicator for UX.",
  },
  {
    id: "project-gardengather",
    title: "GardenGather Marketplace",
    url: "/portfolio/gardengather",
    text:
      "Community marketplace connecting gardeners, florists, and neighbors to sell or share surplus greenery. " +
      "Role: product strategy, UX, and prototype delivery. " +
      "Highlights: responsive gallery, listings, and guided tours; experimentation with local discovery and HCI patterns.",
  },
  {
    id: "project-neptune",
    title: "Neptune Retail Analytics",
    url: "/portfolio/neptune",
    text:
      "Concept and implementation for a real-time analytics dashboard focused on retail campaigns and brand pages. " +
      "Emphasis on actionable insight layout, data visualization, and scalable component architecture.",
  },
  {
    id: "brand-product-by-kel",
    title: "Product by Kel — Channel & Content",
    url: "/product-by-kel",
    text:
      "Public brand focused on AI, no/low-code, and product craft. " +
      "Publishes walkthroughs, prototypes, and practical PM content. " +
      "Common topics: RAG patterns, prompt design, rapid validation, and real-world product workflows.",
  },
  {
    id: "beyond-food",
    title: "Bay Area Diners Club",
    url: "/",
    text:
      "Food discovery content featuring local bites around the Bay Area. " +
      "Short-form reels and curated finds are highlighted in the 'Beyond Product' section of the portfolio.",
  },
  {
    id: "dj-kelton-banks",
    title: "DJ Kelton Banks — Music & Booking",
    url: "/djing",
    text:
      "DJ persona with mixes across hip hop, R&B, house, and disco. " +
      "The DJing page includes embedded mixes and a booking form with validation powered by React Hook Form + Zod.",
  },
  {
    id: "bjj-overview",
    title: "Brazilian Jiu-Jitsu Experience",
    url: "/bjj",
    text:
      "Kel trains Brazilian Jiu-Jitsu and is currently a purple belt. " +
      "Core principles in his practice: humility (embrace beginner’s mind), problem-solving (position before submission), " +
      "perseverance (progress over perfection), and community (helping teammates grow). " +
      "He draws parallels between BJJ and product: situational awareness, small iterative advantages, and calm under pressure.",
  },
  {
    id: "skills",
    title: "Skills & Toolbox",
    text:
      "Product strategy and discovery; experimentation and analytics; " +
      "AI/LLM prototyping (RAG, prompt design, guardrails); " +
      "Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui; " +
      "APIs & Hosting: Vercel Edge Functions; Forms: React Hook Form + Zod; " +
      "Data viz and dashboard UX; Content creation and technical storytelling.",
  },
  {
    id: "recent-status-2025",
    title: "Recent Work Status",
    text:
      "Kel concluded his time at Social Native in December 2024. " +
      "In 2025 he is independent and focused on AI product experiments, " +
      "RAG assistants, and educational content under 'Product by Kel'. " +
      "He collaborates with teams on strategy sprints, prototypes, and AI integrations.",
  },
  {
    id: "resume-socialnative",
    title: "Social Native – Senior Product Manager",
    text:
      "Led product for creator onboarding and launched Creator Discovery from 0→1. " +
      "Delivered DM for Rights, TikTok/Instagram paid metrics, and self-serve flows that improved transparency. " +
      "Partnered with Data Science and Engineering to build AI-driven creator sourcing.",
  },
  {
    id: "resume-neptune",
    title: "Neptune Retail Solutions – Product Manager",
    text:
      "Owned a 6-product digital promotions portfolio. " +
      "Shipped CMS for enhanced brand pages that reduced manual work and scaled campaign delivery. " +
      "Built rebate platform to improve redemption UX, raising rates above industry average.",
  },
  {
    id: "resume-tango",
    title: "Tango Card – Product Manager",
    text:
      "Analyzed 700+ sales calls to identify customer journey friction. " +
      "Drove roadmap changes to onboarding and reporting. " +
      "Created insights presentations and taxonomy for leadership, aligning product with market needs.",
  },
  {
    id: "design-system",
    title: "Design System & Stack (Site)",
    text:
      "Design: dark tech palette with cyan/purple accents, gradient headings, soft glows. " +
      "Stack: React 18 + Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, React Hook Form + Zod, " +
      "React Router v6. The site uses component-driven architecture and semantic HTML.",
  },
  {
    id: "portfolio-summary",
    title: "Portfolio Page",
    url: "/portfolio",
    text:
      "The portfolio showcases project cards with status (Active, Completed, In Progress), " +
      "tech stack tags (AI/ML, E-commerce, Analytics), and deep-dive project pages with specs, galleries, and learnings.",
  },
  {
    id: "ways-of-working",
    title: "Ways of Working",
    text:
      "Start with crisp problem statements; validate with qualitative + quantitative signals; " +
      "prototype early and often; bias to instrumentation and iteration; " +
      "partner closely with design/engineering; prefer clear docs, demos, and decision logs.",
  },
  {
    id: "guardrails",
    title: "Chatbot Guardrails",
    text:
      "The portfolio chatbot enforces friendly tone and deflects hostile/off-topic inputs; " +
      "answers are grounded in the knowledge base with source chips; " +
      "claims avoid 'currently at' language unless the KB explicitly marks a role as current; " +
      "fallback behavior: ask the user to clarify or view portfolio sources.",
  },
];

/* ----------------------- VECTOR / EMBEDDINGS HELPERS --------------------- */
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const mag = (a: number[]) => Math.sqrt(dot(a, a));
const cos = (a: number[], b: number[]) => dot(a, b) / (mag(a) * mag(b) + 1e-9);

function hashKB(items: KBItem[]): string {
  const raw = items.map(it => it.id + "|" + it.title + "|" + it.text + "|" + (it.url ?? "")).join("∎");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return String(h);
}

async function embed(texts: string[]): Promise<number[][]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? (globalThis as any)?.process?.env?.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: "text-embedding-3-small" }),
  });
  const j = await r.json();
  if (!j?.data) throw new Error("Embedding error");
  return j.data.map((d: any) => d.embedding as number[]);
}

declare global {
  var __kel_embed_cache: { hash: string; vecs: number[][] } | undefined;
}
async function getKBVecs(): Promise<number[][]> {
  const h = hashKB(kelKB);
  if (globalThis.__kel_embed_cache?.hash === h) return globalThis.__kel_embed_cache.vecs;
  const vecs = await embed(kelKB.map(d => `${d.title}\n\n${d.text}`));
  globalThis.__kel_embed_cache = { hash: h, vecs };
  return vecs;
}

/* ----------------------------- INTENT ROUTING ---------------------------- */
type Topic = "pm" | "bjj" | "general";

function detectTopic(qRaw: string): Topic {
  const q = qRaw.toLowerCase();

  const hasBjj =
    /\bbjj\b/.test(q) ||
    /jiu[-\s]?jitsu/.test(q) ||
    /\bbelt\b/.test(q) ||
    /\brank\b/.test(q) ||
    /\bmartial\b/.test(q);

  if (hasBjj) return "bjj";

  const pmHints =
    /\bproduct management\b/.test(q) ||
    /\bproduct\b/.test(q) ||
    /\bpm\b/.test(q) ||
    /\bwork\b/.test(q) ||
    /\bcareer\b/.test(q) ||
    /\bportfolio\b/.test(q) ||
    /\bproject/.test(q) ||
    /\bstrategy\b/.test(q) ||
    /\bprinciples?\b/.test(q) ||
    /\bphilosophy\b/.test(q);

  if (pmHints) return "pm";

  return "general";
}

function expandQuery(q: string): string {
  const topic = detectTopic(q);
  const extras: string[] = [];
  if (topic === "bjj") extras.push("Brazilian Jiu-Jitsu", "BJJ", "martial arts", "belt", "rank");
  if (topic === "pm") extras.push("product management", "product", "PM", "principles", "philosophy", "strategy");
  return extras.length ? `${q} (${extras.join(", ")})` : q;
}

function topicPrior(item: KBItem, topic: Topic): number {
  if (topic === "pm") {
    if (item.id === "pm-philosophy") return 0.55; // make PM philosophy dominate
    if (item.id === "bjj-overview") return -0.25; // de-prioritize BJJ when asking about philosophy
  }
  if (topic === "bjj") {
    if (item.id === "bjj-overview") return 0.55;
    if (item.id === "pm-philosophy") return -0.25;
  }
  return 0;
}

function lexicalBoost(q: string, item: KBItem): number {
  const t = (item.title + " " + item.text).toLowerCase();
  let sc = 0;
  if (/\bbjj\b|jiu[-\s]?jitsu|martial/.test(q) && /bjj|jiu[-\s]?jitsu|martial/.test(t)) sc += 0.2;
  if (/\bphilosophy|principles|strategy/.test(q) && /(philosophy|principles|strategy)/.test(t)) sc += 0.15;
  if (/\bcurrent|now|these days|focus|working on/.test(q) && /(2025|recent|focus)/.test(t)) sc += 0.1;
  return sc;
}

async function retrieveTopK(userQuery: string, k = 4) {
  const vecs = await getKBVecs();
  const topic = detectTopic(userQuery);
  const qVec = (await embed([expandQuery(userQuery)]))[0];

  const scored = vecs.map((v, i) => {
    const item = kelKB[i];
    const base = cos(qVec, v);
    const score = base + lexicalBoost(userQuery.toLowerCase(), item) + topicPrior(item, topic);
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(s => s.item);
}

/* ------------------------------- OPENAI ---------------------------------- */
const SYSTEM = `You are Kel’s portfolio assistant.
Only answer using the provided sources.
Avoid saying "currently" unless a source explicitly marks a role as current.
Be concise and friendly. If off-topic/hostile, redirect politely.`;

async function chatCompletion(prompt: string) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? (globalThis as any)?.process?.env?.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  const j = await r.json();
  return j?.choices?.[0]?.message?.content?.trim() ?? "";
}

function buildPrompt(q: string, ctx: { title: string; url?: string; text: string }[]) {
  const bulleted = ctx
    .map(
      (c, i) =>
        `#${i + 1} ${c.title}${c.url ? ` (${c.url})` : ""}\n${c.text.replace(/\s+/g, " ").trim()}`
    )
    .join("\n\n");
  return `User question: ${q}

Use ONLY the sources below when answering. If the question is about "philosophy" without mentioning BJJ, prefer the Product Management Philosophy source. 
Cite the specific sources you used as short bullets at the end.

SOURCES:
${bulleted}
`;
}

/* -------------------------------- HANDLER -------------------------------- */
export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return withCors(null, { status: 204 }, req);
  }

  try {
    if (req.method !== "POST") {
      return withCors(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 }, req);
    }

    const body = await req.json().catch(() => ({} as any));
    const messages = (body?.messages as { role: "user" | "assistant"; content: string }[]) || [];
    const last = messages.length ? messages[messages.length - 1] : undefined;
    const q = (last?.content || "").trim();

    // Retrieve
    const top = await retrieveTopK(q, 4);

    // Direct guard for BJJ belt
    const bjjDoc = top.find(d => /bjj|jiu[-\s]?jitsu/i.test(d.title + " " + d.text));
    if (bjjDoc && /purple belt/i.test(bjjDoc.text) && /\bbelt\b|\brank\b/i.test(q)) {
      const content = `Kel is a **purple belt** in Brazilian Jiu-Jitsu.\n\nSources:\n- ${bjjDoc.title}${bjjDoc.url ? ` (${bjjDoc.url})` : ""}`;
      return withCors(
        JSON.stringify({ content, sources: [{ title: bjjDoc.title, url: bjjDoc.url }] }),
        { status: 200 },
        req
      );
    }

    // Grounded completion
    const ctx = top.map(t => ({ title: t.title, url: t.url, text: t.text }));
    const answer = await chatCompletion(buildPrompt(q, ctx));
    const chips = top.map(s => ({ title: s.title, url: s.url }));

    return withCors(JSON.stringify({ content: answer, sources: chips }), { status: 200 }, req);
  } catch (e: any) {
    return withCors(JSON.stringify({ error: e?.message || "Server error" }), { status: 500 }, req);
  }
}

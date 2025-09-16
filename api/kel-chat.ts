// api/kel-chat.ts
// Edge function with CORS, per-site link resolution (WP vs Lovable), topic-aware retrieval,
// LinkedIn/resume guard, and BJJ belt guard — all in one file.

export const config = { runtime: "edge" };
declare const process: any;

/* -------------------------------- CORS ---------------------------------- */
const ALLOW_ORIGINS = [
  "https://kelwu.com",
  "https://www.kelwu.com",
  "https://preview--kelwu-ai-portfolio.lovable.app",
  "https://kelwu-ai-portfolio.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

function pickAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin") || "";
  return ALLOW_ORIGINS.includes(origin) ? origin : "https://kelwu.com";
}
function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": pickAllowedOrigin(req),
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
type SiteLink = { wordpress?: string; lovable?: string; canonical?: string };
type KBItem = { id: string; title: string; text: string; link?: SiteLink };

const kelKB: KBItem[] = [
  // LinkedIn (direct answer for resume/profile queries)
  {
    id: "linkedin",
    title: "Kel Wu — LinkedIn",
    text:
      "Kel Wu’s public professional profile with experience, roles, recommendations, and contact. " +
      "Preferred source for resume-style information and work history.",
    link: { canonical: "https://www.linkedin.com/in/kelwu/" },
  },

  // Summary / current status
  {
    id: "summary-2025",
    title: "Professional Summary (2025)",
    text:
      "Kel Wu is a product leader and AI experimentalist with 6+ years of experience across SaaS, digital marketing, " +
      "e-commerce, and the creator economy. In December 2024, he wrapped up his role at Social Native. " +
      "In 2025 he is focused on building AI/LLM prototypes, retrieval-augmented assistants, and public content for 'Product by Kel'. " +
      "He blends product strategy, rapid prototyping, and hands-on implementation (React, TypeScript, Vercel Edge, Tailwind, shadcn/ui).",
  },

  // Product Management Philosophy
  {
    id: "pm-philosophy",
    title: "Product Management Philosophy",
    text:
      "PM principles: user-centric discovery; data-driven validation and A/B testing; pragmatic innovation using AI; " +
      "agile iteration with tight feedback loops. Cross-functional collaboration with Design (journeys, prototypes), " +
      "Engineering (feasibility, system design, sprints), and Business (market analysis, GTM). " +
      "Typical lifecycle: Discovery → Definition → Development → Delivery.",
    link: {
      wordpress: "/product-management/",
      lovable: "/product-management",
      canonical: "https://kelwu.com/product-management/",
    },
  },

  // RAG project (this chatbot)
  {
    id: "project-ai-rag",
    title: "AI Chatbot (RAG) for Portfolio",
    text:
      "A 24/7 portfolio assistant built with Retrieval-Augmented Generation. " +
      "Stack: Vercel Edge Function (TypeScript), OpenAI responses grounded by a custom knowledge base, " +
      "and a lightweight embeddable JS widget. Features: source chips with links, guardrails for off-topic/hostile prompts, " +
      "recency-aware filtering (post-2024 role), and a 'thinking' indicator for UX.",
    link: {
      wordpress: "/portfolio/",
      lovable: "/portfolio",
      canonical: "https://kelwu.com/portfolio/",
    },
  },

  // GardenGather
  {
    id: "project-gardengather",
    title: "GardenGather Marketplace",
    text:
      "Community marketplace connecting gardeners, florists, and neighbors to sell or share surplus greenery. " +
      "Role: product strategy, UX, and prototype delivery. Highlights: responsive gallery, listings, guided tours.",
    link: {
      wordpress: "/portfolio/",
      lovable: "/portfolio",
      canonical: "https://kelwu.com/portfolio/",
    },
  },

  // Neptune
  {
    id: "project-neptune",
    title: "Neptune Retail Analytics",
    text:
      "Concept and implementation for a real-time analytics dashboard focused on retail campaigns and brand pages. " +
      "Emphasis on actionable insight layout, data visualization, and scalable component architecture.",
    link: {
      wordpress: "/portfolio/",
      lovable: "/portfolio",
      canonical: "https://kelwu.com/portfolio/",
    },
  },

  // Product by Kel (channel)
  {
    id: "brand-product-by-kel",
    title: "Product by Kel — Channel & Content",
    text:
      "Public brand focused on AI, no/low-code, and product craft. " +
      "Publishes walkthroughs, prototypes, and practical PM content. " +
      "Common topics: RAG patterns, prompt design, rapid validation, and real-world product workflows.",
    link: {
      wordpress: "/product-by-kel/",
      lovable: "/product-by-kel",
      canonical: "https://kelwu.com/product-by-kel/",
    },
  },

  // Bay Area Diners Club
  {
    id: "beyond-food",
    title: "Bay Area Diners Club",
    text:
      "Food discovery content featuring local bites around the Bay Area. " +
      "Short-form reels and curated finds are highlighted in the 'Beyond Product' section of the portfolio.",
    link: {
      wordpress: "/",
      lovable: "/",
      canonical: "https://kelwu.com/",
    },
  },

  // DJing
  {
    id: "dj-kelton-banks",
    title: "DJ Kelton Banks — Music & Booking",
    text:
      "DJ persona with mixes across hip hop, R&B, house, and disco. " +
      "The DJing page includes embedded mixes and a booking form with validation powered by React Hook Form + Zod.",
    link: {
      wordpress: "/djing/",
      lovable: "/djing",
      canonical: "https://kelwu.com/djing/",
    },
  },

  // BJJ
  {
    id: "bjj-overview",
    title: "Brazilian Jiu-Jitsu Experience",
    text:
      "Kel trains Brazilian Jiu-Jitsu and is currently a purple belt. " +
      "Core principles in his practice: humility (embrace beginner’s mind), problem-solving (position before submission), " +
      "perseverance (progress over perfection), and community (helping teammates grow). " +
      "He draws parallels between BJJ and product: situational awareness, small iterative advantages, and calm under pressure.",
    link: {
      wordpress: "/brazilian-jiu-jitsu-bjj/",
      lovable: "/bjj",
      canonical: "https://kelwu.com/brazilian-jiu-jitsu-bjj/",
    },
  },

  // Skills
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

  // Recent status
  {
    id: "recent-status-2025",
    title: "Recent Work Status",
    text:
      "Kel concluded his time at Social Native in December 2024. " +
      "In 2025 he is independent and focused on AI product experiments, RAG assistants, " +
      "and educational content under 'Product by Kel'. Collaborates on strategy sprints, prototypes, and AI integrations.",
  },

  // Resume highlights
  {
    id: "resume-socialnative",
    title: "Social Native – Senior Product Manager",
    text:
      "Led product for creator onboarding and launched Creator Discovery from 0→1. " +
      "Delivered DM for Rights, TikTok/Instagram paid metrics, and self-serve flows. " +
      "Partnered with Data Science and Engineering to build AI-driven creator sourcing.",
  },
  {
    id: "resume-neptune",
    title: "Neptune Retail Solutions – Product Manager",
    text:
      "Owned a 6-product digital promotions portfolio. Shipped CMS for enhanced brand pages; " +
      "built rebate platform that improved redemption rates.",
  },
  {
    id: "resume-tango",
    title: "Tango Card – Product Manager",
    text:
      "Analyzed 700+ sales calls to identify friction; drove onboarding/reporting changes; " +
      "created insights presentations and taxonomy for leadership.",
  },

  // Design system / tech
  {
    id: "design-system",
    title: "Design System & Stack (Site)",
    text:
      "Design: dark tech palette with cyan/purple accents, gradient headings, soft glows. " +
      "Stack: React 18 + Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, React Hook Form + Zod, React Router v6.",
  },

  // Portfolio overview
  {
    id: "portfolio-summary",
    title: "Portfolio Page",
    text:
      "Showcases project cards with status (Active, Completed, In Progress), " +
      "tech stack tags (AI/ML, E-commerce, Analytics), and deep-dive project pages.",
    link: {
      wordpress: "/portfolio/",
      lovable: "/portfolio",
      canonical: "https://kelwu.com/portfolio/",
    },
  },

  // Ways of working
  {
    id: "ways-of-working",
    title: "Ways of Working",
    text:
      "Start with crisp problem statements; validate with qualitative + quantitative signals; " +
      "prototype early and often; instrument and iterate; close collaboration with design/engineering; " +
      "write clear docs, demos, and decision logs.",
  },

  // Safety / guardrails doc
  {
    id: "guardrails",
    title: "Chatbot Guardrails",
    text:
      "Friendly tone; deflect hostile/off-topic inputs; answers grounded in the KB with source chips; " +
      "avoid 'currently at' unless explicitly marked; fallback: request clarification or point to sources.",
  },
];

/* -------- Per-site link resolution (WP vs Lovable vs canonical) ---------- */
function resolveLink(item: KBItem, req: Request): string | undefined {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  const isWP = origin.includes("kelwu.com");
  const isLovable = origin.includes("lovable.app");

  // Use the exact origin we saw (so preview/live both work without edits)
  try {
    const base = new URL(origin).origin || "https://kelwu.com";
    const path =
      (isWP && item.link?.wordpress) ||
      (isLovable && item.link?.lovable);
    if (path) return new URL(path, base).toString();
  } catch {
    /* ignore URL parse errors */
  }
  return item.link?.canonical;
}

/* ----------------------- VECTOR / EMBEDDINGS HELPERS --------------------- */
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const mag = (a: number[]) => Math.sqrt(dot(a, a));
const cos = (a: number[], b: number[]) => dot(a, b) / (mag(a) * mag(b) + 1e-9);

function hashKB(items: KBItem[]): string {
  const raw = items.map(it => it.id + "|" + it.title + "|" + it.text + "|" + JSON.stringify(it.link ?? {})).join("∎");
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

  if (/\bbjj\b|jiu[-\s]?jitsu|belt|rank|martial/.test(q)) return "bjj";

  if (
    /\blinkedin|resume|cv|profile/.test(q) ||
    /\bproduct management\b/.test(q) ||
    /\bproduct\b/.test(q) ||
    /\bpm\b/.test(q) ||
    /\bwork\b/.test(q) ||
    /\bcareer\b/.test(q) ||
    /\bportfolio\b/.test(q) ||
    /\bproject/.test(q) ||
    /\bstrategy\b/.test(q) ||
    /\bprinciples?\b/.test(q) ||
    /\bphilosophy\b/.test(q)
  ) return "pm";

  return "general";
}

function expandQuery(q: string): string {
  const topic = detectTopic(q);
  const extras: string[] = [];
  if (topic === "bjj") extras.push("Brazilian Jiu-Jitsu", "BJJ", "martial arts", "belt", "rank");
  if (topic === "pm") extras.push("product management", "product", "PM", "principles", "philosophy", "strategy", "LinkedIn", "resume");
  return extras.length ? `${q} (${extras.join(", ")})` : q;
}

function topicPrior(item: KBItem, topic: Topic): number {
  if (topic === "pm") {
    if (item.id === "linkedin") return 0.65;
    if (item.id === "pm-philosophy") return 0.55;
    if (item.id === "bjj-overview") return -0.25;
  }
  if (topic === "bjj") {
    if (item.id === "bjj-overview") return 0.55;
    if (item.id === "pm-philosophy" || item.id === "linkedin") return -0.25;
  }
  return 0;
}

function lexicalBoost(q: string, item: KBItem): number {
  const t = (item.title + " " + item.text).toLowerCase();
  let sc = 0;
  if (/\bbjj\b|jiu[-\s]?jitsu|martial/.test(q) && /bjj|jiu[-\s]?jitsu|martial/.test(t)) sc += 0.2;
  if (/\bphilosophy|principles|strategy/.test(q) && /(philosophy|principles|strategy)/.test(t)) sc += 0.15;
  if (/\bcurrent|now|these days|focus|working on/.test(q) && /(2025|recent|focus)/.test(t)) sc += 0.1;
  if (/\blinkedin|resume|cv|profile/.test(q) && /linkedin/.test(t)) sc += 0.6;
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
    .map((c, i) => `#${i + 1} ${c.title}${c.url ? ` (${c.url})` : ""}\n${c.text.replace(/\s+/g, " ").trim()}`)
    .join("\n\n");
  return `User question: ${q}

Use ONLY the sources below when answering.
If the question mentions LinkedIn, resume, CV, or profile, prefer the LinkedIn source.
If the question is about "philosophy" without BJJ terms, prefer the Product Management Philosophy source.
Cite the specific sources you used as short bullets at the end.

SOURCES:
${bulleted}
`;
}

/* -------------------------------- HANDLER -------------------------------- */
export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return withCors(null, { status: 204 }, req);

  try {
    if (req.method !== "POST") {
      return withCors(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 }, req);
    }

    const body = await req.json().catch(() => ({} as any));
    const messages = (body?.messages as { role: "user" | "assistant"; content: string }[]) || [];
    const last = messages.length ? messages[messages.length - 1] : undefined;
    const q = (last?.content || "").trim();

    // Direct guard: LinkedIn / resume / CV / profile
    if (/\blinkedin|resume|cv|profile\b/i.test(q)) {
      const li = kelKB.find(d => d.id === "linkedin")!;
      const url = li.link?.canonical || "https://www.linkedin.com/in/kelwu/";
      const content =
        `You can find Kel’s professional profile on LinkedIn here: ${url}\n\n` +
        `Sources:\n- ${li.title} (${url})`;
      return withCors(JSON.stringify({ content, sources: [{ title: li.title, url }] }), { status: 200 }, req);
    }

    // Retrieve
    const top = await retrieveTopK(q, 4);

    // Direct guard: BJJ belt
    const bjjDoc = top.find(d => /bjj|jiu[-\s]?jitsu/i.test(d.title + " " + d.text));
    if (bjjDoc && /purple belt/i.test(bjjDoc.text) && /\bbelt\b|\brank\b/i.test(q)) {
      const url = resolveLink(bjjDoc, req);
      const content = `Kel is a **purple belt** in Brazilian Jiu-Jitsu.\n\nSources:\n- ${bjjDoc.title}${url ? ` (${url})` : ""}`;
      return withCors(JSON.stringify({ content, sources: [{ title: bjjDoc.title, url }].filter(Boolean) }), { status: 200 }, req);
    }

    // Build grounded prompt and answer
    const ctx = top.map(t => ({
      title: t.title,
      url: resolveLink(t, req),
      text: t.text,
    }));
    const answer = await chatCompletion(buildPrompt(q, ctx));

    // Source chips with per-site links
    const chips = top.map(s => {
      const url = resolveLink(s, req);
      return url ? { title: s.title, url } : { title: s.title };
    });

    return withCors(JSON.stringify({ content: answer, sources: chips }), { status: 200 }, req);
  } catch (e: any) {
    return withCors(JSON.stringify({ error: e?.message || "Server error" }), { status: 500 }, req);
  }
}

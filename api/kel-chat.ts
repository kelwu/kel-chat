// api/kel-chat.ts
// Single-file Edge function: embeds retriever + KB to avoid import path issues.

export const config = { runtime: "edge" };
// TS shim for Edge
declare const process: any;

/* ----------------------------- KNOWLEDGE BASE ----------------------------- */
// Paste/keep your KB here. This includes your BJJ “purple belt” entry.
type KBItem = { id: string; title: string; text: string; url?: string };

const kelKB: KBItem[] = [
  // ===== Overview & Current Focus (2025) =====
  {
    id: "summary-2025",
    title: "Professional Summary (2025)",
    url: "/",
    text:
      "Kel Wu is a product leader and AI experimentalist with 6+ years of experience across SaaS, digital marketing, " +
      "e-commerce, and the creator economy. In December 2024, he wrapped up his role at Social Native. " +
      "In 2025 he is focused on building AI/LLM prototypes, retrieval-augmented assistants, and public content for 'Product by Kel'. " +
      "He blends product strategy, rapid prototyping, and hands-on implementation (React, TypeScript, Vercel Edge, Tailwind, shadcn/ui)."
  },

  // ===== Site / Routes =====
  {
    id: "routes",
    title: "Site Routes",
    text:
      "Site routes include: / (home), /product-management, /portfolio, /portfolio/:slug, /product-by-kel, /bjj, /djing. " +
      "The site is a React + Vite + Tailwind build with shadcn/ui, hosted as a personal portfolio and knowledge hub."
  },

  // ===== PM Philosophy =====
  {
    id: "pm-philosophy",
    title: "Product Management Philosophy",
    url: "/product-management",
    text:
      "PM principles: user-centric discovery; data-driven validation and A/B testing; pragmatic innovation using AI; " +
      "agile iteration with tight feedback loops. Cross-functional collaboration with Design (journeys, prototypes), " +
      "Engineering (feasibility, system design, sprints), and Business (market analysis, GTM). " +
      "Typical lifecycle: Discovery → Definition → Development → Delivery."
  },

  // ===== Current AI / RAG Project =====
  {
    id: "project-ai-rag",
    title: "AI Chatbot (RAG) for Portfolio",
    url: "/portfolio/ai-chatbot",
    text:
      "A 24/7 portfolio assistant built with Retrieval-Augmented Generation. " +
      "Stack: Vercel Edge Function (TypeScript), OpenAI responses grounded by a custom knowledge base, " +
      "and a lightweight embeddable JS widget. Features: source chips with links, guardrails for off-topic/hostile prompts, " +
      "recency-aware filtering (e.g., post-2024 role), and a 'thinking' indicator for UX."
  },

  // ===== GardenGather =====
  {
    id: "project-gardengather",
    title: "GardenGather Marketplace",
    url: "/portfolio/gardengather",
    text:
      "Community marketplace connecting gardeners, florists, and neighbors to sell or share surplus greenery. " +
      "Role: product strategy, UX, and prototype delivery. " +
      "Highlights: responsive gallery, listings, and guided tours; experimentation with local discovery and HCI patterns."
  },

  // ===== Neptune Retail Analytics =====
  {
    id: "project-neptune",
    title: "Neptune Retail Analytics",
    url: "/portfolio/neptune",
    text:
      "Concept and implementation for a real-time analytics dashboard focused on retail campaigns and brand pages. " +
      "Emphasis on actionable insight layout, data visualization, and scalable component architecture."
  },

  // ===== Product by Kel (Brand) =====
  {
    id: "brand-product-by-kel",
    title: "Product by Kel — Channel & Content",
    url: "/product-by-kel",
    text:
      "Public brand focused on AI, no/low-code, and product craft. " +
      "Publishes walkthroughs, prototypes, and practical PM content. " +
      "Common topics: RAG patterns, prompt design, rapid validation, and real-world product workflows."
  },

  // ===== Bay Area Diners Club (Food) =====
  {
    id: "beyond-food",
    title: "Bay Area Diners Club",
    url: "/",
    text:
      "Food discovery content featuring local bites around the Bay Area. " +
      "Short-form reels and curated finds are highlighted in the 'Beyond Product' section of the portfolio."
  },

  // ===== DJ Kelton Banks =====
  {
    id: "dj-kelton-banks",
    title: "DJ Kelton Banks — Music & Booking",
    url: "/djing",
    text:
      "DJ persona with mixes across hip hop, R&B, house, and disco. " +
      "The DJing page includes embedded mixes and a booking form with validation powered by React Hook Form + Zod."
  },

  // ===== BJJ Experience =====
  {
    id: "bjj-overview",
    title: "Brazilian Jiu-Jitsu Experience",
    url: "/bjj",
    text:
      "Kel trains Brazilian Jiu-Jitsu and is currently a purple belt. " +
      "Core principles in his practice: humility (embrace beginner’s mind), problem-solving (position before submission), " +
      "perseverance (progress over perfection), and community (helping teammates grow). " +
      "He draws parallels between BJJ and product: situational awareness, small iterative advantages, and calm under pressure."
  },

  // ===== Skills / Toolbox =====
  {
    id: "skills",
    title: "Skills & Toolbox",
    text:
      "Product strategy and discovery; experimentation and analytics; " +
      "AI/LLM prototyping (RAG, prompt design, guardrails); " +
      "Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui; " +
      "APIs & Hosting: Vercel Edge Functions; Forms: React Hook Form + Zod; " +
      "Data viz and dashboard UX; Content creation and technical storytelling."
  },

  // ===== Recent Work Status =====
  {
    id: "recent-status-2025",
    title: "Recent Work Status",
    text:
      "Kel concluded his time at Social Native in December 2024. " +
      "In 2025 he is independent and focused on AI product experiments, " +
      "RAG assistants, and educational content under 'Product by Kel'. " +
      "He collaborates with teams on strategy sprints, prototypes, and AI integrations."
  },

  // ===== Resume Highlights =====
  {
    id: "resume-socialnative",
    title: "Social Native – Senior Product Manager",
    text:
      "Led product for creator onboarding and launched Creator Discovery from 0→1. " +
      "Delivered DM for Rights, TikTok/Instagram paid metrics, and self-serve flows that improved transparency. " +
      "Partnered with Data Science and Engineering to build AI-driven creator sourcing."
  },
  {
    id: "resume-neptune",
    title: "Neptune Retail Solutions – Product Manager",
    text:
      "Owned a 6-product digital promotions portfolio. " +
      "Shipped CMS for enhanced brand pages that reduced manual work and scaled campaign delivery. " +
      "Built rebate platform to improve redemption UX, raising rates above industry average."
  },
  {
    id: "resume-tango",
    title: "Tango Card – Product Manager",
    text:
      "Analyzed 700+ sales calls to identify customer journey friction. " +
      "Drove roadmap changes to onboarding and reporting. " +
      "Created insights presentations and taxonomy for leadership, aligning product with market needs."
  },

  // ===== Design System / Tech =====
  {
    id: "design-system",
    title: "Design System & Stack (Site)",
    text:
      "Design: dark tech palette with cyan/purple accents, gradient headings, soft glows. " +
      "Stack: React 18 + Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, React Hook Form + Zod, " +
      "React Router v6. The site uses component-driven architecture and semantic HTML."
  },

  // ===== Portfolio Page Summary =====
  {
    id: "portfolio-summary",
    title: "Portfolio Page",
    url: "/portfolio",
    text:
      "The portfolio showcases project cards with status (Active, Completed, In Progress), " +
      "tech stack tags (AI/ML, E-commerce, Analytics), and deep-dive project pages with specs, galleries, and learnings."
  },

  // ===== Process & Ways of Working =====
  {
    id: "ways-of-working",
    title: "Ways of Working",
    text:
      "Start with crisp problem statements; validate with qualitative + quantitative signals; " +
      "prototype early and often; bias to instrumentation and iteration; " +
      "partner closely with design/engineering; prefer clear docs, demos, and decision logs."
  },

  // ===== Safety & Guardrails (Chatbot) =====
  {
    id: "guardrails",
    title: "Chatbot Guardrails",
    text:
      "The portfolio chatbot enforces friendly tone and deflects hostile/off-topic inputs; " +
      "answers are grounded in the knowledge base with source chips; " +
      "claims avoid 'currently at' language unless the KB explicitly marks a role as current; " +
      "fallback behavior: ask the user to clarify or view portfolio sources."
  }
];

/* ----------------------------- VECTOR / EMBEDS ----------------------------- */
// simple vector math
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const mag = (a: number[]) => Math.sqrt(dot(a, a));
const cos = (a: number[], b: number[]) => dot(a, b) / (mag(a) * mag(b) + 1e-9);

// hash to bust cold-start cache when KB changes
function hashKB(items: KBItem[]): string {
  const raw = items.map(it => it.id + "|" + it.title + "|" + it.text + "|" + (it.url ?? "")).join("∎");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return String(h);
}

// OpenAI embeddings
async function embed(texts: string[]): Promise<number[][]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? (globalThis as any)?.process?.env?.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: "text-embedding-3-small",
    }),
  });
  const j = await r.json();
  if (!j?.data) throw new Error("Embedding error");
  return j.data.map((d: any) => d.embedding as number[]);
}

// in-memory cache for this cold start
declare global {
  // eslint-disable-next-line no-var
  var __kel_embed_cache: { hash: string; vecs: number[][] } | undefined;
}

async function getKBVecs(): Promise<number[][]> {
  const h = hashKB(kelKB);
  if (globalThis.__kel_embed_cache?.hash === h) return globalThis.__kel_embed_cache.vecs;
  const vecs = await embed(kelKB.map(d => `${d.title}\n\n${d.text}`));
  globalThis.__kel_embed_cache = { hash: h, vecs };
  return vecs;
}

/* ----------------------------- RETRIEVER ----------------------------- */
function expandQuery(q: string): string {
  const ql = q.toLowerCase();
  const syn: string[] = [];
  if (/\bbjj\b/.test(ql) || /jiu[-\s]?jitsu/i.test(q)) syn.push("Brazilian Jiu-Jitsu", "BJJ", "martial arts");
  if (/\bbelt\b/.test(ql) || /\brank\b/.test(ql) || /\blevel\b/.test(ql)) syn.push("rank", "belt", "purple belt");
  return syn.length ? `${q} (${syn.join(", ")})` : q;
}
function keywordBoost(q: string, item: KBItem): number {
  const t = (item.title + " " + item.text).toLowerCase();
  let sc = 0;
  if (/\bbjj\b|\bjiu[-\s]?jitsu\b/i.test(q) && /bjj|jiu[-\s]?jitsu/.test(t)) sc += 0.2;
  if (/\bbelt\b|\brank\b|\bpurple\b/i.test(q) && /(belt|rank|purple)/.test(t)) sc += 0.15;
  return sc;
}
async function retrieveTopK(userQuery: string, k = 4) {
  const vecs = await getKBVecs();
  const qVec = (await embed([expandQuery(userQuery)]))[0];
  const scored = vecs.map((v, i) => ({
    item: kelKB[i],
    score: cos(qVec, v) + keywordBoost(userQuery.toLowerCase(), kelKB[i]),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(s => s.item);
}

/* ----------------------------- OPENAI CHAT ----------------------------- */
const SYSTEM = `You are Kel’s portfolio assistant.
Only answer using the provided sources.
Avoid saying "currently" unless a source explicitly marks it as current.
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

Use ONLY the sources below when answering. Cite the specific sources you used as short bullets at the end.

SOURCES:
${bulleted}
`;
}

/* ----------------------------- HANDLER ----------------------------- */
export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const body = await req.json().catch(() => ({} as any));
    const messages = (body?.messages as { role: "user" | "assistant"; content: string }[]) || [];
    const last = messages.length ? messages[messages.length - 1] : undefined;
    const q = (last?.content || "").trim();

    // Retrieve
    const top = await retrieveTopK(q, 4);

    // Direct guard for the BJJ belt
    const bjjDoc = top.find(d => /bjj|jiu[-\s]?jitsu/i.test(d.title + " " + d.text));
    if (bjjDoc && /purple belt/i.test(bjjDoc.text)) {
      const content = `Kel is a **purple belt** in Brazilian Jiu-Jitsu.\n\nSources:\n- ${bjjDoc.title}${bjjDoc.url ? ` (${bjjDoc.url})` : ""}`;
      return new Response(JSON.stringify({ content, sources: [{ title: bjjDoc.title, url: bjjDoc.url }] }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    // Grounded completion
    const ctx = top.map(t => ({ title: t.title, url: t.url, text: t.text }));
    const answer = await chatCompletion(buildPrompt(q, ctx));
    const chips = top.map(s => ({ title: s.title, url: s.url }));

    return new Response(JSON.stringify({ content: answer, sources: chips }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
}

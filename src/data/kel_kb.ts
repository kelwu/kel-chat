export type KBItem = { id: string; title: string; text: string; url?: string };

export const kelKB: KBItem[] = [
  // ===== Overview & Current Focus (2025) =====
  {
    id: "summary-2025",
    title: "Professional Summary (2025)",
    url: "/",
    text:
      "Kel Wu is a product leader and AI experimentalist with 8+ years of experience across SaaS, digital marketing, " +
      "e-commerce, and the creator economy. In December 2024, he wrapped up his role at Social Native. " +
      "In June 2025, he was contracted as a Data Analyst for Tango Card where Synthesized AI-driven insights across Gong, FullStory, Mixpanel,+
      "Qualtrics and Ada chat logs, then used Lovable.dev to prototype UX enhancements—transforming raw customer data into visualized product +
      "recommendations for the rewards platform." +
      "In 2025 he is focused on building AI/LLM prototypes, retrieval-augmented assistants, and public content for 'Product by Kel' channels on. " +
      "YouTube, Instagram and TikTok."
      "He blends product strategy, rapid prototyping, and hands-on implementation (Lovable, Vercel, Zapier, n8n, Creatomate, Elevenlabs)."
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

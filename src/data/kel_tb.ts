export type KBItem = { id: string; title: string; text: string; url?: string };

export const kelKB: KBItem[] = [
  {
    id: "routes",
    title: "Site Routes",
    text: "Routes: / (home), /product-management, /portfolio, /portfolio/:slug, /product-by-kel, /bjj, /djing."
  },
  {
    id: "pm",
    title: "PM Philosophy",
    url: "/product-management",
    text: "User-centric research; data-driven A/B testing; innovation using emerging tech; agile iteration. Collaborates with Design, Engineering, and Business. Process: Discovery → Definition → Development → Delivery."
  },
  {
    id: "projects",
    title: "Projects",
    url: "/portfolio",
    text: "Background Removal Tool (AI/ML + React+TS+HF), GardenGather Marketplace (community e-commerce), Neptune Retail Analytics (data viz, in progress)."
  },
  {
    id: "beyond",
    title: "Beyond Product",
    text: "Food discovery via @bayareadinersclub (IG reels grid) and music as DJ Kelton Banks (SoundCloud mixes + booking)."
  },
  {
    id: "bjj",
    title: "BJJ",
    url: "/bjj",
    text: "Brazilian Jiu-Jitsu: humility, problem-solving, perseverance, community."
  },
  {
    id: "dj",
    title: "DJing",
    url: "/djing",
    text: "Hip hop, R&B, house, disco house; mixes embedded; booking form with validation."
  }
];

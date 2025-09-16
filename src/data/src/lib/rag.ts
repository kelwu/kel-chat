// src/lib/rag.ts
import { kelKB } from "../data/kel_kb";

// -------------------- Types --------------------
export type KBItem = { id: string; title: string; text: string; url?: string };
type Embd = { id: string; vec: number[]; item: KBItem };

// -------------------- Small utils --------------------
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const mag = (a: number[]) => Math.sqrt(dot(a, a));
const cos = (a: number[], b: number[]) => dot(a, b) / (mag(a) * mag(b) + 1e-9);

// Create a stable hash of the KB so we can bust any cold-start cache when content changes
function hashKB(items: KBItem[]): string {
  const raw = items.map(it => it.id + "|" + it.title + "|" + it.text + "|" + (it.url ?? "")).join("∎");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return String(h);
}

// -------------------- Embeddings --------------------
// We use a tiny on-the-fly embedding via OpenAI (kept simple). You can swap for your model.
async function embed(texts: string[]): Promise<number[][]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      input: texts,
      model: "text-embedding-3-small",
    }),
  });
  const j = await r.json();
  if (!j.data) throw new Error("Embedding error");
  return j.data.map((d: any) => d.embedding as number[]);
}

// Cache in memory per cold start, but with a content hash
declare global {
  // eslint-disable-next-line no-var
  var __kel_cache: { hash: string; embds: Embd[] } | undefined;
}

async function getKBEmbeddings(): Promise<Embd[]> {
  const h = hashKB(kelKB);
  if (globalThis.__kel_cache?.hash === h) return globalThis.__kel_cache.embds;

  const vecs = await embed(kelKB.map(d => `${d.title}\n\n${d.text}`));
  const embds: Embd[] = kelKB.map((item, i) => ({ id: item.id, vec: vecs[i], item }));
  globalThis.__kel_cache = { hash: h, embds };
  return embds;
}

// -------------------- Retriever --------------------
function expandQuery(q: string): string {
  const ql = q.toLowerCase();
  const synonyms: string[] = [];

  // BJJ ↔ Brazilian Jiu-Jitsu
  if (/\bbjj\b/.test(ql) || /jiu[-\s]?jitsu/i.test(q)) {
    synonyms.push("Brazilian Jiu-Jitsu", "BJJ", "martial arts");
  }
  // belt/rank
  if (/\bbelt\b/.test(ql) || /\brank\b/.test(ql) || /\blevel\b/.test(ql)) {
    synonyms.push("rank", "belt", "purple belt");
  }

  return synonyms.length ? `${q} (${synonyms.join(", ")})` : q;
}

function keywordBoost(q: string, item: KBItem): number {
  const t = (item.title + " " + item.text).toLowerCase();
  let sc = 0;
  if (/\bbjj\b|\bjiu[-\s]?jitsu\b/i.test(q) && /bjj|jiu[-\s]?jitsu/.test(t)) sc += 0.2;
  if (/\bbelt\b|\brank\b|\bpurple\b/i.test(q) && /(belt|rank|purple)/.test(t)) sc += 0.15;
  return sc;
}

export async function retrieveTopK(userQuery: string, k = 4) {
  const embds = await getKBEmbeddings();

  const qExpanded = expandQuery(userQuery);
  const [qVec] = await embed([qExpanded]);

  const scored = embds.map(e => {
    const s = cos(qVec, e.vec) + keywordBoost(qExpanded.toLowerCase(), e.item);
    return { score: s, item: e.item };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(s => s.item);
}

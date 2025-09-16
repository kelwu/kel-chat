// src/lib/rag.js
// ESM module for Vercel Edge (no TS types)

// eslint-disable-next-line import/extensions
import { kelKB } from "../data/kel_kb.js";

// ---------- vector utils ----------
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const mag = (a) => Math.sqrt(dot(a, a));
const cos = (a, b) => dot(a, b) / (mag(a) * mag(b) + 1e-9);

// Stable hash to bust cold-start cache when KB changes
function hashKB(items) {
  const raw = items.map((it) => it.id + "|" + it.title + "|" + it.text + "|" + (it.url ?? "")).join("∎");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return String(h);
}

// ---------- embeddings ----------
async function embed(texts) {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // works in Edge runtime
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? globalThis?.process?.env?.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: "text-embedding-3-small",
    }),
  });
  const j = await r.json();
  if (!j.data) throw new Error("Embedding error");
  return j.data.map((d) => d.embedding);
}

// global cold-start cache (allowed on Edge)
globalThis.__kel_cache = globalThis.__kel_cache || undefined;

async function getKBEmbeddings() {
  const h = hashKB(kelKB);
  if (globalThis.__kel_cache?.hash === h) return globalThis.__kel_cache.embds;

  const vecs = await embed(kelKB.map((d) => `${d.title}\n\n${d.text}`));
  const embds = kelKB.map((item, i) => ({ id: item.id, vec: vecs[i], item }));
  globalThis.__kel_cache = { hash: h, embds };
  return embds;
}

// ---------- retrieval with synonym expansion + keyword boost ----------
function expandQuery(q) {
  const ql = q.toLowerCase();
  const synonyms = [];
  if (/\bbjj\b/.test(ql) || /jiu[-\s]?jitsu/i.test(q)) {
    synonyms.push("Brazilian Jiu-Jitsu", "BJJ", "martial arts");
  }
  if (/\bbelt\b/.test(ql) || /\brank\b/.test(ql) || /\blevel\b/.test(ql)) {
    synonyms.push("rank", "belt", "purple belt");
  }
  return synonyms.length ? `${q} (${synonyms.join(", ")})` : q;
}

function keywordBoost(q, item) {
  const t = (item.title + " " + item.text).toLowerCase();
  let sc = 0;
  if (/\bbjj\b|\bjiu[-\s]?jitsu\b/i.test(q) && /bjj|jiu[-\s]?jitsu/.test(t)) sc += 0.2;
  if (/\bbelt\b|\brank\b|\bpurple\b/i.test(q) && /(belt|rank|purple)/.test(t)) sc += 0.15;
  return sc;
}

export async function retrieveTopK(userQuery, k = 4) {
  const embds = await getKBEmbeddings();
  const qExpanded = expandQuery(userQuery);
  const [qVec] = await embed([qExpanded]);

  const scored = embds.map((e) => {
    const s = cos(qVec, e.vec) + keywordBoost(qExpanded.toLowerCase(), e.item);
    return { score: s, item: e.item };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.item);
}

import type { KBItem } from "../data/kel_kb";

type Embedding = number[];
const cache = new Map<string, Embedding>();

function cosine(a: Embedding, b: Embedding) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function embed(text: string, key: string): Promise<Embedding> {
  const k = "e:" + text;
  if (cache.has(k)) return cache.get(k)!;
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text })
  });
  const j = await r.json();
  const v = j?.data?.[0]?.embedding as Embedding;
  cache.set(k, v);
  return v;
}

export async function topK(query: string, kb: KBItem[], key: string, k = 5) {
  const q = await embed(query, key);
  const scored = await Promise.all(
    kb.map(async it => ({ it, s: cosine(q, await embed(it.text, key)) }))
  );
  return scored.sort((a,b)=>b.s-a.s).slice(0,k).map(x=>x.it);
}

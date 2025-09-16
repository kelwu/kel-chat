// api/kel-chat.ts
import { retrieveTopK } from "../src/lib/rag";
import { kelKB } from "../src/data/kel_kb";

export const config = { runtime: "edge" };

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are Kel’s portfolio assistant. 
Only answer using the provided sources. 
Avoid saying "currently" unless the source explicitly marks something current. 
Tone: friendly, concise, helpful.
If question is hostile/off-topic, respond politely and redirect.`;

async function chatCompletion(prompt: string) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}

function buildPrompt(q: string, ctx: { title: string; url?: string; text: string }[]) {
  const bulleted = ctx
    .map(
      (c, i) =>
        `#${i + 1} ${c.title}${c.url ? ` (${c.url})` : ""}\n` +
        c.text.replace(/\s+/g, " ").trim()
    )
    .join("\n\n");

  return `User question: ${q}

Use ONLY the sources below when answering. Cite the specific sources you used as short bullets at the end.

SOURCES:
${bulleted}
`;
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const { messages } = (await req.json()) as { messages: Msg[] };
    const q = messages?.at(-1)?.content?.trim() || "";

    // Retrieve
    const top = await retrieveTopK(q, 4);

    // If we have a direct BJJ match, answer decisively
    const bjjDoc = top.find(d => /bjj|jiu[-\s]?jitsu/i.test(d.title + " " + d.text));
    if (bjjDoc && /purple belt/i.test(bjjDoc.text)) {
      const content = `Kel is a **purple belt** in Brazilian Jiu-Jitsu.\n\nSources:\n- ${bjjDoc.title}${bjjDoc.url ? ` (${bjjDoc.url})` : ""}`;
      return new Response(
        JSON.stringify({
          content,
          sources: [{ title: bjjDoc.title, url: bjjDoc.url }],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            // prevent CDN/function cache
            "cache-control": "no-store",
          },
        }
      );
    }

    // Otherwise build grounded prompt
    const ctx = top.map(t => ({ title: t.title, url: t.url, text: t.text }));
    const answer = await chatCompletion(buildPrompt(q, ctx));

    // Build source chips for the UI
    const chips = top.map(s => ({ title: s.title, url: s.url }));

    return new Response(JSON.stringify({ content: answer, sources: chips }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
}

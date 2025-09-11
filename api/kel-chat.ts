// api/kel-chat.ts

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        ok: true,
        echo: body,
        msg: "API route is working 🚀"
      }),
      {
        headers: { "content-type": "application/json" }
      }
    );
  }

  return new Response("Method Not Allowed", { status: 405 });
}


import { NextRequest } from "next/server";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE: empuja eventos cuando hay mensajes nuevos.
// Implementación simple basada en polling cada 2s sobre la DB.
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let lastTimestamp = new Date(Date.now() - 5_000);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("hello", { ok: true, ts: Date.now() });

      const interval = setInterval(async () => {
        try {
          const newMessages = await prisma.message.findMany({
            where: {
              conversation: { tenantId: DEMO_TENANT_ID },
              createdAt: { gt: lastTimestamp },
            },
            include: {
              conversation: {
                include: { contact: true, channel: true },
              },
            },
            orderBy: { createdAt: "asc" },
            take: 20,
          });
          if (newMessages.length) {
            lastTimestamp = newMessages[newMessages.length - 1].createdAt;
            send("messages", newMessages);
          } else {
            send("ping", { ts: Date.now() });
          }
        } catch (err) {
          console.error("[stream] error:", err);
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

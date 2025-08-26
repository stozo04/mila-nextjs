// src/app/api/chat-stream/route.ts
import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "edge";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const PROMPT_ID = process.env.OPENAI_PROMPT_ID;
const VECTOR_STORE_ID =
  process.env.OPENAI_VECTOR_STORE_ID || "vs_67a9713baad8819187ebc6dedd741aa5";

type Body = {
  question?: string;
  conversationId?: string | null;
};

function buildNowSystemItem(tz = "America/Chicago") {
  const now = new Date();
  // e.g., "Tuesday, August 26, 2025 at 2:37:12 PM Central Daylight Time"
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    dateStyle: "full",
    timeStyle: "long",
  }).format(now);

  const text =
    `Current date/time: ${fmt} (${tz}). ` +
    `When asked about ages, durations, or “how long ago,” compute using this current date/time. ` +
    `If provided birthdays (e.g., Mila born May 30, 2023), calculate age precisely to today. ` +
    `Prefer exact values (years/months/days) when relevant.`;

  return { role: "system" as const, content: text };
}
function buildNowSystemItem(tz = "America/Chicago") {
  const now = new Date();
  // e.g., "Tuesday, August 26, 2025 at 2:37:12 PM Central Daylight Time"
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    dateStyle: "full",
    timeStyle: "long",
  }).format(now);

  const text =
    `Current date/time: ${fmt} (${tz}). ` +
    `When asked about ages, durations, or “how long ago,” compute using this current date/time. ` +
    `If provided birthdays (e.g., Mila born May 30, 2023), calculate age precisely to today. ` +
    `Prefer exact values (years/months/days) when relevant.`;

  return { role: "system" as const, content: text };
}

function extractSources(final: any) {
  const sources: Array<{ file_id?: string; title?: string; quote?: string }> = [];
  for (const item of final?.output ?? []) {
    for (const c of item?.content ?? []) {
      for (const a of c?.annotations ?? []) {
        if (
          a?.type === "file_citation" ||
          a?.type === "citation" ||
          a?.citation_type === "file"
        ) {
          sources.push({
            file_id: a.file_id || a?.metadata?.file_id,
            title: a?.title || a?.metadata?.title,
            quote: a?.quote || a?.text,
          });
        }
      }
    }
  }
  return sources;
}

export async function POST(req: NextRequest) {
  try {
    const { question, conversationId }: Body = await req.json();
    if (!question?.trim()) {
      return new Response("Missing question", { status: 400 });
    }

    // Start a Responses **stream**
    const stream = await client.responses.stream({
      model: MODEL,
      ...(PROMPT_ID ? { prompt: { id: PROMPT_ID } } : {}),
      ...(conversationId ? { conversation: { id: conversationId } } : {}),
      input: [buildNowSystemItem(), { role: "user", content: question }],
      store: true,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [VECTOR_STORE_ID],
        },
      ],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      start(controller) {
        // Send small headers line so the client knows it's SSE
        controller.enqueue(encoder.encode(`event: ping\ndata: 1\n\n`));

        stream.on("response.output_text.delta", (e: any) => {
          // token delta (just text)
          controller.enqueue(encoder.encode(`data: ${e.delta}\n\n`));
        });

        stream.on("response.refusal.delta", (e: any) => {
          controller.enqueue(encoder.encode(`data: ${e.delta}\n\n`));
        });

        stream.on("response.error", (e: any) => {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: e.message || "stream error" })}\n\n`
            )
          );
          controller.close();
        });

        stream.on("end", async () => {
          // Get the full structured final response (for conv id + citations)
          const final = await stream.finalResponse();
          const convId = final?.conversation?.id || conversationId || null;
          const sources = extractSources(final);

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({ conversationId: convId, sources })}\n\n`
            )
          );
          controller.close();
        });
      },
      cancel() {
        // If client disconnects, stop the OpenAI stream.
        try { stream.abort(); } catch {}
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("[/api/chat-stream] Error:", err);
    return new Response(
      JSON.stringify({
        error:
          err?.error?.message || err?.message || "Unknown error while streaming",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

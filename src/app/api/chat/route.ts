// src/app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "edge"; // fast + scalable
const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatBody = {
  question?: string;          // the user's text
  conversationId?: string;    // optional: keep context across turns
};

export async function POST(req: NextRequest) {
  try {
    const { question, conversationId }: ChatBody = await req.json();

    if (!question || !question.trim()) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Optional: point to a Prompt created in the dashboard.
    // If you don't have one yet, leave it undefined and just pass model below.
    const promptId = process.env.OPENAI_PROMPT_ID || undefined;

    // Choose a default model; you can bump to gpt-4.1, gpt-4.1-mini, etc.
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const response = await client.responses.create({
      model,
      // If you have a Prompt, attach it here:
      ...(promptId ? { prompt: { id: promptId } } : {}),
      // Use conversation to keep server-side context (no more threads)
      ...(conversationId ? { conversation: { id: conversationId } } : {}),
      // Input items: user message
      input: [{ role: "user", content: question }],
      // If you want to store (for reuse / token savings):
      store: true,
       // built-in File Search against your vector store
    tools: [
      {
        type: "file_search",
        vector_store_ids: [VECTOR_STORE_ID || ""],
      },
    ],
    });

    // Extract top-level text and an updated conversation id (if any)
    const answer =
      (response.text && response.text.output_text) ||
      response.output_text ||
      // Fallback: stitch from output items if needed
      (response.output?.[0]?.content?.[0]?.type === "output_text"
        ? response.output[0].content[0].text
        : "");

    // Conversation ID (present when store=true or when Conversations are used)
    const newConvId = response.conversation?.id;

    return new Response(
      JSON.stringify({
        answer: answer?.toString() ?? "",
        conversationId: newConvId || conversationId || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[/api/chat] Error:", err);
    const message =
      err?.error?.message ||
      err?.message ||
      "Unknown error while creating a response";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

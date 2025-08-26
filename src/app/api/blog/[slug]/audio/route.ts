// src/app/api/blog/[slug]/audio/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// IMPORTANT: keep Node runtime (Edge tends to time out & params are async)
export const runtime = "nodejs";

// Persona (yours, unchanged)
const PERSONALITY_INSTRUCTIONS = `Affect/personality: A cheerful guide 

Tone: Friendly, clear, and reassuring, creating a calm atmosphere and making the listener feel confident and comfortable.

Pronunciation: Clear, articulate, and steady, ensuring each instruction is easily understood while maintaining a natural, conversational flow.

Pause: Brief, purposeful pauses after key instructions (e.g., "cross the street" and "turn right") to allow time for the listener to process the information and follow along.

Emotion: Warm and supportive, conveying empathy and care, ensuring the listener feels guided and safe throughout the journey.`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Voice/model (yours)
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "sage";

// ---------- helpers ----------
function htmlToPlain(s: string) {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function b64ToBytes(b64: string) {
  return Buffer.from(b64, "base64");
}
function bytesToB64(bytes: Buffer | Uint8Array) {
  return Buffer.isBuffer(bytes) ? bytes.toString("base64") : Buffer.from(bytes).toString("base64");
}

// Conservative sentence-aware chunker
function chunkText(input: string, target = 2000, maxChunks = 8): string[] {
  if (input.length <= target) return [input];
  const sentences = input
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'])/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    const candidate = current ? `${current} ${s}` : s;
    if (candidate.length <= target) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      if (s.length > target) {
        for (let i = 0; i < s.length; i += target) chunks.push(s.slice(i, i + target));
        current = "";
      } else {
        current = s;
      }
    }
    if (chunks.length >= maxChunks) break; // prevent very long jobs from timing out
  }
  if (current && chunks.length < maxChunks) chunks.push(current);
  return chunks;
}

// Cache (your schema)
async function getCachedAudio(slug: string) {
  const { data, error } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();

  if (error) {
    console.warn("[blog_audio] read error:", error);
  }
  const b64 = data?.audio_data as string | undefined;
  return b64 ? b64ToBytes(b64) : null;
}
async function saveAudioToCache(slug: string, bytes: Buffer) {
  const audio_b64 = bytesToB64(bytes);
  const { error } = await supabase
    .from("blog_audio")
    .upsert({ slug, audio_data: audio_b64, created_at: new Date().toISOString() });
  if (error) console.warn("[blog_audio] upsert error:", error);
}

// Unified JSON error
function jsonError(status: number, message: string, extras?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...extras }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const started = Date.now();
  try {
    const { slug } = await params;
    if (!slug) return jsonError(400, "Missing slug");

    // 1) Load blog
    const { data: blog, error: blogErr } = await supabase
      .from("blogs")
      .select("id, slug, title, content")
      .eq("slug", slug)
      .single();
    if (blogErr) {
      console.error("[blogs] select error:", blogErr);
      return jsonError(500, "DB error fetching blog");
    }
    if (!blog) return jsonError(404, "Blog not found");

    // 2) Build narration text
    const title = blog.title || "A letter to Mila";
    const speakText = `${title}\n\n${htmlToPlain(blog.content)}`;
    if (!speakText || speakText.length < 8) return jsonError(400, "Empty blog content");

    // 3) Cache
    const cached = await getCachedAudio(slug);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "Content-Length": String(cached.byteLength),
        },
      });
    }

    // 4) Chunk + TTS
    const parts = chunkText(speakText, 2000, 8); // tighter to avoid timeouts
    if (parts.length === 0) return jsonError(400, "Nothing to synthesize");

    const buffers: Buffer[] = [];
    for (let i = 0; i < parts.length; i++) {
      const prefix =
        parts.length > 1
          ? `Part ${i + 1} of ${parts.length}. Continue seamlessly with consistent pacing and tone.\n\n`
          : "";
      const input = prefix + parts[i];

      try {
        const speech = await openai.audio.speech.create({
          model: TTS_MODEL,
          voice: TTS_VOICE,
          input,
          instructions: PERSONALITY_INSTRUCTIONS,
          // SDKs vary: "format" vs "response_format"; keep yours:
          response_format: "mp3",
        });
        const arr = await speech.arrayBuffer();
        buffers.push(Buffer.from(arr));
      } catch (e: any) {
        // Surface OpenAI error details
        console.error("[OpenAI TTS] chunk error:", e);
        return jsonError(
          e?.status ?? 502,
          "OpenAI TTS failed",
          { code: e?.code, type: e?.type, message: e?.message }
        );
      }
    }

    // 5) Stitch + cache
    const finalBytes = Buffer.concat(buffers);
    await saveAudioToCache(slug, finalBytes);

    // 6) Return audio
    return new Response(finalBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(finalBytes.length),
        "X-Gen-Time": String(Date.now() - started),
        "X-Chunks": String(parts.length),
      },
    });
  } catch (err: any) {
    console.error("[/api/blog/[slug]/audio] fatal:", err);
    return jsonError(500, err?.message || "Failed to generate or cache audio");
  }
}

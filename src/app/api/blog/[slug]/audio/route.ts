import { NextRequest } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
// -----------------------------------------------------------------------------
// Alexis Rose persona (kept for later prompt-engineering tweaks)
// -----------------------------------------------------------------------------
const PERSONALITY_INSTRUCTIONS = `Affect/personality: A cheerful guide \n\nTone: Friendly, clear, and reassuring, creating a calm atmosphere and making the listener feel confident and comfortable.\n\nPronunciation: Clear, articulate, and steady, ensuring each instruction is easily understood while maintaining a natural, conversational flow.\n\nPause: Brief, purposeful pauses after key instructions (e.g., \"cross the street\" and \"turn right\") to allow time for the listener to process the information and follow along.\n\nEmotion: Warm and supportive, conveying empathy and care, ensuring the listener feels guided and safe throughout the journey.`;

// --- OpenAI + Supabase clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Voice/model defaults
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "sage"; // try "verse", "sage", etc.

// --------- helpers ---------
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

// Read cached audio; ensure the hash matches the latest text
async function getCachedAudio(slug: string) {
  const { data } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();

  const b64 = data?.audio_data as string;
  if (!b64) return null;

  return b64ToBytes(b64);
}

async function saveAudioToCache(slug: string, bytes: Buffer) {
  const audio_b64 = bytesToB64(bytes);
  await supabase.from("blog_audio").upsert({ slug, audio_data: audio_b64, created_at: new Date().toISOString(), });
}

// --------- route ---------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> } // NextJS: params is a Promise
) {
  try {
    const { slug } = await params;
    if (!slug) return new Response("Missing slug", { status: 400 });

    // 1) Fetch blog
    const { data: blog, error } = await supabase
      .from("blogs")
      .select("id, slug, title, content")
      .eq("slug", slug)
      .single();

    if (error || !blog) return new Response("Blog not found", { status: 404 });

    // 2) Build narration text + hash
    const title = blog.title || "A letter to Mila";
    const speakText = `${title}\n\n${htmlToPlain(blog.content)}`;

    // 3) Read-through cache
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

    // 4) Generate via OpenAI TTS
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: speakText,
      instructions: PERSONALITY_INSTRUCTIONS,
      response_format: "mp3",
    });

    const arrayBuf = await speech.arrayBuffer();
    const bytes = Buffer.from(arrayBuf);

    // 5) Persist to blog_audio
    await saveAudioToCache(slug, bytes);

    // 6) Return the fresh audio
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (err: any) {
    console.error("[/api/blog/[slug]/audio] error:", err);
    return new Response(
      JSON.stringify({
        error: err?.error?.message || err?.message || "Failed to generate or cache audio",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

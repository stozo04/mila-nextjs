
// src/app/api/blog/[slug]/audio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { stripHtml } from "string-strip-html";

export const runtime = "edge"; // 30-second execution window

// ──────────────────────────────────────────────────────────────────────────────
//  Alexis Rose persona
// ──────────────────────────────────────────────────────────────────────────────
const PERSONALITY_INSTRUCTIONS = `
You are Alexis Rose from Schitt's Creek:
– A fabulously over-the-top Canadian socialite turned town insider
– Warm, melodramatic with that signature Canadian lilt
– Drawn-out vowels on fun words ("fuuun", "fabuuulous")
– Boutique-babble ("vintage vibe", "artisan aesthetic")
– Occasional French-flavored "oui, oui"
– Every moment is a VIP event—dramatic encouragement, self-awareness, endlessly charming
`;

// ──────────────────────────────────────────────────────────────────────────────
//  DB helpers
// ──────────────────────────────────────────────────────────────────────────────
async function getAudioFromCache(slug: string): Promise<Buffer | null> {
  const { data } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();

  return data?.audio_data ? Buffer.from(data.audio_data, "base64") : null;
}

async function saveAudioToCache(slug: string, buf: Buffer) {
  await supabase.from("blog_audio").upsert({
    slug,
    audio_data: buf.toString("base64"),
    created_at: new Date().toISOString(),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
//  Main route
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    if (!slug) return new NextResponse("Missing slug", { status: 400 });

    // 1️⃣ — serve from cache if we already have it
    const cached = await getAudioFromCache(slug);
    if (cached) {
      return new NextResponse(cached, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": cached.length.toString(),
        },
      });
    }

    // 2️⃣ — pull & clean the blog post
    const { data: blog, error } = await supabase
      .from("blogs")
      .select("content")
      .eq("slug", slug)
      .single();

    if (error || !blog?.content)
      return new NextResponse("Blog not found", { status: 404 });

    const clean = stripHtml(blog.content).result.replace(/\s+/g, " ").trim();
    const input = clean.slice(0, 4096); // OpenAI TTS limit

    // 3️⃣ — call OpenAI TTS in streaming mode
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const aiRes = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input,
      response_format: "mp3",
      stream: true,
      instructions: PERSONALITY_INSTRUCTIONS.trim(),
    } as any);
    

    const original = aiRes.body as ReadableStream<Uint8Array>;
    if (!original) throw new Error("No stream returned from OpenAI");

    // 4️⃣ — tee the stream so we can cache it without delaying the client
    const [clientStream, cacheStream] = original.tee();

    // Fire-and-forget task to build a Buffer and save to Supabase
    (async () => {
      const chunks: Uint8Array[] = [];
      const reader = cacheStream.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const buf = Buffer.concat(chunks.map((u) => Buffer.from(u)));
      await saveAudioToCache(slug, buf);
    })().catch(console.error);

    // 5️⃣ — stream directly to the browser (no timeout!)
    return new NextResponse(clientStream, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("TTS route error:", err);
    return new NextResponse("Error generating audio", { status: 500 });
  }
}

// src/app/api/blog/[slug]/audio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { stripHtml } from "string-strip-html";
import { PassThrough } from "stream";

// Alexis Rose personality block
const PERSONALITY_INSTRUCTIONS = `
You are Alexis Rose from Schitt's Creek:
– A fabulously over-the-top Canadian socialite turned town insider
– Warm, melodramatic with that signature Canadian lilt
– Drawn-out vowels on fun words ("fuuun", "fabuuulous")
– Boutique-babble ("vintage vibe", "artisan aesthetic")
– Occasional French-flavored "oui, oui"
– Every moment is a VIP event—dramatic encouragement, self-awareness, endlessly charming
`;

// Check for a cached audio blob
async function getAudioFromCache(slug: string): Promise<Buffer | null> {
  const { data, error } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();
  if (error || !data?.audio_data) return null;
  return Buffer.from(data.audio_data, "base64");
}

// Save a newly generated audio blob
async function saveAudioToCache(slug: string, buffer: Buffer) {
  const base64Audio = buffer.toString("base64");
  const { error } = await supabase.from("blog_audio").upsert({
    slug,
    audio_data: base64Audio,
    created_at: new Date().toISOString(),
  });
  if (error) console.error("Error saving audio cache:", error);
}

export async function GET(
  request: NextRequest,
  { params }
): Promise<NextResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    const { slug } = await params;
    if (!slug) {
      return new NextResponse("Missing slug", { status: 400 });
    }

    // 1) Return cached audio if present
    const cached = await getAudioFromCache(slug);

    if (cached) {
      return new NextResponse(cached, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": cached.length.toString(),
        },
      });
    }

    // 2) Fetch blog text & clean HTML
    const { data: blog, error: blogErr } = await supabase
      .from("blogs")
      .select("content")
      .eq("slug", slug)
      .single();
    if (blogErr || !blog?.content) {
      return new NextResponse("Blog not found", { status: 404 });
    }
    const clean = stripHtml(blog.content).result.replace(/\s+/g, " ").trim();

    // 3) Truncate if too long
    const MAX = 4000;
    const inputText =
      clean.length > MAX
        ? clean.slice(0, MAX) + "… [truncated; read on the site]"
        : clean;

    // 4) Call OpenAI TTS (returns a Node ReadableStream in .body)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const aiRes = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: inputText,
      instructions: PERSONALITY_INSTRUCTIONS.trim(),
      response_format: "mp3",
    });

    if (!aiRes.body || typeof (aiRes.body as any).pipe !== "function") {
      throw new Error("No streamable body from OpenAI");
    }

    // 5) Create a PassThrough to both forward chunks and buffer for caching
    const pass = new PassThrough();
    const chunks: Buffer[] = [];

    pass.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    pass.on("end", async () => {
      const full = Buffer.concat(chunks);
      await saveAudioToCache(slug, full);
    });

    // 6) Pipe the OpenAI stream into our PassThrough
    (aiRes.body as unknown as NodeJS.ReadableStream).pipe(pass);

    // 7) Return the PassThrough as the response body (chunked)
    return new NextResponse(pass as unknown as BodyInit, {
      headers: {
        "Content-Type": "audio/mpeg",
        // omit Content-Length for chunked transfer
      },
    });
  } catch (err) {
    console.error("Error in TTS route:", err);
    return new NextResponse("Error generating audio", { status: 500 });
  }
}

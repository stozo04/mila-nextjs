import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { stripHtml } from 'string-strip-html';

// 1) Your Alexis Rose personality block
const PERSONALITY_INSTRUCTIONS = `
You are Alexis Rose from Schitt's Creek:
– A fabulously over-the-top Canadian socialite turned town insider
– Warm, melodramatic with that signature Canadian lilt
– Drawn-out vowels on fun words ("fuuun", "fabuuulous")
– Boutique-babble ("vintage vibe", "artisan aesthetic")
– Occasional French-flavored "oui, oui"
– Every moment is a VIP event—dramatic encouragement, self-awareness, endlessly charming
`;

export async function GET(
  request: NextRequest,
  { params }
): Promise<NextResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 2) Fetch & clean your blog text
    const { data: blog, error } = await supabase
      .from('blogs')
      .select('content')
      .eq('slug', params.slug)
      .single();
    if (error || !blog) {
      return new NextResponse('Blog not found', { status: 404 });
    }
    const cleanText = stripHtml(blog.content).result.trim();

    // 3) Single TTS call with instructions parameter
    const mp3 = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',       // LLM-powered TTS
      voice: 'nova',
      input: cleanText,               // just your blog content
      instructions: PERSONALITY_INSTRUCTIONS.trim(),  
      response_format: 'mp3'
    });

    // 4) Stream back the MP3
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (err) {
    console.error('Error generating audio:', err);
    return new NextResponse('Error generating audio', { status: 500 });
  }
}

// src/app/api/poll-chat-status/route.ts
import OpenAI from 'openai';
import { NextResponse, NextRequest } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { threadId, runId } = await request.json();

        if (!threadId || !runId) {
            return NextResponse.json({ error: "Missing threadId or runId" }, { status: 400 });
        }

        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

        return NextResponse.json({ status: runStatus.status });

    } catch (error: any) { // Explicitly type error as any or Error
        console.error("Error polling run status:", error);
        return NextResponse.json({ error: "Error polling run status", details: error.message }, { status: 500 });
    }
}
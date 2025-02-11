// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the current date as a string in your desired format.
const currentDate = new Date().toLocaleDateString("en-US", {
  timeZone: "UTC", // or your desired time zone
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Using service role key for server-side operations
);

export async function POST(request: NextRequest) {
  try {
    const { question, threadId, runId, getAnswer } = await request.json(); // Destructure getAnswer

    // Store the question in Supabase
    const { error: insertError } = await supabase
      .from("chat_questions")
      .insert([
        {
          question,
          created_at: currentDate,
        },
      ]);

    if (insertError) {
      console.error("Error storing question:", insertError);
      // Continue with the chat even if storing fails
    }
    
    if (getAnswer && threadId && runId) {
      // If getAnswer is true, we are fetching the final answer based on existing thread and run IDs
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data
        .filter((message) => message.role === "assistant")
        .pop();

      if (!lastMessage) {
        throw new Error("No response from assistant");
      }
      const answer =
        lastMessage.content[0].type === "text"
          ? lastMessage.content[0].text.value
          : "No text response available";
      return NextResponse.json({ answer });
    } else {
      // Original logic to start a new chat and run
      if (!question) {
        return NextResponse.json(
          { error: "Missing question" },
          { status: 400 }
        );
      }

      const thread = await openai.beta.threads.create();

      // Combine the current date with the user's question.
      const questionWithDate = `Assume today's date is ${currentDate}. ${question}`;

      const message = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: questionWithDate,
      });

      // Create and await the run
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: process.env.OPENAI_ASSISTANT_ID || "",
      });

      // Immediately return threadId and runId
      return NextResponse.json(
        { threadId: thread.id, runId: run.id },
        { status: 202 }
      ); // 202 Accepted - processing started
    }
  } catch (error: any) {
    // Explicitly type error as any or Error
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while processing your request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

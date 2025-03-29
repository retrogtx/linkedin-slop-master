import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    // Generate post using the AI SDK
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    });
    
    // Split the text into three parts using --- as separator
    const posts = text.split("---").map(post => post.trim()).filter(Boolean);
    
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[GENERATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate post" },
      { status: 500 }
    );
  }
} 
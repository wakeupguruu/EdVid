import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, ENHANCED_USER, ENHANCED_USER_CONTINUATION, SYSTEM_PROMPT_CONTINUATION } from '@/defults/prompt';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const userPrompt = body.prompt;
    const previousPromptId = body.previousPromptId; // For continuation requests

    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    // Get previous prompt context if this is a continuation
    let previousContext = null;
    if (previousPromptId) {
      const previousPrompt = await prisma.prompt.findUnique({
        where: { id: previousPromptId },
        include: { user: true }
      });

      if (!previousPrompt || previousPrompt.userId !== user.id) {
        return NextResponse.json({ error: 'Previous prompt not found or access denied.' }, { status: 404 });
      }

      previousContext = {
        originalPrompt: previousPrompt.inputText,
        content: previousPrompt.content, // The parsed JSON from previous generation
        rawOutput: previousPrompt.rawOutput
      };
    }

    const prompt = await prisma.prompt.create({
      data: {
        inputText: userPrompt,
        userId: user.id,
        status: 'pending',
        previousPromptId: previousPromptId || null,
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        promptId: prompt.id,
        action: previousPromptId ? "prompt_continued" : "prompt_created",
        metadata: { promptText: userPrompt, previousPromptId }
      }
    });

    // Call Anthropic API to generate video scripts
    const PROMPT = previousContext 
      ? ENHANCED_USER_CONTINUATION(userPrompt, previousContext)
      : ENHANCED_USER(userPrompt);

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-20250514',
      max_tokens: 20000,
      system: previousContext ? SYSTEM_PROMPT_CONTINUATION : SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `${PROMPT}` },
      ],
      temperature: 1.0,
    });

    let output = '';

    for await (const message of stream) {
      if (message.type === 'content_block_delta') {
        output += (message.delta as {text : string})?.text || '';
      }
    }

    // Parse the output
    let mockOutput: string;
    let scenes: any[];
    
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      mockOutput = jsonMatch ? jsonMatch[1] : output;
      scenes = JSON.parse(mockOutput);
    } catch (e) {
      // If parsing fails, log the error and return a meaningful response
      throw new Error(`Failed to parse API response as valid JSON. Response: ${output.substring(0, 500)}`);
    }
    const sceneCount = scenes.length;
   
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: {
        rawOutput: mockOutput,
        content: mockOutput, // Store the parsed JSON
        status: 'completed',
        startedProcessingAt: new Date(),
        completedAt: new Date()
      }
    });

    const codeSnippet = await prisma.codeSnippet.create({
      data: {
        promptId: prompt.id,
        code: scenes.map((s: any) => s.code).join('\n\n'),
        language: "python"
      }
    });

    const video = await prisma.video.create({
      data: {
        promptId: prompt.id,
        status: "completed",
        title: scenes[0]?.scene || "Generated Video"
      }
    });

    await prisma.videoProcessingLog.create({
      data: {
        videoId: video.id,
        stage: "completed",
        message: previousContext ? "Video continuation completed" : "Video generation completed",
        level: "info"
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        promptId: prompt.id,
        action: previousContext ? "video_continued" : "video_queued",
        metadata: { videoId: video.id, sceneCount: scenes.length, isContinuation: !!previousContext }
      }
    });
  
    return NextResponse.json({ 
      success: true,
      promptId: prompt.id,
      videoId: video.id,
      sceneCount: sceneCount,
      isContinuation: !!previousContext
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

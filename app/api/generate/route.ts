import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, ENHANCED_USER, ENHANCED_USER_CONTINUATION, SYSTEM_PROMPT_CONTINUATION } from '@/defaults/prompt';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';
import { validators, ValidationErrors } from '@/lib/validation';
import { logger } from '@/lib/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    logger.info('🎬 [Generate] Request received');
    
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const userPrompt = body.prompt;
    const previousPromptId = body.previousPromptId;

    try{
      validators.prompt(userPrompt);
    } catch(error){
        if(error instanceof ValidationErrors){
            logger.warn('Validation Failed', {errors: error.errors});
            return NextResponse.json({
                error: "Invalid Input",
                errors: error.errors,
            }, {status: 400});
        } else {
            throw error;
        }
    }
    
    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    logger.info(`📝 [Generate] User prompt: "${userPrompt.substring(0, 50)}..."`);

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
        content: previousPrompt.content,
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

    logger.info(`💾 [Generate] Prompt created: ${prompt.id}`);

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        promptId: prompt.id,
        action: previousPromptId ? "prompt_continued" : "prompt_created",
        metadata: { promptText: userPrompt, previousPromptId }
      }
    });

    // Call Anthropic API to generate video scripts
    // TEMPORARILY COMMENTED - No API balance
    /*
    const PROMPT = previousContext 
      ? ENHANCED_USER_CONTINUATION(userPrompt, previousContext)
      : ENHANCED_USER(userPrompt);

    logger.info(`🤖 [Generate] Calling Anthropic API...`);
    
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

    logger.info(`✅ [Generate] API response received (${output.length} chars)`);
    */

    // Mock response for testing (until API balance is restored)
    logger.info(`🤖 [Generate] Using mock response (API disabled temporarily)`);
    
    const mockOutput = JSON.stringify([
      {
        scene: "Introduction",
        duration: 5,
        code: `from manim import *
class IntroScene(Scene):
    def construct(self):
        title = Text("Educational Video", font_size=60)
        subtitle = Text("${userPrompt.substring(0, 30)}...", font_size=30)
        self.play(Write(title))
        self.wait(1)
        self.play(Write(subtitle))
        self.wait(2)`
      },
      {
        scene: "Main Content",
        duration: 10,
        code: `from manim import *
class MainScene(Scene):
    def construct(self):
        circle = Circle()
        square = Square()
        self.play(Create(circle))
        self.wait(1)
        self.play(Transform(circle, square))
        self.wait(2)`
      }
    ]);

    logger.info(`✅ [Generate] Mock response generated (${mockOutput.length} chars)`);
    
    let output = mockOutput;
    
    // Parse the output
    let parsedOutput: string;
    let scenes: any[];
    
    try {
      const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      parsedOutput = jsonMatch ? jsonMatch[1] : output;
      scenes = JSON.parse(parsedOutput);
      logger.info(`📊 [Generate] Parsed ${scenes.length} scenes`);
    } catch (e) {
      logger.error('❌ [Generate] JSON parsing failed', { error: e });
      throw new Error(`Failed to parse API response as valid JSON. Response: ${output.substring(0, 500)}`);
    }

    const sceneCount = scenes.length;
   
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: {
        rawOutput: parsedOutput,
        content: parsedOutput,
        status: 'completed',
        startedProcessingAt: new Date(),
        completedAt: new Date()
      }
    });

    logger.info(`💾 [Generate] Prompt updated as completed`);

    const pythonCode = scenes.map((s: any) => s.code).join('\n\n');

    const codeSnippet = await prisma.codeSnippet.create({
      data: {
        promptId: prompt.id,
        code: pythonCode,
        language: "python"
      }
    });

    logger.info(`🐍 [Generate] Code snippet created (${pythonCode.length} chars)`);

    // Create video with "queued" status
    const video = await prisma.video.create({
      data: {
        promptId: prompt.id,
        status: "queued",
        title: scenes[0]?.scene || "Generated Video"
      }
    });

    logger.info(`📹 [Generate] Video created: ${video.id} (status: queued)`);

    await prisma.videoProcessingLog.create({
      data: {
        videoId: video.id,
        stage: "queued",
        message: "Video queued for processing",
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

    // Queue video for processing (Bull/Redis will handle it)
    logger.info(`🔴 [Generate] Pushing to Redis queue...`);
    
    try {
      const redis = require('redis');
      const client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });
      
      await client.connect();
      logger.info(`✅ [Generate] Connected to Redis`);
      
      // Push to a simple Redis list that worker listens to
      const jobData = {
        videoId: video.id,
        userId: user.id,
        promptId: prompt.id,
        timestamp: new Date().toISOString()
      };
      
      await client.lPush('video-queue', JSON.stringify(jobData));
      logger.info(`✅ [Generate] Job pushed to Redis queue: ${JSON.stringify(jobData)}`);
      
      await client.disconnect();
      logger.info(`✅ [Generate] Disconnected from Redis`);
    } catch (error) {
      logger.error('❌ [Generate] Failed to queue video', { error });
    }
  
    logger.info(`🎉 [Generate] Response sent successfully`);
    
    return NextResponse.json({ 
      success: true,
      promptId: prompt.id,
      videoId: video.id,
      sceneCount: sceneCount,
      isContinuation: !!previousContext,
      message: "Video processing started. You'll receive a notification when ready."
    });

  } catch (error) {
    // Handle Validation Errors
    if(error instanceof ValidationErrors){
      logger.warn('Validation Failed', {errors: error.errors});
      return NextResponse.json({
        error: "Invalid Input",
        errors: error.errors,
      }, {status: 400});
    }
    
    //Handle Anthropic API Errors
    if(error instanceof Error){
      if(error.message.includes('API')){
        logger.error('Anthropic API Error', {message: error.message});
        return NextResponse.json({
          error: "Failed to generate Video Script, Please check your API key and try again",
          code: "ANTHROPIC_API_ERROR",
          details: error.message,
        }, {status: 503});
      }

      if(error.message.includes('JSON')){
        
        logger.error('JSON Parsing Error',{message: error.message});

        return NextResponse.json({
          error: "Failed to parse video script from response",
          code: "JSON_PARSING_ERROR",
          details: error.message,
        }, {status: 500});
      }

      logger.error('Unknown Error', {message: error.message});
      return NextResponse.json({
        error: "Unknown Error",
        code: "UNKNOWN_ERROR",
        details: error.message,
      }, {status: 500});


    }
  }
}

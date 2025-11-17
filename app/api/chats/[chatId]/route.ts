import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';
import { validators, ValidationErrors } from '@/lib/validation';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Validate chatId format
    let validatedChatId: string;
    try {
      validatedChatId = validators.id(params.chatId);
    } catch (error) {
      if (error instanceof ValidationErrors) {
        logger.warn('Invalid Chat ID format', { errors: error.errors });
        return NextResponse.json({
          error: 'Invalid Chat ID format',
          errors: error.errors,
          code: 'INVALID_CHAT_ID'
        }, { status: 400 });
      }
      throw error;
    }

    // OPTIMIZATION: Fetch entire chat chain in one query with proper ordering
    const allPrompts = await prisma.prompt.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        // Chain finder: either is root (no previous) or connects to root
        OR: [
          { id: validatedChatId },
          { previousPromptId: validatedChatId },
        ]
      },
      include: {
        video: true,
      },
      orderBy: {
        createdAt: 'asc', // Chronological order
      },
    });

    if (!allPrompts.length) {
      logger.warn('Chat not found', { chatId: validatedChatId, userId: user.id });
      return NextResponse.json({ 
        error: 'Chat not found.',
        code: 'CHAT_NOT_FOUND'
      }, { status: 404 });
    }

    // Build chain recursively - get full conversation thread
    const rootPrompt = allPrompts.find(p => p.id === validatedChatId);
    if (!rootPrompt) {
      logger.warn('Root prompt not found in chat chain', { chatId: validatedChatId });
      return NextResponse.json({ 
        error: 'Chat not found.',
        code: 'CHAT_NOT_FOUND'
      }, { status: 404 });
    }

    // Fetch full conversation chain (handle deep nesting)
    const fullChain: any[] = [rootPrompt];
    let currentId = rootPrompt.id;
    
    while (true) {
      const nextPrompt = allPrompts.find(p => p.previousPromptId === currentId);
      if (!nextPrompt) break;
      fullChain.push(nextPrompt);
      currentId = nextPrompt.id;
    }

    // Helper function: safely parse JSON scenes
    const parseScenes = (content: string | null): any[] => {
      if (!content) return [];
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        logger.warn('Failed to parse prompt content', { contentLength: content?.length });
        return [];
      }
    };

    // Convert prompts to messages format
    const messages = fullChain.map((prompt, index) => {
      const scenes = parseScenes(prompt.content);

      return {
        id: prompt.id,
        role: 'user' as const,
        content: prompt.inputText,
        timestamp: prompt.createdAt,
        videoData: prompt.video ? {
          videoId: prompt.video.id,
          promptId: prompt.id,
          sceneCount: scenes.length,
          status: prompt.video.status,
          isContinuation: index > 0,
          previousPromptId: prompt.previousPromptId,
        } : undefined,
      };
    });

    // Add assistant responses
    const assistantMessages = fullChain.map((prompt, index) => {
      if (prompt.status === 'completed') {
        const scenes = parseScenes(prompt.content);
        
        if (scenes.length === 0) {
          return null; // Skip if no scenes
        }

        return {
          id: `${prompt.id}_assistant`,
          role: 'assistant' as const,
          content: index === 0 
            ? `Perfect! I've created a comprehensive educational video with ${scenes.length} scenes covering your topic. Here's your video:`
            : `Perfect! I've extended your video with ${scenes.length} additional scenes. Here's your enhanced video:`,
          timestamp: prompt.completedAt || prompt.updatedAt,
          videoData: {
            videoId: prompt.video?.id || `video_${prompt.id}`,
            promptId: prompt.id,
            sceneCount: scenes.length,
            status: 'completed',
            isContinuation: index > 0,
            previousPromptId: prompt.previousPromptId,
          },
        };
      }
      return null;
    }).filter(Boolean);

    // Interleave user and assistant messages
    const allMessages = [];
    for (let i = 0; i < messages.length; i++) {
      allMessages.push(messages[i]);
      if (assistantMessages[i]) {
        allMessages.push(assistantMessages[i]);
      }
    }

    return NextResponse.json({
      success: true,
      chatId: validatedChatId,
      messages: allMessages,
      lastPromptId: fullChain[fullChain.length - 1]?.id,
      totalMessages: allMessages.length,
      code: 'CHAT_FETCHED'
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationErrors) {
      logger.warn('Validation failed in chat route', { errors: error.errors });
      return NextResponse.json({ 
        error: 'Invalid input',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    // Handle database errors
    if (error instanceof Error) {
      logger.error('Error fetching chat session', { 
        message: error.message,
        stack: error.stack
      });
      
      return NextResponse.json({ 
        error: 'Failed to fetch chat session.',
        code: 'CHAT_FETCH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    logger.error('Unknown error in chat route');
    return NextResponse.json({ 
      error: 'Failed to fetch chat session.',
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
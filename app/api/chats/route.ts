import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Get all prompts for the user, grouped by chat sessions
    const prompts = await prisma.prompt.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        video: true,
      },
    });

    // Group prompts into chat sessions
    // A chat session starts with a prompt that has no previousPromptId
    const chatSessions: any[] = [];
    const processedPromptIds = new Set<string>();

    for (const prompt of prompts) {
      if (processedPromptIds.has(prompt.id)) continue;

      // Find the root prompt (no previousPromptId) for this chat session
      let rootPrompt = prompt;
      while (rootPrompt.previousPromptId && !processedPromptIds.has(rootPrompt.previousPromptId)) {
        const parent = prompts.find(p => p.id === rootPrompt.previousPromptId);
        if (!parent) break;
        rootPrompt = parent;
      }

      if (processedPromptIds.has(rootPrompt.id)) continue;

      // Get all prompts in this chat session
      const sessionPrompts: any[] = [];
      let currentPrompt: any = rootPrompt;
      
      while (currentPrompt) {
        sessionPrompts.push(currentPrompt);
        processedPromptIds.add(currentPrompt.id);
        
        // Find the next prompt in the chain
        const nextPrompt = prompts.find(p => p.previousPromptId === currentPrompt.id);
        currentPrompt = nextPrompt || null;
      }

      // Create chat session object
      const chatSession = {
        id: rootPrompt.id,
        title: rootPrompt.inputText.length > 50 
          ? rootPrompt.inputText.substring(0, 50) + '...' 
          : rootPrompt.inputText,
        originalPrompt: rootPrompt.inputText,
        createdAt: rootPrompt.createdAt,
        updatedAt: sessionPrompts[sessionPrompts.length - 1].updatedAt,
        promptCount: sessionPrompts.length,
        lastPromptId: sessionPrompts[sessionPrompts.length - 1].id,
        hasVideo: sessionPrompts.some(p => p.video),
        status: sessionPrompts[sessionPrompts.length - 1].status,
      };

      chatSessions.push(chatSession);
    }

    // Sort by most recent activity
    chatSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ 
      success: true,
      chatSessions 
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history.' }, { status: 500 });
  }
}

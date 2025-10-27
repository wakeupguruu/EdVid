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

    // Simulate API call with a timer instead of actual request
    // TODO: Uncomment when you have ANTHROPIC_API_KEY
    // const PROMPT = previousContext 
    //   ? ENHANCED_USER_CONTINUATION(userPrompt, previousContext)
    //   : ENHANCED_USER(userPrompt);

    // const stream = anthropic.messages.stream({
    //   model: 'claude-opus-4-20250514',
    //   max_tokens: 20000,
    //   system: previousContext ? SYSTEM_PROMPT_CONTINUATION : SYSTEM_PROMPT,
    //   messages: [
    //     { role: 'user', content: `${PROMPT}` },
    //   ],
    //   temperature: 1.0,
    // }).on('text', (text)=>{
    //     console.log(text)
    // })

    // let output = '';

    // for await (const message of stream) {
    //   if (message.type === 'content_block_delta') {
    //     output += (message.delta as {text : string})?.text || '';
    //   }
    // }

    // Simulate processing time (3-5 seconds)
    const processingTime = Math.random() * 2000 + 3000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Simulate successful response
    let mockOutput: string;
    let scenes: any[];
    
    if (previousContext) {
      try {
        const previousScenes = JSON.parse(previousContext.content || '[]');
        const nextSceneNumber = previousScenes.length + 1;
        const basePrompt = previousContext.originalPrompt;
        
        // Generate continuation scenes based on user's improvement request
        mockOutput = `[
          {
            "scene": "Scene ${nextSceneNumber}: ${userPrompt}",
            "code": "from manim import *\\n\\nclass ContinuationScene${nextSceneNumber}(Scene):\\n    def construct(self):\\n        title = Text('Extending ${basePrompt}', font_size=32, color=GOLD)\\n        subtitle = Text('${userPrompt}', font_size=24, color=BLUE)\\n        self.play(Write(title))\\n        self.play(FadeIn(subtitle))\\n        self.wait(3)"
          },
          {
            "scene": "Scene ${nextSceneNumber + 1}: ${userPrompt} - Part 2",
            "code": "from manim import *\\n\\nclass ContinuationScene${nextSceneNumber + 1}(Scene):\\n    def construct(self):\\n        content = MathTex(r\"\\\\text{Exploring: } ${userPrompt}\", font_size=36, color=GREEN)\\n        self.play(Write(content))\\n        self.wait(2)"
          },
          {
            "scene": "Scene ${nextSceneNumber + 2}: ${userPrompt} - Final Integration",
            "code": "from manim import *\\n\\nclass ContinuationScene${nextSceneNumber + 2}(Scene):\\n    def construct(self):\\n        axes = Axes(x_range=[-3, 3], y_range=[-2, 2])\\n        graph = axes.plot(lambda x: x**2, color=RED)\\n        self.play(Create(axes), Create(graph))\\n        text = Text('Enhanced with ${userPrompt}', font_size=20, color=YELLOW)\\n        text.to_edge(UP)\\n        self.play(Write(text))\\n        self.wait(3)"
          }
        ]`;
      } catch (e) {
        // Fallback if previous content is invalid
        mockOutput = `[
          {
            "scene": "Scene 1: ${userPrompt}",
            "code": "from manim import *\\n\\nclass ImprovedScene(Scene):\\n    def construct(self):\\n        title = Text('${userPrompt}', font_size=36, color=GOLD)\\n        self.play(Write(title))\\n        self.wait(2)"
          }
        ]`;
      }
    } else {
      // Initial video generation
      mockOutput = `[
        {
          "scene": "Scene 1: Introduction to ${userPrompt}",
          "code": "from manim import *\\n\\nclass IntroductionScene(Scene):\\n    def construct(self):\\n        axes = Axes(x_range=[-5, 5], y_range=[-3, 3])\\n        title = Text('${userPrompt}', font_size=40, color=GOLD)\\n        subtitle = Text('Comprehensive Guide', font_size=24, color=BLUE)\\n        self.play(Write(title))\\n        self.play(FadeIn(subtitle))\\n        self.wait(2)\\n        self.play(Create(axes))\\n        self.wait(1)"
        },
        {
          "scene": "Scene 2: Basic Concepts of ${userPrompt}",
          "code": "from manim import *\\n\\nclass BasicConceptsScene(Scene):\\n    def construct(self):\\n        circle = Circle(radius=1.5, color=GREEN)\\n        square = Square(side_length=2, color=RED)\\n        triangle = Polygon([0, 1.5, 0], [-0.5, -0.5, 0], [0.5, -0.5, 0], color=BLUE)\\n        self.play(Create(circle), Create(square), Create(triangle))\\n        self.wait(2)\\n        label = Text('Exploring ${userPrompt}', font_size=24)\\n        label.to_edge(UP)\\n        self.play(Write(label))\\n        self.wait(2)"
        },
        {
          "scene": "Scene 3: Advanced ${userPrompt}",
          "code": "from manim import *\\n\\nclass AdvancedScene(Scene):\\n    def construct(self):\\n        equation = MathTex(r\"f(x) = x^2 + 2x + 1\", font_size=48, color=YELLOW)\\n        graph = Axes(x_range=[-4, 2], y_range=[-1, 10]).plot(lambda x: x**2 + 2*x + 1, color=GREEN)\\n        self.play(Write(equation))\\n        self.play(equation.animate.to_edge(UP))\\n        self.play(Create(graph))\\n        self.wait(3)"
        }
      ]`;
    }
    
    scenes = JSON.parse(mockOutput);
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
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

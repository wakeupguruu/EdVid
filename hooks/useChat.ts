"use client";

import { useState, useCallback } from "react";
import { Message, VideoData, GenerateResponse } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null);

  const addMessage = useCallback((message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Clear any previous errors
    setError(null);

    // Add user message
    const userMessage = addMessage({
      role: "user",
      content: content.trim(),
    });

    // Add assistant message with loading state
    const assistantMessage = addMessage({
      role: "assistant",
      content: "I'm analyzing your request and creating an educational video...",
      isGenerating: true,
    });

    setIsLoading(true);

    try {
      // Simulate API call with a timer instead of actual request
      // const response = await fetch("/api/generate", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({ 
      //     prompt: content.trim(),
      //     previousPromptId: currentPromptId // Include previous prompt ID for continuation
      //   }),
      // });

      // Simulate processing time (3-5 seconds)
      const processingTime = Math.random() * 2000 + 3000; // 3-5 seconds
      
      // Update message to show progress
      updateMessage(assistantMessage.id, {
        content: "Processing your request... This will take a few moments.",
        isGenerating: true,
      });

      await new Promise(resolve => setTimeout(resolve, processingTime / 2));

      updateMessage(assistantMessage.id, {
        content: "Generating video scenes and animations...",
        isGenerating: true,
      });

      await new Promise(resolve => setTimeout(resolve, processingTime / 2));

      // Simulate successful response
      const isContinuation = !!currentPromptId;
      const mockData: GenerateResponse = {
        success: true,
        promptId: `prompt_${Date.now()}`,
        videoId: `video_${Date.now()}`,
        sceneCount: Math.floor(Math.random() * 8) + 5, // 5-12 scenes
        error: undefined,
        isContinuation,
      };

      // Update current prompt ID for future continuations
      setCurrentPromptId(mockData.promptId);

      if (mockData.success) {
        const videoData: VideoData = {
          videoId: mockData.videoId,
          promptId: mockData.promptId,
          sceneCount: mockData.sceneCount,
          status: "completed", // Mark as completed since we're showing existing video
          isContinuation,
          previousPromptId: currentPromptId || undefined,
        };

        // Update assistant message with success response and video
        const continuationText = isContinuation 
          ? `Perfect! I've extended your video with ${mockData.sceneCount} additional scenes. Here's your enhanced video:`
          : `Perfect! I've created a comprehensive educational video with ${mockData.sceneCount} scenes covering your topic. Here's your video:`;

        updateMessage(assistantMessage.id, {
          content: continuationText,
          isGenerating: false,
          videoData,
        });
      } else {
        throw new Error(mockData.error || "Generation failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      
      // Update assistant message with error
      updateMessage(assistantMessage.id, {
        content: "I apologize, but I encountered an error while generating your video. Please try again with a different topic or check your request.",
        isGenerating: false,
        error: errorMessage,
      });

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, updateMessage, currentPromptId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentPromptId(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    currentPromptId,
  };
}

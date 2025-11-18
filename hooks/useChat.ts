"use client";

import { useState, useCallback, useEffect } from "react";
import { Message, VideoData, GenerateResponse } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

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

  const loadChatSession = useCallback(async (chatId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/chats/${chatId}`);
      if (!response.ok) {
        throw new Error("Failed to load chat session");
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
      setCurrentChatId(chatId);
      
      // Set the current prompt ID to the last prompt in the session
      if (data.lastPromptId) {
        setCurrentPromptId(data.lastPromptId);
      }
    } catch (err) {
      console.error("Error loading chat session:", err);
      setError(err instanceof Error ? err.message : "Failed to load chat session");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentPromptId(null);
    setCurrentChatId(null);
    setError(null);
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
    
    let data: GenerateResponse | null = null;

    try {
      // Make actual API call to generate endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      // Add progress updates while waiting
      const progressMessages = [
        "I'm analyzing your request and creating an educational video...",
        "Calling Claude AI to generate scenes...",
        "Parsing video structure...",
        "Creating animation code...",
        "Preparing video queue...",
      ];
      
      let progressIndex = 0;
      const progressInterval = setInterval(() => {
        if (progressIndex < progressMessages.length - 1) {
          progressIndex++;
          updateMessage(assistantMessage.id, {
            content: progressMessages[progressIndex],
            isGenerating: true,
          });
        }
      }, 3000);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            prompt: content.trim(),
            previousPromptId: currentPromptId
          }),
          signal: controller.signal,
        });

        clearInterval(progressInterval);
        clearTimeout(timeoutId);

        // Check if response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate video`);
        }

        data = await response.json();
        
        if (!data || !data.success) {
          throw new Error(data?.error || "Generation returned success: false");
        }
      } catch (fetchError) {
        clearInterval(progressInterval);
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error("Request timed out after 2 minutes. The API may be overloaded. Please try again.");
        }
        throw fetchError;
      }

      // Update message to show progress
      updateMessage(assistantMessage.id, {
        content: "Processing your request... This will take a few moments.",
        isGenerating: true,
      });

      // Simulate some progress display
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateMessage(assistantMessage.id, {
        content: "Generating video scenes and animations...",
        isGenerating: true,
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const isContinuation = !!currentPromptId;

      // Update current prompt ID for future continuations
      if (data) {
        setCurrentPromptId(data.promptId);
        
        // Set current chat ID if this is a new chat
        if (!currentChatId) {
          setCurrentChatId(data.promptId);
        }

        if (data.success) {
          const videoData: VideoData = {
            videoId: data.videoId,
            promptId: data.promptId,
            sceneCount: data.sceneCount,
            status: "queued", // Start as queued, will poll for updates
            isContinuation,
            previousPromptId: currentPromptId || undefined,
          };

          // Update assistant message with success response and video
          const continuationText = isContinuation 
            ? `Perfect! I've extended your video with ${data.sceneCount} additional scenes. Here's your enhanced video:`
            : `Perfect! I've created a comprehensive educational video with ${data.sceneCount} scenes covering your topic. Here's your video:`;

          updateMessage(assistantMessage.id, {
            content: continuationText,
            isGenerating: true,
            videoData,
          });

          // Start polling for video status
          const pollInterval = setInterval(async () => {
            try {
              if (!data) return;
              
              const statusResponse = await fetch(`/api/videos/${data.videoId}/status`);
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                
                updateMessage(assistantMessage.id, {
                  videoData: {
                    ...videoData,
                    status: statusData.status as any,
                    videoUrl: statusData.videoUrl
                  },
                  isGenerating: statusData.status !== 'completed' && statusData.status !== 'failed'
                });

                // Stop polling when complete or failed
                if (statusData.status === 'completed' || statusData.status === 'failed') {
                  clearInterval(pollInterval);
                }
              }
            } catch (error) {
              console.error('Failed to poll video status:', error);
            }
          }, 2000); // Poll every 2 seconds

        } else {
          throw new Error(data.error || "Generation failed");
        }
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
  }, [addMessage, updateMessage, currentPromptId, currentChatId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentPromptId(null);
    setCurrentChatId(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    currentPromptId,
    currentChatId,
    loadChatSession,
    startNewChat,
  };
}

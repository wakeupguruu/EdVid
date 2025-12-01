"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Video, AlertCircle, Play, Download, Plus, RefreshCw } from "lucide-react";
import { Message } from "@/types/chat";
import { ChatSuggestions } from "./ChatSuggestions";

interface ChatInterfaceProps {
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentPromptId?: string | null;
}

export function ChatInterface({ onSendMessage, messages, isLoading, error, currentPromptId }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [continueInput, setContinueInput] = useState("");
  const [showContinueInput, setShowContinueInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const continueTextareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    await onSendMessage(message);
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!continueInput.trim() || isLoading) return;

    const message = continueInput.trim();
    setContinueInput("");
    setShowContinueInput(false);
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleContinueKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleContinue(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const adjustContinueTextareaHeight = () => {
    const textarea = continueTextareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  useEffect(() => {
    adjustContinueTextareaHeight();
  }, [continueInput]);

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const handleRegenerate = async (index: number) => {
    if (isLoading) return;
    // Find the preceding user message
    const userMessage = messages[index - 1];
    if (userMessage && userMessage.role === "user") {
      await onSendMessage(userMessage.content);
    }
  };

  const renderVideoPlayer = (videoData: any, index: number) => {
    // Show loading state while processing
    if (videoData.status === "queued" || videoData.status === "processing") {
      return (
        <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {videoData.status === "queued" ? "Queued for processing..." : "Processing your video..."}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {videoData.sceneCount} scenes • Video ID: {videoData.videoId}
          </p>
        </div>
      );
    }

    if (videoData.status === "completed" && videoData.videoUrl) {
      return (
        <div className="mt-3 space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <Video className="h-4 w-4" />
              <span>Your generated video is ready!</span>
              {videoData.isContinuation && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  Extended
                </span>
              )}
            </div>
            
            {/* Video Player */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video 
                controls 
                className="w-full h-auto max-h-64"
                preload="metadata"
                onError={(e) => {
                  console.error("Video failed to load:", e);
                }}
              >
                <source src={videoData.videoUrl || "/merged/merged.mp4"} type="video/mp4" />
                <div className="flex items-center justify-center h-32 text-white">
                  <p>Video not available. URL: {videoData.videoUrl}</p>
                </div>
              </video>
            </div>
            
            {/* Video Info */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{videoData.sceneCount} scenes generated</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(videoData.videoUrl || "/merged/merged.mp4", "_blank")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleRegenerate(index)}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                {currentPromptId && (
                  <Button
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowContinueInput(!showContinueInput)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Continue
                  </Button>
                )}
              </div>
            </div>

            {/* Continue Input */}
            {showContinueInput && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                  How would you like to continue or improve this video?
                </p>
                <form onSubmit={handleContinue} className="flex gap-2">
                  <Textarea
                    ref={continueTextareaRef}
                    value={continueInput}
                    onChange={(e) => setContinueInput(e.target.value)}
                    onKeyDown={handleContinueKeyDown}
                    placeholder="e.g., add more examples, make it more visual, explain advanced concepts..."
                    className="min-h-[60px] max-h-[80px] resize-none text-xs"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={!continueInput.trim() || isLoading}
                    className="px-3 h-8 text-xs"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
          <Video className="h-3 w-3" />
          <span>Video generation started</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {videoData.sceneCount} scenes • ID: {videoData.videoId}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <Video className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Welcome to EdVid</h3>
            <p className="max-w-md mb-6">
              Describe what you'd like to learn, and I'll create a stunning educational video for you.
            </p>
            <ChatSuggestions 
              onSuggestionClick={handleSuggestionClick}
              disabled={isLoading}
            />
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === "assistant" && message.isGenerating && (
                    <Loader2 className="h-4 w-4 animate-spin mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.role === "assistant" && message.videoData && (
                      renderVideoPlayer(message.videoData, index)
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-white dark:bg-neutral-900 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you'd like to learn..."
              className="min-h-[44px] max-h-[120px] resize-none pr-10"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

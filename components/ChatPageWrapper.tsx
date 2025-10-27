"use client";

import React, { useState, useRef } from "react";
import FinalSideBar from "./FinalSideBar";
import ChatContainer from "./ChatContainer";
import { useChat } from "@/hooks/useChat";

export default function ChatPageWrapper() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    currentPromptId,
    currentChatId,
    loadChatSession,
    startNewChat,
  } = useChat();

  // Reference to sidebar refresh function
  const sidebarRef = useRef<{ refreshChats: () => void } | null>(null);

  // Wrapper function to handle sending messages and refreshing sidebar
  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message);
      // Refresh the sidebar chat list after sending a message
      if (sidebarRef.current?.refreshChats) {
        setTimeout(() => {
          sidebarRef.current?.refreshChats();
        }, 1000); // Small delay to ensure the API call is complete
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleNewChat = () => {
    startNewChat();
    // Refresh sidebar to show updated state
    if (sidebarRef.current?.refreshChats) {
      sidebarRef.current.refreshChats();
    }
  };

  const handleLoadChat = async (chatId: string) => {
    try {
      await loadChatSession(chatId);
    } catch (error) {
      console.error("Error loading chat session:", error);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <FinalSideBar
        ref={sidebarRef}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        currentChatId={currentChatId}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSendMessage={handleSendMessage}
          currentPromptId={currentPromptId}
        />
      </main>
    </div>
  );
}

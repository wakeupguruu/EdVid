"use client";

import React from "react";
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

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <FinalSideBar
        onNewChat={startNewChat}
        onLoadChat={loadChatSession}
        currentChatId={currentChatId}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatContainer />
      </main>
    </div>
  );
}

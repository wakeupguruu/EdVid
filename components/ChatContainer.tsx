"use client";

import { ChatInterface } from "./ChatInterface";
import { useChat } from "@/hooks/useChat";

export default function ChatContainer() {
  const { messages, isLoading, error, sendMessage, currentPromptId } = useChat();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={sendMessage}
        currentPromptId={currentPromptId}
      />
    </div>
  );
}

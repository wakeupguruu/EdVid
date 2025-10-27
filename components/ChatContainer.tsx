"use client";

import { ChatInterface } from "./ChatInterface";
import { Message } from "@/types/chat";

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => Promise<void>;
  currentPromptId?: string | null;
}

export default function ChatContainer({
  messages,
  isLoading,
  error,
  onSendMessage,
  currentPromptId,
}: ChatContainerProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={onSendMessage}
        currentPromptId={currentPromptId}
      />
    </div>
  );
}

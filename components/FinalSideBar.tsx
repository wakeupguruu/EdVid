"use client";

import React, { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";
import {
  IconPlus,
  IconMessageCircle,
  IconSettings,
  IconUser,
  IconLogout,
  IconVideo,
  IconRefresh,
} from "@tabler/icons-react";

interface ChatSession {
  id: string;
  title: string;
  originalPrompt: string;
  createdAt: string;
  updatedAt: string;
  promptCount: number;
  lastPromptId: string;
  hasVideo: boolean;
  status: string;
}

interface FinalSideBarProps {
  onNewChat?: () => void;
  onLoadChat?: (chatId: string) => void;
  currentChatId?: string | null;
}

export default function FinalSideBar({ onNewChat, onLoadChat, currentChatId }: FinalSideBarProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChatHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/chats');
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      
      const data = await response.json();
      if (data.success) {
        setChatSessions(data.chatSessions || []);
      } else {
        throw new Error(data.error || 'Failed to fetch chat history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chat history');
      console.error('Error fetching chat history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleChatClick = (chatId: string) => {
    if (onLoadChat) {
      onLoadChat(chatId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="peer">
      <Sidebar animate>
        <SidebarBody className="md:relative md:z-20">
          <div className="flex h-full flex-col justify-between">
            <div className="flex flex-col gap-2">
              <button
                onClick={handleNewChat}
                className="flex items-center justify-start gap-2 group/sidebar py-2 font-medium text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150"
              >
                <IconPlus className="h-5 w-5" />
                <span>New Chat</span>
              </button>

              <div className="mt-2" />
              <SidebarLink
                link={{
                  label: "All Videos",
                  href: "/videos",
                  icon: <IconVideo className="h-5 w-5" />,
                }}
              />

              <div className="mt-4 h-px w-full bg-neutral-200 dark:bg-neutral-700" />

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Recent Chats
                </span>
                <button
                  onClick={fetchChatHistory}
                  disabled={isLoading}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <IconRefresh className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="mt-2 flex flex-col gap-1">
                {isLoading ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-2">
                    Loading chats...
                  </div>
                ) : error ? (
                  <div className="text-xs text-red-500 p-2">
                    {error}
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-2">
                    No chats yet. Start a new conversation!
                  </div>
                ) : (
                                       chatSessions.map((chat) => (
                       <button
                         key={chat.id}
                         onClick={() => handleChatClick(chat.id)}
                         className={`flex items-center justify-start gap-2 group/sidebar py-2 truncate text-left w-full ${
                           currentChatId === chat.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                         }`}
                       >
                         <IconMessageCircle className="h-5 w-5" />
                         <div className="flex flex-col items-start w-full">
                           <span className="truncate w-full text-neutral-700 dark:text-neutral-200 text-sm">
                             {chat.title}
                           </span>
                           <span className="text-xs text-gray-500 dark:text-gray-400">
                             {formatDate(chat.updatedAt)} • {chat.promptCount} messages
                           </span>
                         </div>
                       </button>
                     ))
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />
              <SidebarLink
                link={{
                  label: "Profile",
                  href: "/profile",
                  icon: <IconUser className="h-5 w-5" />,
                }}
              />
              <SidebarLink
                link={{
                  label: "Settings",
                  href: "/settings",
                  icon: <IconSettings className="h-5 w-5" />,
                }}
              />
              <SidebarLink
                link={{
                  label: "Logout",
                  href: "/api/auth/signout",
                  icon: <IconLogout className="h-5 w-5" />,
                }}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
    </div>
  );
}



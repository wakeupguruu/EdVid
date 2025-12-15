"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
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
import { motion } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";

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

interface FinalSideBarRef {
  refreshChats: () => void;
}

const SidebarContent = ({ 
  onNewChat, 
  onLoadChat, 
  currentChatId, 
  chatSessions, 
  isLoading, 
  error, 
  fetchChatHistory 
}: any) => {
  const { open, animate } = useSidebar();

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNewChat) onNewChat();
  };

  const handleChatClick = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    if (onLoadChat) onLoadChat(chatId);
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
    <div className="flex h-full flex-col justify-between overflow-hidden">
      <div className="flex flex-col gap-2 flex-1 overflow-hidden">
        <button
          onClick={handleNewChat}
          className="flex items-center justify-start gap-2 group/sidebar py-2 font-medium text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150"
        >
          <IconPlus className="h-5 w-5 flex-shrink-0" />
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className="whitespace-pre inline-block transition duration-150"
          >
            New Chat
          </motion.span>
        </button>

        <div className="mt-2" />
        <SidebarLink
          link={{
            label: "All Videos",
            href: "/videos",
            icon: <IconVideo className="h-5 w-5 flex-shrink-0" />,
          }}
        />

        <div className="mt-4 h-px w-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />

        <div className="mt-2 flex items-center justify-between flex-shrink-0">
          <motion.span 
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-pre"
          >
            Recent Chats
          </motion.span>
          <motion.button
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            onClick={fetchChatHistory}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <IconRefresh className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        <div className="mt-2 flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <motion.div 
              animate={{
                display: animate ? (open ? "block" : "none") : "block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="text-xs text-gray-500 dark:text-gray-400 p-2"
            >
              Loading chats...
            </motion.div>
          ) : error ? (
            <motion.div 
              animate={{
                display: animate ? (open ? "block" : "none") : "block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="text-xs text-red-500 p-2"
            >
              {error}
            </motion.div>
          ) : chatSessions.length === 0 ? (
            <motion.div 
              animate={{
                display: animate ? (open ? "block" : "none") : "block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="text-xs text-gray-500 dark:text-gray-400 p-2"
            >
              No chats yet.
            </motion.div>
          ) : (
            chatSessions.map((chat: ChatSession) => (
              <button
                key={chat.id}
                onClick={(e) => handleChatClick(e, chat.id)}
                className={`flex items-center justify-start gap-2 group/sidebar py-2 text-left w-full hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 transition-colors ${
                  currentChatId === chat.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <IconMessageCircle className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
                <motion.div 
                  animate={{
                    display: animate ? (open ? "flex" : "none") : "flex",
                    opacity: animate ? (open ? 1 : 0) : 1,
                  }}
                  className="flex flex-col items-start w-full min-w-0"
                >
                  <span className="truncate w-full text-neutral-700 dark:text-neutral-200 text-sm">
                    {chat.title}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">
                    {formatDate(chat.updatedAt)}
                  </span>
                </motion.div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 flex-shrink-0">
        <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />
        <SidebarLink
          link={{
            label: "Profile",
            href: "/profile",
            icon: <IconUser className="h-5 w-5 flex-shrink-0" />,
          }}
        />
        <SidebarLink
          link={{
            label: "Settings",
            href: "/settings",
            icon: <IconSettings className="h-5 w-5 flex-shrink-0" />,
          }}
        />
        
        {/* Theme Toggle in Sidebar */}
        <div className="flex items-center justify-start gap-2 group/sidebar py-2">
          <ThemeToggle />
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className="text-neutral-700 dark:text-neutral-200 text-sm whitespace-pre inline-block transition duration-150"
          >
            Toggle Theme
          </motion.span>
        </div>

        <SidebarLink
          link={{
            label: "Logout",
            href: "/api/auth/signout",
            icon: <IconLogout className="h-5 w-5 flex-shrink-0" />,
          }}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        />
      </div>
    </div>
  );
};

const FinalSideBar = forwardRef<FinalSideBarRef, FinalSideBarProps>(({ onNewChat, onLoadChat, currentChatId }, ref) => {
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

  useImperativeHandle(ref, () => ({
    refreshChats: fetchChatHistory,
  }));

  return (
    <div className="h-full">
      <Sidebar animate>
        <SidebarBody className="md:relative md:z-20 h-full">
          <SidebarContent 
            onNewChat={onNewChat}
            onLoadChat={onLoadChat}
            currentChatId={currentChatId}
            chatSessions={chatSessions}
            isLoading={isLoading}
            error={error}
            fetchChatHistory={fetchChatHistory}
          />
        </SidebarBody>
      </Sidebar>
    </div>
  );
});

FinalSideBar.displayName = "FinalSideBar";

export default FinalSideBar;



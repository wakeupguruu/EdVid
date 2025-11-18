export interface VideoData {
  videoId: string;
  promptId: string;
  sceneCount: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  isContinuation?: boolean;
  previousPromptId?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isGenerating?: boolean;
  videoData?: VideoData;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentPromptId?: string; // Track the current prompt for continuation
}

export interface GenerateResponse {
  success: boolean;
  promptId: string;
  videoId: string;
  sceneCount: number;
  error?: string;
  isContinuation?: boolean;
}

export interface ContinueRequest {
  prompt: string;
  previousPromptId: string;
}

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the EdVid chat interface.

## Features

### Chat Interface
- **Interactive Chat**: Type any educational topic and get a simulated video generation
- **Quick Suggestions**: Click on suggested topics like "Pythagorean Theorem", "Neural Networks", etc.
- **Video Display**: After the simulated generation, view the existing video from `/public/merged/merged.mp4`
- **Continue/Improve**: Extend existing videos with additional content and improvements

### Chat History & Sessions
- **Persistent Chat History**: All conversations are saved and accessible from the sidebar
- **Session Management**: Each chat session is automatically created and tracked
- **Smart Navigation**: Click on any previous chat to continue the conversation
- **New Chat Button**: Start fresh conversations with the "New Chat" button
- **Real-time Updates**: Chat status and video generation progress are shown in real-time

### Video Continuation System
- **Smart Context Tracking**: System remembers previous video content and context
- **Database Integration**: Uses PostgreSQL to store video generation history
- **Continuation Prompts**: Add more examples, make it more visual, explain advanced concepts
- **Seamless Extension**: New scenes are generated that build upon existing content

### How It Works
1. **Initial Generation**: Enter a topic → System generates video with scenes
2. **Continue Feature**: Click "Continue" button → Add improvement requests
3. **Context Preservation**: System uses previous video data to generate relevant extensions
4. **Database Storage**: All video context stored in `content` field with `previousPromptId` relationships

### Example Continuation Flows:
- **Original**: "Explain Pythagorean theorem" → Basic video with 5 scenes
- **Continue**: "Add more real-world examples" → 3 additional application scenes
- **Continue**: "Make it more visual" → Enhanced animations and graphics
- **Continue**: "Show advanced concepts" → 3D extensions and complex proofs

### Video Generation (Simulated)
The chat system currently simulates the video generation process:
- No actual API calls to save costs
- 3-5 second processing simulation
- Shows realistic progress messages
- Displays the existing `merged.mp4` video
- Tracks video context in database for continuations

### Manual Video Processing
For actual video generation, you can still use the manual process:

1. Set your `ANTHROPIC_API_KEY` in `.env`
2. Use Postman to send requests to `/api/generate` with your topic
3. Copy the output to `test_output.ts` and run `npx tsx test_output.ts`
4. Visit `/api/output` to get the generated code
5. Run Manim locally: `manim -pqh video.py SceneName --format=mp4`

### Video Merging
Video merging is handled automatically by the backend via `/api/output` endpoint. This utility combines individual scene videos into a complete educational video with smooth transitions.

## Database Schema

The system uses a sophisticated database schema for chat history and video continuation:

```sql
-- Prompt table with chat session support
model Prompt {
  id               String        @id @default(cuid())
  inputText        String        -- User's prompt
  content          String?       -- Parsed JSON output from LLM
  previousPromptId String?       -- Links to previous video for continuation
  // ... other fields
}
```

## API Endpoints

### Chat Management
- `GET /api/chats` - Fetch user's chat history
- `GET /api/chats/[chatId]` - Fetch specific chat messages

### Video Generation
- `POST /api/generate` - Generate video from prompt (supports continuation)
- `POST /api/output` - Merge video files with transitions

## Development

The project uses:
- Next.js 15 with TypeScript
- Tailwind CSS for styling
- Prisma with PostgreSQL
- NextAuth for authentication
- Manim Community Edition for video generation

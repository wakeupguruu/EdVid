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
Use the `/merge` page to combine multiple videos with transitions:
- Upload video files
- Choose transition effects (fade, wipe, slide)
- Set transition duration
- Download the merged video

## Database Schema

The system uses a sophisticated database schema for video continuation:

```sql
-- Prompt table with continuation support
model Prompt {
  id               String        @id @default(cuid())
  inputText        String        -- User's prompt
  content          String?       -- Parsed JSON output from LLM
  previousPromptId String?       -- Links to previous video for continuation
  // ... other fields
}
```

## Development

The project uses:
- Next.js 15 with TypeScript
- Tailwind CSS for styling
- Prisma with PostgreSQL
- NextAuth for authentication
- Manim Community Edition for video generation

I'll continue to automate the whole process and build better backend services.
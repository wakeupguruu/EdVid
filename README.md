![EdVid - AI Educational Video Generator](https://img.shields.io/badge/EdVid-AI%20Educational%20Videos-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org/)
[![Powered by Anthropic](https://img.shields.io/badge/Powered%20by-Anthropic-orange)](https://www.anthropic.com/)

# EdVid - AI-Powered Educational Video Generator

Transform any educational topic into stunning, animated video content using AI-generated code and Manim animations.

## 🌟 Features

### Core Capabilities
- **AI-Powered Script Generation**: Claude Opus 4 generates educational video scripts with complete Manim code
- **Interactive Chat Interface**: Intuitive conversation-based video creation
- **Video Continuation System**: Extend videos with "Continue" feature - add examples, improve visuals, or explore advanced concepts
- **Chat History**: Persistent session management with full conversation history
- **Multi-format Support**: Generate videos in multiple resolutions (480p, 720p, 1080p)

### Video Generation
- **Manim Community Edition Integration**: Pure Python-based mathematical animations
- **Real-time API Integration**: Direct Anthropic Claude API calls for reliable generation
- **Professional Output**: High-quality educational video production
- **Automatic Scene Composition**: Multiple scenes compiled into cohesive videos

### User Experience
- **Dark/Light Mode**: Responsive UI with theme support
- **Quick Suggestions**: Pre-built topics for immediate experimentation
- **Real-time Progress**: Live updates during video generation
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Smooth Animations**: Framer Motion for polished interactions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Anthropic API key

### Installation

```bash
# Clone repository
git clone https://github.com/wakeupguruu/EdVid.git
cd EdVid/edvid

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Setup database
npx prisma migrate dev

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Configuration

### Required Environment Variables

```env
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edvid

# AI API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret

# Public Configuration
NEXT_PUBLIC_GITHUB_URL=https://github.com/wakeupguruu/EdVid
```

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 15 with TypeScript
- React 19 with Server Components
- Tailwind CSS 4 with HeroUI components
- Framer Motion for animations
- NextAuth for authentication

**Backend:**
- Next.js API routes
- PostgreSQL with Prisma ORM
- Anthropic Claude 3.5 Opus
- FFmpeg for video processing
- Node.js file system for asset management

**Deployment:**
- Vercel (recommended)
- Docker support
- Self-hosted options

### Database Schema

```
User → Prompt (one-to-many)
     → ActivityLog (one-to-many)
     
Prompt → CodeSnippet (one-to-one)
      → Video (one-to-one)
      → previousPrompt (self-referential for continuations)
      
Video → VideoFormat (one-to-many)
     → VideoProcessingLog (one-to-many)
```

## 📚 API Endpoints

### Video Generation
```
POST /api/generate
{
  "prompt": "Explain the Pythagorean theorem",
  "previousPromptId": "optional-for-continuation"
}

Response:
{
  "success": true,
  "promptId": "clv...",
  "videoId": "vid...",
  "sceneCount": 5,
  "isContinuation": false
}
```

### Chat History
```
GET /api/chats
- Fetch all user chat sessions

GET /api/chats/[chatId]
- Fetch specific chat with messages and context

POST /api/chats
- Create new chat session
```

### Video Processing
```
POST /api/output
{
  "directory": "Manim/media/videos/video/480p15",
  "transition": "fade",
  "transitionDuration": 0.5,
  "outputName": "final-video.mp4"
}
```

## 🎓 Example Usage

### Generate Educational Video

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Explain neural networks step by step"
  }'
```

### Continue & Improve Video

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add more real-world examples",
    "previousPromptId": "clv1234567890"
  }'
```

## 🔧 Development

### Running Tests

```bash
npm run test
```

### Build for Production

```bash
npm run build
npm start
```

### Database Management

```bash
# View database UI
npx prisma studio

# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset
```

## 📦 Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Connect to Vercel and deploy automatically
# Add environment variables in Vercel dashboard
# Done!
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Docker

```bash
docker build -t edvid .
docker run -p 3000:3000 -e DATABASE_URL=... edvid
```

## 📊 Performance Metrics

- **API Response Time**: ~5-10 seconds (Anthropic API dependent)
- **Video Generation**: ~30-60 seconds (Manim rendering)
- **Database Queries**: Optimized with Prisma caching
- **Frontend Load**: <2 seconds (Next.js optimization)

## 🔐 Security

- ✅ NextAuth authentication with JWT
- ✅ Environment variable protection
- ✅ Database connection pooling
- ✅ CSRF protection
- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization
- ✅ OAuth 2.0 Google integration

## 📈 Roadmap

- [ ] Batch video generation
- [ ] Custom animation templates
- [ ] Video analytics dashboard
- [ ] Multi-language support
- [ ] Advanced caching system
- [ ] WebSocket for real-time updates
- [ ] Mobile app (React Native)
- [ ] Video marketplace

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) - Claude AI models
- [Manim Community](https://www.manim.community/) - Mathematical animations
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Vercel](https://vercel.com/) - Deployment platform

## 📞 Support

- 📖 [Documentation](./DEPLOYMENT.md)
- 🐛 [Report Issues](https://github.com/wakeupguruu/EdVid/issues)

## ⭐ Show Your Support

If you find this project helpful, please give it a star! Your support helps us grow and improve the platform.

---

**Last Updated**: December 2025
**Version**: 1.0.0

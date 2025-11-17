# EdVid Deployment Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Anthropic API key
- Environment variables set up

## Environment Setup

### 1. Create `.env.local` file

Copy `.env.example` and create `.env.local`:

```bash
cp .env.example .env.local
```

### 2. Fill in required variables

```env
# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edvid

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Public URLs
NEXT_PUBLIC_GITHUB_URL=https://github.com/wakeupguruu/EdVid
```

### 3. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Setup database

```bash
npx prisma migrate dev --name init
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Deployment

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel: https://vercel.com/new
3. Add environment variables in Vercel dashboard
4. Deploy with one click

**Note**: For video processing with FFmpeg, use Vercel's serverless functions (already configured)

### Option 2: Docker & Self-Hosted

```bash
# Build image
docker build -t edvid .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e NEXTAUTH_SECRET=... \
  -e ANTHROPIC_API_KEY=... \
  edvid
```

### Option 3: Traditional Server (Ubuntu/CentOS)

1. Install Node.js & PostgreSQL
2. Clone repository
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Start: `npm start`
6. Setup Nginx reverse proxy
7. Configure SSL/TLS with Let's Encrypt

## Database Migrations

### Development

```bash
# Create migration
npx prisma migrate dev --name add_new_feature

# Reset database
npx prisma migrate reset
```

### Production

```bash
# Deploy migrations (run before deploying app)
npx prisma migrate deploy
```

## Video Processing

### Prerequisites

FFmpeg must be installed on the server:

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
choco install ffmpeg
```

### Video Generation Pipeline

1. User submits prompt
2. Anthropic API generates Manim code
3. Code is stored in database
4. Manual or automated Manim rendering
5. Videos merged via `/api/output` endpoint
6. Results served from `/public/merged`

## Monitoring & Maintenance

### Health Check

```bash
curl https://your-domain.com/api/health
```

### Database Backup

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Logs

- Server logs: See deployment platform (Vercel/Docker/etc)
- Database logs: Check PostgreSQL logs
- Application errors: Check `/api/generate` responses

## Troubleshooting

### 401 Unauthorized
- Check NEXTAUTH_SECRET and NEXTAUTH_URL
- Clear browser cookies
- Restart auth session

### Database Connection Error
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Run: `npx prisma migrate deploy`

### API Rate Limits
- Check Anthropic API quota
- Implement request queuing
- Add rate limiting middleware

### Video Processing Fails
- Ensure FFmpeg is installed
- Check video file paths
- Verify disk space available

## Performance Optimization

1. **Database**: Add indexes on frequently queried fields
2. **Caching**: Implement Redis for session/chat caching
3. **CDN**: Serve videos from Cloudflare/CloudFront
4. **Compression**: Enable gzip in Next.js config
5. **Images**: Optimize with next/image

## Security Best Practices

- [ ] Enable HTTPS/SSL
- [ ] Setup CSRF protection
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Regular dependency updates
- [ ] Database encryption at rest
- [ ] API key rotation schedule

## Support

For issues or questions:
- GitHub Issues: https://github.com/wakeupguruu/EdVid/issues
- Documentation: See README.md

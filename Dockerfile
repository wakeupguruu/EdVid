FROM node:18-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY db/prisma ./db/prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate --schema=./db/prisma/schema.prisma

# Copy app source
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npm", "start"]

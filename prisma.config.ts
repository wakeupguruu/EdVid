import { defineConfig } from 'prisma/config';
import { config as loadEnv } from 'dotenv';

loadEnv();

const schemaPath = './db/prisma/schema.prisma';
const migrationsPath = './db/prisma/migrations';
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Please add it to your environment.');
}

export default defineConfig({
  schema: schemaPath,
  migrations: {
    path: migrationsPath,
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});


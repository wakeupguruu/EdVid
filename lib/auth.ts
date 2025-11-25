import { config } from "dotenv";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions, User, Session, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
config({ path: "./db/.env" });
import { PrismaClient } from "@/db/generated/prisma";
import { compare, hash } from "bcryptjs";
import { validators, ValidationErrors } from "./validation";
export interface ExtendedUser {
  id: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
}

const prisma = new PrismaClient();

export const Next_Auth: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "Enter your email" },
        password: { label: "Password", type: "password", placeholder: "Enter your password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const validatedEmail = validators.email(credentials.email)

        const existingUser = await prisma.user.findUnique({
          where: { email: validatedEmail },
        });

        if (!existingUser) {
          const hashedPassword = await hash(credentials.password, 10);
          const newUser = await prisma.user.create({
            data: {
              email: validatedEmail,
              password: hashedPassword,
              name: null,
            },
          });

          return { id: newUser.id, email: newUser.email, name: newUser.name };
        }

        const isValid = await compare(credentials.password, existingUser.password ?? "");
        if (!isValid) return null;

        return { id: existingUser.id, email: existingUser.email, name: existingUser.name };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user, account, profile }: {
      token: JWT;
      user?: User;
      account?: Account | null;
      profile?: Profile;
    }): Promise<JWT> {
      // If user logs in for the first time
      if (user) {
        if (account?.provider === "google") {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: null,
                password: null, 
              },
            });

            token.id = newUser.id;
            token.name = newUser.name;
          } else {
            token.id = existingUser.id;
            token.name = existingUser.name;
          }
        } else {
          // Credentials provider
          token.id = user.id;
          token.name = user.name;
        }
      }

      return token;
    },

    async session({ session }: { session: Session; token: JWT }): Promise<Session> {
      const userEmail = session.user?.email;
      if (!userEmail) return session;

      const validatedEmail = validators.email(userEmail)

      // 👇 Fetch the latest user data from your database
      const dbUser = await prisma.user.findUnique({
        where: { email: validatedEmail },
      });

      if (dbUser) {
        // 👇 Overwrite session data with fresh DB values
        (session.user as ExtendedUser).name = dbUser.name;
        (session.user as any).id = dbUser.id;
      }

      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
};

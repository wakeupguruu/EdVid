import NextAuth from "next-auth"
import { Next_Auth } from "@/lib/auth";
import next from "next";
export const handler = NextAuth(Next_Auth)

export { handler as GET, handler as POST }
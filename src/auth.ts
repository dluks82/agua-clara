import crypto from "node:crypto";

import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@/db";
import { users } from "@/db/schema";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (!token.email) return token;

      const existing = await db.query.users.findFirst({
        where: eq(users.email, token.email),
      });

      if (!existing && account?.provider === "google" && profile) {
        const id = crypto.randomUUID();
        await db.insert(users).values({
          id,
          email: token.email,
          name: typeof profile.name === "string" ? profile.name : null,
          image:
            typeof (profile as { picture?: unknown }).picture === "string"
              ? (profile as { picture?: string }).picture
              : null,
          google_sub: account.providerAccountId,
        });
        token.userId = id;
        return token;
      }

      if (existing) {
        token.userId = existing.id;
        if (account?.provider === "google" && !existing.google_sub) {
          await db
            .update(users)
            .set({ google_sub: account?.providerAccountId })
            .where(eq(users.id, existing.id));
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : undefined;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

export const nextAuthHandler = NextAuth(authOptions);

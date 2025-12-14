import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { eq } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "@/db";
import { users } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (!token.email) return token;

      if (!token.userId) {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, token.email),
        });

        token.userId = existing?.id ?? null;
      }

      if (account?.provider === "google" && token.email && profile) {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, token.email),
        });

        if (!existing) {
          const id = crypto.randomUUID();
          await db.insert(users).values({
            id,
            email: token.email,
            name: typeof profile.name === "string" ? profile.name : null,
            image: typeof (profile as { picture?: unknown }).picture === "string" ? (profile as { picture?: string }).picture : null,
            google_sub: account.providerAccountId,
          });
          token.userId = id;
        } else if (!existing.google_sub) {
          await db
            .update(users)
            .set({ google_sub: account.providerAccountId })
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
});

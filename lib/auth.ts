import { cache } from "react";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import GOOGLE from "next-auth/providers/google";
import { env } from "@/env.mjs"
import { db as prisma } from "./db";

export type { Session } from "next-auth";

// Update this whenever adding new providers so that the client can
export const providers = ["email"] as const;
export type OAuthProviders = (typeof providers)[number];

const {
  handlers: { GET, POST },
  auth: defaultAuth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GOOGLE({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email ?? ""
        session.user.image = token.picture
      }

      return session
    },
    async jwt({ token, user }) {
      const dbUser = await prisma.user.findFirst({
        where: {
          email: token.email,
        },
      })

      if (!dbUser) {
        if (user.id) {
          token.id = user?.id
        }
        return token
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      }
    },
  },
})

const auth = cache(defaultAuth);

export { GET, POST, signIn, signOut, auth };

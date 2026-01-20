import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || "company.com";
      const email = user.email;

      if (!email) {
        return false;
      }

      // Check if email domain matches allowed domain
      const domain = email.split("@")[1];
      if (domain !== allowedDomain) {
        return `/login?error=invalid_domain&domain=${allowedDomain}`;
      }

      // Ensure user exists in database (for JWT strategy)
      try {
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name,
              image: user.image,
            },
          });
        }

        // Store user ID for jwt callback
        user.id = dbUser.id;

        // Create account link if not exists
        if (account) {
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
          }
        }
      } catch (error) {
        console.error("Error creating user:", error);
        return false;
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Fetch department from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { department: true },
        });
        token.department = dbUser?.department;
      }
      // Refresh department on session update
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { department: true },
        });
        token.department = dbUser?.department;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.department = token.department as string | null | undefined;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

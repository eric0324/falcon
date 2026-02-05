import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { GOOGLE_SCOPES } from "@/lib/google/config";
import { encryptToken } from "@/lib/google/encryption";

// Combine all Google scopes for login
const allGoogleScopes = [
  "openid",
  "email",
  "profile",
  GOOGLE_SCOPES.SHEETS,
  GOOGLE_SCOPES.DRIVE,
  GOOGLE_SCOPES.CALENDAR,
  GOOGLE_SCOPES.GMAIL,
].join(" ");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: allGoogleScopes,
          access_type: "offline",
          prompt: "consent",
        },
      },
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

          // Save Google service tokens for Sheets, Drive, Calendar
          if (account.provider === "google" && account.access_token) {
            console.log("[Auth] Google account data:", {
              hasAccessToken: !!account.access_token,
              hasRefreshToken: !!account.refresh_token,
              scope: account.scope,
              expiresAt: account.expires_at,
            });

            // Only save if we have refresh token (first login or re-consent)
            if (account.refresh_token) {
              const expiresAt = account.expires_at
                ? new Date(account.expires_at * 1000)
                : new Date(Date.now() + 3600 * 1000);

              const encryptedAccessToken = encryptToken(account.access_token);
              const encryptedRefreshToken = encryptToken(account.refresh_token);
              const scope = account.scope || "";

              // Save token for each service that was authorized
              const services = [
                { service: "SHEETS" as const, scope: GOOGLE_SCOPES.SHEETS },
                { service: "DRIVE" as const, scope: GOOGLE_SCOPES.DRIVE },
                { service: "CALENDAR" as const, scope: GOOGLE_SCOPES.CALENDAR },
                { service: "GMAIL" as const, scope: GOOGLE_SCOPES.GMAIL },
              ];

              for (const { service, scope: requiredScope } of services) {
                const hasScope = scope.includes(requiredScope);
                console.log(`[Auth] Checking ${service}: required=${requiredScope}, hasScope=${hasScope}`);

                if (hasScope) {
                  await prisma.googleServiceToken.upsert({
                    where: {
                      userId_service: { userId: dbUser.id, service },
                    },
                    create: {
                      userId: dbUser.id,
                      service,
                      accessToken: encryptedAccessToken,
                      refreshToken: encryptedRefreshToken,
                      expiresAt,
                      scope: requiredScope,
                      isValid: true,
                    },
                    update: {
                      accessToken: encryptedAccessToken,
                      refreshToken: encryptedRefreshToken,
                      expiresAt,
                      scope: requiredScope,
                      isValid: true,
                    },
                  });
                  console.log(`[Auth] Saved token for ${service}`);
                }
              }
            } else {
              console.log("[Auth] No refresh token, skipping token save");
            }
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

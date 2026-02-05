import { GoogleService } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "./encryption";
import { refreshAccessToken, GOOGLE_SCOPES, GoogleServiceType } from "./config";

// Token refresh buffer (5 minutes before expiry)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface GoogleTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

/**
 * Save Google service token for a user
 */
export async function saveGoogleToken(
  userId: string,
  service: GoogleService,
  tokenData: GoogleTokenData
): Promise<void> {
  const encryptedAccessToken = encryptToken(tokenData.accessToken);
  const encryptedRefreshToken = encryptToken(tokenData.refreshToken);

  await prisma.googleServiceToken.upsert({
    where: {
      userId_service: { userId, service },
    },
    create: {
      userId,
      service,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope,
      isValid: true,
    },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope,
      isValid: true,
    },
  });
}

/**
 * Get a valid access token for a Google service
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(
  userId: string,
  service: GoogleService
): Promise<string | null> {
  const token = await prisma.googleServiceToken.findUnique({
    where: {
      userId_service: { userId, service },
    },
  });

  if (!token || !token.isValid) {
    return null;
  }

  const now = new Date();
  const needsRefresh = token.expiresAt.getTime() - now.getTime() < TOKEN_REFRESH_BUFFER_MS;

  if (needsRefresh) {
    try {
      const decryptedRefreshToken = decryptToken(token.refreshToken);
      const newTokens = await refreshAccessToken(decryptedRefreshToken);

      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      await saveGoogleToken(userId, service, {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || decryptedRefreshToken,
        expiresAt: newExpiresAt,
        scope: newTokens.scope,
      });

      return newTokens.access_token;
    } catch (error) {
      console.error("Failed to refresh Google token:", error);

      // Mark token as invalid
      await prisma.googleServiceToken.update({
        where: {
          userId_service: { userId, service },
        },
        data: { isValid: false },
      });

      return null;
    }
  }

  return decryptToken(token.accessToken);
}

/**
 * Check if user has a valid token for a Google service
 */
export async function hasValidToken(
  userId: string,
  service: GoogleService
): Promise<boolean> {
  const token = await prisma.googleServiceToken.findUnique({
    where: {
      userId_service: { userId, service },
    },
    select: { isValid: true },
  });

  return token?.isValid ?? false;
}

/**
 * Get connection status for all Google services
 */
export async function getGoogleConnectionStatus(
  userId: string
): Promise<Record<GoogleService, boolean>> {
  const tokens = await prisma.googleServiceToken.findMany({
    where: { userId, isValid: true },
    select: { service: true },
  });

  const connectedServices = new Set(tokens.map((t) => t.service));

  return {
    SHEETS: connectedServices.has("SHEETS"),
    DRIVE: connectedServices.has("DRIVE"),
    CALENDAR: connectedServices.has("CALENDAR"),
    GMAIL: connectedServices.has("GMAIL"),
  };
}

/**
 * Revoke and delete token for a Google service
 */
export async function revokeGoogleToken(
  userId: string,
  service: GoogleService
): Promise<void> {
  const token = await prisma.googleServiceToken.findUnique({
    where: {
      userId_service: { userId, service },
    },
  });

  if (token) {
    try {
      const accessToken = decryptToken(token.accessToken);
      // Revoke token at Google
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to revoke token at Google:", error);
    }

    // Delete from database regardless of revocation result
    await prisma.googleServiceToken.delete({
      where: {
        userId_service: { userId, service },
      },
    });
  }
}

/**
 * Convert GoogleServiceType to GoogleService enum
 */
export function serviceTypeToEnum(serviceType: GoogleServiceType): GoogleService {
  return serviceType as GoogleService;
}

/**
 * Get scope for a service
 */
export function getScopeForService(service: GoogleService): string {
  return GOOGLE_SCOPES[service as GoogleServiceType];
}

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// In-memory rate limiter (per process)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

export async function authenticateApiKey(
  req: Request
): Promise<{ userId: string; keyId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const rawKey = authHeader.slice(7);
  const keyHash = hashKey(rawKey);

  const apiKey = await prisma.userApiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true },
  });

  if (!apiKey) {
    return { error: "Invalid API key", status: 401 };
  }

  // Rate limiting
  const now = Date.now();
  const entry = rateLimitMap.get(apiKey.id);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      return { error: "Rate limit exceeded (60 req/min)", status: 429 };
    }
    entry.count++;
  } else {
    rateLimitMap.set(apiKey.id, { count: 1, resetAt: now + RATE_WINDOW });
  }

  // Update lastUsedAt (fire and forget)
  prisma.userApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { userId: apiKey.userId, keyId: apiKey.id };
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// GET /api/me/api-keys — list my API keys
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.userApiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

// POST /api/me/api-keys — generate a new API key
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate a secure random key
  const rawKey = `fk_${randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 11); // "fk_" + first 8 hex chars

  const apiKey = await prisma.userApiKey.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      keyHash,
      keyPrefix,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
    },
  });

  // Return the full key ONCE — it won't be retrievable again
  return NextResponse.json({ ...apiKey, key: rawKey }, { status: 201 });
}

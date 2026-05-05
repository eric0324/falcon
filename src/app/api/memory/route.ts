import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listMemoriesByUser } from "@/lib/memory/store";

// GET /api/memory — list current user's memories
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memories = await listMemoriesByUser(session.user.id);
  return NextResponse.json(memories);
}

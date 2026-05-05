import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listPendingSuggested } from "@/lib/memory/suggested-store";

// GET /api/memory/suggested?conversationId=...
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId") || undefined;

  const list = await listPendingSuggested(session.user.id, conversationId);
  return NextResponse.json(list);
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dismissSuggested } from "@/lib/memory/suggested-store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/memory/suggested/:id/dismiss
export async function POST(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const ok = await dismissSuggested(id, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

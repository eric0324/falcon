import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateMemory, deleteMemory } from "@/lib/memory/store";
import type { MemoryType } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_TYPES: MemoryType[] = ["PREFERENCE", "CONTEXT", "RULE", "FACT"];

// PATCH /api/memory/:id
export async function PATCH(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();

  const updates: { title?: string; content?: string; type?: MemoryType } = {};
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.content === "string") updates.content = body.content.trim();
  if (typeof body.type === "string" && VALID_TYPES.includes(body.type as MemoryType)) {
    updates.type = body.type as MemoryType;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateMemory(id, session.user.id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

// DELETE /api/memory/:id
export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const ok = await deleteMemory(id, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

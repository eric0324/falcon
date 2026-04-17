import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPresignedUrl } from "@/lib/storage/s3";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  if (!key.startsWith(`images/${session.user.id}/`)) {
    return NextResponse.json(
      { error: "Forbidden: key does not belong to user" },
      { status: 403 }
    );
  }

  const url = await getPresignedUrl({ key });
  return NextResponse.json({ url });
}

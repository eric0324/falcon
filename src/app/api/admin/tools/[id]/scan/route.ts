import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runFullScan } from "@/lib/code-scan";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const scan = await runFullScan(id);
    return NextResponse.json(scan);
  } catch (error) {
    console.error("POST /api/admin/tools/[id]/scan error:", error);
    return NextResponse.json(
      { error: "Failed to run scan" },
      { status: 500 }
    );
  }
}

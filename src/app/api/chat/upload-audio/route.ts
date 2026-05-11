import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage/s3";

const MAX_BYTES = 25 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("audio");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large", maxBytes: MAX_BYTES },
      { status: 413 }
    );
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported media type: ${file.type}` },
      { status: 415 }
    );
  }

  const s3Key = `audios/${session.user.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadImage({ buffer, key: s3Key, contentType: file.type });

  return NextResponse.json({ s3Key });
}

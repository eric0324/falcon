export async function uploadImageToS3(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);

  const res = await fetch("/api/chat/upload-image", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }

  const body = (await res.json()) as { s3Key: string };
  return body.s3Key;
}

import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { getConfigRequired } from "@/lib/config";
import {
  uploadImage,
  getPresignedUrl,
  getObjectBuffer,
} from "@/lib/storage/s3";

export type ImageProvider = "imagen" | "gpt-image";

export interface ImageGenerationResult {
  s3Key: string;
  presignedUrl: string;
  provider: ImageProvider;
  modelUsed: string;
}

const TEXT_MODEL: Record<ImageProvider, string> = {
  imagen: "imagen-4.0-generate-001",
  "gpt-image": "gpt-image-1",
};

const TEXT_MODEL_LABEL: Record<ImageProvider, string> = {
  imagen: "imagen-4",
  "gpt-image": "gpt-image-1",
};

// image-to-image model labels used for TokenUsage. `imagen` provider's
// underlying model switches to Gemini 2.5 Flash Image because Imagen 4
// itself does not support edit; see design.md §6.
const IMAGE_EDIT_MODEL_LABEL: Record<ImageProvider, string> = {
  imagen: "gemini-2.5-flash-image",
  "gpt-image": "gpt-image-1",
};

export async function generateFromText(params: {
  prompt: string;
  provider: ImageProvider;
  userId: string;
}): Promise<ImageGenerationResult> {
  const model = await getTextModel(params.provider);

  const result = await generateImage({
    model,
    prompt: params.prompt,
    n: 1,
    size: "1024x1024",
  });

  const buffer = Buffer.from(result.image.uint8Array);
  const s3Key = buildS3Key(params.userId);

  await uploadImage({ buffer, key: s3Key, contentType: "image/png" });
  const presignedUrl = await getPresignedUrl({ key: s3Key });

  return {
    s3Key,
    presignedUrl,
    provider: params.provider,
    modelUsed: TEXT_MODEL_LABEL[params.provider],
  };
}

export async function generateFromImage(params: {
  prompt: string;
  sourceImageKey: string;
  provider: ImageProvider;
  userId: string;
}): Promise<ImageGenerationResult> {
  assertKeyOwnership(params.sourceImageKey, params.userId);

  const sourceBuffer = await getObjectBuffer({ key: params.sourceImageKey });

  const outputBuffer =
    params.provider === "imagen"
      ? await editWithGemini(params.prompt, sourceBuffer)
      : await editWithOpenAI(params.prompt, sourceBuffer);

  const s3Key = buildS3Key(params.userId);
  await uploadImage({
    buffer: outputBuffer,
    key: s3Key,
    contentType: "image/png",
  });
  const presignedUrl = await getPresignedUrl({ key: s3Key });

  return {
    s3Key,
    presignedUrl,
    provider: params.provider,
    modelUsed: IMAGE_EDIT_MODEL_LABEL[params.provider],
  };
}

async function getTextModel(provider: ImageProvider) {
  const modelId = TEXT_MODEL[provider];
  if (provider === "imagen") {
    const apiKey = await getConfigRequired("GOOGLE_GENERATIVE_AI_API_KEY");
    return createGoogleGenerativeAI({ apiKey }).image(modelId);
  }
  const apiKey = await getConfigRequired("OPENAI_API_KEY");
  return createOpenAI({ apiKey }).image(modelId);
}

async function editWithGemini(
  prompt: string,
  sourceBuffer: Buffer
): Promise<Buffer> {
  const apiKey = await getConfigRequired("GOOGLE_GENERATIVE_AI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: sourceBuffer.toString("base64"),
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini image edit failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string } }> };
    }>;
  };

  const b64 = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  )?.inlineData?.data;

  if (!b64) {
    throw new Error("Gemini response contained no image data");
  }

  return Buffer.from(b64, "base64");
}

async function editWithOpenAI(
  prompt: string,
  sourceBuffer: Buffer
): Promise<Buffer> {
  const apiKey = await getConfigRequired("OPENAI_API_KEY");

  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("n", "1");
  form.append(
    "image",
    new Blob([new Uint8Array(sourceBuffer)], { type: "image/png" }),
    "source.png"
  );

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image edit failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI response contained no image data");

  return Buffer.from(b64, "base64");
}

function buildS3Key(userId: string): string {
  return `images/${userId}/${crypto.randomUUID()}.png`;
}

function assertKeyOwnership(key: string, userId: string): void {
  if (!key.startsWith(`images/${userId}/`)) {
    throw new Error(
      `Permission denied: source image key does not belong to user`
    );
  }
}

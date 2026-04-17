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

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type ImageQuality = "low" | "medium" | "high";

export interface ImageGenerationResult {
  s3Key: string;
  presignedUrl: string;
  provider: ImageProvider;
  modelUsed: string;
}

const OPENAI_EDIT_SIZE: Record<AspectRatio, string> = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
  // gpt-image-1 only supports 3 sizes; fall back for 4:3 and 3:4
  "4:3": "1536x1024",
  "3:4": "1024x1536",
};

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
  aspectRatio?: AspectRatio;
  quality?: ImageQuality;
}): Promise<ImageGenerationResult> {
  const model = await getTextModel(params.provider);
  const ratio = params.aspectRatio ?? "1:1";

  const result = await generateImage({
    model,
    prompt: params.prompt,
    n: 1,
    aspectRatio: ratio,
    // OpenAI image model uses provider option "quality"; Imagen ignores it.
    ...(params.quality && params.provider === "gpt-image"
      ? { providerOptions: { openai: { quality: params.quality } } }
      : {}),
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
  aspectRatio?: AspectRatio;
  quality?: ImageQuality;
}): Promise<ImageGenerationResult> {
  assertKeyOwnership(params.sourceImageKey, params.userId);

  const sourceBuffer = await getObjectBuffer({ key: params.sourceImageKey });

  const outputBuffer =
    params.provider === "imagen"
      ? await editWithGemini(params.prompt, sourceBuffer, params.aspectRatio)
      : await editWithOpenAI(
          params.prompt,
          sourceBuffer,
          params.aspectRatio,
          params.quality
        );

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
  sourceBuffer: Buffer,
  aspectRatio?: AspectRatio
): Promise<Buffer> {
  const apiKey = await getConfigRequired("GOOGLE_GENERATIVE_AI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  // Gemini 2.5 Flash Image doesn't take a structured size param — steer via prompt.
  const promptWithRatio = aspectRatio
    ? `${prompt}\n\nOutput aspect ratio: ${aspectRatio}.`
    : `${prompt}\n\nPreserve the aspect ratio of the input image.`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptWithRatio },
            {
              inlineData: {
                mimeType: "image/png",
                data: sourceBuffer.toString("base64"),
              },
            },
          ],
        },
      ],
      // Without this, the model replies with text describing the image
      // instead of generating a new image.
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
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
  sourceBuffer: Buffer,
  aspectRatio?: AspectRatio,
  quality?: ImageQuality
): Promise<Buffer> {
  const apiKey = await getConfigRequired("OPENAI_API_KEY");

  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  // "auto" lets gpt-image-1 pick an output size based on the source image
  form.append("size", aspectRatio ? OPENAI_EDIT_SIZE[aspectRatio] : "auto");
  if (quality) form.append("quality", quality);
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

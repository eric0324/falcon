import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";
import {
  generateFromText,
  generateFromImage,
  type ImageProvider,
  type AspectRatio,
  type ImageQuality,
} from "./image-generation";

export function createImageTools(ctx: {
  userId: string;
  conversationId?: string;
  defaultProvider: ImageProvider;
}) {
  return {
    generateImage: tool({
      description:
        "Generate an image from a text prompt, or edit an existing uploaded image. " +
        "Call this when the user explicitly asks to create, draw, illustrate, or edit an image. " +
        "Do not call this for UI code or documents — use updateCode / updateDocument for those. " +
        "If the user uploaded an image and asks for modifications, pass sourceImageKey from the upload. " +
        "Respect the user's provider preference if mentioned (imagen / gpt-image); otherwise omit provider.",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("The image description or edit instruction, in the same language as the user."),
        sourceImageKey: z
          .string()
          .optional()
          .describe(
            "S3 key of a single source image. Only pass when doing image-to-image edit with one reference. For multiple references, use sourceImageKeys instead."
          ),
        sourceImageKeys: z
          .array(z.string())
          .max(4)
          .optional()
          .describe(
            "Up to 4 source image keys for multi-image edit (e.g. compose user photo + a template). When set, this wins over sourceImageKey."
          ),
        provider: z
          .enum(["imagen", "gpt-image"])
          .optional()
          .describe(
            "Explicit provider override. Usually omit this — the user's UI selection is used by default."
          ),
        aspectRatio: z
          .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
          .optional()
          .describe(
            "Only pass this when the user explicitly asks for a shape (e.g. 'make it 16:9', '橫式海報', '長條'). Omit it otherwise — the default is 1:1 for text-to-image and match-source for image-to-image."
          ),
        quality: z
          .enum(["low", "medium", "high"])
          .optional()
          .describe(
            "Only pass when the user asks for a specific quality level (e.g. '高品質', '精細一點', '快速預覽'). " +
              "'high' costs ~4x more than the default; use it only when the user explicitly wants better quality. " +
              "Currently only applied to the gpt-image provider; Imagen/Gemini ignore this."
          ),
      }),
      execute: async ({ prompt, sourceImageKey, sourceImageKeys, provider, aspectRatio, quality }) => {
        const used: ImageProvider = provider ?? ctx.defaultProvider;
        const keys = Array.isArray(sourceImageKeys) && sourceImageKeys.length > 0
          ? sourceImageKeys
          : sourceImageKey
            ? [sourceImageKey]
            : [];

        try {
          const result = keys.length > 0
            ? await generateFromImage({
                prompt,
                sourceImageKeys: keys,
                provider: used,
                userId: ctx.userId,
                aspectRatio: aspectRatio as AspectRatio | undefined,
                quality: quality as ImageQuality | undefined,
              })
            : await generateFromText({
                prompt,
                provider: used,
                userId: ctx.userId,
                aspectRatio: aspectRatio as AspectRatio | undefined,
                quality: quality as ImageQuality | undefined,
              });

          recordUsage(ctx.userId, result.modelUsed);

          return {
            type: "image_generated" as const,
            s3Key: result.s3Key,
            presignedUrl: result.presignedUrl,
            provider: result.provider,
          };
        } catch (err) {
          return {
            type: "image_error" as const,
            reason: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),
  };
}

function recordUsage(userId: string, modelUsed: string): void {
  const costUsd = estimateCost({ kind: "image", model: modelUsed, imageCount: 1 });
  prisma.tokenUsage
    .create({
      data: {
        userId,
        kind: "image",
        model: modelUsed,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        units: 1,
        costUsd,
      },
    })
    .catch((e: unknown) => {
      console.error(`[image-tools] Failed to save TokenUsage:`, e);
    });
}

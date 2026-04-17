import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";
import {
  generateFromText,
  generateFromImage,
  type ImageProvider,
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
            "S3 key of the user's uploaded source image. Only pass when doing image-to-image edit."
          ),
        provider: z
          .enum(["imagen", "gpt-image"])
          .optional()
          .describe(
            "Explicit provider override. Usually omit this — the user's UI selection is used by default."
          ),
      }),
      execute: async ({ prompt, sourceImageKey, provider }) => {
        const used: ImageProvider = provider ?? ctx.defaultProvider;

        try {
          const result = sourceImageKey
            ? await generateFromImage({
                prompt,
                sourceImageKey,
                provider: used,
                userId: ctx.userId,
              })
            : await generateFromText({
                prompt,
                provider: used,
                userId: ctx.userId,
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
  const costUsd = estimateCost(modelUsed, 0, 1);
  prisma.tokenUsage
    .create({
      data: {
        userId,
        model: modelUsed,
        inputTokens: 0,
        outputTokens: 1,
        totalTokens: 1,
        costUsd,
      },
    })
    .catch((e: unknown) => {
      console.error(`[image-tools] Failed to save TokenUsage:`, e);
    });
}

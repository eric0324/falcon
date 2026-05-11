import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";
import { transcribeAudio } from "@/lib/integrations/openai-audio";
import { getObjectBuffer } from "@/lib/storage/s3";

const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

function mimeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3":
    case "mpeg":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/m4a";
    case "webm":
      return "audio/webm";
    case "ogg":
      return "audio/ogg";
    default:
      return "audio/mpeg";
  }
}

export function createAudioTools(ctx: { userId: string }) {
  return {
    transcribeAudio: tool({
      description:
        "Transcribe a previously-uploaded audio file in this conversation to text. " +
        "Use this when the user refers to an audio attachment from an earlier turn and wants its content searched / summarised / quoted. " +
        "Do not call this for audio attached to the current message — that is auto-transcribed already.",
      inputSchema: z.object({
        audioKey: z
          .string()
          .describe("S3 key of the audio file, format: audios/<userId>/<uuid>.<ext>"),
        language: z
          .string()
          .optional()
          .describe(
            "ISO 639-1 language code (e.g. 'zh', 'en'). Omit for auto-detect."
          ),
      }),
      execute: async ({ audioKey, language }) => {
        if (!audioKey.startsWith(`audios/${ctx.userId}/`)) {
          return {
            type: "transcription_error" as const,
            reason: `Permission denied: audioKey '${audioKey}' does not belong to the current user.`,
          };
        }

        try {
          const buffer = await getObjectBuffer({ key: audioKey });
          const { text, durationSec } = await transcribeAudio(
            buffer,
            mimeFromKey(audioKey),
            { ...(language ? { language } : {}) }
          );

          const minutes = durationSec
            ? Math.max(1, Math.ceil(durationSec / 60))
            : 1;
          prisma.tokenUsage
            .create({
              data: {
                userId: ctx.userId,
                model: TRANSCRIBE_MODEL,
                inputTokens: 0,
                outputTokens: minutes,
                totalTokens: minutes,
                costUsd: estimateCost(TRANSCRIBE_MODEL, 0, minutes),
              },
            })
            .catch((e: unknown) => {
              console.error(`[audio-tools] Failed to save TokenUsage:`, e);
            });

          return {
            type: "transcription" as const,
            text,
            durationSec,
          };
        } catch (err) {
          return {
            type: "transcription_error" as const,
            reason: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),
  };
}

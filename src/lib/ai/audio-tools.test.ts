import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/openai-audio", () => ({
  transcribeAudio: vi.fn(),
  AudioTranscriptionError: class AudioTranscriptionError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = "AudioTranscriptionError";
    }
  },
}));

vi.mock("@/lib/storage/s3", () => ({
  getObjectBuffer: vi.fn(),
}));

const mockTokenUsageCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsage: { create: (...args: unknown[]) => mockTokenUsageCreate(...args) },
  },
}));

import { createAudioTools } from "./audio-tools";
import { transcribeAudio } from "@/lib/integrations/openai-audio";
import { getObjectBuffer } from "@/lib/storage/s3";

const mockTranscribe = vi.mocked(transcribeAudio);
const mockGetObjectBuffer = vi.mocked(getObjectBuffer);

beforeEach(() => {
  vi.clearAllMocks();
  mockTokenUsageCreate.mockResolvedValue({});
  mockGetObjectBuffer.mockResolvedValue(Buffer.from([1, 2, 3]));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(ctxUserId: string, params: Record<string, unknown>): Promise<any> {
  const tools = createAudioTools({ userId: ctxUserId });
  return tools.transcribeAudio.execute!(
    params as never,
    { toolCallId: "t", messages: [], abortSignal: undefined as never }
  );
}

describe("transcribeAudio tool", () => {
  it("transcribes an audio file owned by the user", async () => {
    mockTranscribe.mockResolvedValueOnce({ text: "hello world", durationSec: 75 });

    const result = await executeTool("user-1", {
      audioKey: "audios/user-1/abc.mp3",
    });

    expect(mockGetObjectBuffer).toHaveBeenCalledWith({ key: "audios/user-1/abc.mp3" });
    expect(mockTranscribe).toHaveBeenCalled();
    expect(result).toMatchObject({
      type: "transcription",
      text: "hello world",
      durationSec: 75,
    });
  });

  it("forwards language hint when provided", async () => {
    mockTranscribe.mockResolvedValueOnce({ text: "你好", durationSec: 2 });

    await executeTool("user-1", {
      audioKey: "audios/user-1/clip.mp3",
      language: "zh",
    });

    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.any(String),
      expect.objectContaining({ language: "zh" })
    );
  });

  it("rejects audioKey not owned by the caller", async () => {
    const result = await executeTool("user-1", {
      audioKey: "audios/other-user/clip.mp3",
    });

    expect(result.type).toBe("transcription_error");
    expect(result.reason).toMatch(/permission|own|不屬於/i);
    expect(mockGetObjectBuffer).not.toHaveBeenCalled();
    expect(mockTranscribe).not.toHaveBeenCalled();
  });

  it("surfaces upstream errors as transcription_error", async () => {
    mockTranscribe.mockRejectedValueOnce(new Error("OpenAI rate limit"));

    const result = await executeTool("user-1", {
      audioKey: "audios/user-1/clip.mp3",
    });

    expect(result.type).toBe("transcription_error");
    expect(result.reason).toMatch(/rate limit/i);
  });

  it("writes TokenUsage with kind=audio and minutes as units", async () => {
    // 75 seconds → 2 minutes
    mockTranscribe.mockResolvedValueOnce({ text: "x", durationSec: 75 });

    await executeTool("user-42", { audioKey: "audios/user-42/clip.mp3" });

    expect(mockTokenUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-42",
        kind: "audio",
        model: "gpt-4o-mini-transcribe",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        units: 2,
        costUsd: 0.003 * 2,
      }),
    });
  });

  it("does not write TokenUsage when transcription fails", async () => {
    mockTranscribe.mockRejectedValueOnce(new Error("boom"));

    await executeTool("user-1", { audioKey: "audios/user-1/clip.mp3" });

    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });
});

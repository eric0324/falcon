import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConfigRequired = vi.fn();
vi.mock("@/lib/config", () => ({
  getConfig: vi.fn(async (key: string) => process.env[key]),
  getConfigRequired: (key: string) => mockGetConfigRequired(key),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  transcribeAudio,
  isAudioConfigured,
  AudioTranscriptionError,
} from "./client";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "openai-test-key");
  mockGetConfigRequired.mockImplementation(async (k: string) => {
    if (k === "OPENAI_API_KEY") return "openai-test-key";
    throw new Error(`Missing: ${k}`);
  });
});

describe("isAudioConfigured", () => {
  it("returns true when OPENAI_API_KEY is set", async () => {
    expect(await isAudioConfigured()).toBe(true);
  });

  it("returns false when OPENAI_API_KEY is empty", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(await isAudioConfigured()).toBe(false);
  });
});

describe("transcribeAudio", () => {
  it("POSTs multipart to OpenAI with default model gpt-4o-mini-transcribe", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "hello world", duration: 5.2 }),
    });

    const result = await transcribeAudio(
      Buffer.from([1, 2, 3]),
      "audio/mpeg"
    );

    expect(result).toEqual({ text: "hello world", durationSec: 5.2 });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer openai-test-key");
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get("model")).toBe("gpt-4o-mini-transcribe");
    // gpt-4o-* only support json/text; whisper-1 alone can use verbose_json
    expect(form.get("response_format")).toBe("json");
    // No language unless caller specifies (auto-detect)
    expect(form.has("language")).toBe(false);
    expect(form.get("file")).toBeInstanceOf(Blob);
  });

  it("uses verbose_json response_format for whisper-1 (to get duration)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "hi", duration: 1 }),
    });

    await transcribeAudio(Buffer.from([1]), "audio/mp3", {
      model: "whisper-1",
    });

    const form = mockFetch.mock.calls[0][1].body as FormData;
    expect(form.get("response_format")).toBe("verbose_json");
  });

  it("forwards explicit language to OpenAI", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "你好", duration: 1 }),
    });

    await transcribeAudio(Buffer.from([1]), "audio/wav", { language: "zh" });

    const form = mockFetch.mock.calls[0][1].body as FormData;
    expect(form.get("language")).toBe("zh");
  });

  it("forwards explicit model override", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "x", duration: 1 }),
    });

    await transcribeAudio(Buffer.from([1]), "audio/mp3", {
      model: "whisper-1",
    });

    const form = mockFetch.mock.calls[0][1].body as FormData;
    expect(form.get("model")).toBe("whisper-1");
  });

  it("rejects buffers over 25MB before calling the network", async () => {
    const huge = Buffer.alloc(25 * 1024 * 1024 + 1);
    await expect(
      transcribeAudio(huge, "audio/mpeg")
    ).rejects.toBeInstanceOf(AudioTranscriptionError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws AudioTranscriptionError when OpenAI returns non-2xx", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 415,
      text: async () => "Unsupported file type",
      json: async () => ({ error: { message: "Unsupported file type" } }),
    });

    await expect(
      transcribeAudio(Buffer.from([1]), "audio/mpeg")
    ).rejects.toThrow(/415|Unsupported/i);
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    mockGetConfigRequired.mockImplementation(async () => {
      throw new Error("Missing: OPENAI_API_KEY");
    });
    await expect(
      transcribeAudio(Buffer.from([1]), "audio/mpeg")
    ).rejects.toThrow(/OPENAI_API_KEY/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not lose duration when API omits it", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "plain text" }),
    });

    const result = await transcribeAudio(Buffer.from([1]), "audio/mpeg");
    expect(result.text).toBe("plain text");
    expect(result.durationSec).toBeUndefined();
  });
});

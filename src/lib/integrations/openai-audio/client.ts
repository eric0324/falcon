import { getConfig, getConfigRequired } from "@/lib/config";

const OPENAI_AUDIO_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_BYTES = 25 * 1024 * 1024;

export type AudioProvider =
  | "gpt-4o-mini-transcribe"
  | "gpt-4o-transcribe"
  | "whisper-1";

export const DEFAULT_AUDIO_PROVIDER: AudioProvider = "gpt-4o-mini-transcribe";

export const AUDIO_PROVIDERS: AudioProvider[] = [
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
  "whisper-1",
];

export class AudioTranscriptionError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AudioTranscriptionError";
  }
}

export interface TranscribeOptions {
  /** ISO 639-1 language code; omit for auto-detect */
  language?: string;
  /** OpenAI transcription model id; default gpt-4o-mini-transcribe */
  model?: string;
}

export interface TranscribeResult {
  text: string;
  /** Duration in seconds, if OpenAI reports it (verbose_json does) */
  durationSec?: number;
}

export async function isAudioConfigured(): Promise<boolean> {
  return !!(await getConfig("OPENAI_API_KEY"));
}

export async function transcribeAudio(
  buffer: Buffer,
  mime: string,
  opts: TranscribeOptions = {}
): Promise<TranscribeResult> {
  if (buffer.byteLength > MAX_BYTES) {
    throw new AudioTranscriptionError(
      `Audio buffer is ${buffer.byteLength} bytes, exceeds OpenAI limit of ${MAX_BYTES} bytes (25MB)`
    );
  }

  const apiKey = await getConfigRequired("OPENAI_API_KEY");

  const model = opts.model ?? DEFAULT_AUDIO_PROVIDER;
  const form = new FormData();
  form.append("model", model);
  // whisper-1 supports verbose_json (returns duration); gpt-4o-* only accept json/text
  form.append("response_format", model === "whisper-1" ? "verbose_json" : "json");
  if (opts.language) form.append("language", opts.language);
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mime }),
    "audio"
  );

  const res = await fetch(OPENAI_AUDIO_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      const msg = (body as { error?: { message?: string } })?.error?.message;
      if (msg) detail = msg;
    } catch { /* keep default */ }
    throw new AudioTranscriptionError(
      `OpenAI transcription failed (${res.status}): ${detail}`,
      res.status
    );
  }

  const data = (await res.json()) as { text?: string; duration?: number };
  return {
    text: data.text ?? "",
    ...(typeof data.duration === "number" ? { durationSec: data.duration } : {}),
  };
}

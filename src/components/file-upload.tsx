"use client";

import { useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon, Code, AlertTriangle, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadImageToS3 } from "@/lib/chat/upload-image-client";
import { uploadAudioToS3 } from "@/lib/chat/upload-audio-client";
import { useToast } from "@/components/ui/use-toast";

type ToastFn = ReturnType<typeof useToast>["toast"];
import { estimateTokens } from "@/lib/ai/token-utils";
import { classifyAttachmentSize, HARD_TOKENS, WARN_TOKENS } from "@/lib/attachments/limits";

export type AttachmentTruncateMode = "head" | "csv" | "full";

export type AttachmentKind = "image" | "audio" | "text" | "binary";

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  s3Key?: string;
  /** Classification for backend routing: audio is transcribed, image is vision-fed, etc. */
  kind?: AttachmentKind;
  /** Audio duration in seconds (audio attachments only) */
  durationSec?: number;
  /** Estimated tokens for text attachments; undefined for images / binaries. */
  tokenEstimate?: number;
  /** How the backend should handle this file when over WARN_TOKENS. */
  truncateMode?: AttachmentTruncateMode;
}

// MIME types also accepted by /api/chat/upload-image so image-to-image works
const S3_UPLOADABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
]);
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

// Mirror the backend `isTextReadableMime` heuristic so we can estimate tokens client-side.
const TEXT_READABLE_PREFIXES = ["text/"];
const TEXT_READABLE_EXACT = new Set([
  "application/json",
  "application/javascript",
  "application/typescript",
]);
function isTextReadable(mime: string): boolean {
  return TEXT_READABLE_PREFIXES.some((p) => mime.startsWith(p)) || TEXT_READABLE_EXACT.has(mime);
}

interface FileUploadProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  // Images
  "image/png": true,
  "image/jpeg": true,
  "image/gif": true,
  "image/webp": true,
  // Documents
  "application/pdf": true,
  "text/plain": true,
  "text/markdown": true,
  "text/csv": true,
  // Code
  "application/javascript": true,
  "text/javascript": true,
  "application/typescript": true,
  "application/json": true,
  "text/html": true,
  "text/css": true,
  // Audio
  "audio/mpeg": true,
  "audio/mp3": true,
  "audio/wav": true,
  "audio/x-wav": true,
  "audio/m4a": true,
  "audio/mp4": true,
  "audio/x-m4a": true,
  "audio/webm": true,
  "audio/ogg": true,
};

const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.csv,.js,.ts,.json,.html,.css,.mp3,.wav,.m4a,.webm,.ogg";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (non-audio cap)
const MAX_IMAGE_BASE64_SIZE = 512 * 1024; // Compress images to ~512KB base64 to stay under Vercel 4.5MB body limit

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Scale down if too large
      const MAX_DIM = 1600;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under limit
      let quality = 0.8;
      let base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
      while (base64.length > MAX_IMAGE_BASE64_SIZE && quality > 0.2) {
        quality -= 0.1;
        base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
      }
      resolve(base64);
    };
    img.src = URL.createObjectURL(file);
  });
}

export function getFileIcon(type: string) {
  if (type.startsWith("image/")) {
    return <ImageIcon className="h-3.5 w-3.5" />;
  }
  if (type.startsWith("audio/")) {
    return <Mic className="h-3.5 w-3.5" />;
  }
  if (type.includes("javascript") || type.includes("typescript") || type === "application/json") {
    return <Code className="h-3.5 w-3.5" />;
  }
  return <FileText className="h-3.5 w-3.5" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new window.Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : undefined);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    audio.src = url;
  });
}

/**
 * Process a single file picked or dropped by the user.
 * Returns the UploadedFile entry on success, or null when rejected
 * (unsupported type, too large, or text content over hard token cap).
 * Toasts are emitted for rejections that are worth surfacing.
 */
export async function processFile(
  file: File,
  toast: ToastFn
): Promise<UploadedFile | null> {
  if (!ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
    console.warn(`Unsupported file type: ${file.type}`);
    return null;
  }

  const isAudio = AUDIO_MIME_TYPES.has(file.type);
  const sizeLimit = isAudio ? MAX_AUDIO_SIZE : MAX_FILE_SIZE;
  if (file.size > sizeLimit) {
    toast({
      title: isAudio ? "聲音過大" : "附件過大",
      description: `「${file.name}」${formatFileSize(file.size)}，超過上限 ${formatFileSize(sizeLimit)}。`,
      variant: "destructive",
    });
    return null;
  }

  // Audio path: upload to S3 (transcription happens server-side at chat send),
  // skip base64 body to avoid bloating chat payload.
  if (isAudio) {
    let s3Key: string | undefined;
    try {
      s3Key = await uploadAudioToS3(file);
    } catch (err) {
      console.warn("[FileUpload] Audio S3 upload failed:", err);
      toast({
        title: "聲音上傳失敗",
        description: `「${file.name}」無法上傳，請稍後再試。`,
        variant: "destructive",
      });
      return null;
    }
    const durationSec = await readAudioDuration(file);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      base64: "",
      s3Key,
      kind: "audio",
      durationSec,
    };
  }

  let base64: string;
  if (file.type.startsWith("image/")) {
    base64 = await compressImage(file);
  } else {
    base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.readAsDataURL(file);
    });
  }

  let s3Key: string | undefined;
  if (S3_UPLOADABLE_IMAGE_TYPES.has(file.type)) {
    try {
      s3Key = await uploadImageToS3(file);
    } catch (err) {
      console.warn("[FileUpload] S3 upload failed, continuing with base64 only:", err);
    }
  }

  let tokenEstimate: number | undefined;
  let truncateMode: AttachmentTruncateMode | undefined;
  if (isTextReadable(file.type)) {
    const text = await file.text();
    tokenEstimate = estimateTokens(text);
    const sizeClass = classifyAttachmentSize(tokenEstimate);
    if (sizeClass === "reject") {
      toast({
        title: "附件過大",
        description: `「${file.name}」約 ${tokenEstimate.toLocaleString()} tokens，超過上限 ${HARD_TOKENS.toLocaleString()}。請拆分檔案後再上傳。`,
        variant: "destructive",
      });
      return null;
    }
    if (sizeClass === "warn") {
      truncateMode = file.type === "text/csv" ? "csv" : "head";
      toast({
        title: "附件較大，已預設截斷",
        description: `「${file.name}」約 ${tokenEstimate.toLocaleString()} tokens，將自動截斷至 ${WARN_TOKENS.toLocaleString()} 內。可在檔案標籤切換為「完整送出」。`,
      });
    }
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    base64,
    s3Key,
    tokenEstimate,
    truncateMode,
  };
}

export function FileUpload({ files, onChange, disabled }: FileUploadProps) {
  const t = useTranslations("fileUpload");
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(selectedFiles)) {
      const processed = await processFile(file, toast);
      if (processed) newFiles.push(processed);
    }

    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }

    e.target.value = "";
  }, [files, onChange, toast]);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className="h-8 gap-1.5 text-xs"
      >
        <Paperclip className="h-3.5 w-3.5" />
        {t("upload")}
        {files.length > 0 && (
          <span className="ml-1 bg-primary/10 text-primary px-1.5 rounded-full">
            {files.length}
          </span>
        )}
      </Button>
    </div>
  );
}

interface FileListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
  onChange?: (files: UploadedFile[]) => void;
}

export function FileList({ files, onRemove, onChange }: FileListProps) {
  if (files.length === 0) return null;

  const toggleTruncate = (id: string) => {
    if (!onChange) return;
    onChange(
      files.map((f) => {
        if (f.id !== id || f.tokenEstimate === undefined) return f;
        const next: AttachmentTruncateMode = f.truncateMode === "full"
          ? (f.type === "text/csv" ? "csv" : "head")
          : "full";
        return { ...f, truncateMode: next };
      })
    );
  };

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      {files.map((file) => {
        if (file.kind === "audio") {
          return (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs border bg-muted"
              title={`${file.name} (${formatFileSize(file.size)})`}
            >
              <Mic className="h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="text-muted-foreground">
                  {file.durationSec ? formatDuration(file.durationSec) : "—"} · {formatFileSize(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="ml-1 hover:text-destructive"
                aria-label="移除附件"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        }

        if (file.type.startsWith("image/")) {
          return (
            <div
              key={file.id}
              className="relative h-14 w-14 rounded-md overflow-hidden border bg-muted group"
              title={`${file.name} (${formatFileSize(file.size)})`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${file.base64}`}
                alt={file.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="移除附件"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        }

        const inWarnZone = file.tokenEstimate !== undefined && file.tokenEstimate >= WARN_TOKENS;
        return (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border",
              inWarnZone ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900" : "bg-muted"
            )}
          >
            {getFileIcon(file.type)}
            <span className="max-w-[120px] truncate">{file.name}</span>
            <span className="text-muted-foreground">
              ({formatFileSize(file.size)})
            </span>
            {inWarnZone && (
              <button
                type="button"
                onClick={() => toggleTruncate(file.id)}
                disabled={!onChange}
                className="flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline"
                title={
                  file.truncateMode === "full"
                    ? "目前完整送出，點擊改為截斷"
                    : "目前自動截斷，點擊改為完整送出"
                }
              >
                <AlertTriangle className="h-3 w-3" />
                {file.tokenEstimate?.toLocaleString()} tokens
                <span className="ml-1 px-1 rounded bg-amber-100 dark:bg-amber-900/50">
                  {file.truncateMode === "full" ? "完整" : "截斷"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

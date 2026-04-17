"use client";

import { useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadImageToS3 } from "@/lib/chat/upload-image-client";

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  s3Key?: string;
}

// MIME types also accepted by /api/chat/upload-image so image-to-image works
const S3_UPLOADABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

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
};

const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.csv,.js,.ts,.json,.html,.css";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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

export function FileUpload({ files, onChange, disabled }: FileUploadProps) {
  const t = useTranslations("fileUpload");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(selectedFiles)) {
      // Check file type
      if (!ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
        console.warn(`Unsupported file type: ${file.type}`);
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File too large: ${file.name} (${formatFileSize(file.size)})`);
        continue;
      }

      // Convert to base64 (compress images to stay under Vercel body limit)
      let base64: string;
      if (file.type.startsWith("image/")) {
        base64 = await compressImage(file);
      } else {
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.readAsDataURL(file);
        });
      }

      // For whitelisted image types, also upload the original to S3 so it can
      // be used as sourceImageKey for generateImage. Failure is non-fatal —
      // the file is still usable for vision understanding via base64.
      let s3Key: string | undefined;
      if (S3_UPLOADABLE_IMAGE_TYPES.has(file.type)) {
        try {
          s3Key = await uploadImageToS3(file);
        } catch (err) {
          console.warn("[FileUpload] S3 upload failed, continuing with base64 only:", err);
        }
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
        s3Key,
      });
    }

    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }

    // Reset input
    e.target.value = "";
  }, [files, onChange]);

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
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
            "bg-muted border"
          )}
        >
          {getFileIcon(file.type)}
          <span className="max-w-[120px] truncate">{file.name}</span>
          <span className="text-muted-foreground">
            ({formatFileSize(file.size)})
          </span>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

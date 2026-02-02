"use client";

import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon, Code } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
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
};

const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.csv,.js,.ts,.json,.html,.css";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileIcon(type: string) {
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

      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.readAsDataURL(file);
      });

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
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
        上傳
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

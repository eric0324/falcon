"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, Globe, Loader2 } from "lucide-react";

interface DataSource {
  name: string;
  displayName: string;
  type: string;
  description: string | null;
}

export interface ToolSetup {
  name: string;
  description: string;
  allowedSources: string[];
}

interface InitialSetupDialogProps {
  open: boolean;
  onConfirm: (setup: ToolSetup) => void;
  onCancel: () => void;
}

export function InitialSetupDialog({
  open,
  onConfirm,
  onCancel,
}: InitialSetupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedSources, setAllowedSources] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch("/api/datasources")
        .then((res) => res.json())
        .then((data) => {
          setAvailableSources(data);
          setIsLoading(false);
        })
        .catch(() => {
          setAvailableSources([]);
          setIsLoading(false);
        });
    }
  }, [open]);

  const toggleSource = (sourceName: string) => {
    setAllowedSources((prev) =>
      prev.includes(sourceName)
        ? prev.filter((s) => s !== sourceName)
        : [...prev, sourceName]
    );
  };

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm({
      name: name.trim(),
      description: description.trim(),
      allowedSources,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>建立新工具</DialogTitle>
          <DialogDescription>
            先設定基本資訊，選擇需要的資料源後開始建立
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              工具名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：訂單查詢工具"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述（選填）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="簡單描述這個工具的用途..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>資料源（選填）</Label>
            <p className="text-sm text-muted-foreground">
              選擇此工具需要存取的內部資料
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableSources.length > 0 ? (
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {availableSources.map((source) => (
                  <label
                    key={source.name}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={allowedSources.includes(source.name)}
                      onCheckedChange={() => toggleSource(source.name)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {source.type === "REST_API" ? (
                        <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <Database className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {source.displayName}
                        </div>
                        {source.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {source.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                目前沒有可用的資料源
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            開始建立
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

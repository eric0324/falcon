"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Visibility, ToolStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface ScanWarning {
  rule: string;
  severity: string;
  message: string;
}

interface Props {
  toolId: string;
  initialName: string;
  initialDescription: string;
  initialCode: string;
  initialVisibility: Visibility;
  initialStatus: ToolStatus;
}

export function AdminToolEditForm({
  toolId,
  initialName,
  initialDescription,
  initialCode,
  initialVisibility,
  initialStatus,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [code, setCode] = useState(initialCode);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [status, setStatus] = useState<ToolStatus>(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [warnings, setWarnings] = useState<ScanWarning[]>([]);

  const codeChanged = code !== initialCode;
  const metaChanged =
    name !== initialName ||
    description !== initialDescription ||
    visibility !== initialVisibility ||
    status !== initialStatus;
  const dirty = codeChanged || metaChanged;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;

    setSubmitting(true);
    setWarnings([]);
    try {
      const res = await fetch(`/api/admin/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(name !== initialName && { name }),
          ...(description !== initialDescription && { description }),
          ...(codeChanged && { code }),
          ...(visibility !== initialVisibility && { visibility }),
          ...(status !== initialStatus && { status }),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "更新失敗",
          description: err.message || err.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();
      if (data.scanWarnings?.length) {
        setWarnings(data.scanWarnings);
      }
      toast({ title: "已更新" });
      router.refresh();
    } catch (err) {
      toast({
        title: "更新失敗",
        description: err instanceof Error ? err.message : "網路錯誤",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="tool-name">名稱</Label>
        <Input
          id="tool-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tool-description">描述</Label>
        <Textarea
          id="tool-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>可見度</Label>
          <Select
            value={visibility}
            onValueChange={(v) => setVisibility(v as Visibility)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRIVATE">PRIVATE（私人）</SelectItem>
              <SelectItem value="GROUP">GROUP（群組）</SelectItem>
              <SelectItem value="COMPANY">COMPANY（公司）</SelectItem>
              <SelectItem value="PUBLIC">PUBLIC（公開）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>狀態</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ToolStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">DRAFT（草稿）</SelectItem>
              <SelectItem value="PUBLISHED">PUBLISHED（已發布）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tool-code">
          程式碼
          {codeChanged && (
            <span className="ml-2 text-xs text-amber-600">未儲存的變更</span>
          )}
        </Label>
        <Textarea
          id="tool-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="font-mono text-xs min-h-[420px]"
        />
      </div>

      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium mb-1">儲存成功，但 code scan 有警告：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>
                <span className="font-mono">[{w.severity}]</span> {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 border-t pt-5">
        <Button type="submit" disabled={!dirty || submitting}>
          {submitting ? "儲存中..." : "儲存變更"}
        </Button>
        <p className="text-xs text-muted-foreground">
          程式碼變更會自動建立版本快照，可從下方版本紀錄回復。
        </p>
      </div>
    </form>
  );
}

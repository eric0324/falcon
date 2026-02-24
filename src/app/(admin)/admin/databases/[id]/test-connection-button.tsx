"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plug } from "lucide-react";

export function TestConnectionButton({ databaseId }: { databaseId: string }) {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleTest() {
    setStatus("testing");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/admin/databases/${databaseId}/test`, {
        method: "POST",
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "連線失敗");
        setStatus("error");
      }
    } catch {
      setErrorMsg("網路錯誤");
      setStatus("error");
    }

    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handleTest} disabled={status === "testing"}>
        <Plug className="h-4 w-4 mr-1" />
        {status === "testing" ? "測試中..." : "測試連線"}
      </Button>
      {status === "success" && (
        <span className="text-sm text-green-600">連線成功</span>
      )}
      {status === "error" && (
        <span className="text-sm text-red-600">{errorMsg}</span>
      )}
    </div>
  );
}

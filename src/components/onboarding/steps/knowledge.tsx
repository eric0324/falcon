"use client";

import type { StepType } from "@reactour/tour";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

function FinalStep({ setIsOpen }: { setIsOpen: (v: boolean) => void }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p>五大功能都看過一輪了！有問題隨時點「？操作說明」再次複習。</p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md"
        >
          完成
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/");
          }}
          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
        >
          <Home className="h-3 w-3" />
          回首頁
        </button>
      </div>
    </div>
  );
}

const centeredStyles = {
  maskArea: (base: Record<string, unknown>) => ({ ...base, display: "none" }),
  maskWrapper: (base: Record<string, unknown>) => ({ ...base, color: "rgba(0,0,0,0.65)" }),
};

export const knowledgeSteps: StepType[] = [
  {
    selector: "body",
    position: "center",
    highlightedSelectors: [],
    mutationObservables: [],
    content:
      "知識庫是給 AI 的參考資料，例如產品文件、團隊規範、FAQ。放進來之後，要記得在對話頁的「資料來源」勾選這個知識庫，AI 才會讀到並用來回答，也可以分享給夥伴一起用。",
    styles: centeredStyles,
  },
  {
    selector: '[data-tour="knowledge-create"]',
    content: "點這裡建立一個新的知識庫，取好名字後就能開始放資料進去。",
  },
  {
    selector: '[data-tour="knowledge-card"]',
    content:
      "每張卡片是一個知識庫，上面會顯示收錄了幾則內容、有幾位成員、建立者是誰、夥伴的評分。點進去可以匯入資料（支援 CSV 或直接同步 Notion）、整理資料、邀請成員、設定權限。注意：整理好的資料需要經過核可，AI 才會參考。",
  },
  {
    selector: "body",
    position: "center",
    highlightedSelectors: [],
    mutationObservables: [],
    content: ({ setIsOpen }) => <FinalStep setIsOpen={setIsOpen} />,
    styles: centeredStyles,
  },
];

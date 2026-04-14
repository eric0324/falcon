"use client";

import type { StepType } from "@reactour/tour";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

function FinalStep({ setIsOpen }: { setIsOpen: (v: boolean) => void }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p>工具頁看完了！最後看一下「知識庫」，了解怎麼餵資料讓 AI 回答得更準。</p>
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
            router.push("/knowledge?tour=1");
          }}
          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
        >
          探索知識庫
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

const centeredStyles = {
  maskArea: (base: Record<string, unknown>) => ({ ...base, display: "none" }),
  maskWrapper: (base: Record<string, unknown>) => ({ ...base, color: "rgba(0,0,0,0.65)" }),
};

export const toolsSteps: StepType[] = [
  {
    selector: "body",
    position: "center",
    highlightedSelectors: [],
    mutationObservables: [],
    content:
      "工具頁是你自己做過、發佈的工具清單。每個工具背後都是一段 AI 幫你生的程式碼，但你不用看程式，直接開來用就好。",
    styles: centeredStyles,
  },
  {
    selector: '[data-tour="tools-create"]',
    content: "想做新工具？點這裡會帶你到對話頁，用講的就能生一個出來。",
  },
  {
    selector: '[data-tour="tools-card"]',
    content: "每張卡片是一個你做過的工具，點進去可以直接使用，也能編輯、刪除、重新調整。做好要讓夥伴看到的話，可以在這裡調整分享設定。",
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

"use client";

import type { StepType } from "@reactour/tour";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

function FinalStep({ setIsOpen }: { setIsOpen: (v: boolean) => void }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p>技能頁看完了！接下來可以看看「工具」頁，了解你做過或收藏的工具都在哪裡。</p>
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
            router.push("/tools?tour=1");
          }}
          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
        >
          探索工具
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

export const skillsSteps: StepType[] = [
  {
    selector: "body",
    position: "center",
    highlightedSelectors: [],
    mutationObservables: [],
    content:
      "技能頁（Skill）是 AI 的工作模式或角色。你可以為不同情境寫一套提示詞，告訴 AI 自己的人設，像是「後端工程師」「文案寫手」「Eric 的講話方式」，在對話時一鍵切換。",
    styles: centeredStyles,
  },
  {
    selector: '[data-tour="skills-create"]',
    content: "點「新增」就能建立自己的 skill：填好名稱、描述和提示詞，它就會出現在對話頁的 skill 選單。",
  },
  {
    selector: '[data-tour="skills-card"]',
    content: "每張卡片是一個你建立的 skill。滑過去可以編輯或刪除，使用次數也會顯示在這。",
  },
  {
    selector: '[data-tour="skills-visibility"]',
    content:
      "可見度決定誰能用這個 skill：private 只有你自己、public 則是所有夥伴都能在對話頁選到，適合分享好用的角色設定。",
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

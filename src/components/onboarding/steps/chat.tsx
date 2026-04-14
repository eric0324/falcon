"use client";

import type { StepType } from "@reactour/tour";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

function FinalStep({ setIsOpen }: { setIsOpen: (v: boolean) => void }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p>對話頁的重點都介紹完了！接下來可以看看「技能」頁，了解怎麼設定 AI 的工作模式。</p>
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
            router.push("/skills?tour=1");
          }}
          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
        >
          探索技能
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export const chatSteps: StepType[] = [
  {
    selector: "body",
    position: "center",
    highlightedSelectors: [],
    mutationObservables: [],
    content:
      "這裡是對話頁，你可以跟 AI 討論想法、請它幫你做工具、寫文件，或查各種資料。下面帶你看幾個重要的設定。",
    styles: {
      maskArea: (base) => ({ ...base, display: "none" }),
      maskWrapper: (base) => ({ ...base, color: "rgba(0,0,0,0.65)" }),
    },
  },
  {
    selector: '[data-tour="chat-model"]',
    content:
      "切換 AI 模型。除了 Claude（Opus 思考力強、Sonnet 速度快、Haiku 最便宜），也可以切換到 OpenAI 或 Gemini，各家模型擅長的事情不同。",
  },
  {
    selector: '[data-tour="chat-skill"]',
    content:
      "Skill 決定 AI 的工作模式，像是寫程式、寫文件、一般對話或是 Eric 的講話方式。選對 skill 效果差很多。你也可以到左側選單的「技能」自訂 skill，或直接使用別人寫好的。",
  },
  {
    selector: '[data-tour="chat-data-sources"]',
    content:
      "勾選資料來源，AI 才能讀到你的 Notion、Google Drive、GA4 等資料。不勾就只是一般聊天。",
  },
  {
    selector: '[data-tour="chat-input"]',
    content: "想做什麼直接用講的，例如：「幫我做一個統計這週業績的工具」。",
  },
  {
    selector: "body",
    position: "center",
    highlightedSelectors: [],
    mutationObservables: [],
    content: ({ setIsOpen }) => <FinalStep setIsOpen={setIsOpen} />,
    styles: {
      maskArea: (base) => ({ ...base, display: "none" }),
      maskWrapper: (base) => ({ ...base, color: "rgba(0,0,0,0.65)" }),
    },
  },
];

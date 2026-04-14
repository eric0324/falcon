"use client";

import type { StepType } from "@reactour/tour";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

function FinalStep({ setIsOpen }: { setIsOpen: (v: boolean) => void }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p>看完了！你已經知道首頁的基本操作。接下來可以去「對話」試試看用 AI 做工具或寫文件。</p>
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
            router.push("/chat?tour=1");
          }}
          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
        >
          探索對話頁
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export const marketplaceSteps: StepType[] = [
  {
    selector: "body",
    position: "center",
    highlightedSelectors: [],
    mutationObservables: [],
    content:
      "歡迎使用 Falcon！這是一個用自然語言就能做工具、寫文件、查資料的 AI 協作平台，做好的成果還能分享給夥伴一起用。讓我帶你逛一圈。",
    styles: {
      maskArea: (base) => ({ ...base, display: "none" }),
      maskWrapper: (base) => ({ ...base, color: "rgba(0,0,0,0.65)" }),
    },
  },
  {
    selector: '[data-tour="marketplace-tool-list"]',
    content:
      "在首頁你可以看到大家製作好的工具，直接點開就能使用，也可以自己做一個放上來。",
  },
  {
    selector: '[data-tour="marketplace-search"]',
    content: "想找特定工具？用關鍵字搜尋，或切換下方分類快速瀏覽。",
  },
  {
    selector: '[data-tour="marketplace-tool-card"]',
    content:
      "每張卡片就是一個工具，點下去就能直接使用。星等與使用次數可以幫你判斷好不好用，你也可以點進去看看夥伴給這個工具的評價。",
  },
  {
    selector: '[data-tour="marketplace-categories"]',
    content: "也可以從分類切入，快速找到你要的主題。",
  },
  {
    selector: '[data-tour="sidebar-nav-chat"]',
    content: "「對話」是跟 AI 聊天的主要入口，可以討論想法、請 AI 做工具、寫文件或查資料。",
  },
  {
    selector: '[data-tour="sidebar-nav-skills"]',
    content: "「技能」是 AI 的工作模式／角色，像是後端工程師、文案寫手、Eric 的講話方式。在對話時一鍵切換。",
  },
  {
    selector: '[data-tour="sidebar-nav-tools"]',
    content: "「工具」是你做過並發佈的工具清單，隨時能點開使用、編輯或分享給夥伴。",
  },
  {
    selector: '[data-tour="sidebar-nav-knowledge"]',
    content: "「知識庫」是餵給 AI 的參考資料，例如文件、規範、FAQ，讓 AI 回答更貼近你的情境。",
  },
  {
    selector: '[data-tour="sidebar-conversations"]',
    content: "這裡是你的對話紀錄，點任一則可以繼續之前的討論，也能加星號、改名、刪除。",
  },
  {
    selector: '[data-tour="sidebar-user-menu"]',
    content: "最下面點自己的頭像，可以切換主題、語言、查看更新紀錄或登出。",
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

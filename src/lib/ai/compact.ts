import { generateText } from "ai";
import { models } from "./models";

interface Message {
  role: string;
  content: unknown;
}

export interface CompactResult {
  summary: string;
  compactedMessages: Message[];
  originalCount: number;
  keptCount: number;
}

const DEFAULT_KEEP_COUNT = 6;

/**
 * 將 messages 分為「舊訊息」和「保留的最近訊息」。
 */
export function splitMessages(
  messages: Message[],
  keepCount: number = DEFAULT_KEEP_COUNT
): { oldMessages: Message[]; recentMessages: Message[] } {
  if (messages.length <= keepCount) {
    return { oldMessages: [], recentMessages: [...messages] };
  }

  const splitIndex = messages.length - keepCount;
  return {
    oldMessages: messages.slice(0, splitIndex),
    recentMessages: messages.slice(splitIndex),
  };
}

/**
 * 將舊訊息格式化為可讀的對話文字。
 */
function formatMessagesForSummary(messages: Message[]): string {
  return messages
    .map((m) => {
      const content =
        typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      const role = m.role === "user" ? "使用者" : "助手";
      return `${role}: ${content}`;
    })
    .join("\n\n");
}

const SUMMARY_PROMPT_PREFIX = `你是一個對話摘要助手。請將以下對話歷史壓縮成精簡摘要。

保留以下資訊：
1. 使用者的核心需求和目標
2. 已做出的重要決策和選擇
3. 目前程式碼的狀態摘要（如果有的話）
4. 關鍵的工具呼叫結果摘要
5. 未解決的問題或待辦事項

不需要保留：
- 逐字對話內容
- 完整的程式碼（只保留描述）
- 工具呼叫的原始資料（只保留結論）

輸出格式：使用精簡的條列式摘要，不超過 500 字。

---

對話歷史：

`;

/**
 * 執行 compact：摘要舊訊息，組合成新的 messages 陣列。
 */
export async function compactMessages(
  messages: Message[],
  keepCount: number = DEFAULT_KEEP_COUNT
): Promise<CompactResult> {
  const { oldMessages, recentMessages } = splitMessages(messages, keepCount);

  const conversationText = formatMessagesForSummary(oldMessages);

  const { text: summary } = await generateText({
    model: models["claude-haiku"],
    prompt: SUMMARY_PROMPT_PREFIX + conversationText,
  });

  const compactedMessages: Message[] = [
    {
      role: "user",
      content: `[以下是先前對話的摘要]\n\n${summary}\n\n[摘要結束，以下是最近的對話]`,
    },
    {
      role: "assistant",
      content: "好的，我已了解先前的對話脈絡。請繼續。",
    },
    ...recentMessages,
  ];

  return {
    summary,
    compactedMessages,
    originalCount: messages.length,
    keptCount: recentMessages.length,
  };
}

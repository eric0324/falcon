import { generateText } from "ai";
import { getModel } from "@/lib/ai/models";
import type { MemoryType } from "@prisma/client";

export const EXPLICIT_TRIGGERS = [
  // 中文
  "記起來",
  "記住",
  "記下",
  "以後都",
  "每次都",
  "我喜歡",
  "我討厭",
  "我在做",
  "我的部門是",
  "我的職位是",
  "我叫",
  // 英文
  "remember",
  "please remember",
  "always",
  "never",
  "i prefer",
  "i'm working on",
  "i am working on",
  "my department is",
  "my role is",
];

export interface MemoryDraft {
  type: MemoryType;
  title: string;
  content: string;
}

export function matchExplicitKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return EXPLICIT_TRIGGERS.some((kw) => lower.includes(kw.toLowerCase()));
}

const VALID_TYPES: MemoryType[] = ["PREFERENCE", "CONTEXT", "RULE", "FACT"];

const SYSTEM_PROMPT = `Extract one personal memory from the user's message. Reply with JSON ONLY (no prose):

{
  "type": "PREFERENCE" | "CONTEXT" | "RULE" | "FACT" | null,
  "title": "short summary <= 120 chars",
  "content": "normalized memory content for future recall"
}

Type definitions:
- PREFERENCE: aesthetic / style / UI / naming preferences
- CONTEXT: who the user is / what they're working on (department, role, current project)
- RULE: an explicit rule the user wants applied going forward (e.g. "always use Google Sheets")
- FACT: a one-time fact the user wants remembered

If the message has no clear personal memory worth storing, return { "type": null }.
The content field should rephrase the user's intent in 3rd-person factual form, not a transcript.`;

function tryParseJson(text: string): unknown {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function extractExplicit(
  text: string
): Promise<MemoryDraft | null> {
  if (!matchExplicitKeywords(text)) return null;

  try {
    const { text: result } = await generateText({
      model: await getModel("claude-haiku"),
      system: SYSTEM_PROMPT,
      prompt: text.slice(0, 2000),
      maxOutputTokens: 300,
    });

    const parsed = tryParseJson(result) as
      | { type?: string; title?: string; content?: string }
      | null;

    if (!parsed) return null;
    if (!parsed.type || !VALID_TYPES.includes(parsed.type as MemoryType))
      return null;
    if (!parsed.title || !parsed.content) return null;

    return {
      type: parsed.type as MemoryType,
      title: String(parsed.title).slice(0, 120),
      content: String(parsed.content),
    };
  } catch {
    return null;
  }
}

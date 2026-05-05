import { generateText } from "ai";
import { getModel } from "@/lib/ai/models";
import type { MemoryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/knowledge/embedding";

export interface RecentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CandidateDraft {
  type: MemoryType;
  title: string;
  content: string;
}

const MAX_CANDIDATES = 3;
const RECENT_TURNS = 6;
const DUPLICATE_DISTANCE = 0.1; // similarity > 0.9

const SYSTEM_PROMPT = `Analyze the recent conversation between a user and an AI assistant building internal tools.

Identify up to ${MAX_CANDIDATES} stable user memories worth carrying to future conversations. Skip transient task details, debugging steps, or one-off questions.

Reply with JSON ONLY (no prose):
{
  "candidates": [
    { "type": "PREFERENCE" | "CONTEXT" | "RULE" | "FACT", "title": "short summary <= 120 chars", "content": "factual 3rd-person rephrasing for future recall" }
  ]
}

Type guide:
- PREFERENCE: aesthetic / style / UI / naming taste
- CONTEXT: who the user is, what project they're working on
- RULE: an explicit rule the user wants applied going forward
- FACT: a one-time fact

If nothing clear is worth saving, return: { "candidates": [] }`;

const VALID_TYPES: MemoryType[] = ["PREFERENCE", "CONTEXT", "RULE", "FACT"];

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

export async function extractPassive(
  recentMessages: RecentMessage[],
  userId: string
): Promise<CandidateDraft[]> {
  if (recentMessages.length === 0) return [];

  const lastN = recentMessages.slice(-RECENT_TURNS);
  const context = lastN
    .map((m) => `${m.role}: ${m.content.slice(0, 1500)}`)
    .join("\n\n");

  let candidates: CandidateDraft[] = [];
  try {
    const { text } = await generateText({
      model: await getModel("claude-haiku"),
      system: SYSTEM_PROMPT,
      prompt: context,
      maxOutputTokens: 600,
    });

    const parsed = tryParseJson(text) as
      | { candidates?: Array<{ type?: string; title?: string; content?: string }> }
      | null;

    if (!parsed?.candidates || !Array.isArray(parsed.candidates)) return [];

    candidates = parsed.candidates
      .filter(
        (c) =>
          c.type !== undefined &&
          VALID_TYPES.includes(c.type as MemoryType) &&
          !!c.title &&
          !!c.content
      )
      .slice(0, MAX_CANDIDATES)
      .map((c) => ({
        type: c.type as MemoryType,
        title: String(c.title).slice(0, 120),
        content: String(c.content),
      }));
  } catch {
    return [];
  }

  if (candidates.length === 0) return [];

  const survivors: CandidateDraft[] = [];
  for (const c of candidates) {
    const dupe = await isDuplicateOfExistingMemory(c.content, userId);
    if (!dupe) survivors.push(c);
  }

  return survivors;
}

async function isDuplicateOfExistingMemory(
  content: string,
  userId: string
): Promise<boolean> {
  const embedding = await embedText(content);
  const vectorStr = `[${embedding.join(",")}]`;

  const matches = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `
    SELECT id
    FROM "Memory"
    WHERE "userId" = $2 AND embedding IS NOT NULL
      AND (embedding <=> $1::vector) < $3
    LIMIT 1
    `,
    vectorStr,
    userId,
    DUPLICATE_DISTANCE
  );

  return matches.length > 0;
}

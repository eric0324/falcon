import { matchExplicitKeywords, extractExplicit } from "./extract-explicit";
import { extractPassive, type RecentMessage } from "./extract-passive";
import { createMemory, countUserMemories } from "./store";
import { createSuggestedMemory } from "./suggested-store";
import { recallMemories } from "./recall";

export interface ExplicitMemoryEvent {
  id: string;
  type: string;
  title: string;
  isFirstMemory: boolean;
}

/**
 * Run explicit extraction in the background. Resolves with the created
 * memory's metadata if a memory was stored, or null otherwise. Never throws.
 */
export async function processExplicitMemory(
  message: string,
  userId: string
): Promise<ExplicitMemoryEvent | null> {
  if (!matchExplicitKeywords(message)) return null;

  try {
    const [draft, existingCount] = await Promise.all([
      extractExplicit(message),
      countUserMemories(userId),
    ]);

    if (!draft) return null;

    const memory = await createMemory(userId, {
      type: draft.type,
      title: draft.title,
      content: draft.content,
      source: "EXPLICIT",
      confidence: "HIGH",
    });

    return {
      id: memory.id,
      type: memory.type,
      title: memory.title,
      isFirstMemory: existingCount === 0,
    };
  } catch (e) {
    console.error("[Memory] processExplicitMemory failed:", e);
    return null;
  }
}

/**
 * Run passive extraction in the background and write any candidates to
 * SuggestedMemory. Never throws.
 */
export async function processPassiveMemory(
  recentMessages: RecentMessage[],
  userId: string,
  conversationId: string | null
): Promise<void> {
  try {
    const candidates = await extractPassive(recentMessages, userId);
    for (const c of candidates) {
      await createSuggestedMemory(userId, {
        type: c.type,
        title: c.title,
        content: c.content,
        conversationId: conversationId ?? null,
      });
    }
  } catch (e) {
    console.error("[Memory] processPassiveMemory failed:", e);
  }
}

/**
 * Recall relevant memories for the given user message. Never throws — returns
 * empty result on error so chat path keeps working.
 */
export async function safeRecall(
  message: string,
  userId: string
): Promise<{ promptText: string }> {
  try {
    const result = await recallMemories(message, userId);
    return { promptText: result.promptText };
  } catch (e) {
    console.error("[Memory] safeRecall failed:", e);
    return { promptText: "" };
  }
}

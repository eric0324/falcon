import { generateText } from "ai";
import { models } from "./models";

/**
 * Use AI to generate a short conversation title based on the user's first message.
 * The title language follows the user's input language.
 * Falls back to truncating the message if AI generation fails.
 */
export async function generateConversationTitle(content?: string): Promise<string> {
  if (!content?.trim()) return "New conversation";

  const trimmed = content.trim().slice(0, 50);

  const truncate = (s: string) => {
    const chars = [...s];
    return chars.length > 15 ? chars.slice(0, 15).join("") + "..." : s;
  };

  try {
    const { text } = await generateText({
      model: models["claude-haiku"],
      system:
        "Generate a very short conversation title (max 10 Chinese characters or 20 English characters). " +
        "Use the same language as the user's message. " +
        "Return ONLY the title, no quotes, no punctuation at the end.",
      prompt: trimmed,
      maxOutputTokens: 30,
    });
    return truncate(text.trim()) || truncate(trimmed);
  } catch {
    return truncate(trimmed);
  }
}

import { generateText } from "ai";
import { models } from "./models";

/**
 * Use AI to generate a short conversation title based on the user's first message.
 * The title language follows the user's input language.
 * Falls back to truncating the message if AI generation fails.
 */
export async function generateConversationTitle(content?: string): Promise<string> {
  if (!content?.trim()) return "New conversation";

  const fallback = content.trim().slice(0, 50);

  try {
    const { text } = await generateText({
      model: models["claude-haiku"],
      system:
        "Generate a short conversation title (max 30 characters). " +
        "Use the same language as the user's message. " +
        "Return ONLY the title, no quotes, no punctuation at the end.",
      prompt: content,
      maxOutputTokens: 40,
    });
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}

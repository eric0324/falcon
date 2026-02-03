export const TOOL_CATEGORIES = [
  { id: "productivity", nameKey: "categories.productivity", icon: "⚡" },
  { id: "data", nameKey: "categories.data", icon: "📊" },
  { id: "finance", nameKey: "categories.finance", icon: "💰" },
  { id: "hr", nameKey: "categories.hr", icon: "👥" },
  { id: "marketing", nameKey: "categories.marketing", icon: "📣" },
  { id: "design", nameKey: "categories.design", icon: "🎨" },
  { id: "other", nameKey: "categories.other", icon: "📦" },
] as const;

export type CategoryId = (typeof TOOL_CATEGORIES)[number]["id"];

export function getCategoryById(id: string) {
  return TOOL_CATEGORIES.find((c) => c.id === id);
}

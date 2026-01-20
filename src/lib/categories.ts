export const TOOL_CATEGORIES = [
  { id: "productivity", name: "生產力工具", icon: "⚡" },
  { id: "data", name: "數據分析", icon: "📊" },
  { id: "finance", name: "財務會計", icon: "💰" },
  { id: "hr", name: "人資管理", icon: "👥" },
  { id: "marketing", name: "行銷業務", icon: "📣" },
  { id: "design", name: "設計創意", icon: "🎨" },
  { id: "other", name: "其他", icon: "📦" },
] as const;

export type CategoryId = (typeof TOOL_CATEGORIES)[number]["id"];

export function getCategoryById(id: string) {
  return TOOL_CATEGORIES.find((c) => c.id === id);
}

export function getCategoryName(id: string) {
  return getCategoryById(id)?.name ?? id;
}

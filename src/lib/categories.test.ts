import { describe, it, expect } from "vitest";
import { getCategoryById, TOOL_CATEGORIES } from "./categories";

describe("getCategoryById", () => {
  it("finds an existing category", () => {
    const result = getCategoryById("productivity");
    expect(result).toEqual({ id: "productivity", nameKey: "categories.productivity", icon: "⚡" });
  });

  it("returns undefined for non-existent id", () => {
    const result = getCategoryById("nonexistent");
    expect(result).toBeUndefined();
  });

  it("finds all defined categories", () => {
    for (const cat of TOOL_CATEGORIES) {
      expect(getCategoryById(cat.id)).toEqual(cat);
    }
  });
});

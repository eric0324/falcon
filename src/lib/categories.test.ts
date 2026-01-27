import { describe, it, expect } from "vitest";
import { getCategoryById, getCategoryName, TOOL_CATEGORIES } from "./categories";

describe("getCategoryById", () => {
  it("finds an existing category", () => {
    const result = getCategoryById("productivity");
    expect(result).toEqual({ id: "productivity", name: "生產力工具", icon: "⚡" });
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

describe("getCategoryName", () => {
  it("returns correct name for existing id", () => {
    expect(getCategoryName("data")).toBe("數據分析");
    expect(getCategoryName("finance")).toBe("財務會計");
  });

  it("returns original id for non-existent id", () => {
    expect(getCategoryName("nonexistent")).toBe("nonexistent");
  });
});

import { describe, it, expect } from "vitest";
import { BASE_SYSTEM_PROMPT, buildSystemPromptText } from "./system-prompt";

describe("BASE_SYSTEM_PROMPT", () => {
  it("should identify as a Studio assistant, not just a tool generator", () => {
    expect(BASE_SYSTEM_PROMPT).toContain("Studio");
    // Should NOT position itself as only a tool generator
    expect(BASE_SYSTEM_PROMPT).not.toMatch(/^你是一個內部工具產生器助手/);
  });

  it("should support general conversation", () => {
    expect(BASE_SYSTEM_PROMPT).toContain("回答問題");
    expect(BASE_SYSTEM_PROMPT).toContain("分析資料");
  });

  it("should mention code generation as conditional, not mandatory", () => {
    // Code rules should be under a conditional section
    expect(BASE_SYSTEM_PROMPT).toMatch(/當.*(?:需要|要求|明確).*(?:UI|介面|工具|程式碼)/);
  });

  it("should list available tools", () => {
    expect(BASE_SYSTEM_PROMPT).toContain("listDataSources");
    expect(BASE_SYSTEM_PROMPT).toContain("getDataSourceSchema");
    expect(BASE_SYSTEM_PROMPT).toContain("querySampleData");
    expect(BASE_SYSTEM_PROMPT).toContain("updateCode");
  });

  it("should instruct to use updateCode tool for code submission", () => {
    expect(BASE_SYSTEM_PROMPT).toContain("updateCode");
  });

  it("should instruct to respond in Traditional Chinese", () => {
    expect(BASE_SYSTEM_PROMPT).toContain("繁體中文");
  });
});

describe("buildSystemPromptText", () => {
  it("should return base prompt when no data sources provided", () => {
    const result = buildSystemPromptText([]);
    expect(result).toBe(BASE_SYSTEM_PROMPT);
  });

  it("should return base prompt when data sources array is empty", () => {
    const result = buildSystemPromptText([]);
    expect(result).toBe(BASE_SYSTEM_PROMPT);
  });

  it("should append data source info when provided", () => {
    const dataSources = [
      {
        name: "db_main",
        displayName: "Main DB",
        type: "POSTGRES",
        schema: {
          tables: [
            { name: "users", columns: [{ name: "id", type: "int" }, { name: "email", type: "varchar" }] },
          ],
        },
      },
    ];

    const result = buildSystemPromptText(dataSources);
    expect(result).toContain(BASE_SYSTEM_PROMPT);
    expect(result).toContain("Main DB");
    expect(result).toContain("db_main");
    expect(result).toContain("POSTGRES");
    expect(result).toContain("users");
    expect(result).toContain("id");
    expect(result).toContain("email");
  });

  it("should handle data sources without schema", () => {
    const dataSources = [
      {
        name: "hr_api",
        displayName: "HR API",
        type: "REST_API",
        schema: null,
      },
    ];

    const result = buildSystemPromptText(dataSources);
    expect(result).toContain("HR API");
    expect(result).toContain("hr_api");
  });

  it("should handle multiple data sources", () => {
    const dataSources = [
      { name: "db1", displayName: "DB One", type: "POSTGRES", schema: null },
      { name: "db2", displayName: "DB Two", type: "MYSQL", schema: null },
    ];

    const result = buildSystemPromptText(dataSources);
    expect(result).toContain("DB One");
    expect(result).toContain("DB Two");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const generateTextMock = vi.hoisted(() => vi.fn());
const getModelMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({ generateText: generateTextMock }));
vi.mock("@/lib/ai/models", () => ({ getModel: getModelMock }));

import {
  matchExplicitKeywords,
  extractExplicit,
} from "./extract-explicit";

describe("matchExplicitKeywords", () => {
  it("matches 中文 trigger phrases", () => {
    expect(matchExplicitKeywords("記住我的部門是 HR Ops")).toBe(true);
    expect(matchExplicitKeywords("以後都用 Google Sheets")).toBe(true);
    expect(matchExplicitKeywords("我喜歡深色 UI")).toBe(true);
    expect(matchExplicitKeywords("我在做招募流程的工具")).toBe(true);
    expect(matchExplicitKeywords("我叫 Alex")).toBe(true);
  });

  it("matches 英文 trigger phrases (case-insensitive)", () => {
    expect(matchExplicitKeywords("Please remember I work in HR")).toBe(true);
    expect(matchExplicitKeywords("Always use the dark theme")).toBe(true);
    expect(matchExplicitKeywords("I prefer concise responses")).toBe(true);
    expect(matchExplicitKeywords("I'm working on onboarding flows")).toBe(true);
    expect(matchExplicitKeywords("My department is Marketing")).toBe(true);
  });

  it("does not match unrelated messages", () => {
    expect(matchExplicitKeywords("幫我寫一個 todo list")).toBe(false);
    expect(matchExplicitKeywords("Build a CSV exporter please")).toBe(false);
    expect(matchExplicitKeywords("這個 bug 怎麼修")).toBe(false);
    expect(matchExplicitKeywords("show me trending tools")).toBe(false);
    expect(matchExplicitKeywords("")).toBe(false);
  });
});

describe("extractExplicit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getModelMock.mockResolvedValue({});
  });

  it("returns null when no keyword matches (no LLM call)", async () => {
    const result = await extractExplicit("今天天氣如何");
    expect(result).toBeNull();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns parsed memory on valid LLM JSON", async () => {
    generateTextMock.mockResolvedValue({
      text: '{"type":"RULE","title":"Use Google Sheets","content":"使用者要求以後工具都用 Google Sheets 當資料來源"}',
    });

    const result = await extractExplicit("以後都用 Google Sheets 當資料來源");

    expect(result).toEqual({
      type: "RULE",
      title: "Use Google Sheets",
      content: "使用者要求以後工具都用 Google Sheets 當資料來源",
    });
  });

  it("returns null when LLM says type=null", async () => {
    generateTextMock.mockResolvedValue({ text: '{"type":null}' });
    expect(await extractExplicit("記住")).toBeNull();
  });

  it("returns null when LLM JSON missing required fields", async () => {
    generateTextMock.mockResolvedValue({
      text: '{"type":"FACT","title":"x"}',
    });
    expect(await extractExplicit("我的部門是 X")).toBeNull();
  });

  it("returns null when LLM type is invalid", async () => {
    generateTextMock.mockResolvedValue({
      text: '{"type":"NOPE","title":"x","content":"y"}',
    });
    expect(await extractExplicit("我喜歡 X")).toBeNull();
  });

  it("returns null when LLM throws", async () => {
    generateTextMock.mockRejectedValue(new Error("api down"));
    expect(await extractExplicit("以後都 X")).toBeNull();
  });

  it("tolerates LLM wrapping JSON in prose", async () => {
    generateTextMock.mockResolvedValue({
      text: 'Sure, here is the memory:\n{"type":"PREFERENCE","title":"Dark","content":"喜歡深色"}\nDone.',
    });
    const result = await extractExplicit("我喜歡深色");
    expect(result?.type).toBe("PREFERENCE");
  });

  it("truncates over-long title to 120 chars", async () => {
    const longTitle = "a".repeat(200);
    generateTextMock.mockResolvedValue({
      text: `{"type":"FACT","title":"${longTitle}","content":"c"}`,
    });
    const result = await extractExplicit("我叫 X");
    expect(result?.title.length).toBe(120);
  });
});

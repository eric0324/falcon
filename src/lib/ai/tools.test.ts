import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  tool: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

const mockApplyCodeUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/tool-snapshot", () => ({
  applyCodeUpdate: mockApplyCodeUpdate,
}));

import { createStudioTools } from "./tools";

type ExecuteOptions = Parameters<NonNullable<ReturnType<typeof createStudioTools>["updateCode"]["execute"]>>[1];
const noopOptions = {} as unknown as ExecuteOptions;

describe("updateCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyCodeUpdate.mockResolvedValue({ updated: true });
  });

  it("calls applyCodeUpdate when a draft tool already exists", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({ id: "tool-1" });

    const tools = createStudioTools("user-1", "conv-1");
    const result = await tools.updateCode.execute!(
      { code: "<div>new</div>", explanation: "adjust header" },
      noopOptions
    );

    expect(mockApplyCodeUpdate).toHaveBeenCalledWith(
      "tool-1",
      "<div>new</div>",
      "adjust header"
    );
    expect(result).toMatchObject({
      type: "code_update",
      code: "<div>new</div>",
      toolId: "tool-1",
    });
  });

  it("creates a new draft tool (no snapshot) when none exists for the conversation", async () => {
    prismaMock.tool.findUnique.mockResolvedValue(null);
    prismaMock.tool.create.mockResolvedValue({ id: "tool-new" });

    const tools = createStudioTools("user-1", "conv-1");
    await tools.updateCode.execute!(
      { code: "<div />", explanation: "init" },
      noopOptions
    );

    expect(prismaMock.tool.create).toHaveBeenCalled();
    expect(mockApplyCodeUpdate).not.toHaveBeenCalled();
  });
});

describe("editCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyCodeUpdate.mockResolvedValue({ updated: true });
  });

  it("returns error when no conversationId is bound", async () => {
    const tools = createStudioTools("user-1");
    const result = await tools.editCode.execute!(
      { find: "a", replace: "b", explanation: "x" },
      noopOptions
    );

    expect(result).toMatchObject({ type: "edit_code_error" });
    expect(mockApplyCodeUpdate).not.toHaveBeenCalled();
  });

  it("returns error when no draft tool exists for the conversation", async () => {
    prismaMock.tool.findUnique.mockResolvedValue(null);

    const tools = createStudioTools("user-1", "conv-1");
    const result = await tools.editCode.execute!(
      { find: "a", replace: "b", explanation: "x" },
      noopOptions
    );

    expect(result).toMatchObject({ type: "edit_code_error" });
    expect(mockApplyCodeUpdate).not.toHaveBeenCalled();
  });

  it("returns error when find string is not present", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "tool-1",
      code: "const hello = 1;",
    });

    const tools = createStudioTools("user-1", "conv-1");
    const result = await tools.editCode.execute!(
      { find: "nothing", replace: "!", explanation: "x" },
      noopOptions
    );

    expect(result).toMatchObject({ type: "edit_code_error" });
    expect((result as { reason: string }).reason).toMatch(/not found/i);
    expect(mockApplyCodeUpdate).not.toHaveBeenCalled();
  });

  it("returns error when find string occurs multiple times", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "tool-1",
      code: "foo foo",
    });

    const tools = createStudioTools("user-1", "conv-1");
    const result = await tools.editCode.execute!(
      { find: "foo", replace: "bar", explanation: "x" },
      noopOptions
    );

    expect(result).toMatchObject({ type: "edit_code_error" });
    expect((result as { reason: string }).reason).toMatch(/2 places/);
    expect(mockApplyCodeUpdate).not.toHaveBeenCalled();
  });

  it("replaces the unique match and calls applyCodeUpdate", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "tool-1",
      code: "const label = 'Hello';\nconst x = 1;",
    });

    const tools = createStudioTools("user-1", "conv-1");
    const result = await tools.editCode.execute!(
      {
        find: "const label = 'Hello';",
        replace: "const label = '你好';",
        explanation: "翻譯標題",
      },
      noopOptions
    );

    expect(mockApplyCodeUpdate).toHaveBeenCalledWith(
      "tool-1",
      "const label = '你好';\nconst x = 1;",
      "翻譯標題"
    );
    expect(result).toMatchObject({
      type: "code_update",
      code: "const label = '你好';\nconst x = 1;",
      toolId: "tool-1",
    });
  });

  it("wraps applyCodeUpdate errors as edit_code_error", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "tool-1",
      code: "hello",
    });
    mockApplyCodeUpdate.mockRejectedValue(new Error("DB down"));

    const tools = createStudioTools("user-1", "conv-1");
    const result = await tools.editCode.execute!(
      { find: "hello", replace: "world", explanation: "x" },
      noopOptions
    );

    expect(result).toMatchObject({ type: "edit_code_error", reason: "DB down" });
  });
});

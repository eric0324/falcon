import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  conversationMessage: {
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  conversation: {
    create: vi.fn(),
  },
  tokenUsage: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  getMessages,
  getMessageCount,
  replaceMessages,
  createConversationWithMessages,
  linkOrphanTokenUsage,
} from "./conversation-messages";

describe("conversation-messages", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getMessages", () => {
    it("returns messages sorted by orderIndex", async () => {
      prismaMock.conversationMessage.findMany.mockResolvedValue([
        {
          orderIndex: 0,
          role: "user",
          content: "hi",
          toolCalls: null,
          tokenUsages: [],
        },
        {
          orderIndex: 1,
          role: "assistant",
          content: "hello",
          toolCalls: null,
          tokenUsages: [
            { model: "gpt-4", inputTokens: 100, outputTokens: 50 },
          ],
        },
      ]);

      const result = await getMessages("conv-1");

      expect(prismaMock.conversationMessage.findMany).toHaveBeenCalledWith({
        where: { conversationId: "conv-1" },
        orderBy: { orderIndex: "asc" },
        include: { tokenUsages: true },
      });
      expect(result).toEqual([
        { role: "user", content: "hi" },
        {
          role: "assistant",
          content: "hello",
          tokenUsage: { model: "gpt-4", inputTokens: 100, outputTokens: 50 },
        },
      ]);
    });

    it("includes toolCalls when present", async () => {
      const toolCalls = [
        { id: "tc-1", name: "updateCode", args: {}, status: "completed" },
      ];
      prismaMock.conversationMessage.findMany.mockResolvedValue([
        {
          orderIndex: 0,
          role: "assistant",
          content: "done",
          toolCalls,
          tokenUsages: [],
        },
      ]);

      const result = await getMessages("conv-1");
      expect(result[0].toolCalls).toEqual(toolCalls);
    });

    it("returns empty array when no messages", async () => {
      prismaMock.conversationMessage.findMany.mockResolvedValue([]);
      const result = await getMessages("conv-1");
      expect(result).toEqual([]);
    });

    it("does not include tokenUsage for user messages", async () => {
      prismaMock.conversationMessage.findMany.mockResolvedValue([
        {
          orderIndex: 0,
          role: "user",
          content: "hi",
          toolCalls: null,
          tokenUsages: [],
        },
      ]);

      const result = await getMessages("conv-1");
      expect(result[0]).toEqual({ role: "user", content: "hi" });
      expect(result[0]).not.toHaveProperty("tokenUsage");
    });

    it("aggregates multiple tokenUsages into single tokenUsage", async () => {
      prismaMock.conversationMessage.findMany.mockResolvedValue([
        {
          orderIndex: 0,
          role: "assistant",
          content: "hello",
          toolCalls: null,
          tokenUsages: [
            { model: "gpt-4", inputTokens: 100, outputTokens: 50 },
            { model: "gpt-4", inputTokens: 200, outputTokens: 100 },
          ],
        },
      ]);

      const result = await getMessages("conv-1");
      expect(result[0].tokenUsage).toEqual({
        model: "gpt-4",
        inputTokens: 300,
        outputTokens: 150,
      });
    });
  });

  describe("getMessageCount", () => {
    it("returns count from prisma", async () => {
      prismaMock.conversationMessage.count.mockResolvedValue(5);
      const result = await getMessageCount("conv-1");
      expect(result).toBe(5);
      expect(prismaMock.conversationMessage.count).toHaveBeenCalledWith({
        where: { conversationId: "conv-1" },
      });
    });
  });

  describe("replaceMessages", () => {
    it("deletes old messages and creates new ones via interactive $transaction, returns assistant message IDs", async () => {
      const mockDeleteMany = vi.fn().mockResolvedValue({ count: 2 });
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 2 });
      const mockFindMany = vi.fn().mockResolvedValue([
        { id: "msg-new-2" },
      ]);

      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            conversationMessage: {
              deleteMany: mockDeleteMany,
              createMany: mockCreateMany,
              findMany: mockFindMany,
            },
          };
          return fn(tx);
        }
      );

      const messages = [
        { role: "user" as const, content: "hi" },
        { role: "assistant" as const, content: "hello" },
      ];

      const result = await replaceMessages("conv-1", messages);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { conversationId: "conv-1" },
      });
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          {
            conversationId: "conv-1",
            orderIndex: 0,
            role: "user",
            content: "hi",
            toolCalls: undefined,
          },
          {
            conversationId: "conv-1",
            orderIndex: 1,
            role: "assistant",
            content: "hello",
            toolCalls: undefined,
          },
        ],
      });
      expect(result).toEqual(["msg-new-2"]);
    });
  });

  describe("createConversationWithMessages", () => {
    it("creates conversation and messages in a transaction, returns { conversation, assistantMessageIds }", async () => {
      const mockConversation = { id: "conv-new", title: "Test" };
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            conversation: {
              create: vi.fn().mockResolvedValue(mockConversation),
            },
            conversationMessage: {
              createMany: vi.fn().mockResolvedValue({ count: 2 }),
              findMany: vi.fn().mockResolvedValue([{ id: "msg-2" }]),
            },
          };
          return fn(tx);
        }
      );

      const result = await createConversationWithMessages({
        title: "Test",
        model: "claude-sonnet",

        userId: "user-1",
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
        ],
      });

      expect(result).toEqual({
        conversation: mockConversation,
        assistantMessageIds: ["msg-2"],
      });
    });

    it("creates conversation without messages when array is empty", async () => {
      const mockConversation = { id: "conv-new", title: "Empty" };
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            conversation: {
              create: vi.fn().mockResolvedValue(mockConversation),
            },
            conversationMessage: {
              createMany: vi.fn(),
              findMany: vi.fn().mockResolvedValue([]),
            },
          };
          return fn(tx);
        }
      );

      const result = await createConversationWithMessages({
        title: "Empty",
        model: null,

        userId: "user-1",
        messages: [],
      });

      expect(result).toEqual({
        conversation: mockConversation,
        assistantMessageIds: [],
      });
    });
  });

  describe("linkOrphanTokenUsage", () => {
    it("calls tokenUsage.updateMany with conversationMessageId", async () => {
      prismaMock.tokenUsage.updateMany.mockResolvedValue({ count: 1 });

      await linkOrphanTokenUsage("user-1", "msg-2");

      expect(prismaMock.tokenUsage.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          conversationMessageId: null,
          createdAt: { gte: expect.any(Date) },
        },
        data: { conversationMessageId: "msg-2" },
      });
    });
  });
});

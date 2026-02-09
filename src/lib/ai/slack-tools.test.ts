import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/slack", () => ({
  isSlackConfigured: vi.fn(() => true),
  isSlackSearchConfigured: vi.fn(() => true),
  listChannels: vi.fn(),
  getChannelMessages: vi.fn(),
  getThreadReplies: vi.fn(),
  searchMessages: vi.fn(),
}));

import { createSlackTools } from "./slack-tools";
import {
  isSlackConfigured,
  isSlackSearchConfigured,
  listChannels,
  getChannelMessages,
  getThreadReplies,
  searchMessages,
} from "@/lib/integrations/slack";

const mockIsConfigured = vi.mocked(isSlackConfigured);
const mockIsSearchConfigured = vi.mocked(isSlackSearchConfigured);
const mockListChannels = vi.mocked(listChannels);
const mockGetMessages = vi.mocked(getChannelMessages);
const mockGetThread = vi.mocked(getThreadReplies);
const mockSearch = vi.mocked(searchMessages);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
  mockIsSearchConfigured.mockReturnValue(true);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeSlackTool(params: Record<string, unknown>): Promise<any> {
  const tools = createSlackTools();
  return tools.slackSearch.execute!(
    params as never,
    { toolCallId: "test", messages: [], abortSignal: undefined as never }
  );
}

describe("slackSearch tool", () => {
  describe("not configured", () => {
    it("returns error when Slack is not configured", async () => {
      mockIsConfigured.mockReturnValue(false);

      const result = await executeSlackTool({ action: "list" });

      expect(result.success).toBe(false);
      expect(result.needsConnection).toBe(true);
    });
  });

  describe("action: list", () => {
    it("lists public channels", async () => {
      mockListChannels.mockResolvedValueOnce([
        { id: "C001", name: "general", topic: "General", memberCount: 50 },
        { id: "C002", name: "random", topic: "", memberCount: 30 },
      ]);

      const result = await executeSlackTool({ action: "list" });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe("general");
      expect(result.rowCount).toBe(2);
    });
  });

  describe("action: read", () => {
    it("reads channel messages", async () => {
      mockGetMessages.mockResolvedValueOnce([
        { user: "Alice", text: "Hello", ts: "1700000000.000001", replyCount: 2 },
      ]);

      const result = await executeSlackTool({
        action: "read",
        channelId: "C001",
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user).toBe("Alice");
      expect(mockGetMessages).toHaveBeenCalledWith("C001", 10);
    });
  });

  describe("action: thread", () => {
    it("reads thread replies", async () => {
      mockGetThread.mockResolvedValueOnce([
        { user: "Alice", text: "Original", ts: "1700000000.000001" },
        { user: "Bob", text: "Reply", ts: "1700000000.000002" },
      ]);

      const result = await executeSlackTool({
        action: "thread",
        channelId: "C001",
        threadTs: "1700000000.000001",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockGetThread).toHaveBeenCalledWith("C001", "1700000000.000001");
    });
  });

  describe("action: search", () => {
    it("searches messages", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          channel: "general",
          user: "alice",
          text: "meeting notes",
          ts: "1700000000.000001",
          permalink: "https://slack.com/link",
        },
      ]);

      const result = await executeSlackTool({
        action: "search",
        search: "meeting",
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].channel).toBe("general");
      expect(mockSearch).toHaveBeenCalledWith("meeting", 20);
    });

    it("returns error when search is not configured", async () => {
      mockIsSearchConfigured.mockReturnValue(false);

      const result = await executeSlackTool({
        action: "search",
        search: "meeting",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("SLACK_USER_TOKEN");
    });
  });

  describe("default action", () => {
    it("defaults to list when no action specified", async () => {
      mockListChannels.mockResolvedValueOnce([]);

      const result = await executeSlackTool({});

      expect(result.success).toBe(true);
      expect(mockListChannels).toHaveBeenCalled();
    });
  });
});

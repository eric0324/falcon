import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Dynamic import to pick up env changes
async function importClient() {
  return import("./client");
}

describe("isSlackConfigured", () => {
  it("returns true when SLACK_BOT_TOKEN is set", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
    const { isSlackConfigured } = await importClient();
    expect(isSlackConfigured()).toBe(true);
  });

  it("returns false when SLACK_BOT_TOKEN is not set", async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const { isSlackConfigured } = await importClient();
    expect(isSlackConfigured()).toBe(false);
  });
});

describe("isSlackSearchConfigured", () => {
  it("returns true when SLACK_USER_TOKEN is set", async () => {
    process.env.SLACK_USER_TOKEN = "xoxp-test-token";
    const { isSlackSearchConfigured } = await importClient();
    expect(isSlackSearchConfigured()).toBe(true);
  });

  it("returns false when SLACK_USER_TOKEN is not set", async () => {
    delete process.env.SLACK_USER_TOKEN;
    const { isSlackSearchConfigured } = await importClient();
    expect(isSlackSearchConfigured()).toBe(false);
  });
});

// For the remaining tests, mock global fetch
describe("Slack API functions", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test-bot";
    process.env.SLACK_USER_TOKEN = "xoxp-test-user";
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listChannels", () => {
    it("returns list of public channels", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: [
            {
              id: "C001",
              name: "general",
              topic: { value: "General discussion" },
              num_members: 50,
            },
            {
              id: "C002",
              name: "random",
              topic: { value: "" },
              num_members: 45,
            },
          ],
          response_metadata: { next_cursor: "" },
        }),
      });

      const { listChannels } = await importClient();
      const result = await listChannels();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "C001",
        name: "general",
        topic: "General discussion",
        memberCount: 50,
      });
      expect(result[1]).toEqual({
        id: "C002",
        name: "random",
        topic: "",
        memberCount: 45,
      });

      // Verify correct API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("conversations.list"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer xoxb-test-bot",
          }),
        })
      );
    });
  });

  describe("getChannelMessages", () => {
    it("returns messages with user display names", async () => {
      // First call: conversations.history
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            {
              user: "U001",
              text: "Hello world",
              ts: "1700000000.000001",
              reply_count: 3,
            },
            {
              user: "U002",
              text: "Hi there",
              ts: "1700000000.000002",
            },
          ],
        }),
      });

      // Second call: users.info for U001
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: { profile: { display_name: "Alice", real_name: "Alice Chen" } },
        }),
      });

      // Third call: users.info for U002
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: { profile: { display_name: "", real_name: "Bob Wang" } },
        }),
      });

      const { getChannelMessages } = await importClient();
      const result = await getChannelMessages("C001", 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        user: "Alice",
        text: "Hello world",
        ts: "1700000000.000001",
        replyCount: 3,
      });
      expect(result[1]).toEqual({
        user: "Bob Wang",
        text: "Hi there",
        ts: "1700000000.000002",
        replyCount: 0,
      });
    });

    it("auto-joins channel on not_in_channel error then retries", async () => {
      // First call: not_in_channel error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, error: "not_in_channel" }),
      });

      // Second call: conversations.join
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // Third call: retry conversations.history (success)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { user: "U001", text: "Hello", ts: "1700000000.000001" },
          ],
        }),
      });

      // Fourth call: users.info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: { profile: { display_name: "Alice", real_name: "Alice" } },
        }),
      });

      const { getChannelMessages } = await importClient();
      const result = await getChannelMessages("C001", 10);

      expect(result).toHaveLength(1);
      expect(result[0].user).toBe("Alice");

      // Verify conversations.join was called
      const joinCall = mockFetch.mock.calls.find(
        (call) => (call[0] as string).includes("conversations.join")
      );
      expect(joinCall).toBeDefined();
    });
  });

  describe("getThreadReplies", () => {
    it("returns thread replies", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { user: "U001", text: "Original message", ts: "1700000000.000001" },
            { user: "U002", text: "Reply 1", ts: "1700000000.000002" },
          ],
        }),
      });

      // users.info calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: { profile: { display_name: "Alice", real_name: "Alice" } },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: { profile: { display_name: "Bob", real_name: "Bob" } },
        }),
      });

      const { getThreadReplies } = await importClient();
      const result = await getThreadReplies("C001", "1700000000.000001");

      expect(result).toHaveLength(2);
      expect(result[0].user).toBe("Alice");
      expect(result[1].user).toBe("Bob");
      expect(result[1].text).toBe("Reply 1");
    });
  });

  describe("searchMessages", () => {
    it("filters out private channel results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: {
            matches: [
              {
                channel: { id: "C001", name: "general", is_private: false },
                username: "alice",
                text: "public message about topic",
                ts: "1700000000.000001",
                permalink: "https://slack.com/archives/C001/p1700000000000001",
              },
              {
                channel: { id: "C002", name: "secret", is_private: true },
                username: "bob",
                text: "private message about topic",
                ts: "1700000000.000002",
                permalink: "https://slack.com/archives/C002/p1700000000000002",
              },
            ],
          },
        }),
      });

      const { searchMessages } = await importClient();
      const result = await searchMessages("topic", 20);

      // Only public channel result should be returned
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        channel: "general",
        user: "alice",
        text: "public message about topic",
        ts: "1700000000.000001",
        permalink: "https://slack.com/archives/C001/p1700000000000001",
      });

      // Should use User Token for search
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search.messages"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer xoxp-test-user",
          }),
        }),
      );
    });

    it("returns empty array when all results are from private channels", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: {
            matches: [
              {
                channel: { id: "C002", name: "secret", is_private: true },
                username: "bob",
                text: "private only",
                ts: "1700000000.000001",
                permalink: "https://slack.com/link",
              },
            ],
          },
        }),
      });

      const { searchMessages } = await importClient();
      const result = await searchMessages("private", 20);

      expect(result).toHaveLength(0);
    });
  });
});

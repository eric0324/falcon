import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock token manager
vi.mock("@/lib/google/token-manager", () => ({
  getValidAccessToken: vi.fn(),
}));

// Mock YouTube client
vi.mock("@/lib/integrations/youtube/client", () => ({
  searchVideos: vi.fn(),
  getChannelInfo: vi.fn(),
  getVideoDetails: vi.fn(),
  getVideoComments: vi.fn(),
  getVideoCaptions: vi.fn(),
  getPlaylistItems: vi.fn(),
  getAnalyticsReport: vi.fn(),
}));

import { createYouTubeTools } from "./youtube-tools";
import { getValidAccessToken } from "@/lib/google/token-manager";
import {
  searchVideos,
  getChannelInfo,
  getVideoDetails,
  getVideoComments,
  getPlaylistItems,
  getAnalyticsReport,
} from "@/lib/integrations/youtube/client";

const mockedGetToken = getValidAccessToken as ReturnType<typeof vi.fn>;
const mockedSearch = searchVideos as ReturnType<typeof vi.fn>;
const mockedChannel = getChannelInfo as ReturnType<typeof vi.fn>;
const mockedVideo = getVideoDetails as ReturnType<typeof vi.fn>;
const mockedComments = getVideoComments as ReturnType<typeof vi.fn>;
const mockedPlaylist = getPlaylistItems as ReturnType<typeof vi.fn>;
const mockedAnalytics = getAnalyticsReport as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createYouTubeTools", () => {
  it("returns an object with youtubeQuery tool", () => {
    const tools = createYouTubeTools("user-1");
    expect(tools.youtubeQuery).toBeDefined();
  });
});

describe("youtubeQuery tool", () => {
  const getExecute = () => {
    const tools = createYouTubeTools("user-1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tools.youtubeQuery.execute! as any;
  };

  it("returns error when YouTube is not connected", async () => {
    mockedGetToken.mockResolvedValue(null);
    const execute = getExecute();

    const result = await execute(
      { action: "search", query: "test" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("YouTube"),
      })
    );
  });

  it("searches videos when action is search", async () => {
    mockedGetToken.mockResolvedValue("token-123");
    mockedSearch.mockResolvedValue([
      {
        videoId: "v1",
        title: "Test",
        channelTitle: "Ch",
        publishedAt: "2025-01-01",
        description: "desc",
      },
    ]);

    const execute = getExecute();
    const result = await execute(
      { action: "search", query: "test", maxResults: 5 },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(mockedSearch).toHaveBeenCalledWith("token-123", "test", 5);
  });

  it("gets channel info when action is channel", async () => {
    mockedGetToken.mockResolvedValue("token-123");
    mockedChannel.mockResolvedValue({
      id: "UCxxx",
      title: "My Channel",
      description: "desc",
      subscriberCount: "1000",
      videoCount: "50",
      viewCount: "100000",
    });

    const execute = getExecute();
    const result = await execute(
      { action: "channel", channelId: "UCxxx" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result.success).toBe(true);
    expect(result.data.title).toBe("My Channel");
  });

  it("gets video details when action is video", async () => {
    mockedGetToken.mockResolvedValue("token-123");
    mockedVideo.mockResolvedValue({
      id: "v1",
      title: "Video",
      description: "desc",
      tags: [],
      publishedAt: "2025-01-01",
      channelTitle: "Ch",
      duration: "PT10M",
      viewCount: "5000",
      likeCount: "200",
      commentCount: "30",
    });

    const execute = getExecute();
    const result = await execute(
      { action: "video", videoId: "v1" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result.success).toBe(true);
    expect(result.data.viewCount).toBe("5000");
  });

  it("gets comments when action is comments", async () => {
    mockedGetToken.mockResolvedValue("token-123");
    mockedComments.mockResolvedValue([
      {
        author: "User1",
        text: "Nice!",
        likeCount: 5,
        replyCount: 0,
        publishedAt: "2025-01-01",
      },
    ]);

    const execute = getExecute();
    const result = await execute(
      { action: "comments", videoId: "v1" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("gets playlist items when action is playlist", async () => {
    mockedGetToken.mockResolvedValue("token-123");
    mockedPlaylist.mockResolvedValue([
      { videoId: "pv1", title: "PL Video", position: 0, publishedAt: "2025-01-01" },
    ]);

    const execute = getExecute();
    const result = await execute(
      { action: "playlist", playlistId: "PLxxx" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("gets analytics when action is analytics", async () => {
    mockedGetToken.mockResolvedValue("token-123");
    mockedAnalytics.mockResolvedValue({
      headers: ["day", "views"],
      rows: [["2025-06-01", 100]],
    });

    const execute = getExecute();
    const result = await execute(
      {
        action: "analytics",
        channelId: "UCxxx",
        startDate: "2025-06-01",
        endDate: "2025-06-30",
        metrics: ["views"],
        dimensions: ["day"],
      },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result.success).toBe(true);
    expect(result.data.rows).toHaveLength(1);
  });

  it("catches and returns errors gracefully", async () => {
    mockedGetToken.mockResolvedValue("token-123");
    mockedSearch.mockRejectedValue(new Error("quotaExceeded"));

    const execute = getExecute();
    const result = await execute(
      { action: "search", query: "test" },
      { toolCallId: "tc1", messages: [], abortSignal: undefined as never }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("quotaExceeded");
  });
});

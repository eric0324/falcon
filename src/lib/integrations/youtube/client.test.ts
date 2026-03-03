import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchVideos,
  getChannelInfo,
  getVideoDetails,
  getVideoComments,
  getPlaylistItems,
  getAnalyticsReport,
} from "./client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

function mockJsonResponse(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) };
}

function mockErrorResponse(status: number, message: string) {
  return {
    ok: false,
    statusText: "Bad Request",
    json: () => Promise.resolve({ error: { message } }),
  };
}

const TOKEN = "test-access-token";

describe("searchVideos", () => {
  it("returns formatted video list from search results", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        items: [
          {
            id: { videoId: "abc123" },
            snippet: {
              title: "Test Video",
              channelTitle: "Test Channel",
              publishedAt: "2025-01-01T00:00:00Z",
              description: "A test video",
            },
          },
        ],
      })
    );

    const result = await searchVideos(TOKEN, "test query", 5);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      videoId: "abc123",
      title: "Test Video",
      channelTitle: "Test Channel",
      publishedAt: "2025-01-01T00:00:00Z",
      description: "A test video",
    });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toBe("/youtube/v3/search");
    expect(url.searchParams.get("q")).toBe("test query");
    expect(url.searchParams.get("maxResults")).toBe("5");
    expect(url.searchParams.get("type")).toBe("video");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(403, "quotaExceeded")
    );

    await expect(searchVideos(TOKEN, "test")).rejects.toThrow("YouTube API error");
  });
});

describe("getChannelInfo", () => {
  it("returns formatted channel info", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        items: [
          {
            id: "UCxxx",
            snippet: {
              title: "My Channel",
              description: "Channel desc",
            },
            statistics: {
              subscriberCount: "1000",
              videoCount: "50",
              viewCount: "100000",
            },
          },
        ],
      })
    );

    const result = await getChannelInfo(TOKEN, "UCxxx");

    expect(result).toEqual({
      id: "UCxxx",
      title: "My Channel",
      description: "Channel desc",
      subscriberCount: "1000",
      videoCount: "50",
      viewCount: "100000",
    });
  });

  it("returns null when channel not found", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ items: [] }));

    const result = await getChannelInfo(TOKEN, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getVideoDetails", () => {
  it("returns formatted video details with statistics", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        items: [
          {
            id: "vid123",
            snippet: {
              title: "My Video",
              description: "Video desc",
              tags: ["tag1", "tag2"],
              publishedAt: "2025-06-01T00:00:00Z",
              channelTitle: "My Channel",
            },
            contentDetails: { duration: "PT10M30S" },
            statistics: {
              viewCount: "5000",
              likeCount: "200",
              commentCount: "30",
            },
          },
        ],
      })
    );

    const result = await getVideoDetails(TOKEN, "vid123");

    expect(result).toEqual({
      id: "vid123",
      title: "My Video",
      description: "Video desc",
      tags: ["tag1", "tag2"],
      publishedAt: "2025-06-01T00:00:00Z",
      channelTitle: "My Channel",
      duration: "PT10M30S",
      viewCount: "5000",
      likeCount: "200",
      commentCount: "30",
    });
  });

  it("returns null when video not found", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ items: [] }));

    const result = await getVideoDetails(TOKEN, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getVideoComments", () => {
  it("returns formatted comments list", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        items: [
          {
            snippet: {
              topLevelComment: {
                snippet: {
                  authorDisplayName: "User1",
                  textDisplay: "Great video!",
                  likeCount: 5,
                  publishedAt: "2025-06-02T00:00:00Z",
                },
              },
              totalReplyCount: 2,
            },
          },
        ],
      })
    );

    const result = await getVideoComments(TOKEN, "vid123", 10);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      author: "User1",
      text: "Great video!",
      likeCount: 5,
      replyCount: 2,
      publishedAt: "2025-06-02T00:00:00Z",
    });
  });
});

describe("getPlaylistItems", () => {
  it("returns formatted playlist items", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        items: [
          {
            snippet: {
              title: "Playlist Video 1",
              position: 0,
              resourceId: { videoId: "pv1" },
              publishedAt: "2025-03-01T00:00:00Z",
            },
          },
        ],
      })
    );

    const result = await getPlaylistItems(TOKEN, "PLxxx", 10);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      videoId: "pv1",
      title: "Playlist Video 1",
      position: 0,
      publishedAt: "2025-03-01T00:00:00Z",
    });
  });
});

describe("getAnalyticsReport", () => {
  it("returns formatted analytics rows", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        columnHeaders: [
          { name: "day", columnType: "DIMENSION" },
          { name: "views", columnType: "METRIC" },
          { name: "estimatedMinutesWatched", columnType: "METRIC" },
        ],
        rows: [
          ["2025-06-01", 100, 500],
          ["2025-06-02", 150, 750],
        ],
      })
    );

    const result = await getAnalyticsReport(TOKEN, "UCxxx", {
      startDate: "2025-06-01",
      endDate: "2025-06-02",
      metrics: ["views", "estimatedMinutesWatched"],
      dimensions: ["day"],
    });

    expect(result.headers).toEqual(["day", "views", "estimatedMinutesWatched"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(["2025-06-01", 100, 500]);
  });

  it("handles empty analytics response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        columnHeaders: [
          { name: "views", columnType: "METRIC" },
        ],
        rows: [],
      })
    );

    const result = await getAnalyticsReport(TOKEN, "UCxxx", {
      startDate: "2025-06-01",
      endDate: "2025-06-02",
      metrics: ["views"],
    });

    expect(result.rows).toHaveLength(0);
  });
});

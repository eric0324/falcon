const YT_DATA_BASE = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2";

// ===== Types =====

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  channelTitle: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeComment {
  author: string;
  text: string;
  likeCount: number;
  replyCount: number;
  publishedAt: string;
}

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  position: number;
  publishedAt: string;
}

export interface YouTubeAnalyticsResult {
  headers: string[];
  rows: (string | number)[][];
}

// ===== API Helper =====

async function ytFetch<T>(baseUrl: string, endpoint: string, params: Record<string, string>, accessToken: string): Promise<T> {
  const url = new URL(`${baseUrl}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`YouTube API error: ${error.error?.message || res.statusText}`);
  }

  return res.json();
}

// ===== API Functions =====

export async function searchVideos(
  accessToken: string,
  query: string,
  maxResults: number = 10
): Promise<YouTubeSearchResult[]> {
  const data = await ytFetch<{
    items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        publishedAt: string;
        description: string;
      };
    }>;
  }>(YT_DATA_BASE, "search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(maxResults),
  }, accessToken);

  return (data.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    description: item.snippet.description,
  }));
}

export async function getChannelInfo(
  accessToken: string,
  channelId: string
): Promise<YouTubeChannel | null> {
  const data = await ytFetch<{
    items: Array<{
      id: string;
      snippet: { title: string; description: string };
      statistics: { subscriberCount: string; videoCount: string; viewCount: string };
    }>;
  }>(YT_DATA_BASE, "channels", {
    part: "snippet,statistics",
    id: channelId,
  }, accessToken);

  const item = data.items?.[0];
  if (!item) return null;

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    subscriberCount: item.statistics.subscriberCount,
    videoCount: item.statistics.videoCount,
    viewCount: item.statistics.viewCount,
  };
}

export async function getVideoDetails(
  accessToken: string,
  videoId: string
): Promise<YouTubeVideo | null> {
  const data = await ytFetch<{
    items: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        tags?: string[];
        publishedAt: string;
        channelTitle: string;
      };
      contentDetails: { duration: string };
      statistics: { viewCount: string; likeCount: string; commentCount: string };
    }>;
  }>(YT_DATA_BASE, "videos", {
    part: "snippet,contentDetails,statistics",
    id: videoId,
  }, accessToken);

  const item = data.items?.[0];
  if (!item) return null;

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    tags: item.snippet.tags || [],
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    duration: item.contentDetails.duration,
    viewCount: item.statistics.viewCount,
    likeCount: item.statistics.likeCount,
    commentCount: item.statistics.commentCount,
  };
}

export async function getVideoComments(
  accessToken: string,
  videoId: string,
  maxResults: number = 20
): Promise<YouTubeComment[]> {
  const data = await ytFetch<{
    items: Array<{
      snippet: {
        topLevelComment: {
          snippet: {
            authorDisplayName: string;
            textDisplay: string;
            likeCount: number;
            publishedAt: string;
          };
        };
        totalReplyCount: number;
      };
    }>;
  }>(YT_DATA_BASE, "commentThreads", {
    part: "snippet",
    videoId,
    maxResults: String(maxResults),
    order: "relevance",
  }, accessToken);

  return (data.items || []).map((item) => ({
    author: item.snippet.topLevelComment.snippet.authorDisplayName,
    text: item.snippet.topLevelComment.snippet.textDisplay,
    likeCount: item.snippet.topLevelComment.snippet.likeCount,
    replyCount: item.snippet.totalReplyCount,
    publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
  }));
}

export async function getVideoCaptions(
  accessToken: string,
  videoId: string,
  language?: string
): Promise<string | null> {
  const data = await ytFetch<{
    items: Array<{
      id: string;
      snippet: { language: string; trackKind: string; name: string };
    }>;
  }>(YT_DATA_BASE, "captions", {
    part: "snippet",
    videoId,
  }, accessToken);

  if (!data.items || data.items.length === 0) return null;

  // Prefer manual captions in requested language, then any manual, then ASR
  const preferred = language || "zh-Hant";
  const sorted = [...data.items].sort((a, b) => {
    const aManual = a.snippet.trackKind !== "ASR" ? 1 : 0;
    const bManual = b.snippet.trackKind !== "ASR" ? 1 : 0;
    if (aManual !== bManual) return bManual - aManual;
    const aLang = a.snippet.language === preferred ? 1 : 0;
    const bLang = b.snippet.language === preferred ? 1 : 0;
    return bLang - aLang;
  });

  const captionId = sorted[0].id;

  const res = await fetch(
    `${YT_DATA_BASE}/captions/${captionId}?tfmt=srt`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;
  return res.text();
}

export async function getPlaylistItems(
  accessToken: string,
  playlistId: string,
  maxResults: number = 20
): Promise<YouTubePlaylistItem[]> {
  const data = await ytFetch<{
    items: Array<{
      snippet: {
        title: string;
        position: number;
        resourceId: { videoId: string };
        publishedAt: string;
      };
    }>;
  }>(YT_DATA_BASE, "playlistItems", {
    part: "snippet",
    playlistId,
    maxResults: String(maxResults),
  }, accessToken);

  return (data.items || []).map((item) => ({
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    position: item.snippet.position,
    publishedAt: item.snippet.publishedAt,
  }));
}

export async function getAnalyticsReport(
  accessToken: string,
  channelId: string,
  options: {
    startDate: string;
    endDate: string;
    metrics: string[];
    dimensions?: string[];
  }
): Promise<YouTubeAnalyticsResult> {
  const params: Record<string, string> = {
    ids: `channel==${channelId}`,
    startDate: options.startDate,
    endDate: options.endDate,
    metrics: options.metrics.join(","),
  };

  if (options.dimensions && options.dimensions.length > 0) {
    params.dimensions = options.dimensions.join(",");
  }

  const data = await ytFetch<{
    columnHeaders: Array<{ name: string; columnType: string }>;
    rows: (string | number)[][];
  }>(YT_ANALYTICS_BASE, "reports", params, accessToken);

  return {
    headers: (data.columnHeaders || []).map((h) => h.name),
    rows: data.rows || [],
  };
}

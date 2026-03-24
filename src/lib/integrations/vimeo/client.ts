const VIMEO_API_BASE = "https://api.vimeo.com";

// ===== Types =====

export interface VimeoVideo {
  uri: string;
  name: string;
  description: string | null;
  duration: number;
  createdTime: string;
  modifiedTime: string;
  privacy: string;
  plays: number;
  likes: number;
  comments: number;
  pictures: string | null;
  link: string;
}

export interface VimeoFolder {
  uri: string;
  name: string;
  videoCount: number;
  createdTime: string;
  modifiedTime: string;
}

export interface VimeoAnalyticsRow {
  [key: string]: string | number;
}

export interface VimeoAnalyticsResult {
  data: VimeoAnalyticsRow[];
  total: number;
}

// ===== Configuration =====

export function isVimeoConfigured(): boolean {
  return !!process.env.VIMEO_ACCESS_TOKEN;
}


function getAccessToken(): string {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) throw new Error("VIMEO_ACCESS_TOKEN is not set");
  return token;
}

let _cachedUserId: string | null = null;

async function resolveUserId(): Promise<string> {
  if (process.env.VIMEO_USER_ID) return process.env.VIMEO_USER_ID;
  if (_cachedUserId) return _cachedUserId;

  // Resolve /me to actual user ID (needed for analytics endpoint)
  const data = await vimeoFetch<{ uri: string }>("/me", { fields: "uri" });
  // uri format: "/users/12345678"
  _cachedUserId = data.uri;
  return _cachedUserId;
}

// ===== API Helper =====

async function vimeoFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${VIMEO_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let message = res.statusText;
    try {
      const json = JSON.parse(body);
      message = json.error || json.developer_message || message;
    } catch { /* use statusText */ }
    throw new Error(`Vimeo API error (${res.status}): ${message}`);
  }

  return res.json();
}

// ===== API Response Types =====

interface VimeoApiVideo {
  uri: string;
  name: string;
  description: string | null;
  duration: number;
  created_time: string;
  modified_time: string;
  privacy: { view: string };
  stats: { plays: number };
  metadata: {
    connections: {
      likes: { total: number };
      comments: { total: number };
    };
  };
  pictures?: { sizes?: { link: string }[] };
  link: string;
}

interface VimeoApiFolder {
  uri: string;
  name: string;
  metadata: {
    connections: {
      videos: { total: number };
    };
  };
  created_time: string;
  modified_time: string;
}

// ===== Mappers =====

function mapVideo(v: VimeoApiVideo): VimeoVideo {
  return {
    uri: v.uri,
    name: v.name,
    description: v.description,
    duration: v.duration,
    createdTime: v.created_time,
    modifiedTime: v.modified_time,
    privacy: v.privacy.view,
    plays: v.stats.plays,
    likes: v.metadata.connections.likes.total,
    comments: v.metadata.connections.comments.total,
    pictures: v.pictures?.sizes?.slice(-1)[0]?.link ?? null,
    link: v.link,
  };
}

function mapFolder(f: VimeoApiFolder): VimeoFolder {
  return {
    uri: f.uri,
    name: f.name,
    videoCount: f.metadata.connections.videos.total,
    createdTime: f.created_time,
    modifiedTime: f.modified_time,
  };
}

// ===== API Functions =====

export async function listVideos(maxResults: number = 25): Promise<VimeoVideo[]> {
  const userId = await resolveUserId();
  const data = await vimeoFetch<{ data: VimeoApiVideo[] }>(
    `${userId}/videos`,
    {
      per_page: String(Math.min(maxResults, 100)),
      sort: "date",
      direction: "desc",
      fields: "uri,name,description,duration,created_time,modified_time,privacy.view,stats.plays,metadata.connections.likes.total,metadata.connections.comments.total,pictures.sizes,link",
    }
  );
  return (data.data || []).map(mapVideo);
}

export async function getVideo(videoId: string): Promise<VimeoVideo | null> {
  try {
    const v = await vimeoFetch<VimeoApiVideo>(
      `/videos/${videoId}`,
      {
        fields: "uri,name,description,duration,created_time,modified_time,privacy.view,stats.plays,metadata.connections.likes.total,metadata.connections.comments.total,pictures.sizes,link",
      }
    );
    return mapVideo(v);
  } catch {
    return null;
  }
}

export async function listFolders(maxResults: number = 25): Promise<VimeoFolder[]> {
  const userId = await resolveUserId();
  const data = await vimeoFetch<{ data: VimeoApiFolder[] }>(
    `${userId}/projects`,
    {
      per_page: String(Math.min(maxResults, 100)),
      sort: "date",
      direction: "desc",
      fields: "uri,name,metadata.connections.videos.total,created_time,modified_time",
    }
  );
  return (data.data || []).map(mapFolder);
}

export async function getFolderVideos(folderId: string, maxResults: number = 25): Promise<VimeoVideo[]> {
  const userId = await resolveUserId();
  const data = await vimeoFetch<{ data: VimeoApiVideo[] }>(
    `${userId}/projects/${folderId}/videos`,
    {
      per_page: String(Math.min(maxResults, 100)),
      sort: "date",
      direction: "desc",
      fields: "uri,name,description,duration,created_time,modified_time,privacy.view,stats.plays,metadata.connections.likes.total,metadata.connections.comments.total,pictures.sizes,link",
    }
  );
  return (data.data || []).map(mapVideo);
}

export async function getAnalytics(options: {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimension?: string; // video, country, device_type, embed_domain, etc.
  metrics?: string[];
  videoUri?: string;
  folderUri?: string;
  timeInterval?: string; // day, week, month, year
}): Promise<VimeoAnalyticsResult> {
  // Vimeo Analytics API requires full ISO 8601 datetime format
  const fromDate = options.startDate.includes("T")
    ? options.startDate
    : `${options.startDate}T00:00:00+00:00`;
  const toDate = options.endDate.includes("T")
    ? options.endDate
    : `${options.endDate}T23:59:59+00:00`;

  const params: Record<string, string> = {
    from: fromDate,
    to: toDate,
    dimension: options.dimension || "total",
  };

  if (options.timeInterval) {
    params.time_interval = options.timeInterval;
  }
  if (options.videoUri) {
    params.filter_content = options.videoUri;
  }
  if (options.folderUri) {
    params.filter_content = options.folderUri;
  }

  // Analytics endpoint requires explicit /users/{id} path, /me doesn't work
  const userId = await resolveUserId();

  const data = await vimeoFetch<{ data: VimeoAnalyticsRow[]; total: number }>(
    `${userId}/analytics`,
    params
  );

  return {
    data: data.data || [],
    total: data.total || 0,
  };
}

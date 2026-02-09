const SLACK_API_BASE = "https://slack.com/api";

// ===== Types =====

export interface SlackChannel {
  id: string;
  name: string;
  topic: string;
  memberCount: number;
}

export interface SlackMessage {
  user: string;
  text: string;
  ts: string;
  replyCount: number;
}

export interface SlackThreadMessage {
  user: string;
  text: string;
  ts: string;
}

export interface SlackSearchResult {
  channel: string;
  user: string;
  text: string;
  ts: string;
  permalink: string;
}

// ===== Configuration =====

export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN;
}

export function isSlackSearchConfigured(): boolean {
  return !!process.env.SLACK_USER_TOKEN;
}

function getBotToken(): string {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not configured");
  return token;
}

function getUserToken(): string {
  const token = process.env.SLACK_USER_TOKEN;
  if (!token) throw new Error("SLACK_USER_TOKEN is not configured");
  return token;
}

// ===== API Helper =====

async function slackFetch<T>(
  method: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${SLACK_API_BASE}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    throw new Error(`Slack API HTTP error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || "unknown"}`);
  }

  return data as T;
}

// ===== User Name Cache =====

const userNameCache = new Map<string, string>();

export async function getUserName(userId: string): Promise<string> {
  if (userNameCache.has(userId)) {
    return userNameCache.get(userId)!;
  }

  try {
    const data = await slackFetch<{
      user: { profile: { display_name: string; real_name: string } };
    }>("users.info", getBotToken(), { user: userId });

    const name = data.user.profile.display_name || data.user.profile.real_name || userId;
    userNameCache.set(userId, name);
    return name;
  } catch {
    return userId;
  }
}

// Resolve user names for a list of messages
async function resolveUserNames<T extends { user: string }>(
  messages: T[]
): Promise<T[]> {
  const uniqueUserIds = Array.from(new Set(messages.map((m) => m.user)));
  await Promise.all(uniqueUserIds.map((id) => getUserName(id)));
  return messages.map((m) => ({
    ...m,
    user: userNameCache.get(m.user) || m.user,
  }));
}

// ===== Auto-Join =====

async function joinChannel(channelId: string): Promise<void> {
  await slackFetch("conversations.join", getBotToken(), { channel: channelId });
}

async function withAutoJoin<T>(channelId: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not_in_channel")) {
      await joinChannel(channelId);
      return fn();
    }
    throw error;
  }
}

// ===== API Functions =====

export async function listChannels(): Promise<SlackChannel[]> {
  const data = await slackFetch<{
    channels: Array<{
      id: string;
      name: string;
      topic: { value: string };
      num_members: number;
    }>;
  }>("conversations.list", getBotToken(), {
    types: "public_channel",
    exclude_archived: "true",
    limit: "200",
  });

  return data.channels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    topic: ch.topic?.value || "",
    memberCount: ch.num_members,
  }));
}

export async function getChannelMessages(
  channelId: string,
  limit: number = 20
): Promise<SlackMessage[]> {
  return withAutoJoin(channelId, async () => {
    const data = await slackFetch<{
      messages: Array<{
        user: string;
        text: string;
        ts: string;
        reply_count?: number;
      }>;
    }>("conversations.history", getBotToken(), {
      channel: channelId,
      limit: String(limit),
    });

    const messages = data.messages.map((m) => ({
      user: m.user,
      text: m.text,
      ts: m.ts,
      replyCount: m.reply_count || 0,
    }));

    return resolveUserNames(messages);
  });
}

export async function getThreadReplies(
  channelId: string,
  threadTs: string
): Promise<SlackThreadMessage[]> {
  return withAutoJoin(channelId, async () => {
    const data = await slackFetch<{
      messages: Array<{
        user: string;
        text: string;
        ts: string;
      }>;
    }>("conversations.replies", getBotToken(), {
      channel: channelId,
      ts: threadTs,
    });

    const messages = data.messages.map((m) => ({
      user: m.user,
      text: m.text,
      ts: m.ts,
    }));

    return resolveUserNames(messages);
  });
}

export async function searchMessages(
  query: string,
  limit: number = 20
): Promise<SlackSearchResult[]> {
  const data = await slackFetch<{
    messages: {
      matches: Array<{
        channel: { id: string; name: string; is_private: boolean };
        username: string;
        text: string;
        ts: string;
        permalink: string;
      }>;
    };
  }>("search.messages", getUserToken(), {
    query,
    count: String(limit),
  });

  // Filter: only public channels
  return data.messages.matches
    .filter((m) => !m.channel.is_private)
    .map((m) => ({
      channel: m.channel.name,
      user: m.username,
      text: m.text,
      ts: m.ts,
      permalink: m.permalink,
    }));
}

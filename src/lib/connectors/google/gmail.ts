import {
  ConnectorCapabilities,
  ListParams,
  OperationResult,
} from "../base";
import { GoogleBaseConnector } from "./base";

// Gmail API types
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
}

interface GmailMessagePayload {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { size: number; data?: string };
  parts?: GmailMessagePayload[];
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailThread {
  id: string;
  snippet?: string;
  historyId?: string;
  messages?: GmailMessage[];
}

interface GmailThreadListResponse {
  threads?: Array<{ id: string; snippet: string; historyId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export class GoogleGmailConnector extends GoogleBaseConnector {
  constructor(userId: string) {
    super({ userId, service: "GMAIL" });
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      canQuery: false,
      canList: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    };
  }

  /**
   * List and search emails in Gmail
   *
   * resource formats:
   * - "" or undefined: List recent messages
   * - "thread:threadId": Get thread with all messages
   * - "message:messageId": Get specific message
   *
   * filters:
   * - search: Gmail search query (e.g., "from:boss@company.com subject:meeting")
   * - label: Filter by label (e.g., "INBOX", "SENT", "UNREAD")
   */
  async list(params: ListParams): Promise<OperationResult> {
    const resource = params.resource || "";
    const { filters = {}, limit = 20 } = params;

    try {
      // Get specific thread
      if (resource.startsWith("thread:")) {
        const threadId = resource.replace("thread:", "");
        return await this.getThread(threadId);
      }

      // Get specific message
      if (resource.startsWith("message:")) {
        const messageId = resource.replace("message:", "");
        return await this.getMessage(messageId);
      }

      // List messages or threads
      return await this.listMessages(filters, limit);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Private helper methods

  private async listMessages(
    filters: Record<string, unknown>,
    limit: number
  ): Promise<OperationResult> {
    // Build query
    let query = "";

    if (filters.search) {
      query = String(filters.search);
    }

    if (filters.label) {
      query = query ? `${query} label:${filters.label}` : `label:${filters.label}`;
    }

    // Default to inbox if no query
    if (!query) {
      query = "in:inbox";
    }

    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(Math.min(limit, 100)));

    const listResult = await this.googleFetch<GmailListResponse>(url.toString());

    if (!listResult.messages || listResult.messages.length === 0) {
      return {
        success: true,
        data: [],
        rowCount: 0,
      };
    }

    // Fetch message details for each message
    const messages = await Promise.all(
      listResult.messages.slice(0, limit).map(async (msg) => {
        try {
          const detail = await this.googleFetch<GmailMessage>(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
          );
          return this.formatMessage(detail);
        } catch {
          return { id: msg.id, threadId: msg.threadId, error: "Failed to fetch details" };
        }
      })
    );

    return {
      success: true,
      data: messages,
      rowCount: messages.length,
    };
  }

  private async getMessage(messageId: string): Promise<OperationResult> {
    const message = await this.googleFetch<GmailMessage>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
    );

    return {
      success: true,
      data: this.formatMessage(message, true),
    };
  }

  private async getThread(threadId: string): Promise<OperationResult> {
    const thread = await this.googleFetch<GmailThread>(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
    );

    return {
      success: true,
      data: {
        id: thread.id,
        snippet: thread.snippet,
        messageCount: thread.messages?.length || 0,
        messages: thread.messages?.map((m) => this.formatMessage(m)) || [],
      },
    };
  }

  private formatMessage(message: GmailMessage, includeBody = false): Record<string, unknown> {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    const result: Record<string, unknown> = {
      id: message.id,
      threadId: message.threadId,
      snippet: message.snippet,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      labels: message.labelIds,
      isUnread: message.labelIds?.includes("UNREAD"),
    };

    if (includeBody) {
      result.body = this.extractBody(message.payload);
    }

    return result;
  }

  private extractBody(payload?: GmailMessagePayload): string {
    if (!payload) return "";

    // Direct body
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    // Check parts for text/plain or text/html
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }
      // Fallback to HTML if no plain text
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }
      // Recursive check
      for (const part of payload.parts) {
        const body = this.extractBody(part);
        if (body) return body;
      }
    }

    return "";
  }
}

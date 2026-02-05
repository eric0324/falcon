import { GoogleService } from "@prisma/client";
import {
  BaseConnector,
  ConnectorCapabilities,
  ListParams,
  MutateParams,
  OperationResult,
  QueryParams,
} from "../base";
import { getValidAccessToken } from "@/lib/google/token-manager";

export interface GoogleConnectorConfig {
  userId: string;
  service: GoogleService;
}

/**
 * Base class for all Google service connectors
 */
export abstract class GoogleBaseConnector implements BaseConnector {
  protected config: GoogleConnectorConfig;
  protected accessToken: string | null = null;
  protected connected: boolean = false;

  constructor(config: GoogleConnectorConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.accessToken = await getValidAccessToken(
      this.config.userId,
      this.config.service
    );

    if (!this.accessToken) {
      throw new Error(`No valid token for Google ${this.config.service}`);
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  abstract getCapabilities(): ConnectorCapabilities;

  // Default implementations that return "not supported"
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async query(params: QueryParams): Promise<OperationResult> {
    return { success: false, error: "Query not supported for Google services" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async list(params: ListParams): Promise<OperationResult> {
    return { success: false, error: "List not implemented" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(params: MutateParams): Promise<OperationResult> {
    return { success: false, error: "Create not implemented" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(params: MutateParams): Promise<OperationResult> {
    return { success: false, error: "Update not implemented" };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(params: MutateParams): Promise<OperationResult> {
    return { success: false, error: "Delete not implemented" };
  }

  /**
   * Helper method to make authenticated Google API requests
   */
  protected async googleFetch<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not connected. Call connect() first.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error (${response.status}): ${error}`);
    }

    return response.json();
  }
}

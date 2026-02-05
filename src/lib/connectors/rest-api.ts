import {
  BaseConnector,
  ConnectorCapabilities,
  QueryParams,
  ListParams,
  MutateParams,
  OperationResult,
  RestApiConfig,
  DataSourceConfig,
  // Legacy export
  RestApiConnector,
} from "./base";

export class RestConnector implements BaseConnector, RestApiConnector {
  private config: RestApiConfig;
  private allowedEndpoints: string[];
  private connected: boolean = false;

  constructor(config: DataSourceConfig) {
    const restConfig = config as RestApiConfig;
    this.config = restConfig;
    this.allowedEndpoints = restConfig.allowedEndpoints || [];
  }

  // ===== BaseConnector Implementation =====

  async connect(): Promise<void> {
    // REST API doesn't need persistent connection
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to make a simple request to the base URL
      const response = await fetch(this.config.baseUrl, {
        method: "HEAD",
        headers: this.config.headers,
      });
      return response.ok || response.status === 405; // 405 = Method Not Allowed is also acceptable
    } catch {
      return false;
    }
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      canQuery: false, // REST API doesn't support SQL
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  async query(_params: QueryParams): Promise<OperationResult> {
    return { success: false, error: "REST API does not support SQL queries" };
  }

  async list(params: ListParams): Promise<OperationResult> {
    const endpoint = params.resource || "";

    // Validate endpoint
    if (!this.validateEndpoint(endpoint)) {
      return { success: false, error: `Endpoint not allowed: ${endpoint}` };
    }

    try {
      // Build URL with filters/pagination
      const url = new URL(`${this.config.baseUrl}/${endpoint}`);
      if (params.limit) url.searchParams.set("limit", String(params.limit));
      if (params.offset) url.searchParams.set("offset", String(params.offset));
      if (params.filters) {
        for (const [key, value] of Object.entries(params.filters)) {
          url.searchParams.set(key, String(value));
        }
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API call failed: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        rowCount: Array.isArray(data) ? data.length : 1,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async create(params: MutateParams): Promise<OperationResult> {
    const endpoint = params.resource;

    if (!this.validateEndpoint(endpoint)) {
      return { success: false, error: `Endpoint not allowed: ${endpoint}` };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify(params.data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API call failed: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data, rowCount: 1 };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async update(params: MutateParams): Promise<OperationResult> {
    const endpoint = params.resource;

    if (!this.validateEndpoint(endpoint)) {
      return { success: false, error: `Endpoint not allowed: ${endpoint}` };
    }

    try {
      // Build URL with where clause as path or query params
      let url = `${this.config.baseUrl}/${endpoint}`;
      if (params.where?.id) {
        url = `${url}/${params.where.id}`;
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify(params.data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API call failed: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data, rowCount: 1 };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async delete(params: MutateParams): Promise<OperationResult> {
    const endpoint = params.resource;

    if (!this.validateEndpoint(endpoint)) {
      return { success: false, error: `Endpoint not allowed: ${endpoint}` };
    }

    try {
      let url = `${this.config.baseUrl}/${endpoint}`;
      if (params.where?.id) {
        url = `${url}/${params.where.id}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API call failed: ${response.status} ${errorText}`,
        };
      }

      return { success: true, rowCount: 1 };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ===== Legacy RestApiConnector Implementation =====

  validateEndpoint(endpoint: string): boolean {
    if (this.allowedEndpoints.length === 0) return true;
    return this.allowedEndpoints.some(
      (allowed) => endpoint === allowed || endpoint.startsWith(allowed + "/")
    );
  }

  async call(endpoint: string, data?: unknown): Promise<unknown> {
    // Validate endpoint
    if (!this.validateEndpoint(endpoint)) {
      throw new Error(`Endpoint not allowed: ${endpoint}`);
    }

    const url = `${this.config.baseUrl}/${endpoint}`;

    const response = await fetch(url, {
      method: data ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }
}

// Factory function for one-time API call
export async function executeRestApiCall(
  config: RestApiConfig,
  endpoint: string,
  data?: unknown,
  allowedEndpoints: string[] = []
): Promise<unknown> {
  const connector = new RestConnector({
    ...config,
    allowedEndpoints,
  });
  return connector.call(endpoint, data);
}

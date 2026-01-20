import { RestApiConfig, RestApiConnector } from "./base";

export class RestConnector implements RestApiConnector {
  private config: RestApiConfig;
  private allowedEndpoints: string[];

  constructor(config: RestApiConfig, allowedEndpoints: string[] = []) {
    this.config = config;
    this.allowedEndpoints = allowedEndpoints;
  }

  validateEndpoint(endpoint: string): boolean {
    if (this.allowedEndpoints.length === 0) return true;
    return this.allowedEndpoints.includes(endpoint);
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
  const connector = new RestConnector(config, allowedEndpoints);
  return connector.call(endpoint, data);
}

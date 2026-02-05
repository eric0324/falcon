import { BaseConnector, DataSourceConfig } from "./base";
import { DataSourceType } from "./types";

// Factory function type
type ConnectorFactory = (config: DataSourceConfig) => BaseConnector;

// Connector registry
const registry = new Map<DataSourceType, ConnectorFactory>();

/**
 * Register a connector factory for a data source type
 */
export function registerConnector(
  type: DataSourceType,
  factory: ConnectorFactory
): void {
  registry.set(type, factory);
}

/**
 * Create a connector instance for a data source type
 */
export function createConnector(
  type: DataSourceType,
  config: DataSourceConfig
): BaseConnector {
  const factory = registry.get(type);
  if (!factory) {
    throw new Error(`Unknown connector type: ${type}`);
  }
  return factory(config);
}

/**
 * Check if a connector type is registered
 */
export function hasConnector(type: DataSourceType): boolean {
  return registry.has(type);
}

/**
 * Get all registered connector types
 */
export function getRegisteredTypes(): DataSourceType[] {
  return Array.from(registry.keys());
}

// ===== Auto-register built-in connectors =====
// This is done lazily to avoid circular dependencies

let initialized = false;

export function initializeBuiltinConnectors(): void {
  if (initialized) return;
  initialized = true;

  // Import and register connectors
  // Note: These imports are dynamic to avoid circular dependencies
  import("./database/postgres").then(({ PostgresConnector }) => {
    registerConnector("POSTGRES", (config) => new PostgresConnector(config));
  });

  import("./database/mysql").then(({ MySQLConnector }) => {
    registerConnector("MYSQL", (config) => new MySQLConnector(config));
  });

  import("./rest-api").then(({ RestConnector }) => {
    registerConnector("REST_API", (config) => new RestConnector(config));
  });

  // Google connectors - these require userId from config
  import("./google/sheets").then(({ GoogleSheetsConnector }) => {
    registerConnector("GOOGLE_SHEETS", (config) => {
      const userId = (config as { userId: string }).userId;
      return new GoogleSheetsConnector(userId);
    });
  });

  import("./google/drive").then(({ GoogleDriveConnector }) => {
    registerConnector("GOOGLE_DRIVE", (config) => {
      const userId = (config as { userId: string }).userId;
      return new GoogleDriveConnector(userId);
    });
  });

  import("./google/calendar").then(({ GoogleCalendarConnector }) => {
    registerConnector("GOOGLE_CALENDAR", (config) => {
      const userId = (config as { userId: string }).userId;
      return new GoogleCalendarConnector(userId);
    });
  });
}

// Synchronous registration for connectors that are already imported
export function registerBuiltinConnectors(connectors: {
  PostgresConnector?: new (config: DataSourceConfig) => BaseConnector;
  MySQLConnector?: new (config: DataSourceConfig) => BaseConnector;
  RestConnector?: new (config: DataSourceConfig) => BaseConnector;
}): void {
  if (connectors.PostgresConnector) {
    registerConnector(
      "POSTGRES",
      (config) => new connectors.PostgresConnector!(config)
    );
  }
  if (connectors.MySQLConnector) {
    registerConnector(
      "MYSQL",
      (config) => new connectors.MySQLConnector!(config)
    );
  }
  if (connectors.RestConnector) {
    registerConnector(
      "REST_API",
      (config) => new connectors.RestConnector!(config)
    );
  }
}

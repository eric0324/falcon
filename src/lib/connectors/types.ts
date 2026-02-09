// ===== Authentication Types =====

export type AuthType = "connection_string" | "api_key" | "oauth";

// ===== Data Source Types =====
// Note: Prisma enum is the source of truth, this is for TypeScript usage
export type DataSourceType =
  // Database
  | "POSTGRES"
  | "MYSQL"
  | "MONGODB"
  // REST
  | "REST_API"
  // Google (future)
  | "GOOGLE_SHEETS"
  | "GOOGLE_DRIVE"
  | "GOOGLE_CALENDAR"
  | "GOOGLE_GMAIL"
  // SaaS (future)
  | "NOTION"
  | "SLACK"
  | "GITHUB";

// ===== Connector Capabilities =====

export interface ConnectorCapabilities {
  canQuery: boolean; // SQL-like query
  canList: boolean; // List items/tables
  canCreate: boolean; // Create data
  canUpdate: boolean; // Update data
  canDelete: boolean; // Delete data
}

// ===== Operation Parameters =====

export interface QueryParams {
  sql: string;
  params?: unknown[];
  timeout?: number;
  allowedTables?: string[];
  blockedColumns?: string[];
}

export interface ListParams {
  resource?: string; // table name, folder, etc.
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface MutateParams {
  resource: string;
  data: Record<string, unknown>;
  where?: Record<string, unknown>; // for update/delete
}

// ===== Operation Results =====

export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  rowCount?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

// ===== Schema Information =====

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface SchemaInfo {
  tables: TableInfo[];
}

// ===== Configuration Types =====

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface RestApiConfig {
  baseUrl: string;
  headers: Record<string, string>;
  allowedEndpoints?: string[];
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export interface GoogleConnectorConfig {
  userId: string;
}

export type DataSourceConfig = DatabaseConfig | RestApiConfig | OAuthConfig | GoogleConnectorConfig;

// ===== Permission Types =====

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  allowedTables?: string[];
  blockedColumns?: string[];
}

// ===== Manager Execute Params =====

export interface ExecuteParams {
  dataSourceId: string;
  operation: "query" | "list" | "create" | "update" | "delete";
  userId: string;
  department: string;
  toolId?: string;
  // Operation-specific params
  sql?: string;
  params?: unknown[];
  resource?: string;
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  timeout?: number;
}

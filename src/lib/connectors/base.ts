export interface ConnectorCapabilities {
  canQuery: boolean;
  canList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface OperationResult {
  success: boolean;
  error?: string;
  data?: unknown;
  rowCount?: number;
  metadata?: Record<string, unknown>;
}

export interface QueryParams {
  query: string;
  params?: Record<string, unknown>;
}

export interface ListParams {
  resource?: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

export interface MutateParams {
  resource: string;
  data: Record<string, unknown>;
}

export interface BaseConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  getCapabilities(): ConnectorCapabilities;
  query(params: QueryParams): Promise<OperationResult>;
  list(params: ListParams): Promise<OperationResult>;
  create(params: MutateParams): Promise<OperationResult>;
  update(params: MutateParams): Promise<OperationResult>;
  delete(params: MutateParams): Promise<OperationResult>;
}

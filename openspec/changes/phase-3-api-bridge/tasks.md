# Tasks: API Bridge

## 1. Database Schema
- [x] 1.1 Add DataSourceType enum (POSTGRES, MYSQL, REST_API)
- [x] 1.2 Create DataSource model
- [x] 1.3 Create DataSourcePermission model (department-level)
- [x] 1.4 Create ApiLog model
- [x] 1.5 Add allowedSources field to Tool model
- [x] 1.6 Add apiLogs relation to Tool and User models
- [x] 1.7 Run migration

## 2. CLI Script - Data Source Management
- [x] 2.1 Create scripts/datasource.ts with commander
- [x] 2.2 Implement `list` command
- [x] 2.3 Implement `add` command for database type (postgres, mysql)
- [x] 2.4 Implement `add` command for REST API type
- [x] 2.5 Implement `sync-schema` command (introspect DB tables)
- [x] 2.6 Implement `disable` / `enable` commands
- [x] 2.7 Implement `remove` command

## 3. CLI Script - Permission Management
- [x] 3.1 Implement `add-permission` command
- [x] 3.2 Implement `update-permission` command (add/remove tables)
- [x] 3.3 Implement `list-permissions` command
- [x] 3.4 Implement `remove-permission` command

## 4. Database Connector
- [x] 4.1 Create lib/connectors/base.ts (interface)
- [x] 4.2 Create lib/connectors/postgres.ts
- [x] 4.3 Create lib/connectors/mysql.ts
- [x] 4.4 Implement query execution with prepared statements
- [x] 4.5 Implement table whitelist validation (parse SQL for table names)
- [x] 4.6 Implement column filtering (remove blocked columns from results)
- [x] 4.7 Add query timeout handling

## 5. REST API Connector
- [x] 5.1 Create lib/connectors/rest-api.ts
- [x] 5.2 Implement endpoint whitelist validation
- [x] 5.3 Handle authentication headers from config

## 6. Permission Resolution
- [x] 6.1 Create lib/permissions.ts
- [x] 6.2 Implement department permission lookup (with "*" fallback)
- [x] 6.3 Implement table access check
- [x] 6.4 Implement column blocklist merging (global + department)

## 7. Sandbox API Client
- [x] 7.1 Create lib/sandbox-api-client.ts (code generator)
- [x] 7.2 Implement postMessage-based bridge (query, call, getSources)
- [x] 7.3 Add Promise wrapper with timeout
- [x] 7.4 Update preview-panel.tsx to inject client (replace MOCK_API)
- [x] 7.5 Update tool-runner.tsx to inject client

## 8. Parent Frame Handler
- [x] 8.1 Create hooks/use-api-bridge.ts
- [x] 8.2 Implement message listener and validation
- [x] 8.3 Route to backend /api/bridge
- [x] 8.4 Relay response back to sandbox
- [x] 8.5 Integrate into tool-runner.tsx
- [x] 8.6 Integrate into preview-panel.tsx

## 9. Backend API Bridge
- [x] 9.1 Create /api/bridge/route.ts
- [x] 9.2 Implement session validation
- [x] 9.3 Implement tool.allowedSources check
- [x] 9.4 Load DataSource and resolve department permission
- [x] 9.5 Route to appropriate connector (DB or REST)
- [x] 9.6 Create ApiLog entry for all requests
- [x] 9.7 Handle errors and return formatted responses

## 10. System Prompt Enhancement
- [x] 10.1 Update BASE_SYSTEM_PROMPT with new API format
- [ ] 10.2 Create lib/generate-datasource-prompt.ts (optional - for dynamic prompts)
- [ ] 10.3 Query active DataSources from DB (optional)
- [ ] 10.4 Filter schema based on user's department permission (optional)
- [ ] 10.5 Format for Claude context (tables, columns, examples) (optional)
- [ ] 10.6 Update studio API to include datasource prompt (optional)

## 11. Deploy Dialog Updates
- [x] 11.1 Create GET /api/datasources endpoint (list available sources)
- [x] 11.2 Create DataSourceSelector component (integrated in DeployDialog)
- [x] 11.3 Show checkboxes with descriptions
- [x] 11.4 Save selected sources on tool deploy
- [x] 11.5 Show current permissions when editing tool

## 12. Tool Detail Page Updates
- [x] 12.1 Display allowed data sources on detail page
- [x] 12.2 Show data source badges with type icons

## 13. Testing
- [ ] 13.1 Add test DataSource via CLI script
- [ ] 13.2 Add test permissions for different departments
- [ ] 13.3 Test query execution from sandbox
- [ ] 13.4 Test department permission enforcement
- [ ] 13.5 Test blocked column filtering
- [ ] 13.6 Test "*" default permission fallback
- [ ] 13.7 Verify ApiLog entries are created

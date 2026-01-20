# API Bridge Spec Delta

## ADDED Requirements

### Requirement: Data Source Registry
The system SHALL maintain a registry of available data sources (databases and APIs).

#### Scenario: List data sources via CLI
- WHEN admin runs `npx tsx scripts/datasource.ts list`
- THEN display all registered data sources with name, type, and status

#### Scenario: Add database source via CLI
- WHEN admin runs `npx tsx scripts/datasource.ts add --name db_main --type postgres ...`
- THEN create DataSource record with connection config and global blocked columns

#### Scenario: Add REST API source via CLI
- WHEN admin runs `npx tsx scripts/datasource.ts add --name hr_api --type rest_api ...`
- THEN create DataSource record with baseUrl, headers, and allowed endpoints

#### Scenario: Sync database schema
- WHEN admin runs `npx tsx scripts/datasource.ts sync-schema db_main`
- THEN introspect database tables and columns
- AND store schema in DataSource.schema for Claude context

### Requirement: Department-Based Permissions
The system SHALL enforce department-level access control for data sources.

#### Scenario: Add department permission
- WHEN admin runs `npx tsx scripts/datasource.ts add-permission --source db_main --department 客服 --read-tables users,orders`
- THEN create DataSourcePermission for that department
- AND set allowed tables and blocked columns

#### Scenario: Default permission fallback
- GIVEN a data source has permission for department "*"
- WHEN a user from department "工程" queries (no explicit permission)
- THEN use the "*" default permission

#### Scenario: No permission found
- GIVEN a data source has no permission for department "外包" and no "*" default
- WHEN a user from "外包" queries
- THEN reject with "No permission for your department"

### Requirement: Sandbox Communication
The system SHALL use postMessage for sandbox-to-parent communication.

#### Scenario: Database query from sandbox
- WHEN tool code calls `companyAPI.query('db_main', sql, params)`
- THEN a postMessage is sent to parent frame
- AND parent proxies to backend `/api/bridge`
- AND backend validates, executes query, filters columns, logs, and returns result

#### Scenario: REST API call from sandbox
- WHEN tool code calls `companyAPI.call('hr_api', 'getEmployees', data)`
- THEN a postMessage is sent to parent frame
- AND parent proxies to backend `/api/bridge`
- AND backend validates, calls endpoint, logs, and returns result

#### Scenario: API call timeout
- WHEN an API call does not receive a response within 30 seconds
- THEN the Promise rejects with a timeout error

### Requirement: Tool Data Source Authorization
The system MUST verify tools are authorized for requested data sources.

#### Scenario: Tool authorized for data source
- GIVEN a tool has `allowedSources: ["db_main"]`
- WHEN the tool calls `companyAPI.query('db_main', ...)`
- THEN the call is allowed

#### Scenario: Tool not authorized for data source
- GIVEN a tool has `allowedSources: ["db_main"]`
- WHEN the tool calls `companyAPI.query('db_analytics', ...)`
- THEN the call is rejected with "Tool not authorized for this data source"

### Requirement: Table Access Control
The system MUST enforce table-level access based on department permissions.

#### Scenario: Query allowed table
- GIVEN department "客服" has `readTables: ["users", "orders"]`
- WHEN a 客服 user queries `SELECT * FROM orders`
- THEN the query is executed

#### Scenario: Query blocked table
- GIVEN department "客服" has `readTables: ["users", "orders"]`
- WHEN a 客服 user queries `SELECT * FROM salaries`
- THEN the query is rejected with "Table 'salaries' not allowed for your department"

### Requirement: Column Filtering
The system MUST filter blocked columns from query results.

#### Scenario: Filter global blocked columns
- GIVEN DataSource has `globalBlockedColumns: ["password", "token"]`
- WHEN any user queries and result contains "password"
- THEN "password" column is removed from all rows

#### Scenario: Filter department blocked columns
- GIVEN department "行銷" has `readBlockedColumns: ["email", "phone"]`
- WHEN a 行銷 user queries users table
- THEN "email" and "phone" columns are removed from results

#### Scenario: Merge column blocklists
- GIVEN DataSource has `globalBlockedColumns: ["password"]`
- AND department "行銷" has `readBlockedColumns: ["email"]`
- WHEN a 行銷 user queries
- THEN both "password" and "email" are filtered

### Requirement: SQL Injection Prevention
The system MUST prevent SQL injection attacks.

#### Scenario: Use prepared statements
- WHEN executing a query with parameters
- THEN use prepared statements with parameterized queries
- AND never concatenate user input into SQL

### Requirement: API Audit Logging
The system MUST log all API bridge requests for audit purposes.

#### Scenario: Log successful query
- WHEN a database query succeeds
- THEN create ApiLog with: dataSourceId, toolId, userId, department, operation="query", query, success=true, rowCount, duration

#### Scenario: Log failed call
- WHEN an API call fails (permission denied, error, etc.)
- THEN create ApiLog with: dataSourceId, toolId, userId, department, operation, success=false, errorMessage

### Requirement: Data Source Selection on Deploy
The system SHALL allow tool authors to select required data sources during deployment.

#### Scenario: Select data sources on deploy
- WHEN a user deploys a tool
- THEN they can select from available data sources
- AND selected sources are saved to tool.allowedSources

#### Scenario: View tool data sources
- WHEN viewing a tool's details
- THEN display the list of data sources the tool uses with type icons

## MODIFIED Requirements

### Requirement: System Prompt Generation
The system SHALL dynamically generate Claude's system prompt with available data sources.

#### Scenario: Include data source info in prompt
- WHEN generating system prompt for tool creation
- THEN query active DataSources from database
- AND filter schema based on user's department permission
- AND include allowed tables, columns, and usage examples

#### Scenario: Exclude blocked columns from prompt
- GIVEN user is in department "行銷" with blocked columns ["email", "phone"]
- WHEN generating system prompt
- THEN do not show "email" and "phone" as available columns

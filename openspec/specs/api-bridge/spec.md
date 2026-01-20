# API Bridge Specification

## Purpose
Provide secure, permission-controlled access to internal company systems for generated tools.

## Requirements

### Requirement: API Registry
The system SHALL maintain a registry of available internal APIs.

#### Scenario: List available APIs
- WHEN the system prompt is generated
- THEN all registered APIs are listed with their signatures

#### Scenario: Unknown API call
- WHEN a tool calls an unregistered API
- THEN an error is returned: "API not found"

### Requirement: Permission Check
The system MUST verify permissions before executing API calls.

#### Scenario: User role check
- WHEN an API requires ADMIN role
- AND the user has MEMBER role
- THEN the call is rejected with "Permission denied"

#### Scenario: Tool authorization check
- WHEN a tool calls an API
- AND the API is not in the tool's allowedApis list
- THEN the call is rejected with "Tool not authorized"

### Requirement: Sandbox Communication
The system SHALL use postMessage for sandbox-to-parent communication.

#### Scenario: API call from sandbox
- WHEN tool code calls window.companyAPI.method()
- THEN a postMessage is sent to parent frame
- AND parent validates and proxies to real API
- AND response is sent back via postMessage

### Requirement: Request Logging
The system MUST log all API bridge requests for audit.

#### Scenario: Log API call
- WHEN an API call is made
- THEN log: timestamp, userId, toolId, apiName, success/failure

## API Registry

| API Name | Handler | Required Role | Description |
|----------|---------|---------------|-------------|
| expense:submit | expenseAPI.submit | MEMBER | Submit expense report |
| expense:getHistory | expenseAPI.getHistory | MEMBER | Get expense history |
| expense:approve | expenseAPI.approve | ADMIN | Approve expense |
| hr:getEmployees | hrAPI.getEmployees | MEMBER | List employees |
| hr:getDepartments | hrAPI.getDepartments | MEMBER | List departments |
| report:query | reportAPI.query | MEMBER | Query reports |

## Data Model

```prisma
model Permission {
  id            String   @id @default(cuid())
  tool          Tool     @relation(fields: [toolId], references: [id])
  toolId        String
  allowedApis   String[] // ["expense:submit", "hr:getEmployees"]
}
```

## Sandbox API Client

```javascript
// Injected into Sandpack environment
window.companyAPI = {
  expense: {
    submit: (data) => callBridge('expense:submit', data),
    getHistory: () => callBridge('expense:getHistory'),
  },
  hr: {
    getEmployees: () => callBridge('hr:getEmployees'),
    getDepartments: () => callBridge('hr:getDepartments'),
  },
  report: {
    query: (sql) => callBridge('report:query', { sql }),
  },
};

function callBridge(method, data) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    window.addEventListener('message', function handler(e) {
      if (e.data.id === id) {
        window.removeEventListener('message', handler);
        e.data.error ? reject(e.data.error) : resolve(e.data.result);
      }
    });
    parent.postMessage({ type: 'api', id, method, data }, '*');
  });
}
```

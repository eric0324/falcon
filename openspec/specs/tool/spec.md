# Tool Specification

## Purpose
Manage tools created by users through the Vibe Coding interface.
## Requirements
### Requirement: Tool Creation
The system SHALL allow users to create tools via natural language conversation with Claude.

#### Scenario: Create new tool
- WHEN a user describes a tool requirement in the Studio
- THEN Claude generates a React component
- AND the component is previewed in Sandpack

#### Scenario: Iterate on tool
- WHEN a user provides feedback on the preview
- THEN Claude updates the component code
- AND the preview refreshes automatically

### Requirement: Tool Storage
The system MUST persist tool code and metadata to database.

#### Scenario: Save tool
- WHEN a user clicks "Deploy"
- THEN the tool code, name, and description are saved
- AND a unique URL is generated

#### Scenario: Update tool
- WHEN a user modifies an existing tool
- THEN the code is updated with a new timestamp

### Requirement: Tool Visibility
The system SHALL support four visibility levels for tools.

#### Scenario: Private tool (unchanged)
- WHEN visibility is PRIVATE
- THEN only the author can access the tool

#### Scenario: Department tool (NEW)
- WHEN visibility is DEPARTMENT
- THEN only users in the same department as the author can access

#### Scenario: Company tool (NEW)
- WHEN visibility is COMPANY
- THEN all authenticated users can access

#### Scenario: Public tool (NEW)
- WHEN visibility is PUBLIC
- THEN anyone (including unauthenticated visitors) can access

### Requirement: Tool Execution
The system SHALL execute tools in a sandboxed environment.

#### Scenario: Run tool
- WHEN a user opens a deployed tool
- THEN the React component renders in an isolated sandbox
- AND internal APIs are available via window.companyAPI

### Requirement: Tool Categorization
The system SHALL support categorizing tools.

#### Scenario: Assign category
- WHEN a user deploys a tool
- THEN they can select a category from predefined list
- AND optionally add tags

#### Scenario: Filter by category
- WHEN browsing marketplace
- THEN tools can be filtered by category

### Requirement: Tool Tags
The system SHALL support tagging tools with keywords.

#### Scenario: Add tags
- WHEN deploying a tool
- THEN user can add up to 5 tags

#### Scenario: Search by tags
- WHEN searching in marketplace
- THEN tags are included in search matching

## Data Model

```prisma
model Tool {
  id            String       @id @default(cuid())
  name          String
  description   String?
  code          String       @db.Text
  visibility    Visibility   @default(PRIVATE)
  category      String?
  tags          String[]
  
  author        User         @relation(fields: [authorId], references: [id])
  authorId      String
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

enum Visibility {
  PRIVATE
  DEPARTMENT
  COMPANY
  PUBLIC
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tools | List tools (filtered by visibility) |
| POST | /api/tools | Create new tool |
| GET | /api/tools/:id | Get tool by ID |
| PATCH | /api/tools/:id | Update tool |
| DELETE | /api/tools/:id | Delete tool |

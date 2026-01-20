# Delta for Tool Specification

## MODIFIED Requirements

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

## ADDED Requirements

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

## MODIFIED Data Model

```prisma
model Tool {
  id            String       @id @default(cuid())
  name          String
  description   String?
  code          String       @db.Text
  visibility    Visibility   @default(PRIVATE)
  category      String?      // NEW: 財務, 人事, 數據, etc.
  tags          String[]     // NEW: keyword tags
  
  author        User         @relation(fields: [authorId], references: [id])
  authorId      String
  
  // NEW: Relations for marketplace
  reviews       Review[]
  usages        ToolUsage[]
  stats         ToolStats?
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

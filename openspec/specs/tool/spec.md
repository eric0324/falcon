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

#### Scenario: Private tool
- WHEN visibility is PRIVATE
- THEN only the author can access the tool

#### Scenario: Department tool
- WHEN visibility is DEPARTMENT
- THEN only users in the same department can access

#### Scenario: Company tool
- WHEN visibility is COMPANY
- THEN all authenticated users can access

#### Scenario: Public tool
- WHEN visibility is PUBLIC
- THEN anyone (including unauthenticated visitors) can access

### Requirement: Tool Execution
The system SHALL execute tools in a sandboxed environment.

#### Scenario: Run tool
- WHEN a user opens a deployed tool
- THEN the React component renders in an isolated sandbox
- AND internal APIs are available via window.companyAPI

### Requirement: 程式碼版本快照
The system SHALL automatically snapshot a tool's code before each update made via AI tools, and retain the most recent 20 snapshots per tool.

#### Scenario: 更新時快照舊 code
- GIVEN a tool with existing `code`
- WHEN either `updateCode` or `editCode` tool runs and produces a new `code` different from the current value
- THEN the current `code` is written to `ToolCodeSnapshot` with the update's `explanation`
- AND the tool's `code` is updated to the new value
- AND both operations happen in a single transaction

#### Scenario: 相同 code 不產生重複快照
- GIVEN a tool with existing `code`
- WHEN an update is requested with the **same** `code`
- THEN no new `ToolCodeSnapshot` is created
- AND the tool's `code` remains unchanged

#### Scenario: 超過保留上限自動清舊
- GIVEN a tool already has 20 snapshots
- WHEN a new snapshot is written
- THEN the oldest snapshot is removed so that exactly 20 remain
- AND the cleanup happens in the same transaction as the write

#### Scenario: 工具刪除時快照一併刪除
- GIVEN a tool has `ToolCodeSnapshot` rows
- WHEN the tool is deleted
- THEN all related snapshots are removed (ON DELETE CASCADE)

### Requirement: 版本歷史檢視與還原
The system SHALL allow tool authors to browse snapshots and restore the tool to any retained snapshot.

#### Scenario: 列出版本歷史
- GIVEN a logged-in user who is the author of the tool
- WHEN GET `/api/tools/[id]/snapshots`
- THEN the response contains up to 20 snapshots with `{ id, explanation, createdAt }` sorted by `createdAt` descending
- AND the full `code` field is NOT returned in the list response

#### Scenario: 非作者無法存取
- GIVEN a logged-in user who does not own the tool
- WHEN GET `/api/tools/[id]/snapshots`
- THEN the response is 403

#### Scenario: 還原至歷史版本
- GIVEN tool `T` has snapshot `S` with `code = X`
- AND the current `T.code = Y` (X ≠ Y)
- WHEN POST `/api/tools/[id]/snapshots/[snapshotId]/restore`
- THEN the current code `Y` is snapshotted first
- AND `T.code` is set to `X`
- AND the response is the updated tool

#### Scenario: 還原動作本身也可被還原
- GIVEN the user restored the tool once
- WHEN they list snapshots again
- THEN the code that existed just before the restore appears as a new snapshot
- AND it can be restored too

### Requirement: Tool Image Assets — Deploy-time Promotion

When a tool is deployed or updated via `POST /api/tools`, the system SHALL scan the submitted `code` for s3 keys belonging to the author's personal namespace and copy each one to a tool-scoped namespace, rewriting the code to point at the new location. This is the sole mechanism by which images become "tool assets" — there is no separate asset upload action.

#### Scenario: First deploy promotes author-owned image keys

- GIVEN a chat in which the author dragged `logo.png` into the conversation, which lives at `images/<authorId>/abc.png`
- AND the AI wrote tool code containing the literal string `"images/<authorId>/abc.png"`
- WHEN the author POSTs `/api/tools` to deploy the tool
- THEN before writing `Tool.code`, the server pre-generates the toolId
- AND finds the key `images/<authorId>/abc.png` in the code
- AND copies it (S3 `CopyObject`) to `tools/<toolId>/images/abc.png`
- AND rewrites every occurrence in the code string from `images/<authorId>/abc.png` to `tools/<toolId>/images/abc.png`
- AND persists the rewritten code into `Tool.code`

#### Scenario: Update deploy promotes only newly-referenced images

- GIVEN an existing tool whose code already references `tools/<toolId>/images/abc.png`
- AND the author adds a new image at `images/<authorId>/xyz.png` referenced in the updated code
- WHEN the author POSTs `/api/tools` again
- THEN `tools/<toolId>/images/abc.png` is left untouched (already promoted)
- AND `images/<authorId>/xyz.png` is copied to `tools/<toolId>/images/xyz.png`
- AND the new code is rewritten accordingly

#### Scenario: Idempotent re-deploy

- GIVEN a tool whose code references only `tools/<toolId>/...` keys
- WHEN the author POSTs `/api/tools` with the same code
- THEN no S3 copies happen
- AND the code is persisted unchanged

#### Scenario: Cross-user keys are not promoted

- GIVEN the submitted code contains a string matching `images/<other-userId>/foo.png` where `other-userId !== author.id`
- WHEN the deploy scan runs
- THEN that key is NOT copied
- AND the code is NOT rewritten for that key
- AND deploy completes successfully (the bridge will later reject any runtime read of that key on its own ownership check)

#### Scenario: Pre-generated toolId is used for the create

- GIVEN this is the first deploy (no existing tool with that conversationId)
- WHEN the server promotes assets before insert
- THEN the `Tool` row is created with the same `id` used to build the `tools/<id>/...` paths
- AND there is no intermediate state where the tool row exists but the code still references the author's namespace

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

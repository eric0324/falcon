# admin-conversations Specification

## Purpose
TBD - created by archiving change add-admin-conversations. Update Purpose after archive.
## Requirements
### Requirement: Admin Conversation List

The system SHALL provide `/admin/conversations`, a server-rendered page listing all conversations across the platform, with search, filters, pagination, and per-conversation metrics (messages, token usage, estimated cost, deploy status, starred, deleted state).

#### Scenario: Default listing

- GIVEN an admin opens `/admin/conversations`
- WHEN the page renders
- THEN conversations from all users appear, sorted by `updatedAt` descending
- AND up to 20 rows are shown per page
- AND each row displays title, user (name + email + avatar), model, message count, total tokens, estimated cost, starred icon, deploy-tool link if any, and delete badge if soft-deleted

#### Scenario: Search by title or user

- GIVEN `/admin/conversations?q=design`
- WHEN the page renders
- THEN only conversations whose `title` OR whose user's `name` / `email` contains "design" (case-insensitive) appear

#### Scenario: Starred filter

- GIVEN `?starred=true` is set
- WHEN the page renders
- THEN only `starred = true` conversations appear
- AND `?starred=false` shows only non-starred
- AND no value means both

#### Scenario: User filter

- GIVEN `?userId=<id>`
- WHEN the page renders
- THEN only that user's conversations appear

#### Scenario: Model filter

- GIVEN `?model=claude-opus-47`
- WHEN the page renders
- THEN only conversations with `model = "claude-opus-47"` appear

#### Scenario: Deleted filter

- GIVEN `?deleted=only`
- WHEN the page renders
- THEN only conversations with `deletedAt IS NOT NULL` appear
- AND `?deleted=hide` excludes soft-deleted conversations
- AND no value shows both (default)

#### Scenario: Filters combine with AND

- GIVEN multiple filters and a search are set simultaneously
- WHEN the page renders
- THEN the rows match ALL conditions (AND)

#### Scenario: Pagination preserves search and filters

- GIVEN any combination of `q`, `starred`, `userId`, `model`, `deleted`
- WHEN the user clicks the next-page link
- THEN the next URL preserves all params

### Requirement: Admin Conversation Viewer

The system SHALL provide `/admin/conversations/[id]`, a read-only page showing one conversation's metadata and full message history.

#### Scenario: Existing conversation

- GIVEN a valid conversation id owned by some user
- WHEN the admin visits `/admin/conversations/<id>`
- THEN a header shows: user info, model, created/updated times, total messages, total tokens, estimated cost, deploy tool link if any
- AND the message list shows every message in order (user / assistant / tool)
- AND there is no input box or edit / delete controls

#### Scenario: Missing conversation

- GIVEN an id that does not exist
- WHEN the admin visits the page
- THEN the page returns 404

#### Scenario: Tool call rendering

- GIVEN an assistant message that included tool calls
- WHEN the viewer renders
- THEN each tool call appears as a labelled row showing the tool name and (optionally truncated) params / result
- AND adjacent assistant text is shown after the tool calls

### Requirement: Sidebar Navigation

The admin sidebar SHALL include a link to `/admin/conversations` so admins can reach the conversation list from any admin page.

#### Scenario: Sidebar shows entry

- GIVEN any admin page is open
- WHEN the sidebar renders
- THEN there is an item labelled "對話管理" with an icon, pointing to `/admin/conversations`
- AND the item is highlighted when the current path starts with `/admin/conversations`


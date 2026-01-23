# Tasks: Tool CRUD Operations

## 1. Tool API Routes
- [x] 1.1 Create tools API route (`src/app/api/tools/route.ts`)
  - GET: List user's tools
  - POST: Create new tool
- [x] 1.2 Create single tool API route (`src/app/api/tools/[id]/route.ts`)
  - GET: Get tool by ID
  - PATCH: Update tool
  - DELETE: Delete tool
- [x] 1.3 Add authorization checks (user owns tool)
- [x] 1.4 Validate request body with zod

## 2. Deploy Dialog
- [x] 2.1 Create DeployDialog component (`src/components/deploy-dialog.tsx`)
- [x] 2.2 Add form fields:
  - Tool name (required)
  - Description (optional)
- [x] 2.3 Add deploy button to studio header
- [x] 2.4 Implement deploy submission
- [x] 2.5 Show success toast and redirect

## 3. Homepage Tool List
- [x] 3.1 Create homepage (`src/app/(dashboard)/page.tsx`)
- [x] 3.2 Fetch user's tools from API
- [x] 3.3 Create ToolCard component
- [x] 3.4 Display tool grid with cards
- [x] 3.5 Add "Create New Tool" card/button
- [x] 3.6 Show empty state for no tools

## 4. Tool Card
- [x] 4.1 Display tool name and description
- [x] 4.2 Show created/updated date
- [x] 4.3 Add dropdown menu with actions:
  - Open (go to tool page)
  - Edit (go to studio with tool)
  - Delete
- [x] 4.4 Add hover effect and click handler

## 5. Edit Tool Flow
- [x] 5.1 Add edit route (`/studio?edit=xxx`)
- [x] 5.2 Load existing tool data into studio
- [x] 5.3 Pre-populate conversation history
- [x] 5.4 Pre-populate code in preview
- [x] 5.5 Change "Deploy" to "Update" when editing
- [x] 5.6 Implement update API call

## 6. Delete Tool
- [x] 6.1 Create delete confirmation in DeployDialog
- [x] 6.2 Show confirmation with tool name
- [x] 6.3 Call DELETE API on confirm
- [x] 6.4 Remove from list / redirect after delete
- [x] 6.5 Show success toast

## 7. Conversation Persistence
- [x] 7.1 Save conversation messages with tool
- [x] 7.2 Conversation model linked to Tool
- [x] 7.3 Load conversation when editing tool

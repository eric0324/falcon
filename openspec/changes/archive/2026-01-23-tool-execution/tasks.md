# Tasks: Tool Execution Page

## 1. Tool Page Route
- [x] 1.1 Create tool page (`src/app/tool/[id]/page.tsx`)
- [x] 1.2 Fetch tool data by ID from Prisma
- [x] 1.3 Handle loading state (Server Component)
- [x] 1.4 Handle tool not found (notFound())

## 2. Tool Header
- [x] 2.1 Display tool name
- [x] 2.2 Show tool description
- [x] 2.3 Add back button (Link to /)
- [x] 2.4 Add edit button (if user is owner)
- [x] 2.5 Add details link (`/tool/[id]/details`)

## 3. Execution Environment
- [x] 3.1 Create ToolRunner component (`src/components/tool-runner.tsx`)
- [x] 3.2 Render SandpackProvider + SandpackPreview
- [x] 3.3 Full-page preview layout (h-screen)
- [x] 3.4 Inject companyAPI (mock or real bridge)
- [x] 3.5 Support Tailwind CSS via CDN

## 4. API Bridge
- [x] 4.1 Create sandbox-api-client.ts
- [x] 4.2 Implement companyAPI.query()
- [x] 4.3 Implement companyAPI.call()
- [x] 4.4 Implement companyAPI.getSources()
- [x] 4.5 postMessage communication with parent frame
- [x] 4.6 Handle message in ToolRunner (handleMessage)

## 5. Access Control
- [x] 5.1 Check if user can access tool (PRIVATE = owner only)
- [x] 5.2 Show 404 for unauthorized access

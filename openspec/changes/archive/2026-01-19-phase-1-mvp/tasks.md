# Tasks: MVP Core Features

## 1. Project Setup
- [x] 1.1 Initialize Next.js 14 project with App Router
- [x] 1.2 Configure Tailwind CSS and shadcn/ui
- [x] 1.3 Set up Prisma with PostgreSQL connection
- [x] 1.4 Create initial database schema (User, Tool, Conversation)
- [x] 1.5 Configure environment variables

## 2. Authentication
- [x] 2.1 Install and configure NextAuth.js
- [x] 2.2 Set up Google OAuth provider
- [x] 2.3 Implement domain restriction callback (@company.com)
- [x] 2.4 Create login page UI
- [x] 2.5 Add session provider to app layout
- [x] 2.6 Create auth middleware for protected routes

## 3. Database Models
- [x] 3.1 Create User model with Prisma
- [x] 3.2 Create Tool model with Prisma
- [x] 3.3 Create Conversation model with Prisma
- [x] 3.4 Run initial migration
- [x] 3.5 Seed test data (optional)

## 4. Studio - Chat Interface
- [x] 4.1 Create Studio page layout (split view)
- [x] 4.2 Build ChatPanel component
- [x] 4.3 Implement message input with send button
- [x] 4.4 Create message bubble components (user/assistant)
- [x] 4.5 Add loading state for streaming response

## 5. Studio - Claude Integration
- [x] 5.1 Create Claude API route (/api/chat)
- [x] 5.2 Implement system prompt with tool generation rules
- [x] 5.3 Set up streaming response handling
- [x] 5.4 Extract code blocks from Claude response
- [x] 5.5 Handle conversation context (message history)

## 6. Studio - Preview Panel
- [x] 6.1 Install Sandpack React package
- [x] 6.2 Create PreviewPanel component
- [x] 6.3 Configure Sandpack with React template
- [x] 6.4 Implement code hot-reload on extraction
- [x] 6.5 Add error boundary for invalid code
- [x] 6.6 Inject mock companyAPI into sandbox

## 7. Tool Management
- [x] 7.1 Create tools API routes (CRUD)
- [x] 7.2 Build tool name/deploy dialog
- [x] 7.3 Implement save tool functionality
- [x] 7.4 Create homepage with tool list
- [x] 7.5 Build tool card component
- [x] 7.6 Add delete tool confirmation

## 8. Tool Execution
- [x] 8.1 Create tool execution page (/tool/[id])
- [x] 8.2 Fetch tool code from database
- [x] 8.3 Render tool in Sandpack (read-only)
- [x] 8.4 Handle tool not found / access denied

## 9. Polish & Testing
- [x] 9.1 Add loading skeletons
- [x] 9.2 Implement error toasts
- [x] 9.3 Add responsive design for mobile
- [x] 9.4 Write basic E2E tests (login flow, create tool)
- [x] 9.5 Performance optimization (lazy loading)

## 10. Deployment (Deferred)
- [ ] 10.1 Set up Vercel project
- [ ] 10.2 Configure production environment variables
- [ ] 10.3 Set up AWS RDS for production
- [ ] 10.4 Configure domain and SSL
- [ ] 10.5 Deploy and smoke test

> Note: Deployment deferred. MVP development complete and validated locally.

# Tasks: Project Setup

## 1. Initialize Project
- [x] 1.1 Create Next.js 14 project with App Router
- [x] 1.2 Configure TypeScript strict mode in `tsconfig.json`
- [ ] 1.3 Add `.nvmrc` with Node.js version (skipped)

## 2. Styling Setup
- [x] 2.1 Initialize shadcn/ui
- [x] 2.2 Install common components:
  - button, input, card, dialog, toast
  - avatar, label, scroll-area, dropdown-menu
  - tabs, textarea, select, checkbox, skeleton
- [x] 2.3 Configure Tailwind with shadcn/ui theme colors

## 3. Database Setup
- [x] 3.1 Install Prisma and @prisma/client
- [x] 3.2 Create initial schema with models:
  - User, Account, Session
  - Tool, Conversation
  - Review, ReviewReply
  - ToolStats, ToolUsage
  - DataSource, DataSourcePermission, ApiLog
- [x] 3.3 Configure DATABASE_URL in `.env.example`

## 4. Project Structure
- [x] 4.1 Create folder structure:
  ```
  src/
  ├── app/           # Next.js App Router pages
  ├── components/    # React components
  │   └── ui/        # shadcn/ui components
  ├── lib/           # Utility functions
  ├── hooks/         # Custom React hooks
  └── types/         # TypeScript types
  prisma/
  └── schema.prisma
  ```
- [x] 4.2 Create Prisma client singleton (`src/lib/prisma.ts`)

## 5. Environment Configuration
- [x] 5.1 Create `.env.example` with variables:
  - DATABASE_URL
  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
  - NEXTAUTH_SECRET / NEXTAUTH_URL
  - ANTHROPIC_API_KEY
  - ALLOWED_EMAIL_DOMAIN
- [x] 5.2 Add `.env` to `.gitignore`

## 6. Code Quality
- [x] 6.1 Configure ESLint with Next.js recommended rules
- [ ] 6.2 Add Prettier (using ESLint instead)
- [ ] 6.3 Add lint-staged + husky (deferred)

## 7. Additional Setup
- [x] 7.1 Add Playwright for E2E testing
- [x] 7.2 Add npm scripts for database operations

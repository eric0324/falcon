# Agent-v1 Project Context

## Overview
Agent-v1 是一個內部 Vibe Coding 平台，讓非工程師用自然語言做出小工具。

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + shadcn/ui + Tailwind CSS
- **Preview Sandbox**: Sandpack (by CodeSandbox)
- **Auth**: NextAuth.js + Google OAuth
- **AI**: Claude API (Sonnet)
- **Database**: PostgreSQL (AWS RDS) + Prisma ORM
- **File Storage**: AWS S3
- **Deployment**: Vercel (frontend) + AWS Lambda (backend)

## Architecture
```
User Layer → Frontend (Next.js) → Backend (API Gateway + Lambda) → Data Layer (RDS + S3) → Internal Systems
```

## Conventions
- Use TypeScript for all code
- Follow Conventional Commits
- Use kebab-case for file names
- Use PascalCase for React components
- API responses follow REST conventions
- All dates in ISO 8601 format

## Key Constraints
- Only company domain (@company.com) can login
- Tool code must be single React component
- Generated tools can only use whitelisted internal APIs
- No external npm packages in generated tools (Tailwind only)

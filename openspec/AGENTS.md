# OpenSpec Instructions

These instructions are for AI assistants working on the Agent-v1 project.

## Before Any Task

**Context Checklist:**
- [ ] Read relevant specs in `openspec/specs/[capability]/spec.md`
- [ ] Check `openspec/project.md` for tech stack and conventions
- [ ] Review active changes in `openspec/changes/`

## Project Overview

Agent-v1 is an internal Vibe Coding platform that lets employees create tools using natural language.

**Key Specs:**
- `openspec/specs/auth/spec.md` - Authentication with Google OAuth
- `openspec/specs/tool/spec.md` - Tool CRUD and visibility
- `openspec/specs/studio/spec.md` - Vibe Coding interface
- `openspec/specs/api-bridge/spec.md` - Internal API access
- `openspec/specs/marketplace/spec.md` - Tool marketplace

## Changes (Recommended Order)

### Phase 1: MVP Core
Execute in order (each builds on the previous):

| # | Change | Description | Est. Time |
|---|--------|-------------|-----------|
| 1 | `project-setup` | Next.js, Tailwind, Prisma 初始化 | 2-3 hrs |
| 2 | `google-auth` | Google OAuth 登入 | 3-4 hrs |
| 3 | `studio-chat` | 對話介面 UI | 3-4 hrs |
| 4 | `claude-integration` | Claude API streaming | 3-4 hrs |
| 5 | `sandpack-preview` | Sandpack 即時預覽 | 3-4 hrs |
| 6 | `tool-crud` | 工具 CRUD + Deploy | 4-5 hrs |
| 7 | `tool-execution` | 工具執行頁面 | 2-3 hrs |

**Total Phase 1: ~21-27 hours**

### Phase 2: Marketplace
Execute after Phase 1:

| # | Change | Description | Est. Time |
|---|--------|-------------|-----------|
| 1 | `tool-visibility` | DEPARTMENT/COMPANY/PUBLIC 可見度 | 3-4 hrs |
| 2 | `usage-tracking` | 使用追蹤 | 2-3 hrs |
| 3 | `rating-review` | 評分與評論系統 | 4-5 hrs |
| 4 | `marketplace-browse` | 市集首頁、分類、搜尋 | 4-5 hrs |
| 5 | `leaderboard` | 排行榜 | 3-4 hrs |

**Total Phase 2: ~16-21 hours**

## Coding Conventions

1. **TypeScript** for all code
2. **Prisma** for database access
3. **shadcn/ui** components with Tailwind
4. **App Router** patterns for Next.js
5. **API Routes** in `/app/api/`

## When Making Changes

1. Read the `proposal.md` to understand scope
2. Follow tasks in order in `tasks.md`
3. Mark tasks `[x]` as you complete them
4. Reference specs for requirements/scenarios
5. Archive when all tasks complete

## Commands

```bash
# View project status
openspec list

# Show change details
openspec show project-setup

# Validate specs
openspec validate google-auth

# Archive completed change
openspec archive project-setup --yes
```

## Quick Start

```bash
# Start with Phase 1, Change 1
openspec show project-setup

# Or tell your AI:
# "Apply the project-setup change"
# /openspec:apply project-setup
```

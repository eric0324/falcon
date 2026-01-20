# OpenSpec Instructions

These instructions are for AI assistants working on the Falcon project.

## Before Any Task

**Context Checklist:**
- [ ] Read relevant specs in `openspec/specs/[capability]/spec.md`
- [ ] Check `openspec/project.md` for tech stack and conventions
- [ ] Review active changes in `openspec/changes/`

## Project Overview

Falcon is an internal Vibe Coding platform that lets employees create tools using natural language.

**Key Specs:**
- `openspec/specs/auth/spec.md` - Authentication with Google OAuth
- `openspec/specs/tool/spec.md` - Tool CRUD and visibility
- `openspec/specs/studio/spec.md` - Vibe Coding interface
- `openspec/specs/api-bridge/spec.md` - Internal API access
- `openspec/specs/marketplace/spec.md` - Tool marketplace (Phase 2)

## Active Changes

Check `openspec/changes/` for in-progress work:
- `phase-1-mvp/` - Core MVP features
- `phase-2-marketplace/` - Marketplace and social features

## Coding Conventions

1. **TypeScript** for all code
2. **Prisma** for database access
3. **shadcn/ui** components with Tailwind
4. **App Router** patterns for Next.js
5. **API Routes** in `/app/api/`

## When Making Changes

1. Check if a relevant spec exists
2. If modifying behavior, update the spec first
3. Follow the task checklist in `changes/[change]/tasks.md`
4. Mark tasks complete as you implement them

## Commands

```bash
# View project status
openspec list

# Show change details
openspec show phase-1-mvp

# Validate specs
openspec validate phase-1-mvp

# Archive completed change
openspec archive phase-1-mvp --yes
```

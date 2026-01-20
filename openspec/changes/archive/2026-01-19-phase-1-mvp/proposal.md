# Proposal: MVP Core Features

## Summary
Implement the minimum viable product for Falcon Vibe Coding platform, enabling users to login, create tools via natural language, and deploy them.

## Motivation
The company needs a way to democratize internal tool creation. Currently, building simple tools requires engineering resources and takes days. With this MVP, any employee can create basic tools in minutes through natural language conversation.

## Scope

### In Scope
- Google OAuth login (company domain only)
- Studio page with chat interface + Sandpack preview
- Basic tool CRUD (create, read, update, delete)
- Tool visibility: PRIVATE only (for MVP)
- Tool execution in sandbox

### Out of Scope (Phase 2+)
- Marketplace and rankings
- Reviews and ratings
- Department/Company/Public visibility
- API Bridge with real internal systems (mock only for MVP)

## Success Criteria
- [x] Employee can login with @company.com Google account
- [x] Employee can describe a tool and see live preview
- [x] Employee can iterate on tool via conversation
- [x] Employee can save and deploy tool
- [x] Employee can access their saved tools from homepage

## Dependencies
- Google Cloud Console project with OAuth credentials
- AWS RDS PostgreSQL instance
- Anthropic Claude API key
- Vercel account for deployment

## Risks
| Risk | Mitigation |
|------|------------|
| Claude generates invalid React code | Add validation layer, show errors in preview |
| Sandpack performance issues | Lazy load, debounce code updates |
| OAuth setup complexity | Use NextAuth.js with built-in Google provider |

## Timeline
2 weeks

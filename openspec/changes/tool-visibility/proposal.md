# Proposal: Tool Visibility & Permissions

## Summary
Extend tool visibility from PRIVATE-only to support DEPARTMENT, COMPANY, and PUBLIC visibility levels.

## Motivation
Users want to share tools with their team or the entire company. Different visibility levels enable controlled sharing while maintaining security.

## Scope

### In Scope
- Add visibility selector to deploy dialog
- Update tool API to filter by visibility
- Department-based access control
- Public tool access (no auth required)
- Visibility badge on tool cards

### Out of Scope
- Marketplace browsing (separate change)
- Usage tracking
- Ratings / reviews

## Success Criteria
- [ ] User can select visibility when deploying
- [ ] DEPARTMENT tools visible to same department
- [ ] COMPANY tools visible to all employees
- [ ] PUBLIC tools accessible without login
- [ ] Visibility badge shown on cards

## Dependencies
- `tool-crud` change completed
- `tool-execution` change completed

## Timeline
3-4 hours

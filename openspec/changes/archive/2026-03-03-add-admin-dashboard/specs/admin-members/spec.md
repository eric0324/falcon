# Admin Members Specification

## Purpose

讓 ADMIN 角色的使用者查看所有成員的 token 使用量及對話內容。

## ADDED Requirements

### Requirement: Admin Role Guard
The system SHALL restrict admin pages and APIs to users with ADMIN role.

#### Scenario: Admin accesses admin page
- GIVEN a user with role ADMIN
- WHEN they navigate to /admin/*
- THEN the page renders normally

#### Scenario: Non-admin accesses admin page
- GIVEN a user with role MEMBER
- WHEN they navigate to /admin/*
- THEN they are redirected to the home page

#### Scenario: Non-admin calls admin API
- GIVEN a user with role MEMBER
- WHEN they call GET /api/admin/*
- THEN the API returns 403 Forbidden

### Requirement: Member List
The system SHALL display a list of all members with their token usage.

#### Scenario: View member list
- GIVEN an admin user
- WHEN they visit /admin/members
- THEN they see a table with columns: name, email, department, total tokens, last active
- AND members are sorted by total tokens descending

#### Scenario: Member token aggregation
- GIVEN a member with multiple TokenUsage records
- WHEN the admin views the member list
- THEN the total tokens column shows the sum of all totalTokens for that member

### Requirement: Member Conversations
The system SHALL allow admins to view a member's conversations.

#### Scenario: View member conversations
- GIVEN an admin user viewing the member list
- WHEN they click on a member row
- THEN they navigate to /admin/members/[userId]
- AND see a list of that member's conversations with: title, message count, token usage, last updated

#### Scenario: View conversation messages
- GIVEN an admin on a member's conversation list
- WHEN they click on a conversation
- THEN the conversation messages are displayed inline (expandable)
- AND user and assistant messages are visually distinguished

#### Scenario: Soft-deleted conversations excluded
- GIVEN a member has soft-deleted conversations (deletedAt is not null)
- WHEN the admin views that member's conversations
- THEN soft-deleted conversations are NOT shown

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/members | List all members with aggregated token usage |
| GET | /api/admin/members/[id]/conversations | List conversations for a specific member |
| GET | /api/admin/members/[id]/conversations/[conversationId] | Get conversation messages |

## Data Dependencies
- `User` — existing model (role field)
- `TokenUsage` — existing model (aggregation by userId)
- `Conversation` — existing model (filter by userId, exclude deletedAt)

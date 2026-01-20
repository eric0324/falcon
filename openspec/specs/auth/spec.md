# Auth Specification

## Purpose
Handle user authentication and session management for Falcon platform.

## Requirements

### Requirement: Google OAuth Login
The system SHALL authenticate users via Google OAuth 2.0.

#### Scenario: Valid company email
- WHEN a user signs in with a @company.com email
- THEN the system creates a session and redirects to dashboard

#### Scenario: Invalid email domain
- WHEN a user signs in with a non-company email
- THEN the system rejects the login with an error message

### Requirement: Session Management
The system MUST maintain secure sessions using NextAuth.js.

#### Scenario: Active session
- WHEN a user has a valid session
- THEN all authenticated routes are accessible

#### Scenario: Expired session
- WHEN a session expires
- THEN the user is redirected to login page

### Requirement: User Profile Creation
The system SHALL create a user profile on first login.

#### Scenario: New user
- WHEN a user logs in for the first time
- THEN a User record is created with email, name, and department from Google profile
- AND the default role is MEMBER

## Data Model

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatar        String?
  department    String?
  role          Role     @default(MEMBER)
  createdAt     DateTime @default(now())
}

enum Role {
  ADMIN
  MEMBER
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/signin | Initiate OAuth flow |
| GET | /api/auth/callback/google | OAuth callback |
| GET | /api/auth/session | Get current session |
| POST | /api/auth/signout | Sign out |

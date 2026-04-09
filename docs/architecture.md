# Architecture

## Overview

EduPlatform Starter is a full-stack education SaaS template built with:

- **Astro 5** — Web framework with SSR and Islands architecture
- **Preact** — Lightweight interactive components (swappable with React)
- **Supabase** — PostgreSQL database, authentication, and realtime
- **TypeScript** — Type safety throughout

## Database Design

### Entity Relationships

```
organizations
  ├── users (1:N) — admin accounts with roles
  ├── groups (1:N) — classes, cohorts, teams
  │     └── participants (1:N) — no auth required
  ├── invitations (1:N) — expiring join tokens
  └── role_change_logs (1:N) — audit trail

session_runs (created by users, optionally linked to groups)
  ├── session_participants (1:N) — joined via code
  └── feedback (1:N) — post-session responses

assignments (linked to groups, created by users)
```

### Design Decisions

**Why no auth for participants?**
In classroom settings, requiring 30 students to create accounts would block adoption. Participants join with a 6-character code and a name. A session token provides subsequent identity within the session.

**Why JSONB metadata on session_runs?**
Session phases, custom data, and app-specific state vary widely. Rather than adding columns for every use case, `metadata` provides a flexible key-value store.

**Why separate users and organizations?**
Users can exist without an organization (individual teachers). Organizations enable multi-user collaboration. The `ensureUserOrganization()` helper creates an org on demand.

**Why RLS instead of middleware?**
Database-level security prevents data leaks even if application code has bugs. Every query goes through Supabase's RLS engine, enforcing organization scoping and creator ownership.

## Library Modules

| Module | Tables | Functions | Purpose |
|--------|--------|-----------|---------|
| `supabase-client.ts` | — | 1 | Client init + all type definitions |
| `auth.ts` | users | 7 | Sign up/in/out, OAuth, plan limits |
| `groups.ts` | groups | 6 | Group CRUD with stats |
| `participants.ts` | participants | 7 | Participant CRUD (single + bulk) |
| `sessions.ts` | session_runs, session_participants, feedback | 12 | Session lifecycle + feedback + cache |
| `realtime.ts` | — | 6 | Realtime subscriptions + channel management |
| `admin.ts` | organizations, users, invitations, role_change_logs | 11 | Org admin + invitations + audit |

## Security Model

### Row Level Security (24 policies)

| Pattern | Tables | How it works |
|---------|--------|-------------|
| **Org scoping** | organizations, users | Users only see their own org's data |
| **Creator ownership** | groups, session_runs | Only the creator can update/delete |
| **Cascading access** | participants, assignments | Access through group ownership |
| **Join code access** | session_runs | Active sessions discoverable by code |
| **Token-based** | session_participants | Participants auth via session token |
| **Role-gated** | invitations, role_change_logs | Admin/owner actions only |

### Auth Flow

```
Email/Password → Supabase Auth → users table (auto-created on first sign-in)
OAuth (Google/GitHub/Azure) → Supabase Auth → users table (auto-created from metadata)
```

### Participant Auth

```
Facilitator creates session → join_code generated
Participant enters code → finds session
Participant enters name → session_token generated
Token stored in localStorage → used for heartbeat and reconnection
```

## Realtime

Three tables are published for realtime:

| Table | Events | Subscriber |
|-------|--------|-----------|
| session_runs | UPDATE | Participants (phase changes) |
| session_participants | INSERT, UPDATE | Facilitator (who joined) |
| feedback | INSERT | Facilitator (incoming feedback) |

Subscriptions use Supabase Postgres Changes with row-level filters (`filter: id=eq.{runId}`) to minimize traffic.

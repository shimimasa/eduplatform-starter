# EduPlatform Starter

> Open-source template for building education SaaS with Astro + Supabase + Realtime

A production-ready database schema and project scaffold for education platforms. Includes group management, participant tracking, live session orchestration, and row-level security — all designed for classroom and workshop use cases.

## What's Included

| Layer | What you get |
|---|---|
| **Database** | 10 tables with RLS policies, indexes, and realtime enabled |
| **Auth** | Supabase Auth integration with org-scoped roles (member/admin/owner) |
| **Groups** | Manage classes, cohorts, or teams within an organization |
| **Participants** | Track students/attendees without requiring them to create accounts |
| **Sessions** | Run live activities with join codes and phase tracking |
| **Realtime** | Supabase Realtime on session tables for live updates |
| **Feedback** | Post-session rating and comments |
| **Invitations** | Invite users to your organization with expiring tokens |

## Quick Start

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the Schema

In the Supabase SQL Editor, run:

```sql
-- Run in order:
-- 1. supabase/schema.sql  (tables + RLS + indexes)
-- 2. supabase/seed.sql    (optional demo data)
```

### 3. Clone and Configure

```bash
git clone https://github.com/shimimasa/eduplatform-starter.git
cd eduplatform-starter
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

### 4. Environment Variables

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

### Core Tables (8)

```
organizations ──┬── users (auth accounts with roles)
                ├── groups ── participants
                ├── invitations
                └── session_runs ── session_participants
                                 └── feedback
```

### Extension Tables (2, optional)

- **assignments** — distribute tasks/content to groups with due dates
- **role_change_logs** — audit trail for role changes

### Row Level Security

All tables have RLS enabled. Key patterns:

- **Organization scoping**: users see only their org's data
- **Creator ownership**: groups and sessions are editable by their creator
- **Join code access**: active sessions are discoverable by join code
- **Participant self-access**: session participants can read their own data via token

### Realtime

Enabled on `session_runs`, `session_participants`, and `feedback` tables. Subscribe to changes for live session experiences.

## Use Cases

This template is designed for platforms where:

- A **facilitator** (teacher, trainer, host) runs **live sessions**
- **Participants** (students, attendees) join via a **code** — no account needed
- Sessions have **phases** that the facilitator controls in real time
- Post-session **feedback** is collected
- Participants are organized into **groups** within an **organization**

### Examples

- Classroom quiz/activity platforms
- Workshop facilitation tools
- Training session managers
- Interactive presentation platforms
- Group coaching/tutoring apps

## Tech Stack

| Technology | Role |
|---|---|
| [Astro](https://astro.build) | Web framework (SSR + Islands) |
| [Supabase](https://supabase.com) | Database, Auth, Realtime |
| [Preact](https://preactjs.com) | Interactive components (swappable) |
| TypeScript | Type safety throughout |

## Project Structure

```
eduplatform-starter/
├── supabase/
│   ├── schema.sql          # 10 tables + RLS + indexes
│   └── seed.sql            # Demo data
├── src/
│   ├── lib/                # Supabase client functions
│   ├── pages/              # Astro pages
│   └── components/         # Interactive UI components
├── docs/
│   ├── setup.md            # Detailed setup guide
│   ├── architecture.md     # Schema design decisions
│   └── extending.md        # How to add your own features
└── README.md
```

## Extending

The schema is intentionally minimal. Common extensions:

- **Custom phases**: Define your session phases in `metadata` JSONB or add a `phases` table
- **Responses/Answers**: Add a `responses` table linked to `session_participants`
- **Gamification**: Add `badges`, `scores`, or `achievements` tables
- **Content management**: Add a `templates` table to store your activities
- **Analytics**: Add `session_events` for granular tracking

See [docs/extending.md](docs/extending.md) for patterns and examples.

## Roadmap

- [ ] Phase 2: Auth + Supabase client library
- [ ] Phase 3: Groups + Participants CRUD
- [ ] Phase 4: Realtime session engine
- [ ] Phase 5: Admin + Invitation system
- [ ] Phase 6: Demo pages (LP, Dashboard, Join)
- [ ] Phase 7: Documentation

## Origin

This template was extracted from a production education platform ([Nazotoki Detective Agency](https://nazotoki.gamanavi.com)) that runs interactive mystery-solving sessions in Japanese classrooms. The generic 81% of the codebase became this starter template.

## License

MIT

# Setup Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

## 1. Clone the Repository

```bash
git clone https://github.com/shimimasa/eduplatform-starter.git
cd eduplatform-starter
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Set Up Supabase

### Create a Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** from Settings > API

### Run the Schema

1. Open the SQL Editor in your Supabase dashboard
2. Paste and run `supabase/schema.sql`
3. Optionally run `supabase/seed.sql` for demo data

### Enable Realtime

The schema already adds the necessary tables to `supabase_realtime`. Verify in your Supabase dashboard under Database > Replication that `session_runs`, `session_participants`, and `feedback` are listed.

### Enable Auth Providers

1. Go to Authentication > Providers
2. Enable **Email** (enabled by default)
3. Optionally enable **Google** or other OAuth providers

## 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 5. Run the Dev Server

```bash
npm run dev
```

Visit `http://localhost:4321` to see the landing page.

## 6. Test the Flow

1. Go to `/dashboard` and create an account
2. Create a group
3. Start a session from the group
4. Copy the join code
5. Open `/join` in another browser tab
6. Enter the join code and a participant name
7. The participant should see the session phase update in real time

## Troubleshooting

### "Supabase not configured"

Check that your `.env` file has the correct `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` values.

### RLS errors (403)

Make sure you ran the full `schema.sql` including the RLS policies and helper functions (`current_user_id()`, `current_user_org_id()`).

### Realtime not working

Verify that the tables are added to the `supabase_realtime` publication. You can check with:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

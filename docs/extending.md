# Extending EduPlatform Starter

## Adding Session Phases

The `current_phase` field on `session_runs` is a plain text string. Define your own phase flow:

```typescript
// src/lib/phases.ts
export const PHASES = ['waiting', 'intro', 'activity', 'discussion', 'wrap-up'] as const;
export type Phase = typeof PHASES[number];

export function nextPhase(current: Phase): Phase | null {
  const idx = PHASES.indexOf(current);
  return idx < PHASES.length - 1 ? PHASES[idx + 1] : null;
}
```

Use `updateSessionRun(runId, { current_phase: nextPhase(current) })` to advance.

## Adding a Responses Table

For collecting answers, votes, or submissions during a session:

```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_run_id UUID NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE,
  session_participant_id UUID NOT NULL REFERENCES session_participants(id),
  phase TEXT,
  response_type TEXT,  -- 'text', 'choice', 'number', 'file'
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Participants can insert their own responses
CREATE POLICY "responses_insert" ON responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM session_runs
    WHERE session_runs.id = responses.session_run_id
      AND session_runs.is_active = true
  ));

-- Facilitators can read all responses for their sessions
CREATE POLICY "responses_select" ON responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM session_runs
    WHERE session_runs.id = responses.session_run_id
      AND session_runs.created_by_user_id = current_user_id()
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
```

## Adding Gamification

### Badges

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (participant_id, badge_key)
);
```

### Scores

```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_participant_id UUID NOT NULL REFERENCES session_participants(id),
  score INT NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Adding a Content/Templates Table

If you want to manage session templates in the database:

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Then reference templates from `session_runs` via `template_id`.

## Adding Analytics

### Session Events

For granular tracking of actions during a session:

```sql
CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_run_id UUID NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE,
  session_participant_id UUID REFERENCES session_participants(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_session_events_run ON session_events(session_run_id);
CREATE INDEX idx_session_events_type ON session_events(event_type);
```

## Swapping Preact for React

1. Replace `@astrojs/preact` with `@astrojs/react` in `package.json` and `astro.config.ts`
2. Change `preact/hooks` imports to `react`
3. Change `onInput` to `onChange` on inputs
4. Update `tsconfig.json` `jsxImportSource` to `react`

## Adding Email (Resend)

Create an API route for sending emails:

```typescript
// src/pages/api/send-invitation.ts
import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  const { email, inviteLink, organizationName } = await request.json();

  const { error } = await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: email,
    subject: `Join ${organizationName}`,
    html: `<p>You've been invited to join ${organizationName}.</p>
           <p><a href="${inviteLink}">Accept Invitation</a></p>`,
  });

  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }));
};
```

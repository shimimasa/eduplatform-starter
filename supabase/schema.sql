-- EduPlatform Starter - Database Schema
-- Supabase (PostgreSQL) + Row Level Security
--
-- 8 core tables + 2 optional extension tables
-- Designed for education SaaS: groups, participants, realtime sessions

-- =============================================================
-- CORE TABLES (8)
-- =============================================================

-- 1. Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_type TEXT,  -- 'school' | 'company' | 'nonprofit' | etc.
  domain_hint TEXT,        -- e.g. 'example.edu' for SSO matching
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Users (admin/facilitator accounts, linked to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  organization_id UUID REFERENCES organizations(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Groups (classes, cohorts, teams, etc.)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  group_name TEXT NOT NULL,
  group_level TEXT,       -- e.g. 'Grade 5', 'Beginner', 'Team A'
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Participants (students, attendees - no auth account needed)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  external_id TEXT,       -- optional: school student ID, LMS ID, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, display_name)
);

-- 5. Session Runs (a live or async session instance)
CREATE TABLE session_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  template_id TEXT,       -- your content/activity identifier
  template_title TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  join_code TEXT UNIQUE,  -- 6-char code for participants to join
  current_phase TEXT,     -- app-defined phase name
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',  -- flexible key-value for app-specific data
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Session Participants (who joined a specific session)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_run_id UUID NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id),
  participant_name TEXT NOT NULL,    -- denormalized for display
  session_token TEXT,                -- anonymous auth token
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

-- 7. Feedback (post-session responses from participants)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_run_id UUID NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE,
  session_participant_id UUID REFERENCES session_participants(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Invitations (invite users to an organization)
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  email TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- EXTENSION TABLES (optional)
-- =============================================================

-- Assignments (distribute content/tasks to a group)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  template_id TEXT,
  title TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Role Change Audit Log
CREATE TABLE role_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  before_role TEXT NOT NULL,
  after_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_users_auth ON users(auth_user_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_groups_org ON groups(organization_id);
CREATE INDEX idx_groups_creator ON groups(created_by_user_id);
CREATE INDEX idx_participants_group ON participants(group_id);
CREATE INDEX idx_session_runs_group ON session_runs(group_id);
CREATE INDEX idx_session_runs_join_code ON session_runs(join_code);
CREATE INDEX idx_session_runs_creator ON session_runs(created_by_user_id);
CREATE INDEX idx_session_participants_run ON session_participants(session_run_id);
CREATE INDEX idx_feedback_run ON feedback(session_run_id);
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_assignments_group ON assignments(group_id);
CREATE INDEX idx_role_change_logs_org ON role_change_logs(organization_id);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's internal user id
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get the current user's organization id
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --- organizations ---
CREATE POLICY "org_select_member" ON organizations FOR SELECT
  USING (id = current_user_org_id());

CREATE POLICY "org_update_admin" ON organizations FOR UPDATE
  USING (id = current_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND organization_id = organizations.id
        AND role IN ('admin', 'owner')
    ));

-- --- users ---
CREATE POLICY "users_select_self" ON users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "users_select_same_org" ON users FOR SELECT
  USING (organization_id = current_user_org_id());

CREATE POLICY "users_update_self" ON users FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "users_insert_self" ON users FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- --- groups ---
CREATE POLICY "groups_select_org" ON groups FOR SELECT
  USING (organization_id = current_user_org_id()
    OR created_by_user_id = current_user_id());

CREATE POLICY "groups_insert_authed" ON groups FOR INSERT
  WITH CHECK (created_by_user_id = current_user_id());

CREATE POLICY "groups_update_creator" ON groups FOR UPDATE
  USING (created_by_user_id = current_user_id());

CREATE POLICY "groups_delete_creator" ON groups FOR DELETE
  USING (created_by_user_id = current_user_id());

-- --- participants ---
CREATE POLICY "participants_select_group_owner" ON participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = participants.group_id
      AND (groups.created_by_user_id = current_user_id()
        OR groups.organization_id = current_user_org_id())
  ));

CREATE POLICY "participants_insert_group_owner" ON participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = participants.group_id
      AND groups.created_by_user_id = current_user_id()
  ));

CREATE POLICY "participants_update_group_owner" ON participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = participants.group_id
      AND groups.created_by_user_id = current_user_id()
  ));

CREATE POLICY "participants_delete_group_owner" ON participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = participants.group_id
      AND groups.created_by_user_id = current_user_id()
  ));

-- --- session_runs ---
CREATE POLICY "sessions_select_creator" ON session_runs FOR SELECT
  USING (created_by_user_id = current_user_id());

CREATE POLICY "sessions_select_by_join_code" ON session_runs FOR SELECT
  USING (is_active = true AND join_code IS NOT NULL);

CREATE POLICY "sessions_insert_authed" ON session_runs FOR INSERT
  WITH CHECK (created_by_user_id = current_user_id());

CREATE POLICY "sessions_update_creator" ON session_runs FOR UPDATE
  USING (created_by_user_id = current_user_id());

-- --- session_participants ---
CREATE POLICY "sp_select_session_creator" ON session_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM session_runs
    WHERE session_runs.id = session_participants.session_run_id
      AND session_runs.created_by_user_id = current_user_id()
  ));

CREATE POLICY "sp_insert_active_session" ON session_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM session_runs
    WHERE session_runs.id = session_participants.session_run_id
      AND session_runs.is_active = true
  ));

CREATE POLICY "sp_select_self" ON session_participants FOR SELECT
  USING (session_token = current_setting('request.headers', true)::json->>'x-session-token');

-- --- feedback ---
CREATE POLICY "feedback_insert_participant" ON feedback FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM session_runs
    WHERE session_runs.id = feedback.session_run_id
      AND session_runs.is_active = false  -- only after session ends
  ));

CREATE POLICY "feedback_select_session_creator" ON feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM session_runs
    WHERE session_runs.id = feedback.session_run_id
      AND session_runs.created_by_user_id = current_user_id()
  ));

-- --- invitations ---
CREATE POLICY "invitations_select_org_admin" ON invitations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
      AND organization_id = invitations.organization_id
      AND role IN ('admin', 'owner')
  ));

CREATE POLICY "invitations_insert_org_admin" ON invitations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
      AND organization_id = invitations.organization_id
      AND role IN ('admin', 'owner')
  ));

-- --- assignments ---
CREATE POLICY "assignments_select_org" ON assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = assignments.group_id
      AND (groups.created_by_user_id = current_user_id()
        OR groups.organization_id = current_user_org_id())
  ));

CREATE POLICY "assignments_insert_creator" ON assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = assignments.group_id
      AND groups.created_by_user_id = current_user_id()
  ));

-- --- role_change_logs ---
CREATE POLICY "role_logs_select_org_admin" ON role_change_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
      AND organization_id = role_change_logs.organization_id
      AND role IN ('admin', 'owner')
  ));

-- =============================================================
-- REALTIME (enable for session tables)
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE session_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

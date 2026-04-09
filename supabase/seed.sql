-- EduPlatform Starter - Seed Data
-- Run after schema.sql to populate demo data
--
-- NOTE: This seed creates data directly in tables (bypassing RLS).
-- In production, users are created via Supabase Auth + trigger.

-- Demo organization
INSERT INTO organizations (id, name, organization_type, domain_hint) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo School', 'school', 'demo.edu');

-- Demo user (you'll need to update auth_user_id after signing up)
-- Use a placeholder UUID — replace with your actual auth.users id
INSERT INTO users (id, auth_user_id, display_name, organization_id, role, subscription_plan) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000099',
   'Demo Teacher', '00000000-0000-0000-0000-000000000001', 'admin', 'free');

-- Demo groups
INSERT INTO groups (id, organization_id, created_by_user_id, group_name, group_level) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010', 'Class 5-A', 'Grade 5'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010', 'Class 5-B', 'Grade 5');

-- Demo participants
INSERT INTO participants (id, group_id, display_name) VALUES
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000100', 'Alice'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000100', 'Bob'),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000100', 'Charlie'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000100', 'Diana'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000101', 'Eve'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000101', 'Frank');

-- Demo session
INSERT INTO session_runs (id, group_id, template_id, template_title, created_by_user_id, join_code, current_phase, is_active, started_at) VALUES
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000000100',
   'demo-activity-01', 'Getting Started Activity', '00000000-0000-0000-0000-000000000010',
   'ABC123', 'intro', true, now());

-- Demo session participants
INSERT INTO session_participants (session_run_id, participant_id, participant_name) VALUES
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000001001', 'Alice'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000001002', 'Bob'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000001003', 'Charlie'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000001004', 'Diana');

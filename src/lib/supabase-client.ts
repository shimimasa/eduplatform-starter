/**
 * Supabase Client + Type Definitions
 * EduPlatform Starter
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- User ---

export type UserRole = 'member' | 'admin' | 'owner';
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  organization_id: string | null;
  role: UserRole;
  subscription_plan: SubscriptionPlan;
  created_at: string;
}

// --- Organization ---

export interface OrganizationRow {
  id: string;
  name: string;
  organization_type: string | null;
  domain_hint: string | null;
  created_at: string;
}

// --- Group ---

export interface GroupRow {
  id: string;
  organization_id: string | null;
  created_by_user_id: string;
  group_name: string;
  group_level: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface GroupWithStats extends GroupRow {
  participant_count: number;
  session_count: number;
}

// --- Participant ---

export interface ParticipantRow {
  id: string;
  group_id: string;
  display_name: string;
  external_id: string | null;
  created_at: string;
}

// --- Session Run ---

export interface SessionRunRow {
  id: string;
  group_id: string | null;
  template_id: string | null;
  template_title: string | null;
  created_by_user_id: string;
  join_code: string | null;
  current_phase: string | null;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SessionRunInsert {
  group_id?: string;
  template_id?: string;
  template_title?: string;
  created_by_user_id: string;
  join_code?: string;
  current_phase?: string;
  metadata?: Record<string, unknown>;
}

// --- Session Participant ---

export interface SessionParticipantRow {
  id: string;
  session_run_id: string;
  participant_id: string | null;
  participant_name: string;
  session_token: string | null;
  joined_at: string;
  last_seen_at: string | null;
}

// --- Feedback ---

export interface FeedbackRow {
  id: string;
  session_run_id: string;
  session_participant_id: string | null;
  rating: number | null;
  comment: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FeedbackInsert {
  session_run_id: string;
  session_participant_id?: string;
  rating?: number;
  comment?: string;
  metadata?: Record<string, unknown>;
}

// --- Invitation ---

export interface InvitationRow {
  id: string;
  organization_id: string;
  invited_by_user_id: string;
  email: string | null;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface InvitationPreview {
  valid: boolean;
  error?: string;
  organization_name?: string;
  expires_at?: string;
}

// --- Assignment (extension) ---

export interface AssignmentRow {
  id: string;
  group_id: string;
  created_by_user_id: string;
  template_id: string | null;
  title: string | null;
  description: string | null;
  due_date: string | null;
  created_at: string;
}

export interface AssignmentInsert {
  group_id: string;
  created_by_user_id: string;
  template_id?: string;
  title?: string;
  description?: string;
  due_date?: string;
}

// --- Role Change Log (extension) ---

export interface RoleChangeLogRow {
  id: string;
  organization_id: string;
  actor_user_id: string;
  target_user_id: string;
  before_role: string;
  after_role: string;
  created_at: string;
}

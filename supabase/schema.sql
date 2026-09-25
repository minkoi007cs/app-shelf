-- App Shelf Database Schema and Row Level Security (RLS) Policies
-- Project prefix: tkw_

-- 1. Tables DDL

CREATE TABLE IF NOT EXISTS public.tkw_payment_schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  account_email TEXT,
  due_date BIGINT,
  due_date_string TEXT,
  recurrence TEXT NOT NULL DEFAULT 'monthly',
  repeat_count INTEGER,
  amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'VND',
  payment_method TEXT,
  is_auto_debit BOOLEAN NOT NULL DEFAULT false,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tkw_ai_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reset_cycle_hours INTEGER NOT NULL DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tkw_ai_accounts (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES public.tkw_ai_tools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  reset_time BIGINT NOT NULL,
  run_out_time BIGINT,
  next_due_date BIGINT,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tkw_app_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'Development',
  priority TEXT NOT NULL DEFAULT 'Medium',
  description TEXT,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tkw_app_backlog_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.tkw_app_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tkw_user_permissions (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  can_read_token_wallet BOOLEAN NOT NULL DEFAULT false,
  can_edit_token_wallet BOOLEAN NOT NULL DEFAULT false,
  can_read_payments BOOLEAN NOT NULL DEFAULT false,
  can_edit_payments BOOLEAN NOT NULL DEFAULT false,
  can_read_app_wallet BOOLEAN NOT NULL DEFAULT true,
  can_edit_app_wallet BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Security Definer Privilege Helper Function

CREATE OR REPLACE FUNCTION public.tkw_perm(flag text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT COALESCE((
    SELECT CASE flag
      WHEN 'can_read_token_wallet' THEN p.can_read_token_wallet
      WHEN 'can_edit_token_wallet' THEN p.can_edit_token_wallet
      WHEN 'can_read_payments'     THEN p.can_read_payments
      WHEN 'can_edit_payments'     THEN p.can_edit_payments
      WHEN 'can_read_app_wallet'   THEN p.can_read_app_wallet
      WHEN 'can_edit_app_wallet'   THEN p.can_edit_app_wallet
      WHEN 'is_admin'              THEN (p.role = 'admin')
      ELSE false
    END
    FROM public.tkw_user_permissions p
    WHERE p.user_id = auth.uid()
  ), false);
$fn$;

-- 3. Enable RLS & Configure Policies

-- Table: tkw_payment_schedules
DROP POLICY IF EXISTS "Allow all for anon on tkw_payment_schedules" ON public.tkw_payment_schedules;
ALTER TABLE public.tkw_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read payments" ON public.tkw_payment_schedules
  FOR SELECT USING (public.tkw_perm('can_read_payments'));

CREATE POLICY "write payments" ON public.tkw_payment_schedules
  FOR ALL USING (public.tkw_perm('can_edit_payments'))
           WITH CHECK (public.tkw_perm('can_edit_payments'));

-- Table: tkw_ai_tools
ALTER TABLE public.tkw_ai_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read tools" ON public.tkw_ai_tools
  FOR SELECT USING (public.tkw_perm('can_read_token_wallet'));

CREATE POLICY "write tools" ON public.tkw_ai_tools
  FOR ALL USING (public.tkw_perm('can_edit_token_wallet'))
           WITH CHECK (public.tkw_perm('can_edit_token_wallet'));

-- Table: tkw_ai_accounts
ALTER TABLE public.tkw_ai_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read accounts" ON public.tkw_ai_accounts
  FOR SELECT USING (public.tkw_perm('can_read_token_wallet'));

CREATE POLICY "write accounts" ON public.tkw_ai_accounts
  FOR ALL USING (public.tkw_perm('can_edit_token_wallet'))
           WITH CHECK (public.tkw_perm('can_edit_token_wallet'));

-- Table: tkw_app_projects (Public read, authenticated write)
ALTER TABLE public.tkw_app_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read app projects" ON public.tkw_app_projects
  FOR SELECT USING (true);

CREATE POLICY "write app projects" ON public.tkw_app_projects
  FOR ALL USING (public.tkw_perm('can_edit_app_wallet'))
           WITH CHECK (public.tkw_perm('can_edit_app_wallet'));

-- Table: tkw_app_backlog_items (Public read, authenticated write)
ALTER TABLE public.tkw_app_backlog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read backlog items" ON public.tkw_app_backlog_items
  FOR SELECT USING (true);

CREATE POLICY "write backlog items" ON public.tkw_app_backlog_items
  FOR ALL USING (public.tkw_perm('can_edit_app_wallet'))
           WITH CHECK (public.tkw_perm('can_edit_app_wallet'));

-- Table: tkw_user_permissions
ALTER TABLE public.tkw_user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own or admin" ON public.tkw_user_permissions
  FOR SELECT USING (user_id = auth.uid() OR public.tkw_perm('is_admin'));

CREATE POLICY "self register unprivileged" ON public.tkw_user_permissions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND role = 'user'
    AND can_read_token_wallet = false AND can_edit_token_wallet = false
    AND can_read_payments     = false AND can_edit_payments     = false
    AND can_edit_app_wallet   = false
  );

CREATE POLICY "admin manages permissions" ON public.tkw_user_permissions
  FOR UPDATE USING (public.tkw_perm('is_admin'))
             WITH CHECK (public.tkw_perm('is_admin'));

-- Bootstrap: run once, manually, in the Supabase SQL editor for the first admin.
-- INSERT INTO public.tkw_user_permissions
--   (user_id, email, role, can_read_token_wallet, can_edit_token_wallet,
--    can_read_payments, can_edit_payments, can_read_app_wallet, can_edit_app_wallet)
-- SELECT id, email, 'admin', true, true, true, true, true, true
--   FROM auth.users WHERE email = '<owner email>'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

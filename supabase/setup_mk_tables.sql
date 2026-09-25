-- ============================================================
-- MinKoi App Shelf - Table Setup Script
-- Project: apps.minkoi.org (minkoi007cs)
-- Supabase: msozshwatonyxnkaqjfs (shared instance)
-- Table prefix: mk_ (isolated from aw_ used by johnnyhoang)
-- Run this via: Supabase Dashboard > SQL Editor
-- ============================================================

-- =============================================
-- mk_app_projects: Main project catalog table
-- =============================================
CREATE TABLE IF NOT EXISTS public.mk_app_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  frontend_url TEXT,
  github TEXT,
  hosting TEXT,
  database TEXT,
  category TEXT,
  status TEXT DEFAULT 'Development',
  priority TEXT DEFAULT 'Medium',
  author TEXT DEFAULT 'minkoi007cs',
  tech_stack TEXT,
  description TEXT,
  health_status TEXT DEFAULT 'unknown',
  health_checked_at TEXT,
  manual_checked BOOLEAN DEFAULT false,
  manual_checked_at TEXT,
  is_disabled BOOLEAN DEFAULT false,
  notes TEXT,
  spec_en TEXT,
  spec_vi TEXT,
  last_updated BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- mk_app_backlog_items: Per-project tasks
-- =============================================
CREATE TABLE IF NOT EXISTS public.mk_app_backlog_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.mk_app_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- mk_user_permissions: Role-based access control
-- =============================================
CREATE TABLE IF NOT EXISTS public.mk_user_permissions (
  user_id UUID PRIMARY KEY,
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

-- =============================================
-- mk_perm() helper for RLS policies
-- =============================================
CREATE OR REPLACE FUNCTION public.mk_perm(flag text)
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
    FROM public.mk_user_permissions p
    WHERE p.user_id = auth.uid()
  ), false);
$fn$;

-- =============================================
-- RLS: mk_user_permissions
-- =============================================
ALTER TABLE public.mk_user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mk_read own or admin" ON public.mk_user_permissions;
CREATE POLICY "mk_read own or admin" ON public.mk_user_permissions
  FOR SELECT USING (user_id = auth.uid() OR public.mk_perm('is_admin'));

DROP POLICY IF EXISTS "mk_self register unprivileged" ON public.mk_user_permissions;
CREATE POLICY "mk_self register unprivileged" ON public.mk_user_permissions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND role = 'user'
    AND can_read_token_wallet = false AND can_edit_token_wallet = false
    AND can_read_payments     = false AND can_edit_payments     = false
    AND can_edit_app_wallet   = false
  );

DROP POLICY IF EXISTS "mk_admin manages permissions" ON public.mk_user_permissions;
CREATE POLICY "mk_admin manages permissions" ON public.mk_user_permissions
  FOR UPDATE USING (public.mk_perm('is_admin'))
             WITH CHECK (public.mk_perm('is_admin'));

-- =============================================
-- RLS: mk_app_projects
-- =============================================
ALTER TABLE public.mk_app_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mk_anyone can read projects" ON public.mk_app_projects;
CREATE POLICY "mk_anyone can read projects" ON public.mk_app_projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "mk_admin can write projects" ON public.mk_app_projects;
CREATE POLICY "mk_admin can write projects" ON public.mk_app_projects
  FOR ALL USING (public.mk_perm('can_edit_app_wallet'))
          WITH CHECK (public.mk_perm('can_edit_app_wallet'));

-- =============================================
-- RLS: mk_app_backlog_items
-- =============================================
ALTER TABLE public.mk_app_backlog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mk_anyone can read backlog" ON public.mk_app_backlog_items;
CREATE POLICY "mk_anyone can read backlog" ON public.mk_app_backlog_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "mk_admin can write backlog" ON public.mk_app_backlog_items;
CREATE POLICY "mk_admin can write backlog" ON public.mk_app_backlog_items
  FOR ALL USING (public.mk_perm('can_edit_app_wallet'))
          WITH CHECK (public.mk_perm('can_edit_app_wallet'));

-- =============================================
-- Bootstrap admin: johnny.khoihoang@gmail.com
-- =============================================
INSERT INTO public.mk_user_permissions (
  user_id, email, role,
  can_read_token_wallet, can_edit_token_wallet,
  can_read_payments, can_edit_payments,
  can_read_app_wallet, can_edit_app_wallet
)
SELECT
  u.id,
  u.email,
  'admin',
  true, true, true, true, true, true
FROM auth.users u
WHERE u.email = 'johnny.khoihoang@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  can_read_token_wallet = true,
  can_edit_token_wallet = true,
  can_read_payments = true,
  can_edit_payments = true,
  can_read_app_wallet = true,
  can_edit_app_wallet = true,
  updated_at = NOW();

-- Bootstrap admin: minkoi007.cs@gmail.com
INSERT INTO public.mk_user_permissions (
  user_id, email, role,
  can_read_token_wallet, can_edit_token_wallet,
  can_read_payments, can_edit_payments,
  can_read_app_wallet, can_edit_app_wallet
)
SELECT
  u.id,
  u.email,
  'admin',
  true, true, true, true, true, true
FROM auth.users u
WHERE u.email = 'minkoi007.cs@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  can_read_token_wallet = true,
  can_edit_token_wallet = true,
  can_read_payments = true,
  can_edit_payments = true,
  can_read_app_wallet = true,
  can_edit_app_wallet = true,
  updated_at = NOW();

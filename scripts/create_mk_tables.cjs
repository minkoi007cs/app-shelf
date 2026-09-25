/**
 * Create mk_* tables via direct PostgreSQL connection (bypasses RLS)
 * Uses the same DB as msozshwatonyxnkaqjfs but via pooler connection string
 * Run: node scripts/create_mk_tables.cjs
 *
 * NOTE: requires 'pg' package: npm install pg
 */
const { Client } = require('pg');

// msozshwatonyxnkaqjfs pooler connection (port 5432 = transaction mode)
// Password from .env DATABASE_URL → but that's xzmqeibqvgrthuisghvu
// We need the msozshwatonyxnkaqjfs password
// The anon key payload has ref=msozshwatonyxnkaqjfs, password from AppWallet config
const client = new Client({
  connectionString: 'postgresql://postgres.msozshwatonyxnkaqjfs:[DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const SQL = `
-- mk_app_projects
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
  last_updated BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mk_app_backlog_items
CREATE TABLE IF NOT EXISTS public.mk_app_backlog_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.mk_app_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mk_user_permissions
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

-- Helper function
CREATE OR REPLACE FUNCTION public.mk_perm(flag text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE flag
      WHEN 'can_edit_app_wallet' THEN p.can_edit_app_wallet
      WHEN 'is_admin'            THEN (p.role = 'admin')
      ELSE false
    END
    FROM public.mk_user_permissions p
    WHERE p.user_id = auth.uid()
  ), false);
$$;

-- RLS
ALTER TABLE public.mk_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mk_app_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mk_app_backlog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mk_read own or admin" ON public.mk_user_permissions;
CREATE POLICY "mk_read own or admin" ON public.mk_user_permissions
  FOR SELECT USING (user_id = auth.uid() OR public.mk_perm('is_admin'));
DROP POLICY IF EXISTS "mk_self register unprivileged" ON public.mk_user_permissions;
CREATE POLICY "mk_self register unprivileged" ON public.mk_user_permissions
  FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'user' AND can_edit_app_wallet = false);
DROP POLICY IF EXISTS "mk_admin manages permissions" ON public.mk_user_permissions;
CREATE POLICY "mk_admin manages permissions" ON public.mk_user_permissions
  FOR UPDATE USING (public.mk_perm('is_admin')) WITH CHECK (public.mk_perm('is_admin'));

DROP POLICY IF EXISTS "mk_anyone reads projects" ON public.mk_app_projects;
CREATE POLICY "mk_anyone reads projects" ON public.mk_app_projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "mk_admin writes projects" ON public.mk_app_projects;
CREATE POLICY "mk_admin writes projects" ON public.mk_app_projects
  FOR ALL USING (public.mk_perm('can_edit_app_wallet')) WITH CHECK (public.mk_perm('can_edit_app_wallet'));

DROP POLICY IF EXISTS "mk_anyone reads backlog" ON public.mk_app_backlog_items;
CREATE POLICY "mk_anyone reads backlog" ON public.mk_app_backlog_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "mk_admin writes backlog" ON public.mk_app_backlog_items;
CREATE POLICY "mk_admin writes backlog" ON public.mk_app_backlog_items
  FOR ALL USING (public.mk_perm('can_edit_app_wallet')) WITH CHECK (public.mk_perm('can_edit_app_wallet'));
`;

async function run() {
  await client.connect();
  console.log('Connected. Creating mk_ tables...');
  await client.query(SQL);
  console.log('✅ mk_ tables created successfully!');
  await client.end();
}

run().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});

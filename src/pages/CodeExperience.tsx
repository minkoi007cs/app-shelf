import { useState } from 'react';

interface Section {
  id: string;
  icon: string;
  title: string;
  auditPrompt: string;
  content: React.ReactNode;
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="note-codeblock">
      <div className="note-codeblock-header">
        <span className="note-lang">{lang}</span>
        <button className="note-copy-btn" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
      </div>
      <pre><code>{code.trim()}</code></pre>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="note-step">
      <div className="note-step-num">{n}</div>
      <div className="note-step-body">{children}</div>
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className="note-tag" style={{ background: color + '22', color, border: `1px solid ${color}44` }}>{children}</span>;
}

function Alert({ type, children }: { type: 'tip' | 'warn' | 'info'; children: React.ReactNode }) {
  const map = { tip: { icon: '💡', color: '#10b981' }, warn: { icon: '⚠️', color: '#f59e0b' }, info: { icon: 'ℹ️', color: '#6366f1' } };
  const { icon, color } = map[type];
  return (
    <div className="note-alert" style={{ borderLeft: `3px solid ${color}`, background: color + '11' }}>
      <span>{icon}</span>
      <div>{children}</div>
    </div>
  );
}

export default function CodeExperience() {
  const [activeSection, setActiveSection] = useState('google-auth');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  function copyFullChecklist() {
    const markdown = `# 📋 FULL PROJECT AUDIT CHECKLIST FOR AI REVIEW & ENGINEERING VALIDATION

Audit the entire source code and system configuration of the current project against these mandatory technical specifications:

## 1. 🔑 Google Login & Supabase Auth Integration
- [ ] Enable Google OAuth Provider in Supabase Dashboard with Authorized Redirect URI \`https://<project-ref>.supabase.co/auth/v1/callback\`
- [ ] Utilize Supabase Auth (\`@supabase/supabase-js\`) for Google Login using \`VITE_SUPABASE_URL\` & \`VITE_SUPABASE_ANON_KEY\` (Vite) or \`NEXT_PUBLIC_SUPABASE_URL\` & \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` (Next.js App Router)
- [ ] Enforce 1-Hour JWT Expiry (3600s) in Supabase Dashboard (Auth -> JWT Expiry Limit) for security and automatic background token rotation
- [ ] Login trigger calls \`signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })\`
- [ ] Listen to real-time session updates via \`supabase.auth.onAuthStateChange\`
- [ ] Verify active session on all Protected Routes prior to rendering UI
- [ ] Enforce Row Level Security (RLS) across all user data tables (\`auth.uid() = user_id\`)

## 2. 🚀 Monorepo Architecture & Vercel Deployment
- [ ] Standardized Monorepo folder layout (\`apps/web\`, \`apps/api\`, \`packages/shared\`)
- [ ] Root Directory in Vercel Project accurately points to target app folder (\`apps/web\` or \`apps/api\`)
- [ ] Configure frontend environment variables with \`VITE_\` (or \`NEXT_PUBLIC_\`) prefix in Vercel Project Settings
- [ ] Provide \`vercel.json\` serverless configuration for Express/NestJS backend APIs
- [ ] Configure Custom Domain CNAME \`cname.vercel-dns.com\` and verify SSL certificates

## 3. 🔌 Deterministic Port Allocation for Local Dev (Non-Docker)
- [ ] Define fixed \`port\` for frontend in \`vite.config.ts\` (or \`next dev -p <port>\` in \`package.json\`)
- [ ] Enable \`strictPort: true\` in \`vite.config.ts\` to prevent unexpected port jumping when busy
- [ ] Configure isolated environment \`PORT\` for Express / NestJS backend APIs (e.g. 5001, 5002...)
- [ ] Whitelist local development ports \`http://localhost:<port>/**\` in Supabase Auth Redirect URLs

## 4. 🔄 Shared Auth & Cross-App Redirection Isolation
- [ ] Whitelist exact Production and Localhost domains for every satellite app in Supabase Auth Redirect URLs
- [ ] Always pass explicit \`redirectTo: window.location.origin\` (or exact callback path) during \`signInWithOAuth\`
- [ ] Apply RLS / App Scope Isolation (e.g., \`user_app_access\` table) to govern per-application launch permissions

## 5. 💻 Minimalist & Hardened Environment Variables Configuration
- [ ] **Minimalist Configuration:** Only declare strictly necessary variables, never emit boilerplate or dead env keys
- [ ] **Supabase Google Auth:** Declare \`VITE_SUPABASE_URL\` & \`VITE_SUPABASE_ANON_KEY\` (Vite) or \`NEXT_PUBLIC_*\` (Next.js)
- [ ] **1-Hour JWT Expiration:** Enforce 3600s token duration and confirm client SDK auto-refresh behavior
- [ ] **Direct Database Connections:** Supply \`DATABASE_URL\` (Postgres Pooling URL) only when backend/ORM requires direct database operations
- [ ] **AI Integrations:** Supply \`OPENAI_API_KEY\` and \`GEMINI_API_KEY\` only when AI features are present
- [ ] **Explicit Consent Rule:** Always consult user prior to introducing any configuration variables outside standard specification
- [ ] Private \`.env.local\` points to Remote Supabase (\`*.supabase.co\`); strictly forbid committing \`.env\` or secret tokens to Git
- [ ] Maintain synchronized sample templates \`.env.example\` and \`.env.sample\` with correct production placeholders
- [ ] Configure CORS on backend APIs allowing \`http://localhost:<port>\` origin access

## 6. 🗄️ Supabase Schema & Realtime Best Practices
- [ ] Every newly created database table MUST include a designated Project Prefix (e.g. \`tkw_*\`, \`fml_*\`, \`ld_*\`) to eliminate table collision in shared databases
- [ ] Mirror authenticated users into \`public.profiles\` linked to \`auth.users(id)\` via Postgres trigger \`on_auth_user_created\`
- [ ] Implement standard RLS patterns: Users read/write own records (\`auth.uid() = user_id\`), Admins full access
- [ ] Utilize \`supabase.channel()\` for Realtime subscriptions with complete cleanup on unmount
- [ ] Store files in Supabase Storage buckets governed by secure public/private policies

## 7. ⚙️ Code Quality & Production Readiness
- [ ] Strict TypeScript compliance (\`noImplicitAny\`, \`strictNullChecks\`)
- [ ] Enforce \`type-only imports\` when \`verbatimModuleSyntax\` is active
- [ ] Dedicated Loading indicators and Error Boundaries for all asynchronous data flows
- [ ] Zero secret leaks; maintain clean \`.gitignore\` ignoring all \`.env\` variations and node artifacts

## 8. 🎲 Automated Mock Seed Data Scripts
- [ ] Include automated seed generator in \`scripts/seed-mock-data.ts\` (or SQL seed script)
- [ ] Generate rich and realistic domain datasets (Users, Projects, Analytics metrics, Activity logs)
- [ ] Expose \`npm run db:seed\` script in \`package.json\` for on-demand environment re-creation

## 9. 🧹 Database Cleanup & Reset Automation (Fresh Deployment)
- [ ] Include safe database truncate script in \`scripts/clean-db.ts\` (or SQL cleanup script)
- [ ] Cascade records in reverse foreign key constraint order to avoid constraint violations
- [ ] Expose \`npm run db:clean\` and \`npm run db:reset\` scripts in \`package.json\` for clean handoffs

## 10. 🎨 UI/UX Standards & Anti-AI Design Philosophy
- [ ] Preserve 100% of working business logic, state management, and operational routes during UI work
- [ ] Every app must feature custom-crafted, distinct Logos and Favicons (never use default Vite/React icons)
- [ ] Eliminate generic AI artifacts: excessive generic gradients, gratuitous glassmorphism, redundant badge clusters
- [ ] Maintain responsive breakpoints (Mobile, Tablet, Desktop) and rigorous WCAG color contrast standards

## 11. 👤 Profile, Role-Based Access Control (RBAC) & Multi-Tenant Groups
- [ ] **Track Profile Logins:** Synchronize user profile attributes on login via PostgreSQL trigger into \`public.profiles\`
- [ ] **Self-Service Profile Management:** Allow users to update display names, avatars, and contact preferences
- [ ] **Admin Governance:** Dedicated administration panel managing user permissions and module read/write flags
- [ ] **Multi-Tenant Group / Family Model:** Enable users to instantiate isolated groups, invite members, and assign delegated administrators
`;
    navigator.clipboard.writeText(markdown);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  }

  function copyAuditPrompt(sectionId: string, promptText: string) {
    navigator.clipboard.writeText(promptText.trim());
    setCopiedPromptId(sectionId);
    setTimeout(() => setCopiedPromptId(null), 2200);
  }

  const sections: Section[] = [
    {
      id: 'google-auth',
      icon: '🔑',
      title: 'Google Login + Supabase Auth',
      auditPrompt: `Use skills \`source-driven-development\` and \`security-and-hardening\` to audit and upgrade Google OAuth + Supabase Auth integration:

1. Audit \`supabaseClient\` in \`utils/supabaseClient.ts\`: Must use \`@supabase/supabase-js\` with \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` (Vite) or \`NEXT_PUBLIC_*\` (Next.js).
2. Verify 1-hour JWT token expiration (3600s) in Supabase Dashboard (Auth -> JWT Expiry Limit) and check SDK session auto-refresh.
3. Verify \`signInWithOAuth\` in AuthContext passes \`provider: 'google'\` and \`options: { redirectTo: window.location.origin }\`.
4. Verify dynamic session synchronization via \`supabase.auth.onAuthStateChange\` and route guard wrappers.
5. Check Row Level Security (RLS) across all user tables (\`auth.uid() = user_id\`).
6. Upgrade codebase if any gaps or missing standard patterns are identified.`,
      content: (
        <div className="note-content">
          <h2>Google OAuth with Supabase Authentication</h2>
          <p className="note-desc">Authentication Flow: <strong>User → Google → Supabase Auth → Application</strong>. Supabase acts as the secure OAuth broker; client applications never handle raw user passwords.</p>

          <h3>Architecture Overview</h3>
          <div className="note-arch-flow">
            <div className="arch-box">Browser</div>
            <div className="arch-arrow">→ signInWithOAuth</div>
            <div className="arch-box">Google</div>
            <div className="arch-arrow">→ redirect + code</div>
            <div className="arch-box arch-box-accent">Supabase Auth</div>
            <div className="arch-arrow">→ session JWT</div>
            <div className="arch-box">Application</div>
          </div>

          <h3>Step 1 — Create Google Cloud OAuth Credentials</h3>
          <Step n={1}>
            <p>Navigate to <strong>Google Cloud Console</strong> → APIs &amp; Services → Credentials → <em>Create Credentials → OAuth 2.0 Client ID</em></p>
          </Step>
          <Step n={2}>
            <p>Application type: <Tag color="#6366f1">Web application</Tag></p>
            <p>Add <strong>Authorized redirect URIs</strong>:</p>
            <CodeBlock lang="text" code={`https://<project-ref>.supabase.co/auth/v1/callback`} />
            <Alert type="warn">Always provide the Supabase callback URI, never the application URL directly. Supabase processes the OAuth callback before redirecting back to your application.</Alert>
          </Step>
          <Step n={3}>
            <p>Copy the generated <Tag color="#10b981">Client ID</Tag> and <Tag color="#10b981">Client Secret</Tag></p>
          </Step>

          <h3>Step 2 — Configure Supabase Authentication</h3>
          <Step n={1}>
            <p>Open <strong>Supabase Dashboard</strong> → Authentication → Providers → Google → Enable</p>
            <p>Paste your Client ID and Client Secret from the previous step.</p>
          </Step>
          <Step n={2}>
            <p>Configure <strong>Redirect URLs</strong> under Authentication → URL Configuration:</p>
            <CodeBlock lang="text" code={`https://apps.minkoi.org/**
http://localhost:5173/**`} />
          </Step>

          <h3>Step 3 — Frontend Client Integration</h3>
          <Alert type="info">Standardize on <code>@supabase/supabase-js</code>. No additional third-party SDK is required for Google OAuth.</Alert>

          <CodeBlock lang="typescript" code={`// utils/supabaseClient.ts (Vite)
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);`} />

          <CodeBlock lang="typescript" code={`// AuthContext.tsx — Initiating Google Login
async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin, // Return to current origin post-login
    },
  });
}

// Listening for dynamic session state changes
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user; // { id, email, user_metadata: { full_name, avatar_url } }
});

// Retrieve active session during startup
const { data: { session } } = await supabase.auth.getSession();`} />

          <h3>Step 4 — Row Level Security (RLS)</h3>
          <p>Supabase utilizes authenticated JWT payloads to authorize requests against PostgreSQL tables. Enforce RLS across user tables:</p>
          <CodeBlock lang="sql" code={`-- Enable RLS on target table
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Allow users to select only their own records
CREATE POLICY "Users read own data"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert records attributed to their ID
CREATE POLICY "Users insert own data"
  ON your_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Query the authenticated user's email directly in SQL
SELECT auth.jwt() ->> 'email';`} />

          <Alert type="tip">
            <strong>auth.uid()</strong> resolves to the UUID of the currently authenticated user, mapping to <code>session.user.id</code> on the client. Always utilize this as the canonical foreign key.
          </Alert>

          <h3>Environment Variables</h3>
          <CodeBlock lang="bash" code={`# .env.local (Vite)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Note: The Anon key is public and designed to be exposed to client browsers safely.
# The Service Role key is strictly secret and must NEVER be bundled in client bundles.`} />
        </div>
      )
    },
    {
      id: 'monorepo-vercel',
      icon: '🚀',
      title: 'Monorepo on Vercel',
      auditPrompt: `Use skills \`ci-cd-and-automation\` and \`web-app-standards\` to audit and optimize Monorepo structure and Vercel deployments:

1. Verify monorepo directory layout (\`apps/web\`, \`apps/api\`, \`packages/shared\`) and root \`package.json\` workspaces.
2. Check \`turbo.json\` pipeline configurations and individual app build scripts.
3. Validate \`vercel.json\` serverless function routes for backend services.
4. Verify environment variable prefixes (\`VITE_\` for browser-exposed configs).
5. Ensure zero secret leaks in client builds.`,
      content: (
        <div className="note-content">
          <h2>Monorepo Deployment on Vercel</h2>
          <p className="note-desc">A unified repository housing multiple frontend and backend services, deployed independently to dedicated Vercel projects from a single codebase.</p>

          <h3>Directory Structure</h3>
          <CodeBlock lang="text" code={`my-monorepo/
├── apps/
│   ├── web/          ← Frontend Client (React/Next.js/Vite)
│   │   ├── package.json
│   │   └── src/
│   └── api/          ← Backend API (Express/NestJS Serverless)
│       ├── package.json
│       └── src/
├── packages/
│   └── shared/       ← Shared Utilities, Types & Schemas
│       └── package.json
├── package.json      ← Root workspace orchestrator
└── turbo.json        ← Turborepo pipeline configuration`} />

          <h3>Root Workspace Configuration</h3>
          <CodeBlock lang="json" code={`{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "build:web": "turbo build --filter=web",
    "build:api": "turbo build --filter=api"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}`} />

          <h3>Vercel Project Setup</h3>
          <Alert type="info">Each service within the monorepo corresponds to an isolated Vercel project with its own Root Directory setting.</Alert>

          <Step n={1}>
            <p>Vercel Dashboard → <strong>Add New Project</strong> → Import repository</p>
          </Step>
          <Step n={2}>
            <p>Configure <strong>Root Directory</strong> to point to the targeted app directory:</p>
            <CodeBlock lang="text" code={`Root Directory:  apps/web
Framework:       Vite / Next.js
Build Command:   npm run build
Output Dir:      dist`} />
          </Step>

          <h3>API Serverless Configuration (vercel.json)</h3>
          <CodeBlock lang="json" code={`// apps/api/vercel.json
{
  "version": 2,
  "builds": [{ "src": "dist/main.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "dist/main.js" }]
}`} />

          <h3>Custom Domain Setup</h3>
          <Step n={1}><p>Project Settings → Domains → Add <code>apps.minkoi.org</code></p></Step>
          <Step n={2}><p>Configure DNS CNAME record pointing to Vercel edge:</p>
            <CodeBlock lang="text" code={`Type:  CNAME
Name:  apps
Value: cname.vercel-dns.com`} />
          </Step>
        </div>
      )
    },
    {
      id: 'supabase-schema',
      icon: '🗄️',
      title: 'Supabase Schema Standards',
      auditPrompt: `Use skills \`web-app-standards\` and \`security-and-hardening\` to audit and standardize Supabase Database Schemas:

1. Verify table prefix convention: Every new table MUST carry a distinct project prefix (e.g. \`tkw_*\`, \`ld_*\`).
2. Verify \`public.profiles\` links to \`auth.users(id)\` via Postgres trigger \`on_auth_user_created\`.
3. Verify RLS is enabled on 100% of user data tables.
4. Verify Realtime subscriptions cleanly unsubscribe on component unmount.
5. Upgrade SQL schema migrations accordingly.`,
      content: (
        <div className="note-content">
          <h2>Standardized Database Schema &amp; Security</h2>

          <h3>Mandatory Project Table Prefixes</h3>
          <Alert type="warn">
            <strong>CRITICAL:</strong> When multiple web applications share a common Supabase PostgreSQL instance, all tables <strong>MUST include a unique project prefix</strong> to eliminate naming collisions and accidental data overwrites.
          </Alert>

          <div className="user-mgmt-table-wrap" style={{ margin: '16px 0' }}>
            <table className="user-mgmt-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Project Name</th>
                  <th>Prefix</th>
                  <th style={{ textAlign: 'left' }}>Sample Tables in Database</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="user-email-cell">⚡ App Shelf</td>
                  <td><Tag color="#10b981">tkw_ / aw_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>aw_app_projects</code>, <code>aw_app_backlog_items</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">🚀 Apps System</td>
                  <td><Tag color="#10b981">as_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>as_tenants</code>, <code>as_routing_rules</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">⚡ LifeDashboard</td>
                  <td><Tag color="#10b981">ld_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>ld_habits</code>, <code>ld_tasks</code>, <code>ld_finances</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">🏡 House Renting</td>
                  <td><Tag color="#10b981">hr_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>hr_leases</code>, <code>hr_utilities</code>, <code>hr_invoices</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>User Profiles Mirror Table</h3>
          <Alert type="info">Supabase manages <code>auth.users</code> internally. Applications mirror public user attributes into <code>public.profiles</code>.</Alert>
          <CodeBlock lang="sql" code={`CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`} />
        </div>
      )
    },
    {
      id: 'multi-app-auth',
      icon: '🔄',
      title: 'Shared Auth & Redirect Guard',
      auditPrompt: `Audit shared Supabase Authentication and redirection isolation across multi-app environments:

1. Verify applications do not fallback to default Site URL upon Google OAuth return.
2. Confirm signInWithOAuth always supplies explicit \`redirectTo: window.location.origin\`.
3. Provide complete whitelist of production and development redirect URLs.
4. Verify tenant / app isolation policies.`,
      content: (
        <div className="note-content">
          <h2>Shared Authentication &amp; Redirection Isolation</h2>
          <p className="note-desc">Preventing unexpected cross-app redirect loops when multiple satellite applications share a single authentication provider.</p>

          <h3>Preventing Fallback Redirects</h3>
          <p>By default, if an OAuth login callback does not match an approved redirect URL, Supabase will fall back to the project root <strong>Site URL</strong>. To guarantee users remain in their current application:</p>

          <Step n={1}>
            <p>In <strong>Supabase Dashboard → Authentication → URL Configuration</strong>, register wildcard domain patterns:</p>
            <CodeBlock lang="text" code={`https://apps.minkoi.org/**
https://mikoi-life.vercel.app/**
https://apps-system.vercel.app/**
https://house-renting-frontend.vercel.app/**
https://embeded-system.vercel.app/**
https://learning-ai-pink-one.vercel.app/**
http://localhost:5173/**`} />
          </Step>

          <Step n={2}>
            <p>Always transmit dynamic origin during login:</p>
            <CodeBlock lang="typescript" code={`await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: \`\${window.location.origin}/\`,
  },
});`} />
          </Step>
        </div>
      )
    },
    {
      id: 'local-dev-supabase',
      icon: '💻',
      title: 'Environment & Configuration',
      auditPrompt: `Audit and sanitize environment variables and configuration files:

1. Minimalist config bar: eliminate any unused boilerplate variables.
2. Verify \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\`.
3. Enforce 1-hour JWT token expiration policy.
4. Verify \`DATABASE_URL\` is restricted to server environments.
5. Confirm \`.env.local\` is excluded from Git.`,
      content: (
        <div className="note-content">
          <h2>Minimalist Configuration &amp; Hardened Secrets</h2>
          <p className="note-desc">Core Rule: Only declare variables strictly required by runtime code. Never introduce speculative or redundant parameters.</p>

          <h3>Standard Variable Schema</h3>
          <CodeBlock lang="bash" code={`# 1. Supabase Client & Auth (Browser Exposed)
VITE_SUPABASE_URL=https://msozshwatonyxnkaqjfs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...

# 2. Direct Database Connection (Server / Backend Only)
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres

# 3. AI Service Keys (Optional)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...`} />
        </div>
      )
    },
    {
      id: 'local-ports',
      icon: '🔌',
      title: 'Deterministic Port Planning',
      auditPrompt: `Audit local development port assignments:

1. Ensure \`vite.config.ts\` specifies a static \`server.port\` and enables \`strictPort: true\`.
2. Check backend API ports to prevent port hopping.
3. Validate CORS whitelists for local port ranges.`,
      content: (
        <div className="note-content">
          <h2>Deterministic Port Allocation</h2>
          <p className="note-desc">Static port bindings prevent OAuth callback failures and CORS rejections caused by automatic port incrementation.</p>

          <CodeBlock lang="typescript" code={`// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Fail immediately rather than jumping to 5174
  },
});`} />
        </div>
      )
    },
    {
      id: 'code-quality',
      icon: '⚙️',
      title: 'Code Quality & TypeScript Rigor',
      auditPrompt: `Audit codebase against TypeScript strictness and production reliability standards:

1. Enforce strictNullChecks and noImplicitAny.
2. Verify type-only imports for module safety.
3. Verify comprehensive Loading and Error states for all async hooks.`,
      content: (
        <div className="note-content">
          <h2>TypeScript Rigor &amp; Robustness</h2>
          <p className="note-desc">Zero runtime exceptions through strict typing contracts and resilient asynchronous UI states.</p>

          <CodeBlock lang="json" code={`// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true
  }
}`} />
        </div>
      )
    },
    {
      id: 'mock-seed',
      icon: '🎲',
      title: 'Automated Mock Seed Data',
      auditPrompt: `Audit and implement mock seed data scripts:

1. Verify presence of \`scripts/seed-mock-data.ts\`.
2. Ensure realistic sample data covering all key entity states.
3. Verify \`npm run db:seed\` executes seamlessly.`,
      content: (
        <div className="note-content">
          <h2>Automated Mock Seed Generator</h2>
          <p className="note-desc">Every application must maintain automated scripts to populate rich, realistic test data for UI verification and development.</p>

          <CodeBlock lang="typescript" code={`// scripts/seed-mock-data.ts
import { createClient } from '@supabase/supabase-js';

async function seedMockData() {
  console.log('🚀 Seeding realistic mock dataset...');
  // Populate entities with deterministic IDs and realistic content
  console.log('✓ Mock data seeded successfully.');
}

seedMockData().catch(console.error);`} />
        </div>
      )
    },
    {
      id: 'clean-db',
      icon: '🧹',
      title: 'Database Reset & Clean Automation',
      auditPrompt: `Audit database reset and cleanup mechanisms:

1. Verify existence of \`scripts/clean-db.ts\`.
2. Verify foreign key deletion order to prevent cascade violations.
3. Confirm \`npm run db:clean\` and \`npm run db:reset\` scripts work reliably.`,
      content: (
        <div className="note-content">
          <h2>Clean Database Reset for Production Handoff</h2>
          <p className="note-desc">A single command to safely wipe transient development data and return the schema to a clean, production-ready zero state.</p>

          <CodeBlock lang="json" code={`// package.json scripts
{
  "scripts": {
    "db:seed": "tsx scripts/seed-mock-data.ts",
    "db:clean": "tsx scripts/clean-db.ts",
    "db:reset": "npm run db:clean && npm run db:seed"
  }
}`} />
        </div>
      )
    },
    {
      id: 'ui-standards',
      icon: '🎨',
      title: 'UI/UX & Anti-AI Design Philosophy',
      auditPrompt: `Audit frontend design against production quality standards:

1. Ensure custom, unique Logo and Favicon (no default framework icons).
2. Remove generic AI aesthetics (meaningless gradients, excessive cards).
3. Verify responsive layout, keyboard accessibility, and WCAG contrast.`,
      content: (
        <div className="note-content">
          <h2>Production Quality UI/UX Engineering</h2>
          <p className="note-desc">Crafting deliberate, human-centric user interfaces with clear typographic hierarchy and distinctive visual identities.</p>

          <Alert type="tip">
            Every application must carry a unique SVG favicon and custom brand identity reflecting its domain purpose.
          </Alert>
        </div>
      )
    },
    {
      id: 'rbac-family',
      icon: '👤',
      title: 'RBAC & Multi-Tenant Groups',
      auditPrompt: `Audit user profile management, RBAC, and multi-tenant family/group architectures:

1. Automatic synchronization of logins into \`public.profiles\`.
2. Self-serve profile editing interface.
3. Administrative permission control matrix.
4. Multi-tenant group or family model architecture.`,
      content: (
        <div className="note-content">
          <h2>Role-Based Access Control (RBAC) &amp; Multi-Tenant Groups</h2>
          <p className="note-desc">Comprehensive user governance, granular feature permissions, and self-managed collaborative organization units.</p>

          <CodeBlock lang="sql" code={`CREATE TABLE public.tkw_user_permissions (
  user_id text PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  can_read_app_wallet boolean NOT NULL DEFAULT true,
  can_edit_app_wallet boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);`} />
        </div>
      )
    },
  ];

  const currentSection = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="note-container">
      {/* Hero Header */}
      <div className="note-hero">
        <div className="note-hero-badge">Architecture &amp; Engineering Standards</div>
        <h1>Web App Engineering Standards</h1>
        <p>Production checklist, deployment practices, and architectural standards for modern digital products.</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={copyFullChecklist}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>📋</span>
            <span>{copiedAll ? '✓ Copied Full Checklist!' : 'Copy Full Audit Checklist (Markdown)'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="note-layout">
        {/* Navigation Sidebar */}
        <aside className="note-sidebar">
          <div className="note-nav-title">Standard Modules</div>
          <nav className="note-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`note-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="note-nav-icon">{section.icon}</span>
                <span className="note-nav-text">{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Section View */}
        <main className="note-main">
          <div className="note-action-bar">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copyAuditPrompt(currentSection.id, currentSection.auditPrompt)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>🤖</span>
              <span>{copiedPromptId === currentSection.id ? '✓ Copied Prompt!' : 'Copy AI Audit Prompt for this Module'}</span>
            </button>
          </div>

          {currentSection.content}
        </main>
      </div>
    </div>
  );
}

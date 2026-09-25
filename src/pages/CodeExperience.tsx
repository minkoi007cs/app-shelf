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
    const markdown = `# 📋 PROJECT AUDIT CHECKLIST FOR AI REVIEW & CODE VALIDATION

Hãy kiểm tra toàn bộ mã nguồn và cấu hình của dự án hiện tại đối chiếu với danh sách các tiêu chuẩn kỹ thuật bắt buộc dưới đây:

## 1. 🔑 Google Login & Supabase Auth Integration
- [ ] Bật Google OAuth Provider trong Supabase Dashboard với Authorized Redirect URI \`https://<project-ref>.supabase.co/auth/v1/callback\`
- [ ] Dùng Supabase Auth (\`@supabase/supabase-js\`) cho Google Login với \`VITE_SUPABASE_URL\` & \`VITE_SUPABASE_ANON_KEY\` nếu dùng Vite, hoặc \`NEXT_PUBLIC_SUPABASE_URL\` & \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` nếu code Next.js App Router
- [ ] Cấu hình JWT Token Expired sau 1h (3600s) trong Supabase Dashboard (Auth -> JWT Expiry Limit) để đảm bảo an toàn và tự động refresh session
- [ ] Nút login gọi \`signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })\`
- [ ] Lắng nghe session thay đổi tự động qua \`supabase.auth.onAuthStateChange\`
- [ ] Kiểm tra session trên mọi Protected Route trước khi render UI
- [ ] Khai báo Row Level Security (RLS) cho tất cả bảng DB liên quan đến User (\`auth.uid() = user_id\`)

## 2. 🚀 Monorepo & Vercel Deployment
- [ ] Cấu trúc folder chuẩn Monorepo (\`apps/web\`, \`apps/api\`, \`packages/shared\`)
- [ ] Root Directory trong Vercel Project trỏ chính xác tới thư mục app (\`apps/web\` hoặc \`apps/api\`)
- [ ] Cấu hình biến môi trường Frontend có tiền tố \`VITE_\` (hoặc \`NEXT_PUBLIC_\`) trong Vercel Settings
- [ ] Cấu hình \`vercel.json\` cho Backend Serverless (Express/NestJS)
- [ ] Cấu hình Custom Domain CNAME \`cname.vercel-dns.com\` và SSL Certificate

## 3. 🔌 Quy Hoạch Port Cố Định Cho Local Dev (Non-Docker)
- [ ] Khai báo \`port\` cố định cho Frontend trong \`vite.config.ts\` (hoặc \`package.json\` \`next dev -p <port>\`)
- [ ] Bật \`strictPort: true\` trong \`vite.config.ts\` để ép không tự đổi port khi port bận
- [ ] Cấu hình \`PORT\` môi trường riêng cho Backend API Express / NestJS (e.g. 5001, 5002...)
- [ ] Thêm dải port local \`http://localhost:<port>/**\` vào Supabase Auth Additional Redirect URLs Whitelist

## 4. 🔄 Shared Auth & Chống Redirect Sai Sub-App
- [ ] Khai báo chính xác domain Production và Localhost của từng sub-app vào Supabase Auth Redirect URLs Whitelist
- [ ] Luôn truyền \`redirectTo: window.location.origin\` (hoặc exact callback path) khi gọi \`signInWithOAuth\`
- [ ] Áp dụng RLS / App Scope Isolation (e.g., bảng \`user_app_access\`) nếu cần kiểm soát quyền mở từng app

## 5. 💻 Cấu Hình & Environment Variables (Tối Thiểu Hóa & Chuẩn Bảo Mật)
- [ ] **Tối thiểu hóa cấu hình:** Chỉ khai báo các biến môi trường thực sự cần thiết, tuyệt đối không tạo biến thừa
- [ ] **Login Google qua Supabase:** Khai báo \`VITE_SUPABASE_URL\` & \`VITE_SUPABASE_ANON_KEY\` (Vite) hoặc \`NEXT_PUBLIC_SUPABASE_URL\` & \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` (Next.js)
- [ ] **JWT Token Expired sau 1h:** Cấu hình thời hạn JWT token hết hạn sau 1h (3600s), xử lý auto refresh token
- [ ] **Có đọc/lưu database trực tiếp:** Nếu app có đọc/lưu data ở Server/API/Node/Prisma/Drizzle, bổ sung \`DATABASE_URL\` (Postgres Pooling URL)
- [ ] **Có AI Function:** Nếu app có tính năng AI, bổ sung đúng 2 API key: \`OPENAI_API_KEY\` và \`GEMINI_API_KEY\`
- [ ] **Quy tắc bắt buộc:** Ngoài các cấu hình trên, BẮT BUỘC PHẢI HỎI Ý KIẾN NGƯỜI DÙNG trước khi thêm bất kỳ cấu hình hay biến môi trường nào khác
- [ ] File \`.env.local\` ở máy cá nhân trỏ tới Remote Supabase Project (\`*.supabase.co\`), cấm commit \`.env\` / \`.env.local\` vào Git
- [ ] Cung cấp đầy đủ file mẫu \`.env.example\` và \`.env.sample\` đồng bộ với cấu hình thực tế
- [ ] Cấu hình CORS cho Backend API Express/NestJS cho phép origin \`http://localhost:<port>\` gọi API
- [ ] Test quy trình Google Login tại Localhost quay về đúng domain local \`http://localhost:<port>\`

## 6. 🗄️ Supabase Schema & Realtime Best Practices
- [ ] Mọi bảng Database tạo mới BẮT BUỘC phải có tiền tố (Project Prefix) riêng biệt (e.g. tkw_*, fml_*, lnd_*, beth_*) để tránh xung đột tên bảng khi dùng chung Supabase DB
- [ ] Tạo bảng \`public.profiles\` link với \`auth.users(id)\` qua Postgres Trigger \`on_auth_user_created\`
- [ ] Áp dụng đúng RLS Pattern: User read/write own data (\`auth.uid() = user_id\`), Admin full access
- [ ] Dùng \`supabase.channel()\` cho Realtime subscriptions và cleanup khi component unmount
- [ ] Upload file lên Supabase Storage với Bucket public/private policy phù hợp

## 7. ⚙️ Code Quality & Production Readiness
- [ ] Đạt chuẩn TypeScript strict mode (noImplicitAny, strictNullChecks)
- [ ] Sử dụng \`type-only imports\` khi bật \`verbatimModuleSyntax\`
- [ ] Có Loading state và Error boundaries cho mọi async data fetch
- [ ] Không commit file \`.env\`, \`.env.local\` hoặc secret keys vào Git repository; luôn duy trì file mẫu \`.env.example\` / \`.env.sample\` và khai báo \`.gitignore\` chuẩn

## 8. 🎲 Script Data Giả Lập (Mock Seed Data)
- [ ] Tích hợp script seed database giả lập trong \`scripts/seed-mock-data.ts\` (hoặc SQL seed script)
- [ ] Tạo dữ liệu mẫu thực tế & phong phú (User/Nhân viên, Bài giảng/Khóa học, Tiến độ & Analytics monitor đầy đủ)
- [ ] Khai báo lệnh \`npm run db:seed\` trong \`package.json\` để tái tạo môi trường dữ liệu mẫu bất cứ lúc nào

## 9. 🧹 Script Dọn Dẹp & Reset Database (Fresh Deployment)
- [ ] Tích hợp script xóa sạch dữ liệu DB trong \`scripts/clean-db.ts\` (hoặc SQL TRUNCATE script)
- [ ] Xóa đúng thứ tự ràng buộc khóa ngoại (Foreign Keys) để không bị vi phạm CASCADE constraints
- [ ] Khai báo các lệnh \`npm run db:clean\` và \`npm run db:reset\` trong \`package.json\` để sẵn sàng cho Fresh Deployment

## 10. 🎨 Quy Chuẩn Refactor UI Frontend (Skill frontend-design)
- [ ] Giữ nguyên 100% Business Logic, API Contract, Route, State Management và hành vi đang hoạt động (không tạo màn hình demo)
- [ ] Mọi Web hay App luôn phải có một Logo và Favicon được thiết kế & cấu hình đặc sắc riêng biệt (tuyệt đối không dùng favicon mặc định của Vite/React/Next.js)
- [ ] Loại bỏ các dấu vết "AI-generated UI" (card bo góc lặp lại vô cơ, gradient màu lố, glassmorphism vô cớ, layout dashboard nhàm chán, icon/badge dư thừa)
- [ ] Đọc & phân tích cấu trúc frontend, typography, design tokens trước khi sửa code
- [ ] Đề xuất 2 phương án visual direction phù hợp và chốt 1 phương án có Visual Hierarchy mạnh mẽ
- [ ] Kiểm tra responsive trên các breakpoint chính (Mobile, Tablet, Desktop) và các trạng thái Rỗng/Loading/Error, contrast & accessibility

## 11. 👤 Profile, Phân Quyền (RBAC) & Mô Hình Group/Family (User Groups)
- [ ] **Track Profile Login:** Tự động đồng bộ và lưu thông tin profile user khi đăng nhập qua Trigger PostgreSQL \`on_auth_user_created\` vào \`public.profiles\` (lưu ID, email, avatar_url, full_name, last_sign_in_at).
- [ ] **User Edit Profile:** Cung cấp modal/trang cho phép User tự chỉnh sửa thông tin cá nhân (Tên hiển thị, Avatar URL/Upload, Email liên hệ, Thông tin nghiệp vụ đặc thù của app).
- [ ] **Admin Permission Management:** Có trang hoặc khu vực dành riêng cho Admin để xem danh sách Users và phân quyền/cấp permission truy cập (ví dụ: \`role: 'admin' | 'user'\`, bật/tắt module truy cập \`can_read_*\`, \`can_edit_*\`).
- [ ] **Khảo sát Nhu cầu Group User / Gia đình:** Đánh giá app có yêu cầu dữ liệu theo nhóm/tổ chức/gia đình không.
- [ ] **Mô hình Group User / Gia đình (Multi-Tenant Family/Group Model):**
  - Bất kỳ User nào cũng có quyền tự tạo Group/Gia đình riêng cho mình (trở thành Group Owner/Creator).
  - Chủ Group có quyền mời (Invite) thành viên khác tham gia làm Member (qua email hoặc invite code).
  - Chủ Group có quyền bổ nhiệm/tạo thêm Admin cho Group/Gia đình của mình để cùng quản lý.
  - *Tham khảo kiến trúc chuẩn:* Đã áp dụng thành công trong dự án **Family Management** và **Mikawaii**.
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
      auditPrompt: `Dùng skill \`source-driven-development\` và \`security-and-hardening\` để audit và nâng cấp tích hợp Google OAuth + Supabase Auth trong ứng dụng này:

1. Kiểm tra cấu hình \`supabaseClient\` trong \`utils/supabaseClient.ts\`: Bắt buộc dùng Supabase Auth (\`@supabase/supabase-js\`) cho Google Login với \`VITE_SUPABASE_URL\` & \`VITE_SUPABASE_ANON_KEY\` (nếu dùng Vite) hoặc \`NEXT_PUBLIC_SUPABASE_URL\` & \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` (nếu code Next.js App Router).
2. Kiểm tra cấu hình JWT Token Expired sau 1h (3600s) trong Supabase Dashboard (Auth -> JWT Expiry Limit) và cơ chế tự động refresh session của SDK.
3. Kiểm tra hàm \`signInWithOAuth\` trong AuthContext đã truyền \`provider: 'google'\` và \`options: { redirectTo: window.location.origin }\`.
4. Kiểm tra tự động sync session qua \`supabase.auth.onAuthStateChange\` và bảo vệ Protected Routes.
5. Kiểm tra Row Level Security (RLS) cho tất cả các bảng DB liên quan (\`auth.uid() = user_id\`).
6. Cập nhật và nâng cấp mã nguồn nếu có bất kỳ điểm nào chưa chuẩn hoặc bị thiếu sót.`,
      content: (
        <div className="note-content">
          <h2>Google OAuth với Supabase Auth</h2>
          <p className="note-desc">Luồng xác thực: <strong>User → Google → Supabase Auth → App</strong>. Supabase làm OAuth broker, app không bao giờ xử lý password trực tiếp.</p>

          <h3>Kiến trúc</h3>
          <div className="note-arch-flow">
            <div className="arch-box">Browser</div>
            <div className="arch-arrow">→ signInWithOAuth</div>
            <div className="arch-box">Google</div>
            <div className="arch-arrow">→ redirect + code</div>
            <div className="arch-box arch-box-accent">Supabase Auth</div>
            <div className="arch-arrow">→ session JWT</div>
            <div className="arch-box">App</div>
          </div>

          <h3>Bước 1 — Tạo Google OAuth Credentials</h3>
          <Step n={1}>
            <p>Vào <strong>Google Cloud Console</strong> → APIs &amp; Services → Credentials → <em>Create Credentials → OAuth 2.0 Client ID</em></p>
          </Step>
          <Step n={2}>
            <p>Application type: <Tag color="#6366f1">Web application</Tag></p>
            <p>Thêm <strong>Authorized redirect URIs</strong>:</p>
            <CodeBlock lang="text" code={`https://<project-ref>.supabase.co/auth/v1/callback`} />
            <Alert type="warn">Phải thêm đúng redirect URI này, không thêm URL của app. Supabase sẽ nhận callback rồi mới redirect về app.</Alert>
          </Step>
          <Step n={3}>
            <p>Copy <Tag color="#10b981">Client ID</Tag> và <Tag color="#10b981">Client Secret</Tag></p>
          </Step>

          <h3>Bước 2 — Bật trong Supabase Dashboard</h3>
          <Step n={1}>
            <p><strong>Supabase Dashboard</strong> → Authentication → Providers → Google → Enable</p>
            <p>Điền Client ID + Client Secret từ bước trên.</p>
          </Step>
          <Step n={2}>
            <p>Thêm <strong>Redirect URLs</strong> trong Authentication → URL Configuration:</p>
            <CodeBlock lang="text" code={`https://your-app.vercel.app
http://localhost:5173`} />
          </Step>

          <h3>Bước 3 — Code phía Frontend</h3>
          <Alert type="info">Dùng <code>@supabase/supabase-js</code>. Không cần cài thêm gì cho Google OAuth.</Alert>

          <CodeBlock lang="typescript" code={`// utils/supabaseClient.ts (Vite)
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// lib/supabaseClient.ts (Next.js App Router)
// import { createClient } from '@supabase/supabase-js';
// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );`} />

          <CodeBlock lang="typescript" code={`// AuthContext.tsx — signInWithGoogle
async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin, // sau login quay về app
    },
  });
}

// Lắng nghe auth state thay đổi
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user; // { id, email, user_metadata: { full_name, avatar_url } }
});

// Lấy session hiện tại khi app load
const { data: { session } } = await supabase.auth.getSession();`} />

          <h3>Bước 4 — Row Level Security (RLS)</h3>
          <p>Supabase dùng JWT của Auth để xác thực mọi request đến DB. Bật RLS để protect data:</p>
          <CodeBlock lang="sql" code={`-- Bật RLS cho bảng
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- User chỉ đọc được data của chính mình
CREATE POLICY "Users read own data"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);

-- User chỉ insert được data của chính mình
CREATE POLICY "Users insert own data"
  ON your_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Lấy email của user đang login trong SQL
SELECT auth.jwt() ->> 'email';`} />

          <Alert type="tip">
            <strong>auth.uid()</strong> trả về UUID của user đang login, tương ứng với <code>session.user.id</code> trong frontend. Luôn dùng cái này làm foreign key để link data với user.
          </Alert>

          <h3>Variables môi trường</h3>
          <CodeBlock lang="bash" code={`# .env.local (Dành cho Vite)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# .env.local (Dành cho Next.js App Router)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Anon key là PUBLIC — an toàn để expose trong frontend
# Service Role key là PRIVATE — chỉ dùng ở server/backend`} />
        </div>
      )
    },
    {
      id: 'monorepo-vercel',
      icon: '🚀',
      title: 'Monorepo trên Vercel',
      auditPrompt: `Dùng skill \`ci-cd-and-automation\` và \`web-app-standards\` để audit và nâng cấp cấu trúc Monorepo & Deployment trên Vercel:

1. Kiểm tra cấu trúc thư mục Monorepo (\`apps/web\`, \`apps/api\`, \`packages/shared\`) và khai báo \`workspaces\` trong root \`package.json\`.
2. Kiểm tra file \`turbo.json\` hoặc cấu hình build command cho từng app (\`npm run build\`).
3. Kiểm tra file \`vercel.json\` cho Backend Express/NestJS serverless functions.
4. Kiểm tra các biến môi trường (Environment Variables) trong Vercel Settings, đảm bảo Frontend sử dụng tiền tố \`VITE_\` và secret keys không bị rò rỉ.
5. Cập nhật và nâng cấp cấu hình Monorepo & Vercel nếu còn thiếu sót.`,
      content: (
        <div className="note-content">
          <h2>Monorepo Deploy trên Vercel</h2>
          <p className="note-desc">Một repo chứa nhiều app (frontend + backend), mỗi app là 1 Vercel Project riêng trỏ vào đúng thư mục.</p>

          <h3>Cấu trúc thư mục</h3>
          <CodeBlock lang="text" code={`my-monorepo/
├── apps/
│   ├── web/          ← Frontend (React/Next.js)
│   │   ├── package.json
│   │   └── src/
│   └── api/          ← Backend (Express/NestJS/Next.js API)
│       ├── package.json
│       └── src/
├── packages/
│   └── shared/       ← Code dùng chung (types, utils)
│       └── package.json
├── package.json      ← Root workspace
└── turbo.json        ← (nếu dùng Turborepo)`} />

          <h3>Root package.json — Workspace</h3>
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

          <h3>turbo.json</h3>
          <CodeBlock lang="json" code={`{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}`} />

          <h3>Tạo Vercel Project cho từng app</h3>
          <Alert type="info">Mỗi app trong monorepo = 1 Vercel Project riêng. Deploy cùng lúc từ 1 repo.</Alert>

          <Step n={1}>
            <p>Vercel Dashboard → <strong>Add New Project</strong> → Import repo</p>
          </Step>
          <Step n={2}>
            <p>Cấu hình <strong>Root Directory</strong> = <code>apps/web</code> (chỉ trỏ vào thư mục của app đó)</p>
            <CodeBlock lang="text" code={`Root Directory:  apps/web
Framework:       Vite / Next.js / ...
Build Command:   npm run build    (hoặc turbo build --filter=web)
Output Dir:      dist             (hoặc .next cho Next.js)`} />
          </Step>
          <Step n={3}>
            <p>Lặp lại cho <code>apps/api</code> → tạo Project thứ 2</p>
            <CodeBlock lang="text" code={`Root Directory:  apps/api
Build Command:   npm run build
Output Dir:      dist`} />
          </Step>

          <h3>vercel.json — cấu hình từng app</h3>
          <CodeBlock lang="json" code={`// apps/api/vercel.json — Express/NestJS API
{
  "version": 2,
  "builds": [{ "src": "dist/main.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "dist/main.js" }]
}`} />

          <h3>Custom Domain</h3>
          <Step n={1}><p>Vercel Project → Settings → Domains → Add <code>family.minkoi.org</code></p></Step>
          <Step n={2}><p>DNS Provider → thêm CNAME record:</p>
            <CodeBlock lang="text" code={`Type:  CNAME
Name:  family
Value: cname.vercel-dns.com`} />
          </Step>
          <Step n={3}><p>Vercel tự cấp SSL certificate sau vài phút.</p></Step>

          <h3>Environment Variables cho Monorepo</h3>
          <Alert type="tip">Mỗi Vercel Project có env vars riêng. Không share giữa các project tự động.</Alert>
          <CodeBlock lang="bash" code={`# apps/web — VITE_ prefix để expose ra browser
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://api.family.minkoi.org

# apps/api — không cần VITE_ prefix (server-side)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ← PRIVATE, chỉ ở server
DATABASE_URL=postgresql://...`} />

          <h3>Vercel CLI — deploy thủ công</h3>
          <CodeBlock lang="bash" code={`# Cài Vercel CLI
npm i -g vercel

# Deploy từ thư mục app cụ thể
cd apps/web && vercel --prod
cd apps/api && vercel --prod

# Hoặc dùng --cwd
vercel --cwd apps/web --prod`} />
        </div>
      )
    },
    {
      id: 'supabase-schema',
      icon: '🗄️',
      title: 'Supabase Schema chuẩn',
      auditPrompt: `Dùng skill \`web-app-standards\` và \`security-and-hardening\` để audit và nâng cấp Supabase Database Schema:

1. Kiểm tra tất cả các bảng trong Database: BẮT BUỘC mọi bảng mới tạo phải có Project Prefix riêng (ví dụ: \`tkw_*\`, \`fml_*\`, \`beth_*\`, \`lnd_*\`).
2. Kiểm tra bảng \`public.profiles\` đã được link với \`auth.users(id)\` qua Postgres trigger \`on_auth_user_created\` chưa.
3. Kiểm tra việc bật RLS (Row Level Security) cho mọi bảng, đảm bảo User read/write own data (\`auth.uid() = user_id\`) và Admin full access.
4. Kiểm tra mã nguồn frontend/backend đã xử lý Realtime subscription (\`supabase.channel()\`) và cleanup hợp lý khi unmount chưa.
5. Cập nhật SQL migration/schema script và nâng cấp mã nguồn tương ứng.`,
      content: (
        <div className="note-content">
          <h2>Supabase DB Schema chuẩn</h2>

          <h3>⚠️ Quy Tắc Đặt Tên Bảng (Project Table Prefix)</h3>
          <Alert type="warn">
            <strong>BẮT BUỘC:</strong> Khi nhiều Web App dùng chung 1 Supabase PostgreSQL Database, mọi bảng tạo mới <strong>BẮT BUỘC phải có tiền tố (Prefix) của dự án</strong> để tránh xung đột tên bảng và đè dữ liệu của nhau!
          </Alert>
          <div className="user-mgmt-table-wrap" style={{ margin: '16px 0' }}>
            <table className="user-mgmt-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Dự Án</th>
                  <th>Project Prefix</th>
                  <th style={{ textAlign: 'left' }}>Ví Dụ Bảng Tạo Trong DB</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="user-email-cell">⚡ App Shelf</td>
                  <td><Tag color="#10b981">tkw_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>tkw_app_projects</code>, <code>tkw_user_permissions</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">🏡 Family Management</td>
                  <td><Tag color="#10b981">fml_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>fml_members</code>, <code>fml_transactions</code>, <code>fml_tasks</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">🤖 BETH (Quant Bot)</td>
                  <td><Tag color="#10b981">beth_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>beth_trades</code>, <code>beth_bot_config</code>, <code>beth_signals</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">📚 LnD Portal</td>
                  <td><Tag color="#10b981">lnd_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>lnd_employees</code>, <code>lnd_courses</code>, <code>lnd_learning_progress</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">🎓 AdmissionDecisionEngine</td>
                  <td><Tag color="#10b981">ade_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>ade_schools</code>, <code>ade_score_cutoffs</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">🎮 gameEngG10</td>
                  <td><Tag color="#10b981">g10_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>g10_students</code>, <code>g10_quizzes</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">☕ coffee_shop_24hxh</td>
                  <td><Tag color="#10b981">coffee_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>coffee_products</code>, <code>coffee_orders</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">📚 qlhs_dtnt</td>
                  <td><Tag color="#10b981">dtnt_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>dtnt_students</code>, <code>dtnt_evaluations</code></td>
                </tr>
                <tr>
                  <td className="user-email-cell">🌸 MOM Health</td>
                  <td><Tag color="#10b981">mh_</Tag></td>
                  <td style={{ textAlign: 'left' }}><code>mh_menstrual_cycles</code>, <code>mh_daily_logs</code>, <code>mh_app_settings</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Bảng users mở rộng (profile)</h3>
          <Alert type="info">Supabase có sẵn bảng <code>auth.users</code> nhưng không được chỉnh sửa trực tiếp. Tạo bảng <code>public.profiles</code> mirror sang.</Alert>
          <CodeBlock lang="sql" code={`CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user',  -- 'admin' | 'user'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-create profile khi user đăng ký
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

          <h3>RLS Pattern chuẩn</h3>
          <CodeBlock lang="sql" code={`-- Pattern 1: User chỉ xem/sửa data của mình
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own posts" ON posts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pattern 2: Public read, authenticated write
CREATE POLICY "Public read" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Auth write" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Pattern 3: Admin full access
CREATE POLICY "Admin all" ON posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );`} />

          <h3>Realtime Subscription</h3>
          <CodeBlock lang="typescript" code={`// Lắng nghe thay đổi real-time
const channel = supabase
  .channel('posts-changes')
  .on('postgres_changes', {
    event: '*',          // INSERT | UPDATE | DELETE | *
    schema: 'public',
    table: 'posts',
    filter: \`user_id=eq.\${userId}\`,
  }, (payload) => {
    console.log('Change:', payload);
  })
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);`} />

          <h3>Storage — Upload file</h3>
          <CodeBlock lang="typescript" code={`// Upload ảnh lên Supabase Storage
const { data, error } = await supabase.storage
  .from('avatars')           // bucket name
  .upload(\`\${userId}/avatar.jpg\`, file, {
    upsert: true,
    contentType: 'image/jpeg',
  });

// Lấy public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(\`\${userId}/avatar.jpg\`);`} />
        </div>
      )
    },
    {
      id: 'multi-app-auth',
      icon: '🔄',
      title: 'Dùng chung Auth & Chống Redirect Sai',
      auditPrompt: `Dùng skill \`web-app-standards\` và \`security-and-hardening\` để audit và khắc phục lỗi Multi-App Auth & Redirect:

1. Kiểm tra xem ứng dụng có bị fallback về sai URL khi đăng nhập Supabase Auth với nhiều app dùng chung 1 DB.
2. Đảm bảo nút đăng nhập Google luôn truyền \`redirectTo: window.location.origin\` (hoặc exact callback path).
3. Đưa ra danh sách domain (Production + Localhost) cần thêm vào Supabase Auth Additional Redirect URLs Whitelist.
4. Xây dựng hoặc nâng cấp bảng \`user_app_access\` và RLS policy để kiểm soát quyền truy cập từng app nếu cần.
5. Chỉnh sửa code frontend để đảm bảo sau khi Google xác thực xong, user luôn ở lại đúng domain hiện tại.`,
      content: (
        <div className="note-content">
          <h2>Dùng chung Supabase Auth cho Nhiều App mà Không Bị Redirect Sai</h2>
          <p className="note-desc">Khi nhiều Web App (App Shelf, Family, BETH...) dùng chung 1 Supabase Project, người dùng đăng nhập tại App A có thể bị nhảy nhầm về Site URL mặc định nếu không cấu hình <code>redirectTo</code> và Whitelist chính xác.</p>

          <h3>Nguyên Nhân Bị Fallback Nhầm App</h3>
          <p>Mặc định trong Supabase Dashboard có một trường <strong>Site URL</strong> (ví dụ: <code>https://appshelf.example.com</code>). Nếu App B (<code>https://family.minkoi.org</code>) gọi <code>signInWithOAuth()</code> mà không khai báo <code>redirectTo</code> hoặc URL của App B chưa nằm trong Whitelist, Supabase sẽ <strong>tự động fallback quay về Site URL mặc định</strong> (App A).</p>

          <h3>Giải Pháp 1 — Whitelist Đủ Redirect URLs trong Supabase</h3>
          <Step n={1}>
            <p>Vào <strong>Supabase Dashboard</strong> → Authentication → URL Configuration</p>
          </Step>
          <Step n={2}>
            <p><strong>Site URL:</strong> Đặt domain chính hoặc app trung tâm (ví dụ: <code>https://appshelf.example.com</code>)</p>
          </Step>
          <Step n={3}>
            <p><strong>Redirect URLs (Whitelist):</strong> Thêm <em>TẤT CẢ</em> domain production + localhost của các sub-app. Dùng wildcard <code>**</code> để hỗ trợ mọi sub-route:</p>
            <CodeBlock lang="text" code={`https://appshelf.example.com/**
https://family.minkoi.org/**
https://beth.minkoi.org/**
https://ade.minkoi.org/**
https://talent.minkoi.org/**
https://collab.minkoi.org/**
https://lnd.minkoi.org/**
https://hub.minkoi.org/**
https://shopee.minkoi.org/**
http://localhost:5173/**
http://localhost:3000/**`} />
          </Step>

          <h3>Giải Pháp 2 — Khai Báo Exact <code>redirectTo</code> Ở Frontend</h3>
          <Alert type="info">Luôn truyền <code>window.location.origin</code> (hoặc đường dẫn callback cụ thể) khi gọi <code>signInWithOAuth</code>.</Alert>
          <CodeBlock lang="typescript" code={`// Trong từng app cụ thể (Vite / React / Next.js)
async function handleLogin() {
  const currentOrigin = window.location.origin; // e.g., "https://family.minkoi.org" hoặc "http://localhost:5173"

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Ép Supabase sau khi Google xác thực phải quay lại đúng domain hiện tại
      redirectTo: \`\${currentOrigin}/\`,
    },
  });
}`} />

          <h3>Giải Pháp 3 — Phân Quyền Access Theo App (App Scope Isolation)</h3>
          <p>Dùng chung 1 DB Auth nghĩa là User ID đăng nhập là duy nhất toàn hệ thống. Để kiểm soát User nào có quyền vào App nào:</p>
          <CodeBlock lang="sql" code={`-- Bảng phân quyền app cho từng user
CREATE TABLE public.user_app_access (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id text NOT NULL, -- 'app-family', 'app-shelf', 'app-beth'
  is_allowed boolean DEFAULT false,
  PRIMARY KEY (user_id, app_id)
);

-- RLS Check xem user có quyền mở App hiện tại không
CREATE POLICY "Check app access" ON app_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_app_access
      WHERE user_id = auth.uid() AND app_id = 'app-family' AND is_allowed = true
    )
  );`} />
        </div>
      )
    },
    {
      id: 'local-dev-supabase',
      icon: '💻',
      title: 'Cấu Hình Env & Chạy Local với Supabase',
      auditPrompt: `Dùng skill \`debugging-and-error-recovery\` và \`web-app-standards\` để audit và chuẩn hóa cấu hình & Environment Variables:

1. Tối thiểu hóa cấu hình: Chỉ giữ đúng các biến môi trường cần thiết, loại bỏ toàn bộ config thừa hay boilerplate.
2. Login Google qua Supabase: Khai báo đúng \`VITE_SUPABASE_URL\` & \`VITE_SUPABASE_ANON_KEY\` (Vite) hoặc \`NEXT_PUBLIC_SUPABASE_URL\` & \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` (Next.js App Router).
3. JWT token expired sau 1h (3600s): Cấu hình trong Supabase Auth Settings và kiểm tra SDK tự động refresh session.
4. Đọc/lưu data trực tiếp: Nếu ứng dụng có đọc/lưu database trực tiếp ở Server/API/Node/Prisma/Drizzle, bổ sung thêm \`DATABASE_URL\` (Postgres connection pooler).
5. Tính năng AI: Nếu ứng dụng có AI function, bổ sung đúng 2 API key: \`OPENAI_API_KEY\` và \`GEMINI_API_KEY\`.
6. Quy tắc bắt buộc: Ngoài các cấu hình trên, BẮT BUỘC PHẢI HỎI Ý KIẾN NGƯỜI DÙNG trước khi thêm bất kỳ cấu hình hay biến môi trường nào khác.
7. File \`.env.local\` cấm commit vào Git; luôn duy trì 2 file mẫu chuẩn \`.env.example\` & \`.env.sample\` và cấu hình \`.gitignore\` chuẩn.`,
      content: (
        <div className="note-content">
          <h2>Quy Chuẩn Cấu Hình &amp; Environment Variables (Tối Thiểu Hóa)</h2>
          <p className="note-desc">Nguyên tắc cốt lõi: <strong>Tối thiểu hóa cấu hình</strong> — chỉ khai báo biến thực sự cần, không tạo biến dư thừa. Ngoài danh sách chuẩn, muốn thêm biến mới <strong>BẮT BUỘC PHẢI HỎI NGƯỜI DÙNG</strong>.</p>

          <h3>Danh Mục Biến Môi Trường Tiêu Chuẩn</h3>
          <p>Mỗi dự án cần file <code>.env.local</code> (không commit vào Git, luôn đi kèm <code>.env.example</code> &amp; <code>.env.sample</code>):</p>

          <CodeBlock lang="bash" code={`# 1. Supabase Auth & Client (Google Login + JWT 1h Expiry)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
# (Với Next.js: dùng NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY)

# 2. Database Connection (CHỈ THÊM khi có đọc/lưu data trực tiếp ở Backend Server/ORM)
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# 3. AI Functions (CHỈ THÊM khi có tính năng AI)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...

# QUY TẮC: Cần thêm bất kỳ biến nào khác BẮT BUỘC PHẢI HỎI Ý KIẾN NGƯỜI DÙNG!`} />

          <h3>Bước 1 — Thêm Localhost Vào Whitelist Redirect URLs</h3>
          <Alert type="warn">Nếu quên bước này, khi ấn "Login Google" ở <code>localhost:5173</code>, trình duyệt sẽ bị chuyển hướng sang domain production thay vì ở lại localhost!</Alert>
          <p>Trong <strong>Supabase Dashboard → Auth → URL Configuration → Redirect URLs</strong>, thêm các URL local:</p>
          <CodeBlock lang="text" code={`http://localhost:5173/**
http://localhost:3000/**
http://127.0.0.1:5173/**`} />

          <h3>Bước 2 — Cấu Hình CORS Cho Local Node.js Backend</h3>
          <p>Nếu dự án có backend Express / NestJS chạy local kết nối Supabase, cần cho phép Frontend Localhost gọi API mà không bị chặn CORS:</p>
          <CodeBlock lang="typescript" code={`// Express Backend (apps/api/src/index.ts)
import cors from 'cors';
import express from 'express';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://family.minkoi.org',
  'https://appshelf.example.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked for origin: ' + origin));
    }
  },
  credentials: true
}));`} />

          <h3>Bước 3 — Test Quy Trình Login ở Localhost</h3>
          <Step n={1}>
            <p>Khởi chạy app local: <code>npm run dev</code> (thường chạy tại <code>http://localhost:5173</code>)</p>
          </Step>
          <Step n={2}>
            <p>Bấm nút <strong>Đăng nhập với Google</strong>. Trình duyệt mở trang chọn tài khoản Google.</p>
          </Step>
          <Step n={3}>
            <p>Sau khi chọn tài khoản, Google chuyển về Supabase Auth → Supabase Auth đọc <code>redirectTo: http://localhost:5173/</code> → Trình duyệt nhảy về lại <code>localhost:5173</code> với đầy đủ Session token.</p>
          </Step>

          <Alert type="tip">
            <strong>Kinh nghiệm:</strong> Bạn có thể dùng 1 Supabase Project cho cả Dev Local lẫn Production. Nhờ RLS và <code>auth.uid()</code>, dữ liệu giữa các môi trường vẫn được bảo vệ tuyệt đối an toàn.
          </Alert>
        </div>
      )
    },
    {
      id: 'local-ports',
      icon: '🔌',
      title: 'Quy Hoạch Port Cố Định Local',
      auditPrompt: `Dùng skill \`web-app-standards\` để audit và nâng cấp quy hoạch Port cố định cho môi trường Local Dev:

1. Kiểm tra file \`vite.config.ts\`: Đảm bảo đã khai báo \`server.port\` cố định và bật \`strictPort: true\` để ép không tự động đổi port khi bị bận.
2. Nếu là Next.js: Đảm bảo \`package.json\` dùng lệnh \`next dev -p <port>\`.
3. Nếu là Backend Express/NestJS: Đảm bảo port API được cố định riêng biệt (ví dụ: 5001, 5002...).
4. Kiểm tra danh sách port local đã được thêm vào Supabase Auth Redirect URLs Whitelist chưa.
5. Chỉnh sửa file config để hoàn thiện quy hoạch port cố định.`,
      content: (
        <div className="note-content">
          <h2>Quy Hoạch Port Cố Định Khi Chạy Nhiều App Local (Không Dùng Docker)</h2>
          <p className="note-desc">Khi phát triển nhiều app cùng lúc trên máy local không qua Docker, việc cấu hình port cố định cho từng Frontend/Backend giúp tránh xung đột port, nhảy port ngẫu nhiên làm hỏng Google OAuth Redirect & CORS.</p>

          <h3>Vì Sao Cần Port Cố Định & Strict Port?</h3>
          <p>Mặc định Vite/Next.js sẽ tự động tăng port (ví dụ: <code>5173</code> → <code>5174</code> → <code>5175</code>) nếu port gốc bị chiếm. Điều này gây ra 2 lỗi nghiêm trọng:</p>
          <div className="note-checklist">
            <label className="checklist-item"><span>1. <strong>OAuth Redirect Error:</strong> Google/Supabase Auth nhảy về port cũ <code>5173</code> thay vì port mới <code>5174</code>.</span></label>
            <label className="checklist-item"><span>2. <strong>CORS Error:</strong> Backend Express chỉ cho phép <code>localhost:5173</code> gọi API, khi Frontend tự đổi thành <code>5174</code> sẽ bị chặn CORS ngay.</span></label>
          </div>

          <h3>Bảng Quy Hoạch Port Chuẩn Danh Mục App</h3>
          <div className="user-mgmt-table-wrap" style={{ margin: '16px 0' }}>
            <table className="user-mgmt-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Tên App</th>
                  <th>Frontend Local Port</th>
                  <th>Backend API Local Port</th>
                  <th>Cấu Hình Config</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="user-email-cell">⚡ App Shelf</td>
                  <td><Tag color="#10b981">http://localhost:5173</Tag></td>
                  <td><Tag color="#64748b">N/A (Frontend Only)</Tag></td>
                  <td>Vite (strictPort)</td>
                </tr>
                <tr>
                  <td className="user-email-cell">🏡 Family Management</td>
                  <td><Tag color="#10b981">http://localhost:5174</Tag></td>
                  <td><Tag color="#6366f1">http://localhost:5001</Tag></td>
                  <td>Vite + Express Monorepo</td>
                </tr>
                <tr>
                  <td className="user-email-cell">🤖 BETH (Quant Bot)</td>
                  <td><Tag color="#10b981">http://localhost:5175</Tag></td>
                  <td><Tag color="#6366f1">http://localhost:5002</Tag></td>
                  <td>Next.js (-p 5175)</td>
                </tr>
                <tr>
                  <td className="user-email-cell">🎮 gameEngG10</td>
                  <td><Tag color="#10b981">http://localhost:5176</Tag></td>
                  <td><Tag color="#6366f1">http://localhost:5003</Tag></td>
                  <td>Vite + Express</td>
                </tr>
                <tr>
                  <td className="user-email-cell">🎓 AdmissionDecisionEngine</td>
                  <td><Tag color="#10b981">http://localhost:5177</Tag></td>
                  <td><Tag color="#6366f1">http://localhost:5004</Tag></td>
                  <td>Vite + NestJS</td>
                </tr>
                <tr>
                  <td className="user-email-cell">☕ coffee_shop_24hxh</td>
                  <td><Tag color="#10b981">http://localhost:5178</Tag></td>
                  <td><Tag color="#6366f1">http://localhost:5005</Tag></td>
                  <td>Vite + NestJS</td>
                </tr>
                <tr>
                  <td className="user-email-cell">📚 qlhs_dtnt</td>
                  <td><Tag color="#10b981">http://localhost:5179</Tag></td>
                  <td><Tag color="#6366f1">http://localhost:5006</Tag></td>
                  <td>Vite + Express</td>
                </tr>
                <tr>
                  <td className="user-email-cell">🌸 MOM Health</td>
                  <td><Tag color="#10b981">http://localhost:5181</Tag></td>
                  <td><Tag color="#64748b">N/A (Frontend Only)</Tag></td>
                  <td>Vite (strictPort)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>1. Khóa Port Cố Định Trong Vite (<code>vite.config.ts</code>)</h3>
          <p>Dùng thuộc tính <code>strictPort: true</code> để ép Vite báo lỗi ngay nếu port đang bị chiếm, không tự ý đổi port:</p>
          <CodeBlock lang="typescript" code={`// vite.config.ts (ví dụ cho Family Management - Port 5174)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true, // Ép không nhảy sang 5175 nếu 5174 đang bận
  },
});`} />

          <h3>2. Khóa Port Cố Định Trong Next.js (<code>package.json</code>)</h3>
          <CodeBlock lang="json" code={`// package.json (ví dụ cho BETH App - Port 5175)
"scripts": {
  "dev": "next dev -p 5175",
  "build": "next build",
  "start": "next start -p 5175"
}`} />

          <h3>3. Cấu Hình Port cho Express / NestJS Backend (<code>.env.local</code>)</h3>
          <CodeBlock lang="typescript" code={`// apps/api/src/index.ts
const PORT = process.env.PORT || 5001; // Port riêng cho Backend từng App

app.listen(PORT, () => {
  console.log(\`Backend API running on http://localhost:\${PORT}\`);
});`} />

          <h3>4. Khai Báo Danh Sách Port vào Supabase Auth Redirect Whitelist</h3>
          <Alert type="tip">Thêm toàn bộ dải port từ 5173 đến 5179 vào Supabase Dashboard → Auth → URL Configuration để mọi App Local đều đăng nhập mượt mà!</Alert>
          <CodeBlock lang="text" code={`http://localhost:5173/**
http://localhost:5174/**
http://localhost:5175/**
http://localhost:5176/**
http://localhost:5177/**
http://localhost:5178/**
http://localhost:5179/**`} />
        </div>
      )
    },
    {
      id: 'mock-data-script',
      icon: '🎲',
      title: 'Script Seed & Giả Lập Data',
      auditPrompt: `Dùng skill \`test-driven-development\` và \`web-app-standards\` để audit và xây dựng bộ script Seed Mock Data & Clean Database:

1. Kiểm tra sự tồn tại của \`scripts/seed-mock-data.ts\` (sinh dữ liệu giả lập phong phú: Users, Courses, Progress, Metrics, Monitor logs...).
2. Kiểm tra sự tồn tại của \`scripts/clean-db.ts\` (dọn dẹp toàn bộ dữ liệu DB theo đúng thứ tự khóa ngoại Foreign Keys để sẵn sàng cho Fresh Deployment).
3. Kiểm tra các lệnh \`npm run db:seed\`, \`npm run db:clean\`, \`npm run db:reset\` trong \`package.json\`.
4. Viết mới hoặc bổ sung script seed/clean data hoàn chỉnh nếu chưa có hoặc chưa đầy đủ.`,
      content: (
        <div className="note-content">
          <h2>Tạo Script Seed Data Giả Lập Cho Mỗi Ứng Dụng (Mock Data Generator)</h2>
          <p className="note-desc">Mọi ứng dụng (đặc biệt là các hệ thống quản trị như LnD Portal, Family, App Shelf...) <strong>bắt buộc phải có một bộ script seed data giả lập tự động</strong>. Script này sinh ra dữ liệu phong phú để phục vụ kiểm thử UI/UX, đo đạc thông số monitor và demo sản phẩm mà không phụ thuộc data thật.</p>

          <h3>Ví Dụ Thực Tế Cho App L&amp;D Portal (<code>LnD_Portal</code>)</h3>
          <div className="note-checklist">
            <label className="checklist-item"><span>👥 <strong>Nhân viên (Employees):</strong> Tự sinh danh sách 50–100 nhân viên đầy đủ Tên, Email, Phòng ban (HR, Tech, Sales) và Chức danh.</span></label>
            <label className="checklist-item"><span>📚 <strong>Bài giảng &amp; Khóa học (Lectures &amp; Courses):</strong> Tự sinh danh mục khóa học Bắt buộc, Kỹ năng mềm, Chuyên môn kèm tài liệu.</span></label>
            <label className="checklist-item"><span>🎯 <strong>Chương trình đào tạo (Training Programs):</strong> Phân bổ nhân viên vào các lộ trình học tập theo quý/năm.</span></label>
            <label className="checklist-item"><span>📊 <strong>Tiến độ &amp; Monitor (Learning Logs &amp; Progress):</strong> Tạo lịch sử học tập, thời lượng học, điểm thi, chứng chỉ để Dashboard Monitor vẽ biểu đồ chân thực.</span></label>
          </div>

          <h3>Code Mẫu TypeScript Seed Script (<code>scripts/seed-mock-data.ts</code>)</h3>
          <CodeBlock lang="typescript" code={`// scripts/seed-mock-data.ts
import { supabase } from '../src/utils/supabaseClient';

async function seedMockData() {
  console.log('🌱 Starting Mock Data Seeding...');

  // 1. Seed Employees
  const employees = Array.from({ length: 30 }, (_, i) => ({
    id: \`emp-\${i + 1}\`,
    full_name: \`Nguyễn Văn Employee \${i + 1}\`,
    email: \`employee\${i + 1}@company.com\`,
    department: ['Engineering', 'Product', 'HR', 'Finance'][i % 4],
    role: i === 0 ? 'manager' : 'staff',
  }));
  await supabase.from('lnd_employees').upsert(employees);

  // 2. Seed Courses & Lectures
  const courses = [
    { id: 'course-1', title: 'An Toàn Thông Tin & Security 2026', category: 'Bắt buộc' },
    { id: 'course-2', title: 'Kỹ Năng Quản Lý Dự Án Agile/Scrum', category: 'Chuyên môn' },
    { id: 'course-3', title: 'Giao Tiếp & Làm Việc Nhóm Hiệu Quả', category: 'Kỹ năng mềm' },
  ];
  await supabase.from('lnd_courses').upsert(courses);

  // 3. Seed Learning Progress & Monitoring Logs
  const progressLogs = employees.flatMap(emp =>
    courses.map(c => ({
      employee_id: emp.id,
      course_id: c.id,
      progress_percent: Math.floor(Math.random() * 100),
      is_completed: Math.random() > 0.4,
      score: Math.floor(Math.random() * 40) + 60,
      last_active_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
    }))
  );
  await supabase.from('lnd_learning_progress').upsert(progressLogs);

  console.log('✅ Mock Data Seeding Complete!');
}

seedMockData().catch(console.error);`} />

          <h3>Script Dọn Dẹp / Reset Database (Sẵn Sàng Cho Fresh Deployment)</h3>
          <p>Bên cạnh seed data, ứng dụng <strong>bắt buộc phải có một script dọn dẹp sạch toàn bộ dữ liệu</strong> (<code>scripts/clean-db.ts</code>). Script này xóa dữ liệu thử nghiệm theo đúng thứ tự khóa ngoại (foreign keys) để trả DB về trạng thái trắng (Zero Data), sẵn sàng cho việc <strong>Fresh Deployment / Handoff bàn giao sản phẩm</strong>.</p>

          <CodeBlock lang="typescript" code={`// scripts/clean-db.ts
import { supabase } from '../src/utils/supabaseClient';

async function cleanDatabase() {
  console.log('🧹 Cleaning Database for Fresh Deployment...');

  // Xóa theo thứ tự ngược lại của ràng buộc khóa ngoại (Foreign Keys)
  await supabase.from('lnd_learning_progress').delete().neq('id', 'non_existent');
  await supabase.from('lnd_courses').delete().neq('id', 'non_existent');
  await supabase.from('lnd_employees').delete().neq('id', 'non_existent');

  console.log('✨ Database Reset Successfully! Ready for Fresh Deployment.');
}

cleanDatabase().catch(console.error);`} />

          <h3>Cấu Hình Commands Trong <code>package.json</code></h3>
          <CodeBlock lang="json" code={`// package.json
"scripts": {
  "db:seed": "tsx scripts/seed-mock-data.ts",
  "db:clean": "tsx scripts/clean-db.ts",
  "db:reset": "npm run db:clean && npm run db:seed"
}`} />

          <Alert type="tip">
            • <code>npm run db:seed</code> — Tạo lại toàn bộ dữ liệu mẫu giả lập.<br />
            • <code>npm run db:clean</code> — Xóa sạch toàn bộ dữ liệu, đưa DB về 0 để sẵn sàng cho Fresh Deployment.<br />
            • <code>npm run db:reset</code> — Dọn dẹp sạch rồi seed lại data giả lập mới.
          </Alert>
        </div>
      )
    },
    {
      id: 'webapp-checklist',
      icon: '✅',
      title: 'Checklist Web App chuẩn',
      auditPrompt: `Dùng skill \`code-review-and-quality\` và \`web-app-standards\` để kiểm tra (Audit) toàn bộ dự án đối chiếu với 10 Tiêu Chuẩn Kỹ Thuật Web App:

1. Auth: Google Login + Supabase, RLS, protected routes.
2. Monorepo & Vercel deployment setup.
3. Quy hoạch Port cố định & strictPort local.
4. Multi-app auth & redirect whitelist.
5. Local dev kết nối Remote Supabase DB.
6. Supabase DB Schema, Table Prefixes (\`tkw_*\`, \`fml_*\`...) & RLS patterns.
7. TypeScript strict mode & Code Quality.
8. Seed mock data script (\`npm run db:seed\`).
9. Clean database script (\`npm run db:clean\`).
10. Refactor UI theo skill \`frontend-design\`.

Báo cáo danh sách các mục ĐẠT / CHƯA ĐẠT và tự động nâng cấp code cho các mục chưa đạt.`,
      content: (
        <div className="note-content">
          <h2>Checklist Web App Production-Ready</h2>

          <h3>🔐 Authentication &amp; Environment Variables</h3>
          <div className="note-checklist">
            {[
              'Tối thiểu hóa cấu hình: chỉ giữ biến cần thiết, cấm sinh biến thừa hay boilerplate',
              'Login Google qua Supabase (@supabase/supabase-js) với VITE_ (Vite) hoặc NEXT_PUBLIC_ (Next.js App Router)',
              'JWT Token Expired sau 1h (3600s) + cơ chế auto refresh session',
              'Có đọc/lưu database trực tiếp: bổ sung DATABASE_URL (Postgres Pooling URL)',
              'Có AI function: bổ sung đúng OPENAI_API_KEY và GEMINI_API_KEY',
              'Ngoài danh sách trên, cần thêm cấu hình BẮT BUỘC PHẢI HỎI Ý KIẾN NGƯỜI DÙNG',
              'onAuthStateChange để sync session toàn app',
              'Redirect về đúng page sau login (redirectTo)',
              'Sign out xóa session + clear local state',
              'Protected routes kiểm tra session trước khi render',
              'RLS bật cho mọi bảng chứa data user',
            ].map(item => <label key={item} className="checklist-item"><input type="checkbox" /><span>{item}</span></label>)}
          </div>

          <h3>🚀 Deployment (Vercel)</h3>
          <div className="note-checklist">
            {[
              'Root Directory đúng với từng app trong monorepo',
              'Env vars set đủ trong Vercel Dashboard (không commit .env)',
              'VITE_ prefix cho biến expose ra browser',
              'Custom domain + CNAME record đúng',
              'Preview Deployments cho mỗi PR',
              'vercel.json cho Node.js/Express API',
            ].map(item => <label key={item} className="checklist-item"><input type="checkbox" /><span>{item}</span></label>)}
          </div>

          <h3>🗄️ Supabase</h3>
          <div className="note-checklist">
            {[
              'Mọi bảng DB tạo mới bắt buộc phải có Project Prefix riêng (tkw_*, fml_*, lnd_*, beth_*)',
              'RLS bật cho mọi bảng (mặc định Supabase tắt RLS)',
              'Dùng anon key ở frontend, service_role key chỉ ở server',
              'Trigger auto-create profile khi user mới đăng ký',
              'Index trên cột filter thường dùng (user_id, created_at)',
              'Backup policy (Point-in-Time Recovery cho Pro plan)',
              'Supabase Auth Redirect URLs whitelist đủ domain',
            ].map(item => <label key={item} className="checklist-item"><input type="checkbox" /><span>{item}</span></label>)}
          </div>

          <h3>🎲 Seed &amp; Clean Data (Fresh Deployment)</h3>
          <div className="note-checklist">
            {[
              'Có script seed mock data trong scripts/seed-mock-data.ts',
              'Có script clean db trong scripts/clean-db.ts (Xóa đúng thứ tự Foreign Key)',
              'Tự sinh đầy đủ Nhân viên, Khóa học, Tiến độ & Nhật ký monitor',
              'Khai báo đầy đủ db:seed, db:clean, db:reset trong package.json',
            ].map(item => <label key={item} className="checklist-item"><input type="checkbox" /><span>{item}</span></label>)}
          </div>

          <h3>⚙️ Code Quality & Branding</h3>
          <div className="note-checklist">
            {[
              'Mọi Web/App bắt buộc phải có Logo & Favicon thiết kế đặc sắc riêng biệt (không dùng favicon mặc định)',
              'TypeScript strict mode (noImplicitAny, strictNullChecks)',
              'ESLint + Prettier config',
              'type-only imports khi dùng verbatimModuleSyntax',
              'Error boundaries cho React',
              'Loading + empty states cho mọi async data',
              '.env.example / .env.sample commit vào repo; .gitignore chặn mọi file .env*.local và secret keys',
            ].map(item => <label key={item} className="checklist-item"><input type="checkbox" /><span>{item}</span></label>)}
          </div>

          <h3>Lệnh khởi tạo nhanh</h3>
          <CodeBlock lang="bash" code={`# Tạo monorepo với Turborepo
npx create-turbo@latest my-app
cd my-app

# Hoặc Vite + React
npm create vite@latest apps/web -- --template react-ts

# Cài Supabase client
npm install @supabase/supabase-js

# Cài react-router
npm install react-router-dom`} />
        </div>
      )
    },
    {
      id: 'frontend-design',
      icon: '🎨',
      title: 'Quy Chuẩn Refactor UI Frontend',
      auditPrompt: `Dùng skill \`frontend-design\` để refactor UI hiện tại của ứng dụng này.

Đây là một ứng dụng sản phẩm thật, BẮT BUỘC:
- Giữ nguyên 100% Business Logic, API Contract, Routes, State Management và Hành vi đang hoạt động (không tạo màn hình demo).
- Loại bỏ các dấu vết UI "AI-generated": card bo góc lặp lại vô cơ, gradient màu lố, glassmorphism vô cớ, layout dashboard nhàm chán, icon/badge dư thừa.
- Phân tích cấu trúc frontend, typography, design tokens và visual hierarchy.
- Đề xuất 2 phương án thiết kế visual direction, chốt 1 phương án có Visual Hierarchy mạnh mẽ.
- Đảm bảo Responsive (Mobile, Tablet, Desktop), độ tương phản Accessibility, các trạng thái Rỗng / Loading / Lỗi.

Tiến hành sửa code và báo cáo lại kết quả ngắn gọn.`,
      content: (
        <div className="note-content">
          <h2>Quy Chuẩn Refactor UI Frontend (Skill frontend-design)</h2>
          <p className="note-desc">Quy trình & tiêu chuẩn refactor giao diện cho các dự án thật: Nâng cao chất lượng Visual Hierarchy, thiết kế có chủ đích, loại bỏ triệt để các dấu vết UI "AI-generated" mà <strong>KHÔNG làm thay đổi Business Logic, API Contract, Route, State Management hoặc Hành vi đang hoạt động</strong>.</p>

          <h3>1. Quy Trình 3 Bước Trước Khi Sửa Code</h3>
          <Step n={1}>
            <p><strong>Nghiên cứu Cấu trúc Frontend:</strong> Đọc kỹ các component dùng chung, design tokens, typography, bảng màu hiện tại và mối liên hệ giữa các màn hình.</p>
          </Step>
          <Step n={2}>
            <p><strong>Phát Hiện Dấu Vết "AI-Generated UI":</strong> Nhận biết và loại bỏ:</p>
            <div className="note-checklist">
              <label className="checklist-item"><span>❌ Card bo góc đồng loạt thiếu tính phân cấp (border-radius lặp lại vô cơ).</span></label>
              <label className="checklist-item"><span>❌ Gradient trang trí màu lố, hiệu ứng glassmorphism / backdrop-blur vô cớ.</span></label>
              <label className="checklist-item"><span>❌ Bố cục Card-Grid lặp lại nhàm chán trên toàn bộ trang dashboard.</span></label>
              <label className="checklist-item"><span>❌ Quá nhiều Badge/Icon dư thừa không tăng giá trị truyền tải thông tin.</span></label>
              <label className="checklist-item"><span>❌ Visual Hierarchy kém, typography và khoảng trắng (spacing) thiếu chủ đích.</span></label>
            </div>
          </Step>
          <Step n={3}>
            <p><strong>Đánh Giá & Đề Xuất 2 Hướng Thiết Kế:</strong> Tóm tắt ngắn gọn vấn đề UI hiện tại, đề xuất 2 phương án visual direction phù hợp nhất với mục đích sản phẩm và đối tượng người dùng. Chọn 1 phương án tối ưu nhất trước khi sửa code.</p>
          </Step>

          <h3>2. Nguyên Tắc Triển Khai Code Refactor UI</h3>
          <div className="note-checklist">
            <label className="checklist-item"><span>🎯 <strong>Bảo Tồn Brand &amp; Chức Năng:</strong> Giữ lại nhận diện thương hiệu, nội dung, tính năng và design system hiện có nếu còn hợp lý.</span></label>
            <label className="checklist-item"><span>🎨 <strong>Logo &amp; Favicon Đặc Sắc Bắt Buộc:</strong> Mọi Web/App luôn phải có Logo và Favicon được thiết kế &amp; cấu hình đặc sắc riêng biệt, tuyệt đối không dùng favicon mặc định của framework (Vite/React/Next.js/HTML).</span></label>
            <label className="checklist-item"><span>🎨 <strong>Visual Direction Rõ Ràng:</strong> Thiết kế có hierarchy mạnh mẽ. Mọi lựa chọn về typography, spacing, màu sắc và layout đều phải có lý do cụ thể.</span></label>
            <label className="checklist-item"><span>🚫 <strong>Nói KHÔNG Với Chi Tiết Dư Thừa:</strong> Cấm dùng gradient lố, glassmorphism, "AI purple", font Inter/Arial mặc định, card-grid lặp lại, icon trang trí, animation hoặc shadow nếu không phục vụ trải nghiệm người dùng thực tế.</span></label>
            <label className="checklist-item"><span>📐 <strong>Layout Có Nhịp Điệu & Mật Độ Phù Hợp:</strong> Ưu tiên mật độ thông tin cân đối, xử lý chỉn chu các trạng thái Rỗng (Empty), Đang tải (Loading) và Lỗi (Error).</span></label>
            <label className="checklist-item"><span>♻️ <strong>Tái Sử Dụng Component Hiện Có:</strong> Ưu tiên dùng lại các component có sẵn; chỉ tạo component mới khi giúp giảm bớt trùng lặp mã nguồn.</span></label>
            <label className="checklist-item"><span>📱 <strong>Responsive & Accessible:</strong> Kiểm tra các breakpoint màn hình chính (Mobile, Tablet, Desktop), đảm bảo độ tương phản (contrast), trạng thái hover/focus và căn chỉnh alignment chính xác.</span></label>
          </div>

          <h3>3. Mẫu Prompt Chuẩn Đổi Cho AI / Subagent</h3>
          <CodeBlock lang="text" code={`Dùng skill \`frontend-design\` để refactor UI hiện có. Đây là một dự án thật, không tạo màn hình demo, không thay đổi business logic, API contract, route, state management, hoặc hành vi đang hoạt động.

Trước khi sửa code:
1. Đọc cấu trúc frontend, component dùng chung, design tokens, typography, màu sắc và các màn hình liên quan.
2. Xác định những dấu hiệu khiến UI hiện tại trông “AI-generated”: card bo góc đồng loạt, gradient trang trí, glassmorphism vô cớ, layout dashboard lặp lại, quá nhiều badge/icon, hierarchy kém, khoảng trắng và typography thiếu chủ đích.
3. Tóm tắt ngắn vấn đề và đề xuất 2 hướng thiết kế phù hợp với mục đích sản phẩm và người dùng hiện tại. Chọn hướng hợp lý nhất rồi triển khai.

Khi triển khai:
- Giữ lại brand, nội dung, chức năng và design system hiện có nếu chúng còn hợp lý.
- Thiết kế theo một visual direction rõ ràng, có hierarchy mạnh và có lý do cho từng lựa chọn về typography, spacing, màu, layout.
- Không dùng gradient, glassmorphism, “AI purple”, font Inter/Arial mặc định, card-grid lặp lại, icon trang trí, animation hoặc shadow nếu không phục vụ trải nghiệm.
- Ưu tiên bố cục có nhịp điệu, mật độ thông tin phù hợp, trạng thái rỗng/loading/error rõ ràng, responsive và accessible.
- Tái sử dụng component hiện có khi phù hợp; chỉ tạo component mới khi thật sự giảm lặp code.
- Sau khi hoàn tất, kiểm tra các breakpoint chính và sửa các lỗi visual như alignment, overflow, contrast, hover/focus state.

Cuối cùng, báo cáo ngắn: những gì đã thay đổi, các file đã sửa, và các quyết định thiết kế quan trọng.`} />
        </div>
      )
    },
    {
      id: 'user-profile-groups-rbac',
      icon: '👥',
      title: 'Profile, Phân Quyền & Group/Gia Đình',
      auditPrompt: `Dùng skill \`web-app-standards\` và \`security-and-hardening\` để audit và xây dựng phân hệ Profile, Phân Quyền Admin và Mô hình Group User / Gia Đình:

1. Profile Tracking & Editing:
   - Kiểm tra xem app đã tự động track profile khi user login chưa (bảng \`public.profiles\` link \`auth.users\` qua trigger \`on_auth_user_created\`).
   - Kiểm tra UI cho phép User tự chỉnh sửa profile cá nhân (tên hiển thị, avatar, thông tin nghiệp vụ cần thiết).

2. Khu Vực Admin Cấp Quyền (Permission Management):
   - Kiểm tra xem app đã có khu vực / trang dành cho Admin quản lý danh sách user và cấp quyền (RBAC / permission flags: can_read_*, can_edit_*) chưa.

3. Mô Hình Group User / Gia Đình (Family & Mikawaii Pattern):
   - Đánh giá nghiệp vụ của app xem có cần phân nhóm / gia đình không.
   - Nếu có, triển khai mô hình: Mọi user đều có quyền tự tạo Group/Gia đình riêng cho mình, mời thành viên khác làm Member, và bổ nhiệm thêm Admin cho Group của mình.
   - Cung cấp bảng DB (\`groups\`, \`group_members\`), RLS policy cách ly dữ liệu giữa các group và UI quản lý thành viên.

Tiến hành kiểm tra, báo cáo kết quả và tự động hoàn thiện mã nguồn nếu còn thiếu sót.`,
      content: (
        <div className="note-content">
          <h2>Profile User, Phân Quyền Admin &amp; Mô Hình Group / Gia Đình</h2>
          <p className="note-desc">
            Quy chuẩn thiết kế quản lý danh tính người dùng, cơ chế phân quyền (RBAC) và kiến trúc đa nhóm/gia đình (Multi-Tenant Group Model) tham khảo từ dự án <strong>Family Management</strong> và <strong>Mikawaii</strong>.
          </p>

          <h3>1. Track Profile Login &amp; Cho Phép User Sửa Profile</h3>
          <p>Mỗi khi User đăng nhập qua Google OAuth, hệ thống cần tự động đồng bộ profile và cung cấp giao diện cập nhật thông tin:</p>
          <div className="note-checklist">
            <label className="checklist-item"><span>✅ <strong>Tự động Track Profile:</strong> Dùng trigger PostgreSQL <code>on_auth_user_created</code> để ghi nhận User vào <code>public.profiles</code> ngay khi login lần đầu.</span></label>
            <label className="checklist-item"><span>✅ <strong>Ghi nhận thông tin cần thiết:</strong> Email, Tên hiển thị (<code>full_name</code>), Ảnh đại diện (<code>avatar_url</code>), Ngày tạo và Lần đăng nhập cuối.</span></label>
            <label className="checklist-item"><span>✅ <strong>User Profile Edit Modal / Page:</strong> Cung cấp form để người dùng tự cập nhật thông tin cá nhân và lưu trực tiếp về Supabase.</span></label>
          </div>

          <CodeBlock lang="sql" code={`-- 1. Bảng Profiles & Auto Trigger khi User đăng nhập
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  role text DEFAULT 'user', -- 'admin' | 'user'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: User tự đọc và sửa profile của chính mình
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);`} />

          <h3>2. Khu Vực Admin Cấp Quyền Cho User (User Permissions &amp; RBAC)</h3>
          <p>Hệ thống bắt buộc phải có màn hình quản trị (User Management) để Admin xem danh sách người dùng và cấp/thu hồi quyền truy cập:</p>
          <div className="note-checklist">
            <label className="checklist-item"><span>🛡️ <strong>Trang Quản Trị User:</strong> Chỉ user có role <code>admin</code> (hoặc email owner) mới được phép mở trang này.</span></label>
            <label className="checklist-item"><span>🔑 <strong>Bảng Phân Quyền Chi Tiết:</strong> Lưu các cờ phân quyền theo từng module (ví dụ: <code>can_read_app</code>, <code>can_edit_app</code>, <code>role</code>).</span></label>
            <label className="checklist-item"><span>⚡ <strong>Bảo Vệ API &amp; RLS:</strong> Chỉ Admin mới có quyền thực thi lệnh UPDATE trên bảng quyền người dùng.</span></label>
          </div>

          <CodeBlock lang="sql" code={`-- Bảng phân quyền chi tiết (VD: tkw_user_permissions hoặc fml_user_permissions)
CREATE TABLE public.user_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'user', -- 'admin' | 'user'
  can_read_module_a boolean DEFAULT true,
  can_edit_module_a boolean DEFAULT false,
  can_read_module_b boolean DEFAULT false,
  can_edit_module_b boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- RLS: Mọi user đọc được quyền của chính mình; Chỉ Admin mới được sửa quyền
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User read own permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin manage all permissions" ON public.user_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND role = 'admin')
  );`} />

          <h3>3. Mô Hình Group User / Gia Đình (Family &amp; Mikawaii Pattern)</h3>
          <Alert type="info">
            <strong>Mô hình Tổ Chức / Gia Đình Đa Người Dùng (Multi-Tenant Group):</strong> Áp dụng cho các ứng dụng quản lý công việc gia đình, nhóm chi tiêu, dự án chung hoặc trường học (như dự án <strong>Family Management</strong> và <strong>Mikawaii</strong>).
          </Alert>

          <h4>Nguyên Tắc Thiết Kế:</h4>
          <div className="note-checklist">
            <label className="checklist-item"><span>👑 <strong>Ai cũng có thể tạo Gia Đình / Group riêng:</strong> Bất kỳ User nào sau khi đăng nhập đều có quyền bấm nút "Tạo Gia Đình / Nhóm mới" và tự động trở thành <strong>Owner (Chủ nhóm)</strong>.</span></label>
            <label className="checklist-item"><span>✉️ <strong>Mời Thành Viên (Invite Members):</strong> Chủ nhóm có thể mời thành viên khác qua Email hoặc gửi Mã mời (Invite Code/Link) để tham gia làm <strong>Member</strong>.</span></label>
            <label className="checklist-item"><span>⭐ <strong>Bổ Nhiệm Thêm Admin Gia Đình:</strong> Chủ nhóm hoặc Admin hiện tại có quyền thăng cấp (Promote) thành viên bất kỳ lên làm <strong>Admin</strong> của gia đình đó để cùng quản trị dữ liệu.</span></label>
            <label className="checklist-item"><span>🔒 <strong>Cô Lập Dữ Liệu Tuyệt Đối (Group Data Isolation):</strong> Toàn bộ dữ liệu (chi tiêu, công việc, nhật ký) đều gắn với <code>family_id</code> hoặc <code>group_id</code>. Thành viên gia đình này tuyệt đối không thể thấy dữ liệu gia đình khác.</span></label>
          </div>

          <h4>Cấu Trúc Database Chuẩn:</h4>
          <CodeBlock lang="sql" code={`-- 1. Bảng Gia đình / Group
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- VD: "Gia đình Hạnh Phúc"
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code text UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at timestamptz DEFAULT now()
);

-- 2. Bảng Thành viên Gia đình (Liên kết User <-> Family)
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  nickname text,              -- VD: "Bố", "Mẹ", "Con trai"
  joined_at timestamptz DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- 3. Bảng Dữ liệu gắn theo Family (VD: Quản lý chi tiêu gia đình)
CREATE TABLE public.family_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  title text NOT NULL,
  amount numeric NOT NULL,
  category text,
  expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- RLS: Thành viên chỉ xem & thao tác dữ liệu thuộc gia đình mình tham gia
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own family members" ON public.family_members
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "View family expenses" ON public.family_expenses
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Insert family expenses" ON public.family_expenses
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );`} />

          <h4>Code TypeScript Mẫu: Tạo Nhóm &amp; Bổ Nhiệm Admin</h4>
          <CodeBlock lang="typescript" code={`// 1. Tạo Gia đình mới & trở thành Owner
async function createNewFamily(familyName: string, userId: string) {
  // Tạo family
  const { data: family, error: famErr } = await supabase
    .from('families')
    .insert({ name: familyName, created_by: userId })
    .select()
    .single();

  if (famErr) throw famErr;

  // Thêm người tạo làm Owner
  await supabase.from('family_members').insert({
    family_id: family.id,
    user_id: userId,
    role: 'owner',
    nickname: 'Chủ hộ',
  });

  return family;
}

// 2. Mời thành viên qua mã Invite Code
async function joinFamilyByCode(inviteCode: string, userId: string, nickname: string) {
  const { data: family, error } = await supabase
    .from('families')
    .select('id')
    .eq('invite_code', inviteCode.trim())
    .single();

  if (error || !family) throw new Error('Mã mời không tồn tại');

  return await supabase.from('family_members').insert({
    family_id: family.id,
    user_id: userId,
    role: 'member',
    nickname,
  });
}

// 3. Thăng cấp thành viên lên Admin Gia Đình
async function promoteToFamilyAdmin(familyId: string, targetUserId: string) {
  return await supabase
    .from('family_members')
    .update({ role: 'admin' })
    .eq('family_id', familyId)
    .eq('user_id', targetUserId);
}`} />

          <Alert type="tip">
            <strong>Mẹo kiến trúc:</strong> Một User có thể tham gia nhiều Family/Group khác nhau (ví dụ: Gia đình riêng + Nhóm đồng nghiệp công ty). Giao diện nên có Dropdown chọn <em>Active Family/Group Switcher</em> ở Header để chuyển ngữ cảnh dữ liệu mượt mà.
          </Alert>
        </div>
      )
    }
  ];

  const active = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="notes-page">
      <aside className="notes-sidebar">
        <div className="notes-sidebar-title">💡 Code Experience</div>
        <div style={{ padding: '0 12px 12px' }}>
          <button
            className={`btn-copy-all-checklist ${copiedAll ? 'copied' : ''}`}
            onClick={copyFullChecklist}
            title="Copy toàn bộ ghi chú dưới dạng Markdown Checklist để cấp cho AI / Agent Audit code dự án"
          >
            {copiedAll ? '✓ Copied Full Checklist!' : '📋 Copy Audit Checklist'}
          </button>
        </div>
        <nav>
          {sections.map(s => (
            <button
              key={s.id}
              className={`notes-nav-btn ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="notes-main">
        <div className="note-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{active.icon}</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{active.title}</h2>
          </div>
          <button
            className={`btn-copy-item-prompt ${copiedPromptId === active.id ? 'copied' : ''}`}
            onClick={() => copyAuditPrompt(active.id, active.auditPrompt)}
            title="Copy prompt này để cấp cho AI / Agent Audit & nâng cấp app theo tiêu chuẩn này"
          >
            {copiedPromptId === active.id ? '✓ Copied Prompt!' : '📋 Copy Prompt Audit & Improve'}
          </button>
        </div>
        {active.content}
      </main>
    </div>
  );
}

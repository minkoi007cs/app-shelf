/**
 * Seed MinKoi's 14 apps into mk_app_projects on msozshwatonyxnkaqjfs
 * Run AFTER running supabase/setup_mk_tables.sql in Supabase Dashboard
 * Run: node scripts/seed_minkoi_apps.cjs
 */
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://dbzujfyfvxtewfhllice.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienVqZnlmdnh0ZXdmaGxsaWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzA4MjMsImV4cCI6MjA4ODM0NjgyM30.ww-qkmIwWVugx8Fq4Sa3nYukghvOAq_3MEF2zNvSASk'
);

// MinKoi's 14 apps for mk_app_projects
const minkoiApps = [
  { id: 'app-shelf', title: "MinKoi's App Store Workspace", frontend_url: 'https://apps.minkoi.org', github: 'https://github.com/minkoi007cs/app-shelf', hosting: 'Vercel (apps.minkoi.org)', database: 'Neon PostgreSQL', category: 'System & Tools', status: 'Production', priority: 'High', author: 'minkoi007cs', tech_stack: 'React 19, TypeScript, Vite, Supabase Auth & PostgreSQL, Vercel Edge', description: 'Centralized ecosystem portal, app directory, and workspace launcher for MinKoi digital applications.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'apps-system', title: 'Apps System', frontend_url: 'https://apps-system.vercel.app', github: 'https://github.com/minkoi007cs/app_system', hosting: 'Vercel (apps-system)', database: 'Neon Database', category: 'Infrastructure & Cloud', status: 'Production', priority: 'High', author: 'minkoi007cs', tech_stack: 'Next.js App Router, Better Auth, TypeScript, Dynamic Multi-DB Routing Engine', description: 'Lightweight, self-hosted Backend-as-a-Service with dynamic routing across free database tiers and turnkey SDK.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'lifedashboard', title: 'LifeDashboard', frontend_url: 'https://mikoi-life.vercel.app', github: 'https://github.com/minkoi007cs/lifedashboard', hosting: 'Vercel (mikoi-life)', database: 'Supabase LifeDashboard', category: 'Productivity & Life', status: 'Production', priority: 'High', author: 'minkoi007cs', tech_stack: 'Turborepo, NestJS 11, React 19, Vite, PostgreSQL, Passport JWT, TailwindCSS', description: 'Modern personal productivity and life management dashboard built as a monorepo with NestJS and React.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'house-renting', title: 'House Renting Manager', frontend_url: 'https://house-renting-frontend.vercel.app', github: 'https://github.com/minkoi007cs/house_renting', hosting: 'Vercel (house-renting)', database: 'Neon PostgreSQL', category: 'Real Estate & Finance', status: 'Production', priority: 'High', author: 'minkoi007cs', tech_stack: 'React, TypeScript, Node.js API, PostgreSQL, Vercel Serverless', description: 'Rental property billing platform automating tenant tracking, utility calculations, and monthly invoicing.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'embeded-system', title: 'Embedded Systems Hub', frontend_url: 'https://embeded-system.vercel.app', github: 'https://github.com/minkoi007cs/Embeded_system', hosting: 'Vercel (embeded-system)', database: 'Browser State & Local Storage', category: 'Engineering & Robotics', status: 'Production', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'React, TypeScript, FreeRTOS & ARM Cortex-M Curriculum, ROS2/SLAM Simulations, Vite', description: 'Interactive curriculum & engineering hub for Embedded Systems & Robotics.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'learning-ai', title: 'Learning AI Platform', frontend_url: 'https://learning-ai-pink-one.vercel.app', github: 'https://github.com/minkoi007cs/learning_AI', hosting: 'Vercel (learning-ai)', database: 'Neon PostgreSQL', category: 'AI & Machine Learning', status: 'Production', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'React, TypeScript, OpenAI API, Gemini API, Pyodide, TailwindCSS', description: 'Interactive AI learning lab, neural network experimentation sandbox, and intelligent study assistant.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'fitmatch-ai', title: 'FitMatch AI', frontend_url: 'https://fitmatch-ai-two.vercel.app', github: 'https://github.com/minkoi007cs/fitmatch_AI', hosting: 'Vercel (fitmatch-ai)', database: 'Supabase FinMatchAI', category: 'AI & Lifestyle', status: 'Production', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'React, TypeScript, Computer Vision, Generative AI Image Synthesis, Vite', description: 'Virtual fitting and outfit customization platform powered by computer vision and generative AI.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'app-wallet', title: 'App Wallet', frontend_url: 'https://app-wallet-gamma.vercel.app', github: 'https://github.com/minkoi007cs/App_Wallet', hosting: 'Vercel (app-wallet)', database: 'Neon PostgreSQL', category: 'Finance & Tokens', status: 'Production', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'React, TypeScript, Supabase Auth, TailwindCSS, Vite', description: 'Digital application portfolio manager, AI token quota monitor, and payment schedule tracker.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'canvas-ai', title: 'Canvas AI', frontend_url: 'https://canvas-ai-minkoi007cs-projects.vercel.app', github: 'https://github.com/minkoi007cs/Canvas_AI', hosting: 'Vercel (canvas-ai)', database: 'Local Storage', category: 'Education & AI', status: 'Production', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'React, TypeScript, Canvas LMS API Connectors, LLM Reasoning, Vite', description: 'Smart academic workspace and homework assistant integrated with Canvas LMS workflows.', health_status: 'healthy', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'intern-finder', title: 'OpportunityOS (Intern Finder)', frontend_url: 'https://intern-finder.vercel.app', github: 'https://github.com/minkoi007cs/Intern_finder', hosting: 'Vercel / Cloudflare', database: 'Neon PostgreSQL', category: 'Career & AI', status: 'Development', priority: 'High', author: 'minkoi007cs', tech_stack: 'FastAPI, Next.js App Router, Python, Sentence Transformers, PostgreSQL', description: 'AI-assisted opportunity discovery platform for students with explainable matching scores.', health_status: 'unknown', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'collaborative-workspace', title: 'SyncSpace (Collaborative Workspace)', frontend_url: 'https://syncspace.minkoi.org', github: 'https://github.com/minkoi007cs/collaborative_workspace', hosting: 'Vercel / Render', database: 'Neon PostgreSQL', category: 'Collaboration & Workspace', status: 'Development', priority: 'High', author: 'minkoi007cs', tech_stack: 'Next.js, NestJS, Socket.IO, Redis Pub/Sub, PostgreSQL, TypeScript', description: 'Real-time collaborative workspace and task management platform built with NestJS, Redis, and Socket.IO.', health_status: 'unknown', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'money-tracker', title: 'Money Tracker', frontend_url: 'https://money.minkoi.org', github: 'https://github.com/minkoi007cs/Money_Tracker', hosting: 'Vercel', database: 'Neon PostgreSQL', category: 'Personal Finance', status: 'Development', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'React, TypeScript, Chart.js, Bank CSV Parser Engine, Vite', description: 'Privacy-first personal finance and spending dashboard with auto-categorization and recurring bill detection.', health_status: 'unknown', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'python-learning', title: 'PyPath (Python Learning Platform)', frontend_url: 'https://pypath.minkoi.org', github: 'https://github.com/minkoi007cs/Python_learning', hosting: 'Vercel', database: 'Neon PostgreSQL', category: 'Education & Programming', status: 'Development', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'WebAssembly (Pyodide), Monaco Editor, React, FastAPI, Python', description: 'In-browser interactive Python learning platform powered by WebAssembly, Monaco Editor, and behavioral grading.', health_status: 'unknown', manual_checked: true, manual_checked_at: '25/09/2026' },
  { id: 'agent-ui', title: 'Agent UI Orchestrator', frontend_url: 'http://localhost:3000', github: 'https://github.com/minkoi007cs/Agent-UI', hosting: 'Localhost / Node.js', database: 'Local SQLite', category: 'AI & Orchestration', status: 'Development', priority: 'Medium', author: 'minkoi007cs', tech_stack: 'Node.js, React, WebSocket PTY Streamer, Multi-Agent DAG Runner, TailwindCSS', description: 'Localhost UI control plane and visual graph orchestrator for multi-agent workflows with real-time PTY streaming.', health_status: 'unknown', manual_checked: true, manual_checked_at: '25/09/2026' },
];

async function seedMinkoiApps() {
  console.log('🚀 Seeding MinKoi\'s 14 apps into mk_app_projects...\n');
  let ok = 0, fail = 0;
  for (const app of minkoiApps) {
    const row = { ...app, last_updated: Date.now() };
    const { error } = await sb.from('mk_app_projects').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error(`❌ [${app.id}] ${app.title}:`, error.message);
      fail++;
    } else {
      console.log(`✅ [${app.id}] ${app.title}`);
      ok++;
    }
  }
  console.log(`\n✨ Done: ${ok} seeded, ${fail} failed`);
}

seedMinkoiApps();

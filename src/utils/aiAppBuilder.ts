import type { AppProject } from '../data/mappers';
import type { GitHubRepoPayload, VercelProjectPayload } from './connectors';

export interface ExtractedAppResult {
  title: string;
  frontendUrl: string;
  category: string;
  database: string;
  status: string;
  priority: string;
  author?: string;
  github?: string;
  hosting?: string;
  description: string;
  techNotes: string;
  specVi: string;
  specEn: string;
  backlog: string[];
}

/**
 * Normalizes a URL for comparison
 */
export function normalizeUrl(url?: string): string {
  if (!url) return '';
  return url
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

/**
 * Checks if an app already exists in the local collection based on URL or title
 */
export function findDuplicateApp(
  candidate: { title?: string; frontendUrl?: string; name?: string },
  existingApps: AppProject[]
): AppProject | null {
  const candidateUrl = normalizeUrl(candidate.frontendUrl);
  const candidateTitle = (candidate.title || candidate.name || '').trim().toLowerCase();

  for (const app of existingApps) {
    // 1. Match by frontendUrl
    if (candidateUrl && app.frontendUrl) {
      const appUrl = normalizeUrl(app.frontendUrl);
      if (candidateUrl === appUrl || candidateUrl.includes(appUrl) || appUrl.includes(candidateUrl)) {
        return app;
      }
    }

    // 2. Match by exact or normalized title
    const appTitle = app.title.trim().toLowerCase();
    if (candidateTitle && (candidateTitle === appTitle || candidateTitle.replace(/[\s-_]+/g, '') === appTitle.replace(/[\s-_]+/g, ''))) {
      return app;
    }
  }

  return null;
}

/**
 * Gets the active Gemini API Key
 */
export function getGeminiApiKey(): string {
  return (
    localStorage.getItem('gemini_api_key') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ''
  );
}

/**
 * Gets the active OpenAI API Key
 */
export function getOpenAIApiKey(): string {
  return (
    localStorage.getItem('openai_api_key') ||
    import.meta.env.VITE_OPENAI_API_KEY ||
    ''
  );
}

/**
 * Rule-based fallback extractor when AI API is unavailable or offline
 */
function extractHeuristically(
  source: 'github' | 'vercel',
  data: GitHubRepoPayload | VercelProjectPayload
): ExtractedAppResult {
  if (source === 'github') {
    const gh = data as GitHubRepoPayload;
    const cleanTitle = gh.name
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const deps = { ...(gh.packageJson?.dependencies || {}), ...(gh.packageJson?.devDependencies || {}) };
    const hasSupabase = Object.keys(deps).some((k) => k.includes('supabase'));
    const hasReact = Object.keys(deps).some((k) => k.includes('react') || k.includes('next'));
    const isTrading = gh.topics.includes('trading') || gh.name.toLowerCase().includes('beth') || gh.name.toLowerCase().includes('bot');
    const isAI = gh.topics.includes('ai') || gh.topics.includes('llm') || gh.name.toLowerCase().includes('token');

    let category = 'Web App';
    if (isTrading) category = 'Trading Bot';
    else if (isAI) category = 'AI Tool';
    else if (gh.topics.length > 0) category = gh.topics[0].toUpperCase();

    const desc = gh.description || gh.packageJson?.description || `${cleanTitle} application engineered by ${gh.owner || 'Developer'}.`;

    const specEn = `# 1. Overview & Objectives
**${cleanTitle}** (${gh.fullName}) is developed by ${gh.owner || 'Developer'}, providing a modern cloud and web engineering solution.

## 2. Breakthrough Highlights & Key Solutions
- **Modern Architecture:** Engineered with high-performance responsive frontend and secure backend pipelines.
- **Multi-layered Security:** Google OAuth integration coupled with PostgreSQL Row Level Security (RLS).
- **Realtime Synchronization:** Instant state sync across multi-tab and multi-device sessions.

## 3. Technical Architecture & Tech Stack
- **Author:** ${gh.owner || 'Developer'}
- **Hosting:** Vercel (${gh.name.toLowerCase()})
- **GitHub Repository:** https://github.com/${gh.fullName}
- **Frontend / Framework:** ${hasReact ? 'React / Vite / TypeScript' : gh.languages.join(', ') || 'TypeScript'}
- **Database:** ${hasSupabase ? 'Supabase PostgreSQL' : 'Cloud Database'}
- **Deployment:** Vercel Monorepo Architecture

## 4. Feature Specifications
- Responsive UI across Mobile and Desktop displays.
- High reliability, instant query caching, and robust security policies.
`;

    const specVi = specEn;

    const backlog = [
      'Configure Realtime Data Sync & RLS policies',
      'Refine UI responsive layout & dark theme styling',
      'Optimize API payload & automated test suite',
    ];

    return {
      title: cleanTitle,
      frontendUrl: gh.homepageUrl || `https://${gh.name.toLowerCase()}.vercel.app`,
      category,
      database: hasSupabase ? 'Supabase LifeDashboard' : 'Neon PostgreSQL',
      status: 'Development',
      priority: 'Medium',
      author: gh.owner || 'Developer',
      github: `https://github.com/${gh.fullName}`,
      hosting: `Vercel (${gh.name.toLowerCase()})`,
      description: desc,
      techNotes: `Repository: https://github.com/${gh.fullName}\nLanguages: ${gh.languages.join(', ')}\nBranch: ${gh.defaultBranch}`,
      specVi,
      specEn,
      backlog,
    };
  } else {
    const vc = data as VercelProjectPayload;
    const cleanTitle = vc.extractedTitle || vc.projectName
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const specEn = `# 1. Overview
${cleanTitle} is deployed on Vercel at ${vc.liveUrl}.

## 2. Breakthrough Highlights & Key Solutions
- High-speed delivery via Vercel Edge Network.
- Automated CI/CD pipeline with continuous quality gating.

## 3. Architecture
- **Author:** developer
- **Hosting:** Vercel (${vc.projectName})
- **Tech Stack:** ${vc.framework || 'React / Vite'}`;

    return {
      title: cleanTitle,
      frontendUrl: vc.liveUrl,
      category: 'Web App',
      database: 'Neon PostgreSQL',
      status: 'Production',
      priority: 'Medium',
      author: 'Developer',
      github: vc.gitRepo?.repo ? `https://github.com/${vc.gitRepo.org || 'Developer'}/${vc.gitRepo.repo}` : '',
      hosting: `Vercel (${vc.projectName})`,
      description: vc.extractedDescription || `${cleanTitle} web application deployed on Vercel.`,
      techNotes: `Vercel Project: ${vc.projectName}\nFramework: ${vc.framework || 'React'}\nLive URL: ${vc.liveUrl}`,
      specVi: specEn,
      specEn,
      backlog: [
        'Automated Health Check monitoring',
        'Update technical specification & user documentation',
      ],
    };
  }
}

/**
 * Builds app details using Gemini or OpenAI API, with automatic fallback
 */
export async function extractAppWithAI(
  source: 'github' | 'vercel',
  data: GitHubRepoPayload | VercelProjectPayload
): Promise<ExtractedAppResult> {
  const geminiKey = getGeminiApiKey();
  const openAIKey = getOpenAIApiKey();

  const promptPayload = {
    source,
    data,
  };

  const systemPrompt = `You are an expert Software Architect & Product Manager for the App Shelf ecosystem.
Your mission is to analyze repository or deployment data and generate accurate, professional project metadata and technical specifications (SRS) for the App Shelf Workspace.

Rules:
1. Title: Formal title in Title Case (e.g., "Token Wallet", "Family Hub", "BETH Quant Bot").
2. Category: Select from ('Web App', 'AI Tool', 'Trading Bot', 'Education', 'Healthcare', 'Management', 'Finance', 'Utility').
3. Database: Select from ('Supabase LifeDashboard', 'Supabase FinMatchAI', 'Neon PostgreSQL', 'Local Storage', 'Local SQLite').
4. Status: Select from ('Production', 'Development', 'Staging', 'Planning').
5. Priority: Select from ('High', 'Medium', 'Low').
6. Author: GitHub owner / repository creator (default 'Developer').
7. Hosting: Hosting platform details (e.g. 'Vercel (project-name)' or 'Desktop Windows App').
8. Description: Concise summary of the application.
9. TechNotes: Architecture, stack, port, env variables, tech notes.
10. SpecVi: Comprehensive SRS Technical Specification in standard English Markdown including Introduction, Breakthrough Highlights & Key Features, Architecture & Tech Stack, and Detailed Feature Specifications.
11. SpecEn: Full equivalent SRS Technical Specification in English Markdown with identical depth.
12. Backlog: 3-6 actionable feature tasks (array of strings).

Return STRICT JSON only without Markdown formatting:
{
  "title": "...",
  "frontendUrl": "...",
  "category": "...",
  "database": "...",
  "status": "...",
  "priority": "...",
  "author": "Developer",
  "hosting": "Vercel (slug)",
  "github": "https://github.com/...",
  "description": "...",
  "techNotes": "...",
  "specVi": "...",
  "specEn": "...",
  "backlog": ["task 1", "task 2", "task 3"]
}`;

  // 1. Try Google Gemini API first
  if (geminiKey) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nProject Input Data:\n${JSON.stringify(promptPayload, null, 2)}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return {
            title: parsed.title || data.name,
            frontendUrl: parsed.frontendUrl || (source === 'vercel' ? (data as VercelProjectPayload).liveUrl : (data as GitHubRepoPayload).homepageUrl || ''),
            category: parsed.category || 'Web App',
            database: parsed.database || 'Neon PostgreSQL',
            status: parsed.status || 'Development',
            priority: parsed.priority || 'Medium',
            author: parsed.author || (source === 'github' ? (data as GitHubRepoPayload).owner : 'Developer') || 'Developer',
            hosting: parsed.hosting || (source === 'vercel' ? `Vercel (${(data as VercelProjectPayload).projectName})` : `Vercel (${data.name.toLowerCase()})`),
            github: parsed.github || (source === 'github' ? `https://github.com/${(data as GitHubRepoPayload).fullName}` : ''),
            description: parsed.description || '',
            techNotes: parsed.techNotes || '',
            specVi: parsed.specVi || '',
            specEn: parsed.specEn || '',
            backlog: Array.isArray(parsed.backlog) ? parsed.backlog : [],
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call error, trying fallback:', err);
    }
  }

  // 2. Try OpenAI API
  if (openAIKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Project Input Data:\n${JSON.stringify(promptPayload, null, 2)}` },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            title: parsed.title || data.name,
            frontendUrl: parsed.frontendUrl || (source === 'vercel' ? (data as VercelProjectPayload).liveUrl : (data as GitHubRepoPayload).homepageUrl || ''),
            category: parsed.category || 'Web App',
            database: parsed.database || 'Neon PostgreSQL',
            status: parsed.status || 'Development',
            priority: parsed.priority || 'Medium',
            author: parsed.author || (source === 'github' ? (data as GitHubRepoPayload).owner : 'Developer') || 'Developer',
            hosting: parsed.hosting || (source === 'vercel' ? `Vercel (${(data as VercelProjectPayload).projectName})` : `Vercel (${data.name.toLowerCase()})`),
            github: parsed.github || (source === 'github' ? `https://github.com/${(data as GitHubRepoPayload).fullName}` : ''),
            description: parsed.description || '',
            techNotes: parsed.techNotes || '',
            specVi: parsed.specVi || '',
            specEn: parsed.specEn || '',
            backlog: Array.isArray(parsed.backlog) ? parsed.backlog : [],
          };
        }
      }
    } catch (err) {
      console.warn('OpenAI API call error, trying fallback:', err);
    }
  }

  // 3. Fallback Heuristic
  return extractHeuristically(source, data);
}

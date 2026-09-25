/**
 * Connectors for extracting metadata from GitHub Repositories and Vercel Projects.
 */

export interface GitHubRepoPayload {
  owner: string;
  repo: string;
  fullName: string;
  name: string;
  description: string;
  homepageUrl: string;
  topics: string[];
  languages: string[];
  readmeContent: string;
  packageJson?: {
    name?: string;
    description?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  defaultBranch: string;
  starsCount: number;
}

export interface GitHubUserRepoItem {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  updated_at: string;
  language: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface VercelProjectPayload {
  name: string;
  projectName: string;
  liveUrl: string;
  framework?: string;
  nodeVersion?: string;
  gitRepo?: {
    type?: string;
    repo?: string;
    org?: string;
  };
  extractedTitle?: string;
  extractedDescription?: string;
  extractedKeywords?: string[];
  rawMeta?: Record<string, string>;
}

/**
 * Extracts owner and repository name from various GitHub input formats
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const clean = input.trim().replace(/^git@github\.com:/, '').replace(/\.git$/, '');
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i;
  const match = clean.match(urlPattern);

  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  // Handle "owner/repo" shorthand
  const shorthandPattern = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;
  const shortMatch = clean.match(shorthandPattern);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

/**
 * Fetches user's accessible GitHub repositories (including private ones) when authenticated
 */
export async function fetchUserGitHubRepos(customToken?: string): Promise<GitHubUserRepoItem[]> {
  const token =
    customToken?.trim() ||
    localStorage.getItem('github_token') ||
    import.meta.env.VITE_GITHUB_TOKEN ||
    '';

  if (!token) {
    throw new Error('Chưa có token xác thực GitHub.');
  }

  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member', {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('GitHub Token đã hết hạn hoặc không hợp lệ. Vui lòng kết nối lại tài khoản.');
    }
    throw new Error(`Lỗi tải danh sách GitHub Repos (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetches repository metadata, README, package.json, and languages from GitHub API
 */
export async function fetchGitHubRepoData(
  input: string,
  customToken?: string
): Promise<GitHubRepoPayload> {
  const parsed = parseGitHubUrl(input);
  if (!parsed) {
    throw new Error('Đường dẫn GitHub không hợp lệ. Vui lòng nhập định dạng: https://github.com/owner/repo hoặc owner/repo');
  }

  const { owner, repo } = parsed;
  const token =
    customToken?.trim() ||
    localStorage.getItem('github_token') ||
    import.meta.env.VITE_GITHUB_TOKEN ||
    '';

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  // 1. Fetch Repository Core Metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Không tìm thấy repository '${owner}/${repo}'. Nếu là repo riêng tư (private), vui lòng kết nối tài khoản GitHub OAuth hoặc cung cấp Token.`);
    }
    if (repoRes.status === 403) {
      throw new Error('GitHub API bị giới hạn lượt gọi (Rate Limited). Vui lòng kết nối tài khoản GitHub OAuth hoặc cấu hình Token.');
    }
    throw new Error(`Lỗi kết nối GitHub API (${repoRes.status}): ${repoRes.statusText}`);
  }
  const repoData = await repoRes.json();

  // 2. Fetch README Content (Raw)
  let readmeContent = '';
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { ...headers, Accept: 'application/vnd.github.v3.raw' },
    });
    if (readmeRes.ok) {
      readmeContent = await readmeRes.text();
    }
  } catch {
    readmeContent = '';
  }

  // 3. Fetch package.json if exists
  let packageJson: any = undefined;
  try {
    const pkgRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, {
      headers: { ...headers, Accept: 'application/vnd.github.v3.raw' },
    });
    if (pkgRes.ok) {
      const text = await pkgRes.text();
      packageJson = JSON.parse(text);
    }
  } catch {
    packageJson = undefined;
  }

  // 4. Fetch Languages
  let languages: string[] = [];
  try {
    const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
    if (langRes.ok) {
      const langData = await langRes.json();
      languages = Object.keys(langData);
    }
  } catch {
    languages = [];
  }

  return {
    owner,
    repo,
    fullName: repoData.full_name || `${owner}/${repo}`,
    name: repoData.name || repo,
    description: repoData.description || '',
    homepageUrl: repoData.homepage || '',
    topics: Array.isArray(repoData.topics) ? repoData.topics : [],
    languages,
    readmeContent,
    packageJson,
    defaultBranch: repoData.default_branch || 'main',
    starsCount: repoData.stargazers_count || 0,
  };
}

/**
 * Parses Vercel input (URL or project slug)
 */
export function parseVercelUrl(input: string): { projectName: string; liveUrl: string } {
  const clean = input.trim();
  let liveUrl = '';
  let projectName = '';

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    liveUrl = clean;
    try {
      const parsed = new URL(clean);
      // If subdomain on vercel.app
      if (parsed.hostname.endsWith('.vercel.app')) {
        projectName = parsed.hostname.replace('.vercel.app', '');
      } else {
        projectName = parsed.hostname.split('.')[0];
      }
    } catch {
      projectName = clean;
    }
  } else {
    // Project slug given
    projectName = clean.replace(/\.vercel\.app$/, '');
    liveUrl = `https://${projectName}.vercel.app`;
  }

  return { projectName, liveUrl };
}

/**
 * Fetches Vercel project information via Vercel API or public inspection proxy
 */
export async function fetchVercelProjectData(
  input: string,
  customToken?: string
): Promise<VercelProjectPayload> {
  const { projectName, liveUrl } = parseVercelUrl(input);
  if (!projectName) {
    throw new Error('Vui lòng nhập tên Vercel Project hoặc đường dẫn URL hợp lệ.');
  }

  const token =
    customToken?.trim() ||
    localStorage.getItem('vercel_token') ||
    import.meta.env.VITE_VERCEL_TOKEN ||
    '';

  let framework = '';
  let nodeVersion = '';
  let gitRepo: any = undefined;

  // If Vercel token is available, query Vercel REST API
  if (token) {
    try {
      const projectRes = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (projectRes.ok) {
        const vData = await projectRes.json();
        framework = vData.framework || '';
        nodeVersion = vData.nodeVersion || '';
        gitRepo = vData.link
          ? {
              type: vData.link.type,
              repo: vData.link.repo,
              org: vData.link.org,
            }
          : undefined;
      }
    } catch (e) {
      console.warn('Could not query Vercel API with token:', e);
    }
  }

  // Inspect live HTML to extract page title, metadata, description
  let extractedTitle = '';
  let extractedDescription = '';
  const extractedKeywords: string[] = [];

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(liveUrl)}`;
    const pageRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(9000) });
    if (pageRes.ok) {
      const json = await pageRes.json();
      const html = json.contents || '';

      // Title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        extractedTitle = titleMatch[1].trim();
      }

      // Meta Description
      const descMatch =
        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
      if (descMatch) {
        extractedDescription = descMatch[1].trim();
      }

      // Detect Framework hints in HTML
      if (!framework) {
        if (html.includes('__next') || html.includes('_next/static')) framework = 'nextjs';
        else if (html.includes('id="root"') || html.includes('vite/client') || html.includes('/@vite')) framework = 'react-vite';
        else if (html.includes('id="__nuxt"')) framework = 'nuxtjs';
        else if (html.includes('svelte')) framework = 'svelte';
      }
    }
  } catch (e) {
    console.warn('Could not inspect live Vercel URL HTML:', e);
  }

  return {
    name: projectName,
    projectName,
    liveUrl,
    framework: framework || 'react-vite',
    nodeVersion,
    gitRepo,
    extractedTitle: extractedTitle || projectName,
    extractedDescription: extractedDescription || '',
    extractedKeywords,
  };
}

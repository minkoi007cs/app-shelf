import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation, useParams, useNavigate } from 'react-router-dom';
import CodeExperience from './CodeExperience';
import { supabase } from '../utils/supabaseClient';
import { useSyncedCollection } from '../data/useSyncedCollection';
import {
  rowToAppProject,
  appProjectToRow,
  rowToBacklogItem,
  backlogItemToRow,
  type AppProject,
  type BacklogItem,
  type AppProjectRow,
  type BacklogItemRow,
} from '../data/mappers';
import { interpretHealth } from '../utils/health';
import { AppPortfolioModal } from '../components/AppPortfolioModal';
import { AddAppModal } from '../components/AddAppModal';
import { ShareAppsModal } from '../components/ShareAppsModal';
import { removedIds } from '../data/syncPolicy';
import { MINKOI_DEFAULT_APPS } from '../data/minKoiApps';
import { getAppTheme } from '../data/appThemes';
import { useAuth } from '../contexts/AuthContext';
import {
  SearchIcon,
  RefreshIcon,
  PlusIcon,
  ExternalLinkIcon,
  AppStoreIcon,
  ShareIcon,
  CheckIcon,
} from '../components/icons';

export type { AppProject, BacklogItem };

const GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo -> Purple
  'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', // Emerald -> Cyan
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', // Amber -> Red
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', // Cyan -> Blue
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', // Pink -> Violet
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue -> Dark Blue
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)', // Orange -> Yellow
];

function getAppGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

function getAppInitials(title: string): string {
  if (!title) return 'APP';
  const parts = title.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

function getFaviconCandidates(url?: string, id?: string): string[] {
  const candidates: string[] = [];
  if (id) {
    candidates.push(`/favicons/${id}.svg`);
  }
  if (url && url.trim()) {
    try {
      const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      const parsed = new URL(formattedUrl);
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && parsed.hostname.includes('.')) {
        candidates.push(`${parsed.origin}/favicon.svg`);
        candidates.push(`${parsed.origin}/favicon.ico`);
      }
    } catch {
      // ignore
    }
  }
  return candidates;
}

function AppIcon({
  title,
  frontendUrl,
  id,
  iconBg,
}: {
  title: string;
  frontendUrl?: string;
  id: string;
  iconBg?: string;
}) {
  const candidates = useMemo(() => getFaviconCandidates(frontendUrl, id), [frontendUrl, id]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const initials = getAppInitials(title);
  const bgGradient = iconBg || getAppGradient(title + id);

  useEffect(() => {
    setCandidateIndex(0);
  }, [frontendUrl, id]);

  const currentSrc = candidateIndex < candidates.length ? candidates[candidateIndex] : null;

  return (
    <div className="store-app-icon" style={{ background: bgGradient }}>
      {currentSrc ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={title}
          onError={() => setCandidateIndex((prev) => prev + 1)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '14px',
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export default function AppWallet() {
  const { permissions } = useAuth();
  const canEdit = !!permissions?.can_edit_app_wallet;

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { appId } = useParams<{ appId?: string }>();
  const navigate = useNavigate();

  const isCodeExpRoute = location.pathname.includes('/code-experience') || location.pathname.includes('/notes');
  const activeTab = isCodeExpRoute || searchParams.get('tab') === 'code-experience' ? 'code-experience' : 'workspace';

  const handleSubTabChange = (tab: 'workspace' | 'code-experience') => {
    if (tab === 'code-experience') {
      setSearchParams({ tab: 'code-experience' });
    } else {
      setSearchParams({});
    }
  };

  const { items: projectItems, setItems: setProjectItems } = useSyncedCollection<
    Omit<AppProject, 'backlog'>,
    AppProjectRow
  >({
    table: 'aw_app_projects',
    rowToItem: rowToAppProject,
    itemToRow: appProjectToRow,
    seed: (loaded) =>
      loaded && loaded.length > 0 ? loaded : MINKOI_DEFAULT_APPS.map(({ backlog, ...rest }) => rest),
  });

  const { items: backlogItems, setItems: setBacklogItems } = useSyncedCollection<
    BacklogItem & { projectId: string },
    BacklogItemRow
  >({
    table: 'aw_app_backlog_items',
    rowToItem: (row) => ({
      ...rowToBacklogItem(row),
      projectId: row.project_id,
    }),
    itemToRow: (item) => backlogItemToRow(item, item.projectId),
    seed: (loaded) =>
      loaded && loaded.length > 0
        ? loaded
        : MINKOI_DEFAULT_APPS.flatMap((p) => (p.backlog || []).map((b) => ({ ...b, projectId: p.id }))),
  });

  const sharedAppsParam = searchParams.get('apps');
  const sharedAppIds = useMemo(() => {
    if (!sharedAppsParam) return null;
    return sharedAppsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [sharedAppsParam]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalTargetIds, setShareModalTargetIds] = useState<string[] | undefined>(undefined);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());

  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthMap, setHealthMap] = useState<Record<string, 'healthy' | 'checking' | 'failed'>>({});

  const handleOpenShareModal = (targetAppId?: string) => {
    if (targetAppId) {
      setShareModalTargetIds([targetAppId]);
    } else if (selectedAppIds.size > 0) {
      setShareModalTargetIds(Array.from(selectedAppIds));
    } else {
      setShareModalTargetIds(undefined);
    }
    setIsShareModalOpen(true);
  };

  const handleToggleSelectApp = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Combined Apps view
  const apps: AppProject[] = useMemo(() => {
    return projectItems.map((p) => ({
      ...p,
      healthStatus: healthMap[p.id] || p.healthStatus || 'unknown',
      backlog: backlogItems.filter((b) => b.projectId === p.id),
    }));
  }, [projectItems, backlogItems, healthMap]);

  // Selected App from URL parameter
  const selectedApp = useMemo(() => {
    if (!appId) return null;
    return apps.find((a) => a.id === appId) || null;
  }, [apps, appId]);

  // Initial tab for AppPortfolioModal if specified in search params
  const portfolioInitialTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'settings') return 'settings';
    if (tabParam === 'specs') return 'specs';
    if (tabParam === 'backlog') return 'backlog';
    return 'overview';
  }, [searchParams]);

  // Dynamic Categories list extracted from projects
  const categories = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [apps]);

  // Statistics
  const healthyCount = useMemo(() => {
    return apps.filter((a) => a.healthStatus === 'healthy').length;
  }, [apps]);

  // Manual Concurrency-Capped Health Checker (Max 5 concurrent)
  const handleCheckHealthAll = async () => {
    setIsCheckingHealth(true);

    const targets = apps.filter((a) => a.frontendUrl);
    const limit = 5;
    const nowTimeStr = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (let i = 0; i < targets.length; i += limit) {
      const batch = targets.slice(i, i + limit);
      await Promise.all(
        batch.map(async (app) => {
          setHealthMap((prev) => ({ ...prev, [app.id]: 'checking' }));
          let status: 'healthy' | 'failed' = 'failed';
          try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(app.frontendUrl!)}`;
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(9000) });
            if (res.ok) {
              const data = await res.json();
              const httpCode = data.status?.http_code;
              status = interpretHealth(httpCode) === 'healthy' ? 'healthy' : 'failed';
            }
          } catch {
            status = 'failed';
          }
          setHealthMap((prev) => ({ ...prev, [app.id]: status }));

          try {
            const updatedApp: AppProject = {
              ...app,
              healthStatus: status,
              healthCheckedAt: nowTimeStr,
            };
            const row = appProjectToRow(updatedApp);
            await supabase.from('aw_app_projects').update(row).eq('id', app.id);
            setProjectItems((prev) =>
              prev.map((p) =>
                p.id === app.id ? { ...p, healthStatus: status, healthCheckedAt: nowTimeStr } : p
              )
            );
          } catch (dbErr) {
            console.error('Failed to save health check result:', dbErr);
          }
        })
      );
    }

    setIsCheckingHealth(false);
  };

  // Toggle user manual verification with date stamp
  const handleToggleManualCheck = async (app: AppProject) => {
    const nextChecked = !app.manualChecked;
    const nextCheckedAt = nextChecked
      ? new Date().toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

    setProjectItems((prev) =>
      prev.map((p) =>
        p.id === app.id
          ? { ...p, manualChecked: nextChecked, manualCheckedAt: nextCheckedAt }
          : p
      )
    );

    try {
      const updatedApp: AppProject = {
        ...app,
        manualChecked: nextChecked,
        manualCheckedAt: nextCheckedAt,
      };
      const row = appProjectToRow(updatedApp);
      const { error: upErr } = await supabase.from('aw_app_projects').update(row).eq('id', app.id);
      if (upErr) {
        console.error('Failed to save verification status:', upErr);
        alert('Failed to save verification status: ' + upErr.message);
      }
    } catch (err: any) {
      console.error('Failed to save verification status:', err);
      alert('Failed to save verification status: ' + (err?.message || 'Unknown error'));
    }
  };

  // Save newly created app (from AddAppModal)
  const handleSaveNewApp = async (newProj: Omit<AppProject, 'backlog'>, backlog: BacklogItem[]) => {
    const row = appProjectToRow(newProj as AppProject);
    const { error: saveErr } = await supabase.from('aw_app_projects').insert(row);
    if (saveErr) {
      throw new Error('Failed to save to Supabase: ' + saveErr.message);
    }

    if (backlog.length > 0) {
      const backlogRows = backlog.map((b) => backlogItemToRow(b, newProj.id));
      await supabase.from('aw_app_backlog_items').insert(backlogRows);
    }

    setProjectItems((prev) => [newProj, ...prev]);
    if (backlog.length > 0) {
      setBacklogItems((prev) => [...prev, ...backlog.map((b) => ({ ...b, projectId: newProj.id }))]);
    }
  };

  // Update existing app (from AddAppModal or Portfolio Settings Tab)
  const handleUpdateExistingApp = async (updated: AppProject, backlog: BacklogItem[]) => {
    const row = appProjectToRow(updated);
    const { error: saveErr } = await supabase.from('aw_app_projects').upsert(row);
    if (saveErr) {
      throw new Error('Failed to update in Supabase: ' + saveErr.message);
    }

    setProjectItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    // Sync backlog
    const origBacklog = backlogItems.filter((b) => b.projectId === updated.id);
    const deletedIds = removedIds(origBacklog, backlog);
    if (deletedIds.length > 0) {
      await supabase.from('aw_app_backlog_items').delete().in('id', deletedIds);
    }

    if (backlog.length > 0) {
      const backlogRows = backlog.map((b) => backlogItemToRow(b, updated.id));
      await supabase.from('aw_app_backlog_items').upsert(backlogRows);
    }

    setBacklogItems((prev) => [
      ...prev.filter((b) => b.projectId !== updated.id),
      ...backlog.map((b) => ({ ...b, projectId: updated.id })),
    ]);
  };

  const filteredApps = useMemo(() => {
    let result = apps;

    // Filter by sharedAppIds if query param ?apps=... is present
    if (sharedAppIds && sharedAppIds.length > 0) {
      const idSet = new Set(sharedAppIds);
      result = result.filter((a) => idSet.has(a.id));
    }

    const q = searchQuery.toLowerCase().trim();

    if (selectedCategory !== 'all') {
      result = result.filter((a) => a.category === selectedCategory);
    }

    if (q) {
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [apps, sharedAppIds, searchQuery, selectedCategory]);

  return (
    <div className="app-wallet-container">
      {/* App Wallet Sub-Navigation Bar */}
      <div className="app-wallet-subtabs">
        <button
          className={`app-wallet-subtab ${activeTab === 'workspace' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('workspace')}
        >
          <AppStoreIcon size={18} />
          <span>App Workspace</span>
        </button>
        <button
          className={`app-wallet-subtab ${activeTab === 'code-experience' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('code-experience')}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>💡</span>
          <span>Code Experience</span>
        </button>
      </div>

      {activeTab === 'code-experience' ? (
        <CodeExperience />
      ) : (
        <>
          {/* Shared Apps Banner (if viewing shared link) */}
          {sharedAppIds && sharedAppIds.length > 0 && (
            <div className="store-share-banner">
              <div className="store-share-banner-left">
                <span className="store-share-banner-icon">🎁</span>
                <div>
                  <div className="store-share-banner-title">
                    Shared Applications Directory
                  </div>
                  <div className="store-share-banner-desc">
                    Displaying {filteredApps.length} applications curated for you.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('apps');
                  setSearchParams(newParams);
                }}
              >
                <span>View Full Catalog ({apps.length} apps)</span>
              </button>
            </div>
          )}

          {/* App Store Header & Controls Card */}
          <div className="store-header-card">
            <div className="store-header-top">
              <div className="store-title-block">
                <h2>
                  <AppStoreIcon size={26} />
                  MinKoi's App Store Workspace
                </h2>
                <p>Comprehensive portfolio of production applications &amp; systems</p>
              </div>

              <div className="store-stats-pills">
                <div className="store-stat-pill">
                  Total Apps: <strong>{apps.length}</strong>
                </div>
                {healthyCount > 0 && (
                  <div className="store-stat-pill active-healthy">
                    Online: <strong>{healthyCount}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="store-control-bar">
              <div className="store-search-box">
                <div className="store-search-icon">
                  <SearchIcon size={16} />
                </div>
                <input
                  type="text"
                  className="store-search-input"
                  placeholder="Search applications, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="store-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenShareModal()}
                  title="Share applications with friends, colleagues, or mentors"
                >
                  <ShareIcon size={15} />
                  <span>Share Apps</span>
                </button>

                <button
                  type="button"
                  className={`btn ${isSelectMode ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setIsSelectMode((v) => !v);
                    if (isSelectMode) setSelectedAppIds(new Set());
                  }}
                  title="Toggle multi-app selection mode to share"
                >
                  <span>{isSelectMode ? '✓ Selecting' : '☑ Multi Select'}</span>
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleCheckHealthAll}
                  disabled={isCheckingHealth}
                >
                  <RefreshIcon size={15} className={isCheckingHealth ? 'spin-icon' : ''} />
                  {isCheckingHealth ? 'Checking health...' : 'Check Health'}
                </button>

                {canEdit && (
                  <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                    <PlusIcon size={16} />
                    Add Project
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="store-categories-bar">
              <button
                className={`store-cat-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                All
                <span className="store-cat-count">{apps.length}</span>
              </button>

              {categories.map((cat) => {
                const count = apps.filter((a) => a.category === cat).length;
                return (
                  <button
                    key={cat}
                    className={`store-cat-tab ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                    <span className="store-cat-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 PER ROW APP STORE GRID */}
          <div className="store-grid">
            {filteredApps.map((app, index) => {
              const backlogCount = app.backlog?.length || 0;
              const isSelected = selectedAppIds.has(app.id);
              const theme = getAppTheme(app.id);

              return (
                <div
                  key={app.id}
                  className={`store-card ${app.isDisabled ? 'disabled' : ''} ${
                    isSelectMode && isSelected ? 'selected-card' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 0.04}s`,
                    cursor: 'pointer',
                    background: theme.cardBg,
                    borderColor: theme.borderColor,
                    boxShadow: `0 4px 20px -2px ${theme.glowColor}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.hoverBorder;
                    e.currentTarget.style.boxShadow = `0 12px 30px 2px ${theme.glowColor}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.borderColor;
                    e.currentTarget.style.boxShadow = `0 4px 20px -2px ${theme.glowColor}`;
                  }}
                  onClick={() => {
                    if (isSelectMode) {
                      handleToggleSelectApp(app.id);
                    } else {
                      navigate(`/app-wallet/${app.id}`);
                    }
                  }}
                  title={
                    isSelectMode
                      ? `${isSelected ? 'Deselect' : 'Select'} ${app.title}`
                      : `Click to view portfolio details & specification for ${app.title}`
                  }
                >
                  <div>
                    {/* Squircle Icon & Title Block */}
                    <div className="store-card-header">
                      {isSelectMode && (
                        <div
                          className={`store-card-select-check ${isSelected ? 'checked' : ''}`}
                          onClick={(e) => handleToggleSelectApp(app.id, e)}
                        >
                          {isSelected && <CheckIcon size={12} />}
                        </div>
                      )}
                      <AppIcon
                        title={app.title}
                        frontendUrl={app.frontendUrl}
                        id={app.id}
                        iconBg={theme.iconBg}
                      />
                      <div className="store-app-meta">
                        <div className="store-app-title" title={app.title}>
                          {app.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                          <span className="store-app-category">{app.category || 'Web App'}</span>
                          {theme.featureBadge && (
                            <span
                              style={{
                                fontSize: '0.67rem',
                                fontWeight: 600,
                                color: theme.primary,
                                background: theme.bgLight,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: `1px solid ${theme.borderColor}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {theme.featureBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Single Clean Status & Metadata Row */}
                    <div className="store-card-status-bar">
                      <div
                        className="store-health-tag"
                        title={app.healthCheckedAt ? `Checked: ${app.healthCheckedAt}` : 'Not auto checked'}
                      >
                        <span className={`store-health-dot ${app.healthStatus || 'unknown'}`} />
                        <span>
                          {app.healthStatus === 'healthy'
                            ? 'Online'
                            : app.healthStatus === 'failed'
                            ? 'Down'
                            : app.healthStatus === 'checking'
                            ? 'Checking...'
                            : 'Unchecked'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="store-status-badge">{app.status}</span>
                        {app.manualChecked ? (
                          <span
                            className="store-verified-pill"
                            title={`Verified: ${app.manualCheckedAt || 'Yes'}${canEdit ? ' (click to toggle)' : ''}`}
                            onClick={(e) => {
                              if (canEdit) {
                                e.stopPropagation();
                                handleToggleManualCheck(app);
                              }
                            }}
                            style={{ cursor: canEdit ? 'pointer' : 'default' }}
                          >
                            ✓
                          </span>
                        ) : canEdit ? (
                          <span
                            className="store-verified-pill"
                            title="Click to mark verified"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleManualCheck(app);
                            }}
                            style={{ cursor: 'pointer', opacity: 0.5, borderColor: 'rgba(255,255,255,0.15)', color: '#94a3b8' }}
                          >
                            ○
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {app.database && (
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginBottom: '0.65rem',
                          background: app.database.includes('LifeDashboard')
                            ? 'rgba(16, 185, 129, 0.12)'
                            : app.database.includes('FinMatchAI')
                            ? 'rgba(236, 72, 153, 0.12)'
                            : app.database.includes('Neon')
                            ? 'rgba(0, 229, 153, 0.12)'
                            : 'rgba(99, 102, 241, 0.12)',
                          color: app.database.includes('LifeDashboard')
                            ? '#10b981'
                            : app.database.includes('FinMatchAI')
                            ? '#f472b6'
                            : app.database.includes('Neon')
                            ? '#00e599'
                            : '#818cf8',
                          border: `1px solid ${
                            app.database.includes('LifeDashboard')
                              ? 'rgba(16, 185, 129, 0.3)'
                              : app.database.includes('FinMatchAI')
                              ? 'rgba(236, 72, 153, 0.3)'
                              : app.database.includes('Neon')
                              ? 'rgba(0, 229, 153, 0.3)'
                              : 'rgba(99, 102, 241, 0.3)'
                          }`,
                        }}
                      >
                        <span>🗄️</span>
                        <span>{app.database}</span>
                      </div>
                    )}

                    {/* Description */}
                    <p className="store-app-desc" title={app.description}>
                      {app.description || 'No description provided for this application.'}
                    </p>
                  </div>

                  {/* Card Footer: Clean Launch & Share actions without redundant buttons */}
                  <div className="store-card-footer">
                    {app.frontendUrl ? (
                      <a
                        href={app.frontendUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="store-btn-open"
                        title={`Launch ${app.title}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Launch
                        <ExternalLinkIcon size={12} />
                      </a>
                    ) : (
                      <span className="store-btn-open disabled">No URL</span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {backlogCount > 0 && (
                        <span className="store-backlog-chip" title={`${backlogCount} backlog tasks`}>
                          {backlogCount} tasks
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenShareModal(app.id);
                        }}
                        title={`Share ${app.title}`}
                        className="store-card-share-btn"
                      >
                        <ShareIcon size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty placeholder card to add project if editor */}
            {canEdit && (
              <div className="store-card store-card-add" onClick={() => setIsAddModalOpen(true)}>
                <div className="store-card-add-icon">
                  <PlusIcon size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Add New Project</span>
              </div>
            )}
          </div>

          {/* Unified Fullscreen App Portfolio Modal (Overview, Specs, Backlog, and Settings/Admin Edit) */}
          {selectedApp && (
            <AppPortfolioModal
              app={selectedApp}
              canEdit={canEdit}
              initialTab={portfolioInitialTab}
              onClose={() => navigate('/app-wallet')}
              onUpdateApp={(updated) => {
                setProjectItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              }}
              onDeleteApp={async (deleteId) => {
                try {
                  await supabase.from('aw_app_backlog_items').delete().eq('project_id', deleteId);
                  await supabase.from('aw_app_projects').delete().eq('id', deleteId);
                  setProjectItems((prev) => prev.filter((p) => p.id !== deleteId));
                  setBacklogItems((prev) => prev.filter((b) => b.projectId !== deleteId));
                  navigate('/app-wallet');
                } catch (err: any) {
                  alert('Error deleting project: ' + (err?.message || ''));
                }
              }}
              onBacklogChange={(nextBacklog) => {
                setBacklogItems((prev) => [
                  ...prev.filter((b) => b.projectId !== selectedApp.id),
                  ...nextBacklog.map((b) => ({ ...b, projectId: selectedApp.id })),
                ]);
              }}
            />
          )}

          {/* AI-Powered Add App Modal (GitHub / Vercel / Manual + Duplicate Checker) */}
          {isAddModalOpen && (
            <AddAppModal
              existingApps={apps}
              onClose={() => setIsAddModalOpen(false)}
              onSaveNewApp={handleSaveNewApp}
              onUpdateExistingApp={handleUpdateExistingApp}
            />
          )}

          {/* Floating Selection Action Bar */}
          {isSelectMode && selectedAppIds.size > 0 && (
            <div className="store-selection-bar">
              <div className="store-selection-bar-info">
                <span>
                  Selected <strong>{selectedAppIds.size}</strong> apps
                </span>
              </div>
              <div className="store-selection-bar-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (selectedAppIds.size === filteredApps.length) {
                      setSelectedAppIds(new Set());
                    } else {
                      setSelectedAppIds(new Set(filteredApps.map((a) => a.id)));
                    }
                  }}
                >
                  {selectedAppIds.size === filteredApps.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenShareModal()}
                >
                  <ShareIcon size={14} />
                  <span>Share ({selectedAppIds.size})</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedAppIds(new Set());
                  }}
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* Share Apps Modal */}
          {isShareModalOpen && (
            <ShareAppsModal
              allApps={apps}
              initialSelectedAppIds={
                shareModalTargetIds && shareModalTargetIds.length > 0
                  ? shareModalTargetIds
                  : selectedAppIds.size > 0
                  ? Array.from(selectedAppIds)
                  : undefined
              }
              onClose={() => {
                setIsShareModalOpen(false);
                setShareModalTargetIds(undefined);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

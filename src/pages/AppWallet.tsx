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
        candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=128`);
      }
    } catch {
      // ignore
    }
  }
  return candidates;
}

function AppIcon({ title, frontendUrl, id }: { title: string; frontendUrl?: string; id: string }) {
  const candidates = useMemo(() => getFaviconCandidates(frontendUrl, id), [frontendUrl, id]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const initials = getAppInitials(title);
  const bgGradient = getAppGradient(title + id);

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
            padding: '7px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
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
    seed: (loaded) => loaded,
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
    seed: (loaded) => loaded,
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
    const nowTimeStr = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
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
            console.error('Lỗi lưu kết quả kiểm tra health:', dbErr);
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
      ? new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
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
        console.error('Lỗi lưu xác nhận kiểm tra:', upErr);
        alert('Không thể lưu trạng thái xác nhận: ' + upErr.message);
      }
    } catch (err: any) {
      console.error('Lỗi lưu xác nhận:', err);
      alert('Không thể lưu trạng thái xác nhận: ' + (err?.message || 'Lỗi không xác định'));
    }
  };

  // Save newly created app (from AddAppModal)
  const handleSaveNewApp = async (newProj: Omit<AppProject, 'backlog'>, backlog: BacklogItem[]) => {
    const row = appProjectToRow(newProj as AppProject);
    const { error: saveErr } = await supabase.from('aw_app_projects').insert(row);
    if (saveErr) {
      throw new Error('Lỗi lưu vào Supabase: ' + saveErr.message);
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
      throw new Error('Lỗi cập nhật vào Supabase: ' + saveErr.message);
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
                    Danh Mục Ứng Dụng Được Chia Sẻ
                  </div>
                  <div className="store-share-banner-desc">
                    Đang hiển thị {filteredApps.length} ứng dụng được lựa chọn để chia sẻ với bạn.
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
                <span>Xem Toàn Bộ Kho ({apps.length} apps)</span>
              </button>
            </div>
          )}

          {/* App Store Header & Controls Card */}
          <div className="store-header-card">
            <div className="store-header-top">
              <div className="store-title-block">
                <h2>
                  <AppStoreIcon size={26} />
                  App Store Workspace
                </h2>
                <p>Bộ sưu tập các ứng dụng & sản phẩm hệ thống</p>
              </div>

              <div className="store-stats-pills">
                <div className="store-stat-pill">
                  Tổng số app: <strong>{apps.length}</strong>
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
                  placeholder="Tìm kiếm ứng dụng, danh mục..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="store-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenShareModal()}
                  title="Chia sẻ ứng dụng cho bạn bè, đồng nghiệp hoặc thầy cô"
                >
                  <ShareIcon size={15} />
                  <span>Chia Sẻ Apps</span>
                </button>

                <button
                  type="button"
                  className={`btn ${isSelectMode ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setIsSelectMode((v) => !v);
                    if (isSelectMode) setSelectedAppIds(new Set());
                  }}
                  title="Bật/tắt chế độ chọn nhiều ứng dụng để chia sẻ"
                >
                  <span>{isSelectMode ? '✓ Đang Chọn' : '☑ Chọn Nhiều'}</span>
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleCheckHealthAll}
                  disabled={isCheckingHealth}
                >
                  <RefreshIcon size={15} className={isCheckingHealth ? 'spin-icon' : ''} />
                  {isCheckingHealth ? 'Đang check health...' : 'Check Health'}
                </button>

                {canEdit && (
                  <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                    <PlusIcon size={16} />
                    Thêm Dự Án
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
                Tất cả
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

              return (
                <div
                  key={app.id}
                  className={`store-card ${app.isDisabled ? 'disabled' : ''} ${
                    isSelectMode && isSelected ? 'selected-card' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.04}s`, cursor: 'pointer' }}
                  onClick={() => {
                    if (isSelectMode) {
                      handleToggleSelectApp(app.id);
                    } else {
                      navigate(`/app-wallet/${app.id}`);
                    }
                  }}
                  title={
                    isSelectMode
                      ? `${isSelected ? 'Bỏ chọn' : 'Chọn'} ${app.title}`
                      : `Bấm để xem Portfolio chi tiết & đặc tả của ${app.title}`
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
                      <AppIcon title={app.title} frontendUrl={app.frontendUrl} id={app.id} />
                      <div className="store-app-meta">
                        <div className="store-app-title" title={app.title}>
                          {app.title}
                        </div>
                        <div className="store-app-category">{app.category || 'Web App'}</div>
                      </div>
                    </div>

                    {/* Status Bar: Health dot + Status badge + Specs button */}
                    <div className="store-card-status-bar">
                      <div
                        className="store-health-tag"
                        title={app.healthCheckedAt ? `Kiểm tra tự động lúc: ${app.healthCheckedAt}` : 'Chưa kiểm tra tự động'}
                      >
                        <span
                          className={`store-health-dot ${app.healthStatus || 'unknown'}`}
                        />
                        <span>
                          {app.healthStatus === 'healthy'
                            ? 'Healthy'
                            : app.healthStatus === 'failed'
                            ? 'Down'
                            : app.healthStatus === 'checking'
                            ? 'Checking...'
                            : 'Chưa check'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app-wallet/${app.id}?tab=specs`);
                          }}
                          title="Xem Đặc Tả Kỹ Thuật (Specification)"
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>📋</span>
                          <span>Specs</span>
                        </button>
                        <span className="store-status-badge">{app.status}</span>
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
                          marginTop: '0.45rem',
                          marginBottom: '0.15rem',
                          background: app.database.includes('Data 1')
                            ? 'rgba(16, 185, 129, 0.12)'
                            : app.database.includes('Data 2')
                            ? 'rgba(99, 102, 241, 0.12)'
                            : 'rgba(148, 163, 184, 0.12)',
                          color: app.database.includes('Data 1')
                            ? '#10b981'
                            : app.database.includes('Data 2')
                            ? '#818cf8'
                            : '#94a3b8',
                          border: `1px solid ${
                            app.database.includes('Data 1')
                              ? 'rgba(16, 185, 129, 0.3)'
                              : app.database.includes('Data 2')
                              ? 'rgba(99, 102, 241, 0.3)'
                              : 'rgba(148, 163, 184, 0.25)'
                          }`,
                        }}
                      >
                        <span>🗄️</span>
                        <span>{app.database}</span>
                      </div>
                    )}

                    {/* Manual Check Verification Bar */}
                    <div className="store-manual-check-bar">
                      <button
                        type="button"
                        className={`store-manual-check-btn ${app.manualChecked ? 'checked' : 'uncheck'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canEdit) handleToggleManualCheck(app);
                        }}
                        disabled={!canEdit}
                        title={
                          canEdit
                            ? (app.manualChecked ? 'Bấm để hủy hoặc cập nhật ngày xác nhận' : 'Bấm để xác nhận bạn đã kiểm tra ứng dụng')
                            : 'Trạng thái xác nhận kiểm tra'
                        }
                      >
                        <span className="check-indicator">{app.manualChecked ? '✓' : '○'}</span>
                        <span className="check-text">
                          {app.manualChecked ? (
                            <>
                              <span className="check-label">Đã check</span>
                              {app.manualCheckedAt && (
                                <span className="check-date">• {app.manualCheckedAt}</span>
                              )}
                            </>
                          ) : (
                            <span className="check-prompt">Xác nhận đã check</span>
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Description */}
                    <p className="store-app-desc" title={app.description}>
                      {app.description || 'Không có mô tả cho ứng dụng này.'}
                    </p>
                  </div>

                  {/* Card Footer: OPEN Button, SPECS Button, SHARE Button & Backlog */}
                  <div className="store-card-footer" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {app.frontendUrl ? (
                      <a
                        href={app.frontendUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="store-btn-open"
                        title={`Mở ${app.title}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        MỞ
                        <ExternalLinkIcon size={12} />
                      </a>
                    ) : (
                      <button
                        className="store-btn-open disabled"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app-wallet/${app.id}?tab=settings`);
                        }}
                      >
                        Chưa có URL
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app-wallet/${app.id}?tab=specs`);
                      }}
                      title="Xem Portfolio & Đặc Tả Kỹ Thuật"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        padding: '0.45rem 0.55rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>📋</span>
                      <span>SPECS</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenShareModal(app.id);
                      }}
                      title={`Chia sẻ ${app.title} cho bạn bè, đồng nghiệp hoặc thầy cô`}
                      className="store-card-share-btn"
                    >
                      <ShareIcon size={13} />
                    </button>

                    {backlogCount > 0 && (
                      <span className="store-backlog-chip" title={`${backlogCount} công việc backlog`}>
                        {backlogCount} task
                      </span>
                    )}
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
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Thêm Ứng Dụng Mới</span>
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
                  alert('Lỗi xóa dự án: ' + (err?.message || ''));
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
                  Đã chọn <strong>{selectedAppIds.size}</strong> ứng dụng
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
                  {selectedAppIds.size === filteredApps.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenShareModal()}
                >
                  <ShareIcon size={14} />
                  <span>Chia Sẻ ({selectedAppIds.size})</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedAppIds(new Set());
                  }}
                >
                  Thoát
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

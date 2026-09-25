import React, { useState, useMemo, useEffect } from 'react';
import {
  ExternalLinkIcon,
  RefreshIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  ShareIcon,
} from './icons';
import { ShareAppsModal } from './ShareAppsModal';
import type { AppProject, BacklogItem } from '../data/mappers';
import { interpretHealth } from '../utils/health';
import { supabase } from '../utils/supabaseClient';
import { appProjectToRow, backlogItemToRow } from '../data/mappers';
import { newId } from '../utils/ids';
import { getAppTheme } from '../data/appThemes';

interface AppPortfolioModalProps {
  app: AppProject;
  canEdit: boolean;
  initialTab?: 'overview' | 'specs' | 'backlog' | 'settings';
  onClose: () => void;
  onUpdateApp: (updatedApp: AppProject) => void;
  onDeleteApp: (appId: string) => void;
  onBacklogChange: (backlog: BacklogItem[]) => void;
}

const GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
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

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#f8fafc', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            background: 'rgba(99, 102, 241, 0.18)',
            color: '#a5b4fc',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.85em',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function SpecDocRenderer({ content }: { content: string }) {
  if (!content) return <div style={{ opacity: 0.6, fontStyle: 'italic', padding: '1rem 0' }}>No specification content available.</div>;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inList = false;

  const flushList = (keyPrefix: string) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul
          key={`ul-${keyPrefix}-${elements.length}`}
          style={{ paddingLeft: '1.4rem', marginBottom: '1rem', lineHeight: '1.75' }}
        >
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`${index}`);
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList(`${index}`);
      elements.push(
        <h1
          key={index}
          style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginTop: index === 0 ? '0' : '2rem',
            marginBottom: '0.85rem',
            letterSpacing: '-0.02em',
          }}
        >
          {formatInline(trimmed.substring(2))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(`${index}`);
      elements.push(
        <h2
          key={index}
          style={{
            fontSize: '1.18rem',
            fontWeight: 600,
            color: '#38bdf8',
            marginTop: '1.65rem',
            marginBottom: '0.65rem',
          }}
        >
          {formatInline(trimmed.substring(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList(`${index}`);
      elements.push(
        <h3
          key={index}
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#a7f3d0',
            marginTop: '1.25rem',
            marginBottom: '0.4rem',
          }}
        >
          {formatInline(trimmed.substring(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={index} style={{ marginBottom: '0.4rem', color: '#cbd5e1', lineHeight: '1.7' }}>
          {formatInline(trimmed.substring(2))}
        </li>
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushList(`${index}`);
      const text = trimmed.replace(/^\d+\.\s/, '');
      const numMatch = trimmed.match(/^\d+\./);
      elements.push(
        <div
          key={index}
          style={{
            display: 'flex',
            gap: '0.6rem',
            marginBottom: '0.55rem',
            lineHeight: '1.7',
            color: '#cbd5e1',
          }}
        >
          <span style={{ fontWeight: 600, color: '#818cf8', minWidth: '1.2rem' }}>
            {numMatch ? numMatch[0] : ''}
          </span>
          <span>{formatInline(text)}</span>
        </div>
      );
      return;
    }

    flushList(`${index}`);
    elements.push(
      <p key={index} style={{ marginBottom: '0.85rem', color: '#cbd5e1', lineHeight: '1.7' }}>
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList('final');

  return <div>{elements}</div>;
}

export function AppPortfolioModal({
  app,
  canEdit,
  initialTab = 'overview',
  onClose,
  onUpdateApp,
  onDeleteApp,
  onBacklogChange,
}: AppPortfolioModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'backlog' | 'settings'>(initialTab);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newBacklogTitle, setNewBacklogTitle] = useState('');

  // Edit form state for admin settings tab
  const [formData, setFormData] = useState<AppProject>({ ...app });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Sync state when app changes
  useEffect(() => {
    setFormData({ ...app });
  }, [app]);

  // Favicon & Brand Theme handling
  const theme = getAppTheme(app.id);
  const candidates = useMemo(() => getFaviconCandidates(app.frontendUrl, app.id), [app.frontendUrl, app.id]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const initials = getAppInitials(app.title);
  const bgGradient = theme.iconBg || getAppGradient(app.title + app.id);
  const currentSrc = candidateIndex < candidates.length ? candidates[candidateIndex] : null;

  // Backlog counts
  const backlog = app.backlog || [];
  const completedCount = backlog.filter((b) => b.isCompleted).length;
  const progressPercent = backlog.length > 0 ? Math.round((completedCount / backlog.length) * 100) : 0;

  // Manual Health Check for this single app
  const handleCheckHealth = async () => {
    if (!app.frontendUrl) return;
    setIsCheckingHealth(true);

    const nowTimeStr = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let status: 'healthy' | 'failed' = 'failed';
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(app.frontendUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(9000) });
      if (res.ok) {
        const data = await res.json();
        const httpCode = data.status?.http_code;
        status = interpretHealth(httpCode) === 'healthy' ? 'healthy' : 'failed';
      }
    } catch {
      status = 'failed';
    }

    const updated: AppProject = {
      ...app,
      healthStatus: status,
      healthCheckedAt: nowTimeStr,
    };

    try {
      const row = appProjectToRow(updated);
      await supabase.from('aw_app_projects').update(row).eq('id', app.id);
      onUpdateApp(updated);
      setFormData(updated);
    } catch (err) {
      console.error('Failed to save health check result:', err);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Toggle Manual Check (Admin only)
  const handleToggleManualCheck = async () => {
    if (!canEdit) return;
    const nextChecked = !app.manualChecked;
    const nextCheckedAt = nextChecked
      ? new Date().toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

    const updated: AppProject = {
      ...app,
      manualChecked: nextChecked,
      manualCheckedAt: nextCheckedAt,
    };

    try {
      const row = appProjectToRow(updated);
      const { error } = await supabase.from('aw_app_projects').update(row).eq('id', app.id);
      if (error) throw error;
      onUpdateApp(updated);
      setFormData(updated);
    } catch (err: any) {
      alert('Failed to update verification status: ' + (err?.message || ''));
    }
  };

  // Toggle Backlog item completion
  const handleToggleBacklog = async (item: BacklogItem) => {
    if (!canEdit) return;
    const nextCompleted = !item.isCompleted;
    const nextBacklog = backlog.map((b) =>
      b.id === item.id ? { ...b, isCompleted: nextCompleted } : b
    );

    try {
      await supabase
        .from('aw_app_backlog_items')
        .update({ is_completed: nextCompleted })
        .eq('id', item.id);
      onBacklogChange(nextBacklog);
    } catch (err: any) {
      alert('Failed to update task: ' + (err?.message || ''));
    }
  };

  // Add Backlog Item
  const handleAddBacklog = async () => {
    if (!canEdit || !newBacklogTitle.trim()) return;
    const newItem: BacklogItem = {
      id: newId('bl'),
      title: newBacklogTitle.trim(),
      isCompleted: false,
    };
    const nextBacklog = [...backlog, newItem];

    try {
      const row = backlogItemToRow(newItem, app.id);
      await supabase.from('aw_app_backlog_items').insert(row);
      onBacklogChange(nextBacklog);
      setNewBacklogTitle('');
    } catch (err: any) {
      alert('Failed to add task: ' + (err?.message || ''));
    }
  };

  // Delete Backlog Item
  const handleDeleteBacklog = async (itemId: string) => {
    if (!canEdit) return;
    const nextBacklog = backlog.filter((b) => b.id !== itemId);
    try {
      await supabase.from('aw_app_backlog_items').delete().eq('id', itemId);
      onBacklogChange(nextBacklog);
    } catch (err: any) {
      alert('Failed to delete task: ' + (err?.message || ''));
    }
  };

  // Save Settings Form (Fixed Supabase payload mapping)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !formData.title?.trim()) return;
    setIsSaving(true);
    setSaveSuccessMessage('');

    try {
      const updated: AppProject = {
        ...app,
        ...formData,
        title: formData.title.trim(),
        author: formData.author?.trim() || '',
        hosting: formData.hosting?.trim() || '',
        github: formData.github?.trim() || '',
        techStack: formData.techStack || '',
        category: formData.category || 'Web App',
        database: formData.database || 'Neon PostgreSQL',
        status: formData.status || 'Development',
        priority: formData.priority || 'Medium',
        frontendUrl: formData.frontendUrl?.trim() || '',
        description: formData.description || '',
        techNotes: formData.techNotes || '',
        specVi: formData.specVi || '',
        specEn: formData.specEn || '',
        specUpdatedAt: new Date().toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      };

      const row = appProjectToRow(updated);
      const { error } = await supabase.from('aw_app_projects').upsert(row);
      if (error) throw error;

      onUpdateApp(updated);
      setFormData(updated);
      setSaveSuccessMessage('Changes saved successfully!');
      setTimeout(() => setSaveSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Save project error:', err);
      alert('Failed to save project details: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="portfolio-modal-overlay" onClick={onClose}>
      <div className="portfolio-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Fullscreen Header / Hero Bar */}
        <div className="portfolio-hero-header">
          <div className="portfolio-hero-left">
            <div className="portfolio-icon" style={{ background: bgGradient }}>
              {currentSrc ? (
                <img
                  key={currentSrc}
                  src={currentSrc}
                  alt={app.title}
                  onError={() => setCandidateIndex((prev) => prev + 1)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '16px',
                  }}
                />
              ) : (
                initials
              )}
            </div>

            <div className="portfolio-title-meta">
              <div className="portfolio-title-row">
                <h1 className="portfolio-app-title">{app.title}</h1>
                <span className="portfolio-status-pill">{app.status}</span>
                {theme.featureBadge && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: theme.primary,
                      background: theme.bgLight,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.borderColor}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {theme.featureBadge}
                  </span>
                )}
                {app.manualChecked && (
                  <span className="portfolio-verified-badge" title={`Verified at: ${app.manualCheckedAt || 'N/A'}`}>
                    ✓ Verified
                  </span>
                )}
              </div>

              <div className="portfolio-meta-subline">
                <span className="portfolio-subline-cat">{app.category || 'Web App'}</span>
                <span className="portfolio-subline-dot">•</span>
                <span className="portfolio-subline-author">by {app.author || 'minkoi007cs'}</span>
                {app.hosting && (
                  <>
                    <span className="portfolio-subline-dot">•</span>
                    <span className="portfolio-subline-host">{app.hosting}</span>
                  </>
                )}
                <span className="portfolio-subline-dot">•</span>
                <div
                  className="portfolio-health-tag"
                  title={app.healthCheckedAt ? `Checked at: ${app.healthCheckedAt}` : 'Not checked'}
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
              </div>
            </div>
          </div>

          <div className="portfolio-hero-actions">
            {app.frontendUrl && (
              <a
                href={app.frontendUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary portfolio-btn-launch"
              >
                <span>Launch App</span>
                <ExternalLinkIcon size={14} />
              </a>
            )}

            <button
              className="btn btn-secondary portfolio-btn-health"
              onClick={handleCheckHealth}
              disabled={isCheckingHealth || !app.frontendUrl}
              title="Check online status of this application"
            >
              <RefreshIcon size={13} className={isCheckingHealth ? 'spin-icon' : ''} />
              <span>{isCheckingHealth ? 'Checking...' : 'Check Health'}</span>
            </button>

            {canEdit && (
              <button
                className={`btn ${app.manualChecked ? 'btn-secondary' : 'btn-secondary'} portfolio-btn-verify`}
                onClick={handleToggleManualCheck}
                title="Confirm manual verification"
              >
                <span>{app.manualChecked ? '✓ Verified' : '○ Verify'}</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary portfolio-btn-share"
              onClick={() => setIsShareModalOpen(true)}
              title="Share this application with friends, colleagues, or instructors"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ShareIcon size={14} />
              <span>Share</span>
            </button>

            <button className="portfolio-close-btn" onClick={onClose} title="Close modal (Esc)">
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="portfolio-nav-bar">
          <div className="portfolio-tabs-list">
            <button
              className={`portfolio-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span>🌟</span>
              <span>Overview</span>
            </button>
            <button
              className={`portfolio-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              <span>📋</span>
              <span>System Specs (SRS)</span>
            </button>
            <button
              className={`portfolio-tab-btn ${activeTab === 'backlog' ? 'active' : ''}`}
              onClick={() => setActiveTab('backlog')}
            >
              <span>🚀</span>
              <span>Roadmap & Backlog</span>
              {backlog.length > 0 && (
                <span className="portfolio-tab-badge">
                  {completedCount}/{backlog.length}
                </span>
              )}
            </button>
            {canEdit && (
              <button
                className={`portfolio-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <span>⚙️</span>
                <span>Settings & Edit</span>
              </button>
            )}
          </div>

          <div className="portfolio-quick-stats">
            <span className="portfolio-stat-text">
              Role: <strong>{canEdit ? 'Admin / Full Access' : 'Viewer / Read-only'}</strong>
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="portfolio-body">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="portfolio-tab-content">
              <div className="portfolio-overview-clean-grid">
                {/* Main Column: Clean flowing sections (1 frame, no nested boxes) */}
                <div className="portfolio-overview-main-col">
                  {/* About Section */}
                  <div className="portfolio-clean-section">
                    <h3 className="portfolio-clean-heading">
                      <span>📖</span> About Application
                    </h3>
                    <p className="portfolio-clean-desc">
                      {app.description || 'No detailed description available for this application.'}
                    </p>
                  </div>

                  {/* Architecture & Tech Notes */}
                  {app.techNotes && (
                    <div className="portfolio-clean-section">
                      <h3 className="portfolio-clean-heading">
                        <span>💡</span> Architecture &amp; Tech Notes
                      </h3>
                      <div className="portfolio-clean-tech-notes">
                        <SpecDocRenderer content={app.techNotes} />
                      </div>
                    </div>
                  )}

                  {/* Implementation Progress & Milestones */}
                  {backlog.length > 0 && (
                    <div className="portfolio-clean-section">
                      <div className="portfolio-clean-section-header">
                        <h3 className="portfolio-clean-heading">
                          <span>🚀</span> Roadmap &amp; Progress
                        </h3>
                        <button
                          type="button"
                          className="portfolio-text-link"
                          onClick={() => setActiveTab('backlog')}
                        >
                          View Backlog ({completedCount}/{backlog.length}) &rarr;
                        </button>
                      </div>

                      <div className="portfolio-progress-bar-wrapper">
                        <div className="portfolio-progress-bar-track">
                          <div
                            className="portfolio-progress-bar-fill"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="portfolio-progress-text">{progressPercent}% Completed</span>
                      </div>

                      <div className="portfolio-backlog-preview-list">
                        {backlog.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            className={`portfolio-backlog-preview-item ${item.isCompleted ? 'completed' : ''}`}
                            onClick={() => canEdit && handleToggleBacklog(item)}
                            style={{ cursor: canEdit ? 'pointer' : 'default' }}
                          >
                            <span className="backlog-preview-check">
                              {item.isCompleted ? '✓' : '○'}
                            </span>
                            <span className="backlog-preview-title">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Sidebar: Clean Key-Value metadata without heavy nested card */}
                <div className="portfolio-overview-sidebar-col">
                  <div className="portfolio-sidebar-box">
                    <h4 className="portfolio-sidebar-title">Information</h4>

                    <div className="portfolio-sidebar-list">
                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Developer</span>
                        <span className="sidebar-value">{app.author || 'minkoi007cs'}</span>
                      </div>

                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Category</span>
                        <span className="sidebar-value">{app.category || 'Web App'}</span>
                      </div>

                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Hosting</span>
                        <span className="sidebar-value">{app.hosting || 'Vercel'}</span>
                      </div>

                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Database</span>
                        <span className="sidebar-value highlight-db">{app.database || 'None'}</span>
                      </div>

                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Status</span>
                        <span className="sidebar-value">
                          <span className="portfolio-status-pill">{app.status}</span>
                        </span>
                      </div>

                      {app.priority && (
                        <div className="portfolio-sidebar-item">
                          <span className="sidebar-label">Priority</span>
                          <span className="sidebar-value">
                            <span className={`portfolio-priority-pill ${app.priority.toLowerCase()}`}>
                              {app.priority}
                            </span>
                          </span>
                        </div>
                      )}

                      {app.github && (
                        <div className="portfolio-sidebar-item">
                          <span className="sidebar-label">Repository</span>
                          <span className="sidebar-value">
                            <a
                              href={app.github}
                              target="_blank"
                              rel="noreferrer"
                              className="portfolio-repo-link"
                            >
                              {app.github.replace('https://github.com/', '')} ↗
                            </a>
                          </span>
                        </div>
                      )}

                      {app.frontendUrl && (
                        <div className="portfolio-sidebar-item">
                          <span className="sidebar-label">Live URL</span>
                          <span className="sidebar-value">
                            <a
                              href={app.frontendUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="portfolio-repo-link"
                            >
                              {app.frontendUrl.replace(/^https?:\/\//, '')} ↗
                            </a>
                          </span>
                        </div>
                      )}

                      {app.specUpdatedAt && (
                        <div className="portfolio-sidebar-item">
                          <span className="sidebar-label">Last Updated</span>
                          <span className="sidebar-value" style={{ color: '#94a3b8' }}>
                            {app.specUpdatedAt}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECIFICATIONS */}
          {activeTab === 'specs' && (
            <div className="portfolio-tab-content">
              <div className="portfolio-spec-header">
                <div className="portfolio-spec-title-info">
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📋</span> System Requirements &amp; Architecture Specification
                  </span>
                </div>

                <div className="portfolio-spec-meta">
                  <span className="portfolio-spec-date">
                    📅 Last updated: {app.specUpdatedAt || 'Recently'}
                  </span>
                  {canEdit && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('settings')}
                      title="Edit specification in Settings tab"
                    >
                      <EditIcon size={14} />
                      <span>Edit Spec</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="portfolio-spec-doc-container">
                <SpecDocRenderer
                  content={app.specEn || app.description || 'No system specification available for this project.'}
                />
              </div>
            </div>
          )}

          {/* TAB 3: BACKLOG & ROADMAP */}
          {activeTab === 'backlog' && (
            <div className="portfolio-tab-content">
              <div className="portfolio-card">
                <div className="portfolio-card-header-row">
                  <div>
                    <h3 className="portfolio-card-title">
                      <span>🚀</span> Tasks & Implementation Backlog
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      {canEdit
                        ? 'Admins can mark items completed, add new tasks, or remove items.'
                        : 'View implementation progress of system features.'}
                    </p>
                  </div>

                  <div className="portfolio-progress-chip">
                    <strong>{completedCount}</strong> / {backlog.length} tasks completed ({progressPercent}%)
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="portfolio-progress-bar-wrapper" style={{ margin: '1rem 0 1.5rem 0' }}>
                  <div className="portfolio-progress-bar-track">
                    <div
                      className="portfolio-progress-bar-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Add Task Input (Admin Only) */}
                {canEdit && (
                  <div className="portfolio-add-task-row">
                    <input
                      type="text"
                      className="input-text"
                      placeholder="Enter new feature or backlog task..."
                      value={newBacklogTitle}
                      onChange={(e) => setNewBacklogTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBacklog()}
                    />
                    <button className="btn btn-primary" onClick={handleAddBacklog}>
                      <PlusIcon size={16} />
                      <span>Add Task</span>
                    </button>
                  </div>
                )}

                {/* Task List */}
                {backlog.length === 0 ? (
                  <div className="portfolio-empty-state">
                    <span>📝</span>
                    <p>No backlog tasks currently defined for this project.</p>
                  </div>
                ) : (
                  <div className="portfolio-backlog-full-list">
                    {backlog.map((item) => (
                      <div
                        key={item.id}
                        className={`portfolio-backlog-row ${item.isCompleted ? 'done' : ''}`}
                        onClick={() => canEdit && handleToggleBacklog(item)}
                        style={{ cursor: canEdit ? 'pointer' : 'default' }}
                      >
                        <div className="backlog-row-left">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => canEdit && handleToggleBacklog(item)}
                            disabled={!canEdit}
                            style={{ cursor: canEdit ? 'pointer' : 'default', width: '18px', height: '18px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="backlog-row-title">{item.title}</span>
                        </div>

                        {canEdit && (
                          <button
                            className="btn-icon-sm danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBacklog(item.id);
                            }}
                            title="Delete task"
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS & MANAGEMENT (ADMIN ONLY - UNIFIED SINGLE EDIT FORM) */}
          {activeTab === 'settings' && canEdit && (
            <div className="portfolio-tab-content">
              <form onSubmit={handleSaveForm}>
                <div className="portfolio-card">
                  <h3 className="portfolio-card-title">
                    <span>⚙️</span> Comprehensive Application Management
                  </h3>

                  {saveSuccessMessage && (
                    <div className="portfolio-success-alert">
                      ✓ {saveSuccessMessage}
                    </div>
                  )}

                  {/* Section 1: Basic Information */}
                  <div className="form-section-title">
                    <span>🏷️</span> 1. Identity Information
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Application Name:</label>
                      <input
                        type="text"
                        className="input-text"
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Author / Developer:</label>
                      <input
                        type="text"
                        className="input-text"
                        value={formData.author || ''}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        placeholder="e.g. minkoi007cs"
                      />
                    </div>

                    <div className="form-group">
                      <label>Category:</label>
                      <input
                        type="text"
                        className="input-text"
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Section 2: Infrastructure & Environment */}
                  <div className="form-section-title">
                    <span>🌐</span> 2. Infrastructure & Environment
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Frontend Web App URL:</label>
                      <input
                        type="url"
                        className="input-text"
                        value={formData.frontendUrl || ''}
                        onChange={(e) => setFormData({ ...formData, frontendUrl: e.target.value })}
                        placeholder="https://example.minkoi.org"
                      />
                    </div>

                    <div className="form-group">
                      <label>Hosting / Vercel Project:</label>
                      <input
                        type="text"
                        className="input-text"
                        value={formData.hosting || ''}
                        onChange={(e) => setFormData({ ...formData, hosting: e.target.value })}
                        placeholder="e.g. Vercel (app-shelf)"
                      />
                    </div>

                    <div className="form-group">
                      <label>GitHub Repository URL:</label>
                      <input
                        type="url"
                        className="input-text"
                        value={formData.github || ''}
                        onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                        placeholder="https://github.com/..."
                      />
                    </div>
                  </div>

                  {/* Section 3: Database & Status */}
                  <div className="form-section-title">
                    <span>🗄️</span> 3. Database & System Status
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Database Layer:</label>
                      <select
                        className="input-select"
                        value={formData.database || 'Neon PostgreSQL'}
                        onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                      >
                        <option value="Supabase LifeDashboard">Supabase LifeDashboard</option>
                        <option value="Supabase FinMatchAI">Supabase FinMatchAI</option>
                        <option value="Neon PostgreSQL">Neon PostgreSQL</option>
                        <option value="Neon Database">Neon Database</option>
                        <option value="Browser State & Local Storage">Browser State & Local Storage</option>
                        <option value="Local Storage">Local Storage</option>
                        <option value="Local SQLite">Local SQLite</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Status:</label>
                      <select
                        className="input-select"
                        value={formData.status || 'Development'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Production">Production</option>
                        <option value="Development">Development</option>
                        <option value="Staging">Staging</option>
                        <option value="Planning">Planning</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Priority:</label>
                      <select
                        className="input-select"
                        value={formData.priority || 'Medium'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 4: Description & Tech Notes */}
                  <div className="form-section-title">
                    <span>💡</span> 4. Description & Tech Notes
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Summary Description:</label>
                      <textarea
                        className="input-text"
                        rows={4}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe goals, target users, and key features..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Technical Architecture & Notes:</label>
                      <textarea
                        className="input-text"
                        rows={4}
                        value={formData.techNotes || ''}
                        onChange={(e) => setFormData({ ...formData, techNotes: e.target.value })}
                        placeholder="Notes on stack, port, env, auth..."
                      />
                    </div>
                  </div>

                  {/* Section 5: SRS Markdown */}
                  <div className="form-section-title">
                    <span>📝</span> 5. System Specification (SRS Markdown)
                  </div>
                  <div className="form-group">
                    <label>Specification Content (Markdown):</label>
                    <textarea
                      className="input-text"
                      rows={10}
                      value={formData.specEn || ''}
                      onChange={(e) => setFormData({ ...formData, specEn: e.target.value })}
                      placeholder="# 1. Executive Summary & Objective..."
                    />
                  </div>

                  {/* Form Actions footer */}
                  <div
                    style={{
                      marginTop: '1.75rem',
                      paddingTop: '1.25rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently delete "${app.title}"?`)) {
                          onDeleteApp(app.id);
                        }
                      }}
                    >
                      <TrashIcon size={16} />
                      <span>Permanently Delete Application</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Close
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
        {isShareModalOpen && (
          <ShareAppsModal
            allApps={[app]}
            initialSelectedAppIds={[app.id]}
            onClose={() => setIsShareModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

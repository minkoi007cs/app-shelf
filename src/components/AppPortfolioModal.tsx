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
  initialEditMode?: boolean;
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
  if (!content) return <div style={{ opacity: 0.6, fontStyle: 'italic', padding: '0.5rem 0' }}>Chưa có tài liệu đặc tả.</div>;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inList = false;

  const flushList = (keyPrefix: string) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul
          key={`ul-${keyPrefix}-${elements.length}`}
          style={{ paddingLeft: '1.4rem', marginBottom: '0.85rem', lineHeight: '1.7' }}
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
        <h2
          key={index}
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginTop: index === 0 ? '0' : '1.5rem',
            marginBottom: '0.65rem',
            letterSpacing: '-0.02em',
          }}
        >
          {formatInline(trimmed.substring(2))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(`${index}`);
      elements.push(
        <h3
          key={index}
          style={{
            fontSize: '1.05rem',
            fontWeight: 600,
            color: '#38bdf8',
            marginTop: '1.25rem',
            marginBottom: '0.5rem',
          }}
        >
          {formatInline(trimmed.substring(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList(`${index}`);
      elements.push(
        <h4
          key={index}
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#a7f3d0',
            marginTop: '1rem',
            marginBottom: '0.35rem',
          }}
        >
          {formatInline(trimmed.substring(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={index} style={{ marginBottom: '0.3rem', color: '#cbd5e1', lineHeight: '1.65' }}>
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
            marginBottom: '0.45rem',
            lineHeight: '1.65',
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
      <p key={index} style={{ marginBottom: '0.75rem', color: '#cbd5e1', lineHeight: '1.65' }}>
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
  initialEditMode = false,
  onClose,
  onUpdateApp,
  onDeleteApp,
  onBacklogChange,
}: AppPortfolioModalProps) {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newBacklogTitle, setNewBacklogTitle] = useState('');

  // Edit form state
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
      await supabase.from('mk_app_projects').update(row).eq('id', app.id);
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
      const { error } = await supabase.from('mk_app_projects').update(row).eq('id', app.id);
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
        .from('mk_app_backlog_items')
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
      await supabase.from('mk_app_backlog_items').insert(row);
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
      await supabase.from('mk_app_backlog_items').delete().eq('id', itemId);
      onBacklogChange(nextBacklog);
    } catch (err: any) {
      alert('Failed to delete task: ' + (err?.message || ''));
    }
  };

  // Save Edit Form
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
      const { error } = await supabase.from('mk_app_projects').upsert(row);
      if (error) throw error;

      onUpdateApp(updated);
      setFormData(updated);
      setSaveSuccessMessage('Đã lưu thay đổi thành công!');
      setTimeout(() => {
        setSaveSuccessMessage('');
        setIsEditing(false);
      }, 1000);
    } catch (err: any) {
      console.error('Save project error:', err);
      alert('Không thể lưu thông tin ứng dụng: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="portfolio-modal-overlay" onClick={onClose}>
      <div className="portfolio-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header / Hero Bar */}
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
                    borderRadius: '14px',
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
                  <span className="portfolio-verified-badge" title={`Verified: ${app.manualCheckedAt || ''}`}>
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
                  title={app.healthCheckedAt ? `Checked: ${app.healthCheckedAt}` : 'Not checked'}
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
              type="button"
              className="btn btn-secondary portfolio-btn-health"
              onClick={handleCheckHealth}
              disabled={isCheckingHealth || !app.frontendUrl}
              title="Kiểm tra trạng thái online"
            >
              <RefreshIcon size={13} className={isCheckingHealth ? 'spin-icon' : ''} />
              <span>{isCheckingHealth ? 'Đang kiểm tra...' : 'Check Health'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary portfolio-btn-share"
              onClick={() => setIsShareModalOpen(true)}
              title="Chia sẻ ứng dụng"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ShareIcon size={14} />
              <span>Chia sẻ</span>
            </button>

            {canEdit && (
              <button
                type="button"
                className={`btn ${isEditing ? 'btn-primary' : 'btn-secondary'} portfolio-btn-edit`}
                onClick={() => setIsEditing(!isEditing)}
                title={isEditing ? 'Đóng chế độ chỉnh sửa' : 'Chỉnh sửa thông tin ứng dụng'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <EditIcon size={14} />
                <span>{isEditing ? 'Xem hồ sơ' : 'Chỉnh sửa'}</span>
              </button>
            )}

            <button className="portfolio-close-btn" onClick={onClose} title="Đóng modal (Esc)">
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="portfolio-body">
          {isEditing && canEdit ? (
            /* ADMIN EDIT MODE */
            <form onSubmit={handleSaveForm}>
              <div className="portfolio-edit-view">
                <div className="portfolio-edit-header">
                  <h3 className="portfolio-clean-heading">
                    <span>⚙️</span> Chỉnh sửa thông tin ứng dụng
                  </h3>
                  {saveSuccessMessage && (
                    <div className="portfolio-success-alert">
                      ✓ {saveSuccessMessage}
                    </div>
                  )}
                </div>

                {/* Section 1: Basic Information */}
                <div className="form-section-title">
                  1. Thông tin định danh
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Tên ứng dụng:</label>
                    <input
                      type="text"
                      className="input-text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tác giả / Nhà phát triển:</label>
                    <input
                      type="text"
                      className="input-text"
                      value={formData.author || ''}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="e.g. minkoi007cs"
                    />
                  </div>

                  <div className="form-group">
                    <label>Danh mục:</label>
                    <input
                      type="text"
                      className="input-text"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section 2: URLs & Infrastructure */}
                <div className="form-section-title">
                  2. Hạ tầng & Triển khai
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
                      placeholder="e.g. Vercel"
                    />
                  </div>

                  <div className="form-group">
                    <label>GitHub Repository URL:</label>
                    <input
                      type="url"
                      className="input-text"
                      value={formData.github || ''}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      placeholder="https://github.com/minkoi007cs/..."
                    />
                  </div>
                </div>

                {/* Section 3: Database & Status */}
                <div className="form-section-title">
                  3. Cơ sở dữ liệu &amp; Trạng thái
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Cơ sở dữ liệu:</label>
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
                    <label>Trạng thái:</label>
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
                    <label>Độ ưu tiên:</label>
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
                  4. Mô tả &amp; Ghi chú kỹ thuật
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Mô tả ngắn gọn:</label>
                    <textarea
                      className="input-text"
                      rows={4}
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả mục tiêu, đối tượng sử dụng và tính năng chính..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Kiến trúc &amp; Ghi chú kỹ thuật:</label>
                    <textarea
                      className="input-text"
                      rows={4}
                      value={formData.techNotes || ''}
                      onChange={(e) => setFormData({ ...formData, techNotes: e.target.value })}
                      placeholder="Ghi chú về tech stack, cổng port, authentication..."
                    />
                  </div>
                </div>

                {/* Section 5: SRS Markdown */}
                <div className="form-section-title">
                  5. Đặc tả hệ thống (SRS Markdown)
                </div>
                <div className="form-group">
                  <textarea
                    className="input-text"
                    rows={8}
                    value={formData.specEn || ''}
                    onChange={(e) => setFormData({ ...formData, specEn: e.target.value })}
                    placeholder="# 1. Mục tiêu & Tổng quan..."
                  />
                </div>

                {/* Footer Buttons */}
                <div className="portfolio-edit-actions">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ứng dụng "${app.title}"?`)) {
                        onDeleteApp(app.id);
                      }
                    }}
                  >
                    <TrashIcon size={15} />
                    <span>Xóa ứng dụng</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                      Hủy bỏ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* UNIFIED CLEAN PORTFOLIO VIEW: OVERVIEW + SPECS + BACKLOG COMBINED */
            <div className="portfolio-overview-clean-grid">
              {/* Main Content Column */}
              <div className="portfolio-overview-main-col">
                {/* 1. About Application */}
                <section className="portfolio-clean-section">
                  <h3 className="portfolio-clean-heading">
                    <span>📖</span> Giới thiệu ứng dụng
                  </h3>
                  <p className="portfolio-clean-desc">
                    {app.description || 'Chưa có mô tả chi tiết cho ứng dụng này.'}
                  </p>
                </section>

                {/* 2. Architecture & Tech Notes (if available) */}
                {app.techNotes && (
                  <section className="portfolio-clean-section">
                    <h3 className="portfolio-clean-heading">
                      <span>💡</span> Kiến trúc &amp; Ghi chú kỹ thuật
                    </h3>
                    <div className="portfolio-clean-tech-notes">
                      <SpecDocRenderer content={app.techNotes} />
                    </div>
                  </section>
                )}

                {/* 3. System Requirements & Architecture Specification (SRS) */}
                <section className="portfolio-clean-section">
                  <div className="portfolio-clean-section-header">
                    <h3 className="portfolio-clean-heading">
                      <span>📋</span> Đặc tả hệ thống (SRS)
                    </h3>
                    {app.specUpdatedAt && (
                      <span className="portfolio-spec-date">
                        Cập nhật: {app.specUpdatedAt}
                      </span>
                    )}
                  </div>
                  <div className="portfolio-spec-doc-container">
                    <SpecDocRenderer
                      content={app.specEn || app.description || 'Chưa có tài liệu đặc tả hệ thống.'}
                    />
                  </div>
                </section>

                {/* 4. Roadmap & Backlog Tasks */}
                <section className="portfolio-clean-section">
                  <div className="portfolio-clean-section-header">
                    <h3 className="portfolio-clean-heading">
                      <span>🚀</span> Lộ trình &amp; Backlog
                    </h3>
                    <div className="portfolio-progress-chip">
                      <strong>{completedCount}</strong>/{backlog.length} hoàn thành ({progressPercent}%)
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="portfolio-progress-bar-wrapper" style={{ margin: '0.75rem 0 1.25rem 0' }}>
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
                        placeholder="Thêm nhiệm vụ hoặc tính năng mới..."
                        value={newBacklogTitle}
                        onChange={(e) => setNewBacklogTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBacklog()}
                      />
                      <button type="button" className="btn btn-primary" onClick={handleAddBacklog}>
                        <PlusIcon size={15} />
                        <span>Thêm</span>
                      </button>
                    </div>
                  )}

                  {/* Task Checklist */}
                  {backlog.length === 0 ? (
                    <div className="portfolio-empty-tasks">
                      Chưa có nhiệm vụ backlog nào được thiết lập.
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
                              style={{ cursor: canEdit ? 'pointer' : 'default', width: '16px', height: '16px' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="backlog-row-title">{item.title}</span>
                          </div>

                          {canEdit && (
                            <button
                              type="button"
                              className="btn-icon-sm danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBacklog(item.id);
                              }}
                              title="Xóa nhiệm vụ"
                            >
                              <TrashIcon size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Sidebar Column: Information Panel */}
              <div className="portfolio-overview-sidebar-col">
                <div className="portfolio-sidebar-box">
                  <h4 className="portfolio-sidebar-title">Thông tin tổng quan</h4>

                  <div className="portfolio-sidebar-list">
                    <div className="portfolio-sidebar-item">
                      <span className="sidebar-label">Nhà phát triển</span>
                      <span className="sidebar-value">{app.author || 'minkoi007cs'}</span>
                    </div>

                    <div className="portfolio-sidebar-item">
                      <span className="sidebar-label">Danh mục</span>
                      <span className="sidebar-value">{app.category || 'Web App'}</span>
                    </div>

                    <div className="portfolio-sidebar-item">
                      <span className="sidebar-label">Hosting</span>
                      <span className="sidebar-value">{app.hosting || 'Vercel'}</span>
                    </div>

                    <div className="portfolio-sidebar-item">
                      <span className="sidebar-label">Cơ sở dữ liệu</span>
                      <span className="sidebar-value highlight-db">{app.database || 'None'}</span>
                    </div>

                    <div className="portfolio-sidebar-item">
                      <span className="sidebar-label">Trạng thái</span>
                      <span className="sidebar-value">
                        <span className="portfolio-status-pill">{app.status}</span>
                      </span>
                    </div>

                    {app.priority && (
                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Độ ưu tiên</span>
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

                    {canEdit && (
                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Xác thực</span>
                        <span className="sidebar-value">
                          <button
                            type="button"
                            className={`btn-xs ${app.manualChecked ? 'btn-verified-active' : 'btn-verified-idle'}`}
                            onClick={handleToggleManualCheck}
                            title="Xác thực ứng dụng đã kiểm tra"
                          >
                            {app.manualChecked ? '✓ Đã xác thực' : '○ Chưa xác thực'}
                          </button>
                        </span>
                      </div>
                    )}

                    {app.specUpdatedAt && (
                      <div className="portfolio-sidebar-item">
                        <span className="sidebar-label">Cập nhật</span>
                        <span className="sidebar-value" style={{ color: '#94a3b8' }}>
                          {app.specUpdatedAt}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

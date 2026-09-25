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
        candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=128`);
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
  if (!content) return <div style={{ opacity: 0.6, fontStyle: 'italic', padding: '1rem 0' }}>Chưa có nội dung đặc tả.</div>;

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
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#60a5fa',
            borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            paddingBottom: '0.4rem',
            marginTop: index === 0 ? '0' : '1.5rem',
            marginBottom: '0.85rem',
            letterSpacing: '-0.01em',
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
            fontSize: '1.15rem',
            fontWeight: 700,
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.08)',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            borderLeft: '4px solid #38bdf8',
            marginTop: '1.25rem',
            marginBottom: '0.75rem',
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
            marginTop: '1rem',
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
        <li key={index} style={{ marginBottom: '0.35rem', color: '#cbd5e1' }}>
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
            marginBottom: '0.5rem',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontWeight: 700, color: '#818cf8', minWidth: '1.2rem' }}>
            {numMatch ? numMatch[0] : ''}
          </span>
          <span style={{ color: '#e2e8f0' }}>{formatInline(text)}</span>
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
  initialTab = 'overview',
  onClose,
  onUpdateApp,
  onDeleteApp,
  onBacklogChange,
}: AppPortfolioModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'backlog' | 'settings'>(initialTab);
  const [specLang, setSpecLang] = useState<'vi' | 'en'>('vi');
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

  // Favicon handling
  const candidates = useMemo(() => getFaviconCandidates(app.frontendUrl, app.id), [app.frontendUrl, app.id]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const initials = getAppInitials(app.title);
  const bgGradient = getAppGradient(app.title + app.id);
  const currentSrc = candidateIndex < candidates.length ? candidates[candidateIndex] : null;

  // Backlog counts
  const backlog = app.backlog || [];
  const completedCount = backlog.filter((b) => b.isCompleted).length;
  const progressPercent = backlog.length > 0 ? Math.round((completedCount / backlog.length) * 100) : 0;

  // Manual Health Check for this single app
  const handleCheckHealth = async () => {
    if (!app.frontendUrl) return;
    setIsCheckingHealth(true);

    const nowTimeStr = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
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
      console.error('Lỗi lưu kết quả health check:', err);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Toggle Manual Check (Admin only)
  const handleToggleManualCheck = async () => {
    if (!canEdit) return;
    const nextChecked = !app.manualChecked;
    const nextCheckedAt = nextChecked
      ? new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
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
      alert('Lỗi cập nhật xác nhận kiểm tra: ' + (err?.message || ''));
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
      alert('Lỗi cập nhật task: ' + (err?.message || ''));
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
      alert('Lỗi thêm task: ' + (err?.message || ''));
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
      alert('Lỗi xóa task: ' + (err?.message || ''));
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
        database: formData.database || 'JH Supabase NoData',
        status: formData.status || 'Development',
        priority: formData.priority || 'Medium',
        frontendUrl: formData.frontendUrl?.trim() || '',
        description: formData.description || '',
        techNotes: formData.techNotes || '',
        specVi: formData.specVi || '',
        specEn: formData.specEn || '',
        specUpdatedAt: new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const row = appProjectToRow(updated);
      const { error } = await supabase.from('aw_app_projects').upsert(row);
      if (error) throw error;

      onUpdateApp(updated);
      setFormData(updated);
      setSaveSuccessMessage('Đã lưu thay đổi thành công!');
      setTimeout(() => setSaveSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Save project error:', err);
      alert('Lỗi lưu thông tin app: ' + (err?.message || 'Không rõ nguyên nhân'));
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
                    padding: '8px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
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
                {app.priority && (
                  <span className={`portfolio-priority-pill ${app.priority.toLowerCase()}`}>
                    {app.priority}
                  </span>
                )}
              </div>

              <div className="portfolio-meta-tags">
                <span className="portfolio-category-badge">🏷️ {app.category || 'Web App'}</span>
                <span className="portfolio-category-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  👤 {app.author || 'Developer'}
                </span>
                {app.hosting && (
                  <span className="portfolio-category-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    ☁️ {app.hosting}
                  </span>
                )}
                {app.database && (
                  <span className="portfolio-db-badge">
                    🗄️ {app.database}
                  </span>
                )}
                <div
                  className="portfolio-health-tag"
                  title={app.healthCheckedAt ? `Checked lúc: ${app.healthCheckedAt}` : 'Chưa check'}
                >
                  <span className={`store-health-dot ${app.healthStatus || 'unknown'}`} />
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
                {app.manualChecked && (
                  <span className="portfolio-verified-badge" title={`Check tay lúc: ${app.manualCheckedAt || 'N/A'}`}>
                    ✓ Đã xác minh {app.manualCheckedAt ? `(${app.manualCheckedAt})` : ''}
                  </span>
                )}
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
                <span>Mở Trực Tiếp</span>
                <ExternalLinkIcon size={16} />
              </a>
            )}

            <button
              className="btn btn-secondary portfolio-btn-health"
              onClick={handleCheckHealth}
              disabled={isCheckingHealth || !app.frontendUrl}
              title="Kiểm tra trạng thái online của ứng dụng"
            >
              <RefreshIcon size={14} className={isCheckingHealth ? 'spin-icon' : ''} />
              <span>{isCheckingHealth ? 'Đang check...' : 'Check Health'}</span>
            </button>

            {canEdit && (
              <button
                className={`btn ${app.manualChecked ? 'btn-secondary' : 'btn-secondary'} portfolio-btn-verify`}
                onClick={handleToggleManualCheck}
                title="Xác nhận bạn đã kiểm tra ứng dụng"
              >
                <span>{app.manualChecked ? '✓ Đã Check Tay' : '○ Xác Nhận Check'}</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary portfolio-btn-share"
              onClick={() => setIsShareModalOpen(true)}
              title="Chia sẻ ứng dụng này cho bạn bè, đồng nghiệp hoặc thầy cô"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ShareIcon size={15} />
              <span>Chia Sẻ</span>
            </button>

            <button className="portfolio-close-btn" onClick={onClose} title="Đóng modal (Esc)">
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
              <span>Tổng Quan Portfolio</span>
            </button>
            <button
              className={`portfolio-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              <span>📋</span>
              <span>Đặc Tả Kỹ Thuật (Specs)</span>
            </button>
            <button
              className={`portfolio-tab-btn ${activeTab === 'backlog' ? 'active' : ''}`}
              onClick={() => setActiveTab('backlog')}
            >
              <span>🚀</span>
              <span>Lộ Trình & Backlog</span>
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
                <span>Cấu Hình & Quản Lý (Edit)</span>
              </button>
            )}
          </div>

          <div className="portfolio-quick-stats">
            <span className="portfolio-stat-text">
              Quyền hạn: <strong>{canEdit ? 'Admin / Toàn quyền' : 'Viewer / Chỉ xem'}</strong>
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="portfolio-body">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="portfolio-tab-content">
              <div className="portfolio-grid-layout">
                {/* Unified Hero Overview Card (Description + System Info + Launch Action) */}
                <div className="portfolio-overview-hero-card">
                  <div className="portfolio-overview-split">
                    {/* Left: Description & Quick Links */}
                    <div className="portfolio-desc-block">
                      <h3 className="portfolio-card-title">
                        <span>📖</span> Mô Tả & Giới Thiệu
                      </h3>
                      <p className="portfolio-desc-text">
                        {app.description || 'Chưa có mô tả chi tiết cho ứng dụng này.'}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.5rem' }}>
                        {app.frontendUrl && (
                          <a
                            href={app.frontendUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <span>Truy cập Web App</span>
                            <ExternalLinkIcon size={14} />
                          </a>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setActiveTab('specs')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <span>📋 Xem Đặc Tả SRS</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Clean Meta Information Grid */}
                    <div className="portfolio-meta-grid">
                      <div className="portfolio-meta-item">
                        <span className="meta-label">Tác giả</span>
                        <span className="meta-value">{app.author || 'Developer'}</span>
                      </div>

                      <div className="portfolio-meta-item">
                        <span className="meta-label">Hosting</span>
                        <span className="meta-value">{app.hosting || 'Vercel'}</span>
                      </div>

                      <div className="portfolio-meta-item">
                        <span className="meta-label">Danh mục</span>
                        <span className="meta-value">{app.category || 'Web App'}</span>
                      </div>

                      <div className="portfolio-meta-item">
                        <span className="meta-label">Database</span>
                        <span className="meta-value" style={{ color: '#38bdf8' }}>{app.database || 'Supabase'}</span>
                      </div>

                      <div className="portfolio-meta-item">
                        <span className="meta-label">Trạng thái</span>
                        <span className="meta-value">
                          <span className="portfolio-status-pill">{app.status}</span>
                        </span>
                      </div>

                      <div className="portfolio-meta-item">
                        <span className="meta-label">Ưu tiên</span>
                        <span className="meta-value">{app.priority || 'Medium'}</span>
                      </div>

                      {app.github && (
                        <div className="portfolio-meta-item" style={{ gridColumn: 'span 2' }}>
                          <span className="meta-label">GitHub Repo</span>
                          <span className="meta-value">
                            <a
                              href={app.github}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.82rem' }}
                            >
                              {app.github.replace('https://github.com/', '')} ↗
                            </a>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Architecture & Tech Notes */}
                {app.techNotes && (
                  <div className="portfolio-card">
                    <h3 className="portfolio-card-title">
                      <span>💡</span> Kiến Trúc & Ghi Chú Kỹ Thuật
                    </h3>
                    <div className="portfolio-tech-notes">
                      <SpecDocRenderer content={app.techNotes} />
                    </div>
                  </div>
                )}

                {/* Progress & Backlog Section */}
                <div className="portfolio-card">
                  <div className="portfolio-card-header-row">
                    <h3 className="portfolio-card-title">
                      <span>🚀</span> Tiến Độ Thực Hiện & Backlog ({backlog.length} task)
                    </h3>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('backlog')}
                    >
                      Mở quản lý backlog ({backlog.length})
                    </button>
                  </div>

                  <div className="portfolio-progress-bar-wrapper">
                    <div className="portfolio-progress-bar-track">
                      <div
                        className="portfolio-progress-bar-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="portfolio-progress-text">{progressPercent}% Hoàn thành</span>
                  </div>

                  {backlog.length === 0 ? (
                    <p className="portfolio-empty-text" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                      Chưa có đầu việc backlog nào được thêm.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
                      {backlog.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className={`portfolio-backlog-preview-item ${item.isCompleted ? 'completed' : ''}`}
                        >
                          <span className="backlog-preview-check">
                            {item.isCompleted ? '✓' : '○'}
                          </span>
                          <span className="backlog-preview-title">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECIFICATIONS */}
          {activeTab === 'specs' && (
            <div className="portfolio-tab-content">
              <div className="portfolio-spec-header">
                <div className="portfolio-spec-lang-btns">
                  <button
                    type="button"
                    className={`btn ${specLang === 'vi' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSpecLang('vi')}
                  >
                    🇻🇳 Đặc Tả Tiếng Việt
                  </button>
                  <button
                    type="button"
                    className={`btn ${specLang === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSpecLang('en')}
                  >
                    🇬🇧 English Specification
                  </button>
                </div>

                <div className="portfolio-spec-meta">
                  <span className="portfolio-spec-date">
                    📅 Cập nhật lần cuối: {app.specUpdatedAt || '23/09/2026'}
                  </span>
                  {canEdit && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('settings')}
                      title="Chỉnh sửa văn bản đặc tả trong phần cài đặt"
                    >
                      <EditIcon size={14} />
                      <span>Sửa Đặc Tả</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="portfolio-spec-doc-container">
                <SpecDocRenderer
                  content={
                    specLang === 'en'
                      ? (app.specEn || 'No English specification available for this project.')
                      : (app.specVi || 'Chưa có đặc tả tiếng Việt cho dự án này.')
                  }
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
                      <span>🚀</span> Danh Sách Nhiệm Vụ & Kế Hoạch (Backlog)
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      {canEdit
                        ? 'Admin có thể tick hoàn thành, thêm nhiệm vụ mới hoặc xóa task.'
                        : 'Xem tiến độ thực hiện các tính năng của dự án.'}
                    </p>
                  </div>

                  <div className="portfolio-progress-chip">
                    <strong>{completedCount}</strong> / {backlog.length} task xong ({progressPercent}%)
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
                      placeholder="Nhập tên nhiệm vụ / tính năng cần làm..."
                      value={newBacklogTitle}
                      onChange={(e) => setNewBacklogTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBacklog()}
                    />
                    <button className="btn btn-primary" onClick={handleAddBacklog}>
                      <PlusIcon size={16} />
                      <span>Thêm Task</span>
                    </button>
                  </div>
                )}

                {/* Task List */}
                {backlog.length === 0 ? (
                  <div className="portfolio-empty-state">
                    <span>📝</span>
                    <p>Dự án này hiện chưa có nhiệm vụ backlog nào.</p>
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
                            title="Xóa nhiệm vụ"
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
                    <span>⚙️</span> Cấu Hình & Quản Lý Toàn Diện Ứng Dụng
                  </h3>

                  {saveSuccessMessage && (
                    <div className="portfolio-success-alert">
                      ✓ {saveSuccessMessage}
                    </div>
                  )}

                  {/* Section 1: Thông tin cơ bản */}
                  <div className="form-section-title">
                    <span>🏷️</span> 1. Thông Tin Nhận Diện
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
                      <label>Tác giả / Developer:</label>
                      <input
                        type="text"
                        className="input-text"
                        value={formData.author || ''}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        placeholder="VD: minh.khoi"
                      />
                    </div>

                    <div className="form-group">
                      <label>Danh mục (Category):</label>
                      <input
                        type="text"
                        className="input-text"
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Section 2: Hạ tầng & Kết nối */}
                  <div className="form-section-title">
                    <span>🌐</span> 2. Hạ Tầng & Kết Nối Môi Trường
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>URL Frontend Web App:</label>
                      <input
                        type="url"
                        className="input-text"
                        value={formData.frontendUrl || ''}
                        onChange={(e) => setFormData({ ...formData, frontendUrl: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="form-group">
                      <label>Hosting / Vercel Project:</label>
                      <input
                        type="text"
                        className="input-text"
                        value={formData.hosting || ''}
                        onChange={(e) => setFormData({ ...formData, hosting: e.target.value })}
                        placeholder="VD: Vercel (app-shelf)"
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

                  {/* Section 3: Cấu hình hệ thống */}
                  <div className="form-section-title">
                    <span>🗄️</span> 3. Trạng Thái & Cơ Sở Dữ Liệu
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Database Supabase:</label>
                      <select
                        className="input-select"
                        value={formData.database || 'JH Supabase NoData'}
                        onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                      >
                        <option value="JH Supabase Data 1">JH Supabase Data 1</option>
                        <option value="JH Supabase Data 2">JH Supabase Data 2</option>
                        <option value="JH Supabase NoData">JH Supabase NoData</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Trạng thái (Status):</label>
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
                      <label>Mức độ ưu tiên:</label>
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

                  {/* Section 4: Mô tả & Tech notes */}
                  <div className="form-section-title">
                    <span>💡</span> 4. Mô Tả & Ghi Chú Kỹ Thuật
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Mô tả tóm tắt ứng dụng:</label>
                      <textarea
                        className="input-text"
                        rows={4}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Mô tả mục đích, người dùng mục tiêu, tính năng chính..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Ghi chú kỹ thuật & Kiến trúc (Tech Notes):</label>
                      <textarea
                        className="input-text"
                        rows={4}
                        value={formData.techNotes || ''}
                        onChange={(e) => setFormData({ ...formData, techNotes: e.target.value })}
                        placeholder="Ghi chú về stack, port, env, auth..."
                      />
                    </div>
                  </div>

                  {/* Section 5: Đặc tả SRS Markdown */}
                  <div className="form-section-title">
                    <span>📝</span> 5. Tài Liệu Đặc Tả Kỹ Thuật (SRS Markdown)
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Đặc tả Tiếng Việt (Markdown):</label>
                      <textarea
                        className="input-text"
                        rows={8}
                        value={formData.specVi || ''}
                        onChange={(e) => setFormData({ ...formData, specVi: e.target.value })}
                        placeholder="# 1. Giới thiệu tổng quan..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Đặc tả English (Markdown):</label>
                      <textarea
                        className="input-text"
                        rows={8}
                        value={formData.specEn || ''}
                        onChange={(e) => setFormData({ ...formData, specEn: e.target.value })}
                        placeholder="# 1. Overview and Architecture..."
                      />
                    </div>
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
                        if (window.confirm(`Bạn có chắc muốn xóa vĩnh viễn ứng dụng "${app.title}"?`)) {
                          onDeleteApp(app.id);
                        }
                      }}
                    >
                      <TrashIcon size={16} />
                      <span>Xóa Vĩnh Viễn Ứng Dụng</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Đóng
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Đang lưu...' : 'Lưu Tất Cả Thay Đổi'}
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

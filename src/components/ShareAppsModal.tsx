import { useState, useMemo } from 'react';
import type { AppProject } from '../data/mappers';
import { ShareIcon, CopyIcon, CheckIcon, ExternalLinkIcon } from './icons';

interface ShareAppsModalProps {
  allApps: AppProject[];
  initialSelectedAppIds?: string[];
  onClose: () => void;
}

type TargetAudience = 'friends' | 'colleagues' | 'teachers';
type ShareFormat = 'link' | 'message' | 'markdown';

export function ShareAppsModal({
  allApps,
  initialSelectedAppIds,
  onClose,
}: ShareAppsModalProps) {
  // If specific IDs provided, select them; otherwise select all
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelectedAppIds && initialSelectedAppIds.length > 0) {
      return new Set(initialSelectedAppIds);
    }
    return new Set(allApps.map((a) => a.id));
  });

  const [audience, setAudience] = useState<TargetAudience>('friends');
  const [shareFormat, setShareFormat] = useState<ShareFormat>('link');
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isAppPickerExpanded, setIsAppPickerExpanded] = useState(false);

  // Selected apps list
  const selectedApps = useMemo(() => {
    return allApps.filter((a) => selectedIds.has(a.id));
  }, [allApps, selectedIds]);

  // Search filtered apps for the picker
  const filteredAppsForPicker = useMemo(() => {
    const q = appSearchQuery.toLowerCase().trim();
    if (!q) return allApps;
    return allApps.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [allApps, appSearchQuery]);

  // Toggle selection
  const toggleApp = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(allApps.map((a) => a.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Base URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate web share link
  const shareWebLink = useMemo(() => {
    if (selectedApps.length === 0) return `${origin}/app-wallet`;
    if (selectedApps.length === allApps.length) {
      return `${origin}/app-wallet`;
    }
    if (selectedApps.length === 1) {
      return `${origin}/app-wallet/${selectedApps[0].id}`;
    }
    const ids = selectedApps.map((a) => a.id).join(',');
    return `${origin}/app-wallet?apps=${encodeURIComponent(ids)}`;
  }, [selectedApps, allApps.length, origin]);

  // Generate friendly message text based on audience
  const generatedMessage = useMemo(() => {
    const count = selectedApps.length;
    if (count === 0) return 'Please select at least one application to share.';

    if (audience === 'friends') {
      const appLines = selectedApps
        .map((app, idx) => {
          const link = app.frontendUrl || `${origin}/app-wallet/${app.id}`;
          return `${idx + 1}. 🚀 **${app.title}** (${app.category || 'Web App'})\n   - ${app.description || 'Useful application with modern responsive interface.'}\n   👉 Experience: ${link}`;
        })
        .join('\n\n');

      return `Hello! I would like to share with you a curated collection of ${count} useful applications:\n\n${appLines}\n\n✨ Browse the complete collection at: ${shareWebLink}\nEnjoy testing and exploring! 😊`;
    }

    if (audience === 'colleagues') {
      const appLines = selectedApps
        .map((app, idx) => {
          const liveUrl = app.frontendUrl ? `\n   • Production Live: ${app.frontendUrl}` : '';
          const repoUrl = app.github ? `\n   • Repository: ${app.github}` : '';
          const tech = app.techStack ? `\n   • Tech stack: ${app.techStack}` : '';
          const db = app.database ? `\n   • Database: ${app.database}` : '';
          const hosting = app.hosting ? `\n   • Hosting platform: ${app.hosting}` : '';

          return `${idx + 1}. 💼 **${app.title}** [${app.status || 'Active'}] - ${app.category || 'System'}\n   • Description: ${app.description || 'Production web application & workspace tool.'}${liveUrl}${repoUrl}${tech}${db}${hosting}`;
        })
        .join('\n\n');

      return `Hi team and colleagues,\n\nHere is the detailed overview of ${count} deployed systems and projects:\n\n${appLines}\n\n📌 System portfolio & documentation link: ${shareWebLink}\nFeel free to review and share your feedback!`;
    }

    // Teachers / Instructors
    const appLines = selectedApps
      .map((app, idx) => {
        const live = app.frontendUrl ? `\n   - Production URL: ${app.frontendUrl}` : '';
        const specs = `${origin}/app-wallet/${app.id}?tab=specs`;
        const tech = app.techStack ? `\n   - Technology Stack: ${app.techStack}` : '';
        const db = app.database ? `\n   - Data Architecture: ${app.database}` : '';

        return `${idx + 1}. 🎓 **${app.title}** (${app.category || 'Project / Product'})\n   - Objective: ${app.description || 'Research and engineering implementation.'}${tech}${db}${live}\n   - SRS Specification: ${specs}`;
      })
      .join('\n\n');

    return `Dear Professor / Instructor,\n\nI would like to submit and share the live deployment and specifications of ${count} software systems:\n\n${appLines}\n\n📖 Portfolio Directory & System Specifications: ${shareWebLink}\n\nI look forward to receiving your valuable feedback and guidance.\nThank you very much!`;
  }, [selectedApps, audience, origin, shareWebLink]);

  // Generate Markdown table/list
  const generatedMarkdown = useMemo(() => {
    const count = selectedApps.length;
    if (count === 0) return 'Please select applications.';

    const tableRows = selectedApps
      .map((app) => {
        const liveLink = app.frontendUrl ? `[Visit Live](${app.frontendUrl})` : '—';
        const specsLink = `[View Specs](${origin}/app-wallet/${app.id}?tab=specs)`;
        return `| **${app.title}** | ${app.category || 'Web App'} | \`${app.status}\` | ${liveLink} | ${specsLink} |`;
      })
      .join('\n');

    return `### 📦 Application Directory (${count} apps)\n\n| Application Name | Category | Status | Live Demo | Technical Specs |\n| :--- | :--- | :--- | :--- | :--- |\n${tableRows}\n\n> 🌐 **Full Application Workspace**: [MinKoi's App Store Workspace](${shareWebLink})\n`;
  }, [selectedApps, origin, shareWebLink]);

  // Copy helper
  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      alert('Unable to copy automatically. Please select and copy manually.');
    }
  };

  // Web Share API
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: selectedApps.length === 1 ? selectedApps[0].title : 'Shared Applications Directory',
        text: generatedMessage,
        url: shareWebLink,
      });
    } catch {
      // User cancelled or share failed, ignore
    }
  };

  return (
    <div className="portfolio-modal-overlay" onClick={onClose}>
      <div
        className="portfolio-modal-container share-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="portfolio-hero-header share-modal-header">
          <div className="portfolio-hero-left" style={{ gap: '0.85rem' }}>
            <div
              className="portfolio-icon"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                width: '46px',
                height: '46px',
                borderRadius: '12px',
              }}
            >
              <ShareIcon size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Share Applications
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Share individual apps or your full portfolio with friends, colleagues, or instructors
              </p>
            </div>
          </div>

          <button className="portfolio-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="portfolio-body share-modal-body" style={{ padding: '1.25rem 1.5rem' }}>
          {/* SECTION 1: Audience Persona */}
          <div className="share-section">
            <label className="share-section-label">
              <span>🎯</span> Select Target Audience:
            </label>
            <div className="share-audience-pills">
              <button
                type="button"
                className={`share-audience-pill ${audience === 'friends' ? 'active' : ''}`}
                onClick={() => setAudience('friends')}
              >
                <span className="persona-emoji">🤝</span>
                <div className="persona-text">
                  <strong>Friends</strong>
                  <small>Casual, useful app recommendations</small>
                </div>
              </button>

              <button
                type="button"
                className={`share-audience-pill ${audience === 'colleagues' ? 'active' : ''}`}
                onClick={() => setAudience('colleagues')}
              >
                <span className="persona-emoji">💼</span>
                <div className="persona-text">
                  <strong>Colleagues</strong>
                  <small>Professional, tech stack & repo</small>
                </div>
              </button>

              <button
                type="button"
                className={`share-audience-pill ${audience === 'teachers' ? 'active' : ''}`}
                onClick={() => setAudience('teachers')}
              >
                <span className="persona-emoji">🎓</span>
                <div className="persona-text">
                  <strong>Instructors</strong>
                  <small>Academic, project reports & SRS</small>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: Apps Selection */}
          <div className="share-section" style={{ marginTop: '1.15rem' }}>
            <div className="share-section-header">
              <label className="share-section-label" style={{ margin: 0 }}>
                <span>📦</span> Shared Applications ({selectedApps.length} / {allApps.length}):
              </label>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={selectAll}
                  disabled={selectedApps.length === allApps.length}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={deselectAll}
                  disabled={selectedApps.length === 0}
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setIsAppPickerExpanded((v) => !v)}
                  style={{ color: '#60a5fa' }}
                >
                  {isAppPickerExpanded ? 'Collapse list ▲' : 'Customize apps ▼'}
                </button>
              </div>
            </div>

            {/* Collapsible App Selection Checklist */}
            {isAppPickerExpanded && (
              <div className="share-picker-panel">
                <input
                  type="text"
                  className="input-text share-picker-search"
                  placeholder="Search applications in list..."
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                />
                <div className="share-picker-list">
                  {filteredAppsForPicker.map((app) => {
                    const isChecked = selectedIds.has(app.id);
                    return (
                      <label
                        key={app.id}
                        className={`share-picker-item ${isChecked ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleApp(app.id)}
                        />
                        <span className="share-picker-item-title">{app.title}</span>
                        <span className="share-picker-item-category">
                          {app.category || 'Web App'}
                        </span>
                      </label>
                    );
                  })}
                  {filteredAppsForPicker.length === 0 && (
                    <div style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                      No matching applications found
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Preview Chips of Selected Apps */}
            <div className="share-selected-chips">
              {selectedApps.length === 0 ? (
                <div className="share-no-selection">
                  ⚠️ No applications selected. Please check at least one application above.
                </div>
              ) : (
                selectedApps.map((app) => (
                  <span key={app.id} className="share-selected-chip">
                    <span>{app.title}</span>
                    <button
                      type="button"
                      className="share-chip-remove"
                      onClick={() => toggleApp(app.id)}
                      title="Remove this application"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* SECTION 3: Formats & Output Content */}
          <div className="share-section" style={{ marginTop: '1.25rem' }}>
            <div className="share-format-tabs">
              <button
                type="button"
                className={`share-format-tab ${shareFormat === 'link' ? 'active' : ''}`}
                onClick={() => setShareFormat('link')}
              >
                <span>🔗</span>
                <span>Web Share Link</span>
              </button>
              <button
                type="button"
                className={`share-format-tab ${shareFormat === 'message' ? 'active' : ''}`}
                onClick={() => setShareFormat('message')}
              >
                <span>💬</span>
                <span>Intro Message</span>
              </button>
              <button
                type="button"
                className={`share-format-tab ${shareFormat === 'markdown' ? 'active' : ''}`}
                onClick={() => setShareFormat('markdown')}
              >
                <span>📝</span>
                <span>Markdown Format</span>
              </button>
            </div>

            {/* TAB CONTENT: WEB LINK */}
            {shareFormat === 'link' && (
              <div className="share-format-box">
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Recipients opening this link will view the selected {selectedApps.length} applications in the interactive MinKoi's App Store Workspace:
                </p>
                <div className="share-link-input-row">
                  <input
                    type="text"
                    readOnly
                    value={shareWebLink}
                    className="input-text share-link-input"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleCopy(shareWebLink)}
                    style={{ whiteSpace: 'nowrap', minWidth: '130px' }}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon size={16} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={16} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <a
                    href={shareWebLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <span>Open Live Link</span>
                    <ExternalLinkIcon size={13} />
                  </a>

                  {canNativeShare && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleNativeShare}
                      style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.4)' }}
                    >
                      <ShareIcon size={14} />
                      <span>Share via Apps / Mail...</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: MESSAGE TEXT */}
            {shareFormat === 'message' && (
              <div className="share-format-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Pre-formatted text message (suitable for Messaging, Slack, SMS, Email):
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCopy(generatedMessage)}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon size={14} />
                        <span>Message Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  className="textarea-backup share-message-textarea"
                  value={generatedMessage}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}

            {/* TAB CONTENT: MARKDOWN */}
            {shareFormat === 'markdown' && (
              <div className="share-format-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Standard Markdown table format (suitable for GitHub README, Notion, Slack):
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCopy(generatedMarkdown)}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon size={14} />
                        <span>Markdown Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  className="textarea-backup share-message-textarea"
                  value={generatedMarkdown}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Selected <strong>{selectedApps.length}</strong> applications
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const textToCopy =
                  shareFormat === 'link'
                    ? shareWebLink
                    : shareFormat === 'message'
                    ? generatedMessage
                    : generatedMarkdown;
                handleCopy(textToCopy);
              }}
            >
              {isCopied ? (
                <>
                  <CheckIcon size={15} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={15} />
                  <span>Copy Output</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

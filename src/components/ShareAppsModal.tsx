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
    if (count === 0) return 'Vui lòng chọn ít nhất một ứng dụng để chia sẻ.';

    if (audience === 'friends') {
      const appLines = selectedApps
        .map((app, idx) => {
          const link = app.frontendUrl || `${origin}/app-wallet/${app.id}`;
          return `${idx + 1}. 🚀 **${app.title}** (${app.category || 'Web App'})\n   - ${app.description || 'Ứng dụng hữu ích, giao diện mượt mà.'}\n   👉 Trải nghiệm: ${link}`;
        })
        .join('\n\n');

      return `Chào bạn! Mình muốn chia sẻ với bạn bộ sưu tập ${count} ứng dụng cực kỳ tiện ích:\n\n${appLines}\n\n✨ Xem toàn bộ danh sách tại: ${shareWebLink}\nChúc bạn có những trải nghiệm thật vui vẻ và hữu ích! 😊`;
    }

    if (audience === 'colleagues') {
      const appLines = selectedApps
        .map((app, idx) => {
          const liveUrl = app.frontendUrl ? `\n   • Trực tiếp (Live): ${app.frontendUrl}` : '';
          const repoUrl = app.github ? `\n   • Mã nguồn (Repo): ${app.github}` : '';
          const tech = app.techStack ? `\n   • Tech stack: ${app.techStack}` : '';
          const db = app.database ? `\n   • Cơ sở dữ liệu: ${app.database}` : '';
          const hosting = app.hosting ? `\n   • Nền tảng hosting: ${app.hosting}` : '';

          return `${idx + 1}. 💼 **${app.title}** [${app.status || 'Active'}] - ${app.category || 'Hệ thống'}\n   • Mô tả: ${app.description || 'Ứng dụng nội bộ & sản phẩm số.'}${liveUrl}${repoUrl}${tech}${db}${hosting}`;
        })
        .join('\n\n');

      return `Hi anh/chị và các bạn đồng nghiệp,\n\nMình xin chia sẻ thông tin chi tiết về ${count} ứng dụng/dự án trong hệ thống:\n\n${appLines}\n\n📌 Liên kết tổng hợp & hồ sơ dự án: ${shareWebLink}\nMọi người xem và đóng góp ý kiến giúp mình nhé! Cảm ơn mọi người!`;
    }

    // Teachers
    const appLines = selectedApps
      .map((app, idx) => {
        const live = app.frontendUrl ? `\n   - Liên kết thực nghiệm: ${app.frontendUrl}` : '';
        const specs = `${origin}/app-wallet/${app.id}?tab=specs`;
        const tech = app.techStack ? `\n   - Công nghệ áp dụng: ${app.techStack}` : '';
        const db = app.database ? `\n   - Quản trị dữ liệu: ${app.database}` : '';

        return `${idx + 1}. 🎓 **${app.title}** (${app.category || 'Đồ án / Sản phẩm'})\n   - Mục tiêu: ${app.description || 'Nghiên cứu và triển khai ứng dụng thực tiễn.'}${tech}${db}${live}\n   - Hồ sơ đặc tả SRS: ${specs}`;
      })
      .join('\n\n');

    return `Kính gửi Quý Thầy/Cô,\n\nEm xin phép được báo cáo và gửi tới Thầy/Cô thông tin cùng liên kết trải nghiệm của ${count} ứng dụng/sản phẩm phần mềm:\n\n${appLines}\n\n📖 Danh mục hồ sơ & đặc tả hệ thống: ${shareWebLink}\n\nEm rất mong nhận được những góp ý quý báu của Thầy/Cô để hoàn thiện các sản phẩm tốt hơn.\nEm xin chân thành cảm ơn Thầy/Cô!`;
  }, [selectedApps, audience, origin, shareWebLink]);

  // Generate Markdown table/list
  const generatedMarkdown = useMemo(() => {
    const count = selectedApps.length;
    if (count === 0) return 'Vui lòng chọn ứng dụng.';

    const tableRows = selectedApps
      .map((app) => {
        const liveLink = app.frontendUrl ? `[Truy cập](${app.frontendUrl})` : '—';
        const specsLink = `[Xem Specs](${origin}/app-wallet/${app.id}?tab=specs)`;
        return `| **${app.title}** | ${app.category || 'Web App'} | \`${app.status}\` | ${liveLink} | ${specsLink} |`;
      })
      .join('\n');

    return `### 📦 Danh Mục Ứng Dụng (${count} ứng dụng)\n\n| Tên Ứng Dụng | Danh Mục | Trạng Thái | Trải Nghiệm | Đặc Tả Kỹ Thuật |\n| :--- | :--- | :--- | :--- | :--- |\n${tableRows}\n\n> 🌐 **Kho ứng dụng đầy đủ**: [App Store Workspace](${shareWebLink})\n`;
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
      alert('Không thể tự động sao chép. Vui lòng chọn và sao chép thủ công.');
    }
  };

  // Web Share API
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: selectedApps.length === 1 ? selectedApps[0].title : 'Danh mục ứng dụng chia sẻ',
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
                Chia Sẻ Ứng Dụng
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Chia sẻ một, một vài hoặc toàn bộ kho ứng dụng cho bạn bè, đồng nghiệp hoặc thầy cô
              </p>
            </div>
          </div>

          <button className="portfolio-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="portfolio-body share-modal-body" style={{ padding: '1.25rem 1.5rem' }}>
          {/* SECTION 1: Chọn đối tượng người nhận (Audience Persona) */}
          <div className="share-section">
            <label className="share-section-label">
              <span>🎯</span> Chọn Đối Tượng Người Nhận:
            </label>
            <div className="share-audience-pills">
              <button
                type="button"
                className={`share-audience-pill ${audience === 'friends' ? 'active' : ''}`}
                onClick={() => setAudience('friends')}
              >
                <span className="persona-emoji">🤝</span>
                <div className="persona-text">
                  <strong>Bạn Bè</strong>
                  <small>Thân thiện, gợi ý app hay & tiện ích</small>
                </div>
              </button>

              <button
                type="button"
                className={`share-audience-pill ${audience === 'colleagues' ? 'active' : ''}`}
                onClick={() => setAudience('colleagues')}
              >
                <span className="persona-emoji">💼</span>
                <div className="persona-text">
                  <strong>Đồng Nghiệp</strong>
                  <small>Chuyên nghiệp, tech stack & repo</small>
                </div>
              </button>

              <button
                type="button"
                className={`share-audience-pill ${audience === 'teachers' ? 'active' : ''}`}
                onClick={() => setAudience('teachers')}
              >
                <span className="persona-emoji">🎓</span>
                <div className="persona-text">
                  <strong>Thầy Cô</strong>
                  <small>Trang trọng, báo cáo sản phẩm & SRS</small>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: Lựa chọn danh sách Apps */}
          <div className="share-section" style={{ marginTop: '1.15rem' }}>
            <div className="share-section-header">
              <label className="share-section-label" style={{ margin: 0 }}>
                <span>📦</span> Ứng Dụng Được Chia Sẻ ({selectedApps.length} / {allApps.length}):
              </label>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={selectAll}
                  disabled={selectedApps.length === allApps.length}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={deselectAll}
                  disabled={selectedApps.length === 0}
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setIsAppPickerExpanded((v) => !v)}
                  style={{ color: '#60a5fa' }}
                >
                  {isAppPickerExpanded ? 'Thu gọn danh sách ▲' : 'Tùy chỉnh apps ▼'}
                </button>
              </div>
            </div>

            {/* Collapsible App Selection Checklist */}
            {isAppPickerExpanded && (
              <div className="share-picker-panel">
                <input
                  type="text"
                  className="input-text share-picker-search"
                  placeholder="Tìm ứng dụng trong danh sách..."
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
                      Không tìm thấy ứng dụng phù hợp
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Preview Chips of Selected Apps */}
            <div className="share-selected-chips">
              {selectedApps.length === 0 ? (
                <div className="share-no-selection">
                  ⚠️ Chưa có ứng dụng nào được chọn. Vui lòng tick chọn ít nhất 1 ứng dụng bên trên.
                </div>
              ) : (
                selectedApps.map((app) => (
                  <span key={app.id} className="share-selected-chip">
                    <span>{app.title}</span>
                    <button
                      type="button"
                      className="share-chip-remove"
                      onClick={() => toggleApp(app.id)}
                      title="Bỏ ứng dụng này"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* SECTION 3: Định dạng chia sẻ & Nội dung xuất */}
          <div className="share-section" style={{ marginTop: '1.25rem' }}>
            <div className="share-format-tabs">
              <button
                type="button"
                className={`share-format-tab ${shareFormat === 'link' ? 'active' : ''}`}
                onClick={() => setShareFormat('link')}
              >
                <span>🔗</span>
                <span>Liên Kết Chia Sẻ Web</span>
              </button>
              <button
                type="button"
                className={`share-format-tab ${shareFormat === 'message' ? 'active' : ''}`}
                onClick={() => setShareFormat('message')}
              >
                <span>💬</span>
                <span>Tin Nhắn Giới Thiệu</span>
              </button>
              <button
                type="button"
                className={`share-format-tab ${shareFormat === 'markdown' ? 'active' : ''}`}
                onClick={() => setShareFormat('markdown')}
              >
                <span>📝</span>
                <span>Định Dạng Markdown</span>
              </button>
            </div>

            {/* TAB CONTENT: WEB LINK */}
            {shareFormat === 'link' && (
              <div className="share-format-box">
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Người nhận mở link này sẽ xem được đúng danh sách {selectedApps.length} ứng dụng đã chọn trong giao diện App Wallet trực quan:
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
                        <span>Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={16} />
                        <span>Sao chép link</span>
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
                    <span>Mở thử liên kết</span>
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
                      <span>Gửi qua Zalo / Messenger / Mail...</span>
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
                    Nội dung văn bản định dạng sẵn (phù hợp gửi qua Zalo, Messenger, SMS, Email):
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCopy(generatedMessage)}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon size={14} />
                        <span>Đã chép tin nhắn!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} />
                        <span>Sao chép tin nhắn</span>
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
                    Định dạng bảng Markdown chuẩn (thích hợp dán vào GitHub README, Notion, Slack):
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCopy(generatedMarkdown)}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon size={14} />
                        <span>Đã chép Markdown!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} />
                        <span>Sao chép Markdown</span>
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
            Đã chọn <strong>{selectedApps.length}</strong> ứng dụng
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Đóng
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
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={15} />
                  <span>Sao chép kết quả</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  GithubIcon,
  VercelIcon,
  SparklesIcon,
  PlusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshIcon,
  EditIcon,
  SearchIcon,
} from './icons';
import {
  fetchGitHubRepoData,
  fetchVercelProjectData,
  fetchUserGitHubRepos,
  type GitHubUserRepoItem,
} from '../utils/connectors';
import { extractAppWithAI, findDuplicateApp, type ExtractedAppResult } from '../utils/aiAppBuilder';
import type { AppProject, BacklogItem } from '../data/mappers';
import { newId } from '../utils/ids';
import { useAuth } from '../contexts/AuthContext';

interface AddAppModalProps {
  existingApps: AppProject[];
  onClose: () => void;
  onSaveNewApp: (app: Omit<AppProject, 'backlog'>, backlog: BacklogItem[]) => Promise<void>;
  onUpdateExistingApp: (app: AppProject, backlog: BacklogItem[]) => Promise<void>;
}

export function AddAppModal({
  existingApps,
  onClose,
  onSaveNewApp,
  onUpdateExistingApp,
}: AddAppModalProps) {
  const { githubToken, signInWithGitHub, disconnectGitHub } = useAuth();
  const [activeTab, setActiveTab] = useState<'github' | 'vercel' | 'manual'>('github');

  // Input states
  const [githubInput, setGithubInput] = useState('');
  const [manualGhToken, setManualGhToken] = useState('');
  const [showManualGhToken, setShowManualGhToken] = useState(false);

  // User repositories list for 1-click select
  const [userRepos, setUserRepos] = useState<GitHubUserRepoItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearchFilter, setRepoSearchFilter] = useState('');

  const [vercelInput, setVercelInput] = useState('');
  const [vercelToken, setVercelToken] = useState(localStorage.getItem('vercel_token') || '');
  const [saveVercelToken, setSaveVercelToken] = useState(true);

  // Status & loading states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Extracted Result & Duplicate state
  const [extractedData, setExtractedData] = useState<ExtractedAppResult | null>(null);
  const [duplicateApp, setDuplicateApp] = useState<AppProject | null>(null);
  const [viewMode, setViewMode] = useState<'import' | 'duplicate_prompt' | 'review'>('import');

  // Review / Manual form data
  const [formData, setFormData] = useState<Partial<AppProject>>({
    title: '',
    frontendUrl: '',
    category: 'Web App',
    database: 'JH Supabase Data 1',
    status: 'Development',
    priority: 'Medium',
    description: '',
    techNotes: '',
    specVi: '',
    specEn: '',
  });
  const [backlogList, setBacklogList] = useState<BacklogItem[]>([]);
  const [newBacklogTitle, setNewBacklogTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Active token priority
  const effectiveGhToken = githubToken || manualGhToken.trim() || localStorage.getItem('github_token') || '';

  // Load user repositories if GitHub token is present
  useEffect(() => {
    if (activeTab === 'github' && effectiveGhToken && userRepos.length === 0 && !isLoadingRepos) {
      setIsLoadingRepos(true);
      fetchUserGitHubRepos(effectiveGhToken)
        .then((repos) => setUserRepos(repos))
        .catch((err) => console.warn('Could not load user repos:', err))
        .finally(() => setIsLoadingRepos(false));
    }
  }, [activeTab, effectiveGhToken]);

  // Handle GitHub Import
  const handleConnectGitHub = async (e?: React.FormEvent, repoNameOverride?: string) => {
    if (e) e.preventDefault();
    const targetInput = repoNameOverride || githubInput;
    if (!targetInput.trim()) return;

    if (manualGhToken.trim()) {
      localStorage.setItem('github_token', manualGhToken.trim());
    }

    setIsProcessing(true);
    setErrorMessage('');
    setProgressStep('Đang kết nối GitHub và kiểm tra kho mã nguồn...');

    try {
      const repoPayload = await fetchGitHubRepoData(targetInput, effectiveGhToken);

      setProgressStep('AI đang đọc README, dependencies & cấu trúc để trích xuất đặc tả...');
      const aiResult = await extractAppWithAI('github', repoPayload);

      setExtractedData(aiResult);
      populateFormData(aiResult);

      // Check duplicate
      const duplicate = findDuplicateApp(
        { title: aiResult.title, frontendUrl: aiResult.frontendUrl },
        existingApps
      );

      if (duplicate) {
        setDuplicateApp(duplicate);
        setViewMode('duplicate_prompt');
      } else {
        setViewMode('review');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi trích xuất dữ liệu từ GitHub');
    } finally {
      setIsProcessing(false);
      setProgressStep('');
    }
  };

  // Handle Vercel Import
  const handleConnectVercel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vercelInput.trim()) return;

    if (saveVercelToken && vercelToken) {
      localStorage.setItem('vercel_token', vercelToken.trim());
    }

    setIsProcessing(true);
    setErrorMessage('');
    setProgressStep('Đang kết nối dự án Vercel & kiểm tra website...');

    try {
      const vercelPayload = await fetchVercelProjectData(vercelInput, vercelToken);

      setProgressStep('AI đang phân tích kiến trúc, giao diện & tạo tài liệu đặc tả...');
      const aiResult = await extractAppWithAI('vercel', vercelPayload);

      setExtractedData(aiResult);
      populateFormData(aiResult);

      // Check duplicate
      const duplicate = findDuplicateApp(
        { title: aiResult.title, frontendUrl: aiResult.frontendUrl },
        existingApps
      );

      if (duplicate) {
        setDuplicateApp(duplicate);
        setViewMode('duplicate_prompt');
      } else {
        setViewMode('review');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi trích xuất dữ liệu từ Vercel');
    } finally {
      setIsProcessing(false);
      setProgressStep('');
    }
  };

  // Populate form with AI extracted results
  const populateFormData = (result: ExtractedAppResult) => {
    setFormData({
      title: result.title,
      frontendUrl: result.frontendUrl,
      category: result.category,
      database: result.database,
      status: result.status,
      priority: result.priority,
      description: result.description,
      techNotes: result.techNotes,
      specVi: result.specVi,
      specEn: result.specEn,
      specUpdatedAt: new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    const items: BacklogItem[] = result.backlog.map((t) => ({
      id: newId('bl'),
      title: t,
      isCompleted: false,
    }));
    setBacklogList(items);
  };

  // Direct Update Existing App when Duplicate Detected
  const handleApplyUpdateDuplicate = async () => {
    if (!duplicateApp || !extractedData) return;
    setIsSaving(true);
    try {
      const updated: AppProject = {
        ...duplicateApp,
        title: formData.title || duplicateApp.title,
        frontendUrl: formData.frontendUrl || duplicateApp.frontendUrl,
        category: formData.category || duplicateApp.category,
        database: formData.database || duplicateApp.database,
        status: formData.status || duplicateApp.status,
        priority: formData.priority || duplicateApp.priority,
        description: formData.description || duplicateApp.description,
        techNotes: formData.techNotes || duplicateApp.techNotes,
        specVi: formData.specVi || duplicateApp.specVi,
        specEn: formData.specEn || duplicateApp.specEn,
        specUpdatedAt: new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const finalBacklog = backlogList.length > 0 ? backlogList : (duplicateApp.backlog || []);
      await onUpdateExistingApp(updated, finalBacklog);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi cập nhật ứng dụng');
    } finally {
      setIsSaving(false);
    }
  };

  // Save new app / review finish
  const handleFinalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    setIsSaving(true);
    try {
      if (duplicateApp && viewMode === 'review') {
        const updated: AppProject = {
          ...duplicateApp,
          title: formData.title.trim(),
          frontendUrl: formData.frontendUrl?.trim() || '',
          category: formData.category || 'Web App',
          database: formData.database || 'JH Supabase Data 1',
          status: formData.status || 'Development',
          priority: formData.priority || 'Medium',
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
        await onUpdateExistingApp(updated, backlogList);
      } else {
        const newProj: Omit<AppProject, 'backlog'> = {
          id: newId('app'),
          title: formData.title.trim(),
          frontendUrl: formData.frontendUrl?.trim() || '',
          category: formData.category || 'Web App',
          database: formData.database || 'JH Supabase Data 1',
          status: formData.status || 'Development',
          priority: formData.priority || 'Medium',
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
          healthStatus: 'unknown',
        };
        await onSaveNewApp(newProj, backlogList);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi lưu ứng dụng');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBacklogItem = () => {
    if (!newBacklogTitle.trim()) return;
    setBacklogList((prev) => [
      ...prev,
      { id: newId('bl'), title: newBacklogTitle.trim(), isCompleted: false },
    ]);
    setNewBacklogTitle('');
  };

  const filteredUserRepos = userRepos.filter((r) => {
    if (!repoSearchFilter) return true;
    const q = repoSearchFilter.toLowerCase();
    return r.full_name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
  });

  return (
    <Modal
      title={
        viewMode === 'duplicate_prompt'
          ? 'Kiểm Tra Trùng Lặp Ứng Dụng'
          : viewMode === 'review'
          ? 'Kiểm Tra & Lưu Ứng Dụng Mới'
          : 'Thêm Ứng Dụng Mới (AI App Builder)'
      }
      onClose={onClose}
      maxWidth={viewMode === 'review' ? '720px' : '620px'}
    >
      {/* 1. INITIAL IMPORT SCREEN */}
      {viewMode === 'import' && (
        <div>
          {/* Method Selection Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <button
              type="button"
              className={`btn ${activeTab === 'github' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('github')}
              style={{ justifyContent: 'center', padding: '0.6rem 0.5rem' }}
            >
              <GithubIcon size={18} />
              <span>GitHub Repo</span>
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'vercel' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('vercel')}
              style={{ justifyContent: 'center', padding: '0.6rem 0.5rem' }}
            >
              <VercelIcon size={16} />
              <span>Vercel Project</span>
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveTab('manual');
                setViewMode('review');
              }}
              style={{ justifyContent: 'center', padding: '0.6rem 0.5rem' }}
            >
              <EditIcon size={16} />
              <span>Thủ Công</span>
            </button>
          </div>

          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertTriangleIcon size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {isProcessing ? (
            <div
              style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <RefreshIcon size={32} className="spin-icon" />
              <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#818cf8' }}>
                {progressStep || 'Đang xử lý...'}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '420px' }}>
                Hệ thống đang tự động trích xuất các thông tin kiến trúc, cấu hình cổng chạy, cơ sở dữ liệu và bản đặc tả kỹ thuật (SRS).
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: GITHUB */}
              {activeTab === 'github' && (
                <div>
                  {/* GitHub OAuth Connection Status Card */}
                  {effectiveGhToken ? (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🐙</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#34d399' }}>
                            ✓ Đã kết nối tài khoản GitHub (Quyền Private Repos)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Có thể truy cập trực tiếp tất cả kho lưu trữ riêng tư & công khai.
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={disconnectGitHub}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        title="Ngắt kết nối hoặc đổi tài khoản"
                      >
                        Đổi tài khoản
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginBottom: '1.25rem',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🐙</div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem', color: '#f8fafc' }}>
                        Kết Nối Nhanh Với GitHub OAuth
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>
                        Đăng nhập 1-click để hệ thống tự động nhận diện tất cả kho lưu trữ (Public & Private) mà không cần nhập Token thủ công.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={signInWithGitHub}
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.75rem 1.25rem',
                          background: '#24292e',
                          borderColor: 'rgba(255,255,255,0.2)',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                        }}
                      >
                        <GithubIcon size={20} />
                        <span>Đăng Nhập & Kết Nối Với GitHub</span>
                      </button>
                    </div>
                  )}

                  {/* Quick Repo Picker if repos loaded */}
                  {userRepos.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 0 }}>
                          Chọn nhanh từ kho lưu trữ của bạn ({userRepos.length}):
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#818cf8' }}>Bấm để phân tích ngay</span>
                      </div>

                      <div className="store-search-box" style={{ marginBottom: '0.5rem' }}>
                        <div className="store-search-icon">
                          <SearchIcon size={14} />
                        </div>
                        <input
                          type="text"
                          className="store-search-input"
                          placeholder="Tìm kiếm repository..."
                          value={repoSearchFilter}
                          onChange={(e) => setRepoSearchFilter(e.target.value)}
                          style={{ padding: '0.4rem 0.5rem 0.4rem 2rem', fontSize: '0.82rem' }}
                        />
                      </div>

                      <div
                        style={{
                          maxHeight: '180px',
                          overflowY: 'auto',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        {filteredUserRepos.map((repo) => (
                          <div
                            key={repo.id}
                            onClick={() => {
                              setGithubInput(repo.full_name);
                              handleConnectGitHub(undefined, repo.full_name);
                            }}
                            style={{
                              padding: '0.55rem 0.75rem',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'background 0.2s ease',
                            }}
                            className="gh-repo-item"
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{repo.full_name}</span>
                                {repo.private && (
                                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                    Private
                                  </span>
                                )}
                              </div>
                              {repo.description && (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '380px' }}>
                                  {repo.description}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>Chọn ➔</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual input form */}
                  <form onSubmit={(e) => handleConnectGitHub(e)}>
                    <div className="form-group">
                      <label>Hoặc nhập trực tiếp URL / Tên Repository:</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="VD: minkoi007cs/app_system hoặc https://github.com/minkoi007cs/app_system"
                        value={githubInput}
                        onChange={(e) => setGithubInput(e.target.value)}
                        required
                      />
                    </div>

                    {!effectiveGhToken && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowManualGhToken(!showManualGhToken)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#818cf8',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                          }}
                        >
                          {showManualGhToken ? 'Ẩn ô nhập Personal Access Token' : '+ Nhập Personal Access Token (PAT) thủ công'}
                        </button>

                        {showManualGhToken && (
                          <div className="form-group" style={{ marginTop: '0.5rem' }}>
                            <input
                              type="password"
                              className="input-text"
                              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                              value={manualGhToken}
                              onChange={(e) => setManualGhToken(e.target.value)}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                              Token tạo tại GitHub Settings → Developer settings → Tokens (classic) với quyền `repo`.
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Hủy
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={!githubInput.trim()}>
                        <SparklesIcon size={16} />
                        <span>Phân Tích & Tạo Ứng Dụng Với AI</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: VERCEL */}
              {activeTab === 'vercel' && (
                <form onSubmit={handleConnectVercel}>
                  <div className="form-group">
                    <label>Tên Vercel Project hoặc URL Deployment:</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="VD: https://token-wallet-chi.vercel.app hoặc token-wallet-chi"
                      value={vercelInput}
                      onChange={(e) => setVercelInput(e.target.value)}
                      required
                      autoFocus
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                      💡 Có thể nhập URL domain trực tiếp hoặc tên project Vercel.
                    </span>
                  </div>

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Vercel API Token (Tùy chọn):</label>
                    <input
                      type="password"
                      className="input-text"
                      placeholder="Nhập Vercel Token nếu có..."
                      value={vercelToken}
                      onChange={(e) => setVercelToken(e.target.value)}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="save-vc-token"
                      checked={saveVercelToken}
                      onChange={(e) => setSaveVercelToken(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="save-vc-token" style={{ fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer', marginBottom: 0 }}>
                      Lưu Token này vào trình duyệt để sử dụng lần sau
                    </label>
                  </div>

                  <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                      Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!vercelInput.trim()}>
                      <SparklesIcon size={16} />
                      <span>Kết Nối & Phân Tích Với AI</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {/* 2. DUPLICATE DETECTION PROMPT */}
      {viewMode === 'duplicate_prompt' && duplicateApp && (
        <div>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fbbf24', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem' }}>
              <AlertTriangleIcon size={20} />
              <span>Phát Hiện Ứng Dụng Đã Tồn Tại Trong Hệ Thống!</span>
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Hệ thống nhận thấy ứng dụng <strong>"{duplicateApp.title}"</strong> (URL:{' '}
              <code>{duplicateApp.frontendUrl || 'Chưa có URL'}</code>) đã có sẵn trong danh mục App Store Workspace của bạn.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              AI vừa phân tích xong các thông tin và đặc tả kỹ thuật SRS mới nhất từ kho mã nguồn. Bạn muốn thực hiện hành động nào?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplyUpdateDuplicate}
              disabled={isSaving}
              style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>🔄 Cập Nhật Thông Tin Mới Nhất</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 400 }}>
                  Ghi đè thông tin, tech notes & đặc tả SRS mới nhất từ AI vào ứng dụng này
                </div>
              </div>
              <CheckCircleIcon size={20} />
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setViewMode('review')}
              style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>✏️ Xem Lại & Chỉnh Sửa Chi Tiết</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>
                  Kiểm tra từng trường dữ liệu trước khi lưu cập nhật
                </div>
              </div>
              <span>➔</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setDuplicateApp(null);
                setViewMode('review');
              }}
              style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>➕ Tạo Thành 1 Ứng Dụng Mới Riêng Biệt</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>
                  Thêm mới hoàn toàn dưới dạng một bản sao độc lập
                </div>
              </div>
              <PlusIcon size={18} />
            </button>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 3. REVIEW / MANUAL EDIT FORM */}
      {viewMode === 'review' && (
        <form onSubmit={handleFinalSave}>
          {extractedData && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <SparklesIcon size={16} />
              <span>
                {duplicateApp
                  ? `Đang xem lại dữ liệu trích xuất để cập nhật cho ứng dụng "${duplicateApp.title}"`
                  : 'AI đã tự động trích xuất thông tin & đặc tả kỹ thuật thành công!'}
              </span>
            </div>
          )}

          {/* Section 1: Thông tin nhận diện & trạng thái */}
          <div className="form-section-title">
            <span>🏷️</span> 1. Thông Tin Nhận Diện & Trạng Thái
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Tên ứng dụng:</label>
              <input
                type="text"
                className="input-text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="VD: Token Wallet, Payment App..."
                required
              />
            </div>

            <div className="form-group">
              <label>Danh mục (Category):</label>
              <input
                type="text"
                className="input-text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="VD: Web App, AI Tool..."
              />
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '0.85rem' }}>
            <div className="form-group">
              <label>Database Supabase:</label>
              <select
                className="input-select"
                value={formData.database || 'JH Supabase Data 1'}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
              >
                <option value="JH Supabase Data 1">JH Supabase Data 1</option>
                <option value="JH Supabase Data 2">JH Supabase Data 2</option>
                <option value="JH Supabase NoData">JH Supabase NoData</option>
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

          {/* Section 2: Hạ tầng & Mô tả */}
          <div className="form-section-title">
            <span>🌐</span> 2. Hạ Tầng & Mô Tả Ứng Dụng
          </div>
          <div className="form-group">
            <label>URL Frontend Web App:</label>
            <input
              type="url"
              className="input-text"
              value={formData.frontendUrl || ''}
              onChange={(e) => setFormData({ ...formData, frontendUrl: e.target.value })}
              placeholder="https://example.vercel.app"
            />
          </div>

          <div className="form-grid-2" style={{ marginTop: '0.85rem' }}>
            <div className="form-group">
              <label>Mô tả tóm tắt ứng dụng:</label>
              <textarea
                className="input-text"
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả mục tiêu, đối tượng sử dụng..."
              />
            </div>

            <div className="form-group">
              <label>Ghi chú kỹ thuật & Kiến trúc:</label>
              <textarea
                className="input-text"
                rows={3}
                value={formData.techNotes || ''}
                onChange={(e) => setFormData({ ...formData, techNotes: e.target.value })}
                placeholder="Ghi chú về stack, port, env, repo..."
              />
            </div>
          </div>

          {/* Section 3: Lộ trình & Đặc tả SRS */}
          <div className="form-section-title">
            <span>📋</span> 3. Lộ Trình & Bản Đặc Tả Kỹ Thuật (SRS)
          </div>

          {/* Backlog Tasks */}
          <div className="form-group">
            <label>Backlog / Lộ trình tính năng ({backlogList.length} task):</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                className="input-text"
                placeholder="Thêm tính năng hoặc task mới..."
                value={newBacklogTitle}
                onChange={(e) => setNewBacklogTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBacklogItem();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddBacklogItem}>
                Thêm
              </button>
            </div>

            {backlogList.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                {backlogList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.4rem 0.65rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span style={{ color: '#e2e8f0' }}>{item.title}</span>
                    <button
                      type="button"
                      className="btn-icon-sm danger"
                      onClick={() => setBacklogList((prev) => prev.filter((b) => b.id !== item.id))}
                      style={{ padding: '2px 6px', fontSize: '0.75rem', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '0.85rem' }}>
            <label>Đặc tả kỹ thuật tiếng Việt (SRS Markdown):</label>
            <textarea
              className="input-text"
              rows={5}
              value={formData.specVi || ''}
              onChange={(e) => setFormData({ ...formData, specVi: e.target.value })}
              placeholder="# 1. Giới thiệu tổng quan..."
            />
          </div>

          <div
            className="modal-actions"
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (extractedData) setViewMode('import');
                else onClose();
              }}
            >
              Quay lại
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving || !formData.title?.trim()}>
                {isSaving
                  ? 'Đang lưu...'
                  : duplicateApp
                  ? 'Lưu Cập Nhật Ứng Dụng'
                  : 'Tạo Ứng Dụng Mới'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

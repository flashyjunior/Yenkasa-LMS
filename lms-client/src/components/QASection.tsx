import React, { useEffect, useState, useRef } from 'react';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import ChatBox from './ChatBox';
import Tooltip from '@mui/material/Tooltip';
import api from '../api';
import * as signalR from '@microsoft/signalr';
import { useLocation } from 'react-router-dom';

type Reply = { id: number | string; body: string; author?: string; authorName?: string; authorImage?: string; userId?: string | number; userVoted?: boolean; upvotes?: number; createdAt?: string };
type QAItem = { id: number | string; title: string; body?: string; excerpt?: string; author?: string; authorName?: string; userId?: string | number; lecture?: string; createdAt?: string; upvotes?: number; answers?: number; replies?: Reply[] };

const RichReplyForm: React.FC<{ questionId: any; onSubmit: (html: string, files?: File[]) => void }> = ({ questionId, onSubmit }) => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [files, setFiles] = useState<File[]>([]);
  const DRAFT_KEY = `draft_reply_${questionId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setEditorState(EditorState.createWithContent(convertFromRaw(JSON.parse(saved))));
    } catch (_) { }
  }, []);

  useEffect(() => {
    try {
      const raw = convertToRaw(editorState.getCurrentContent());
      localStorage.setItem(DRAFT_KEY, JSON.stringify(raw));
    } catch (_) { }
  }, [editorState]);

  const onAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(prev => prev.concat(list));
    e.currentTarget.value = '';
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const raw = convertToRaw(editorState.getCurrentContent());
    const html = draftToHtml(raw);
    if (!html || !html.trim()) return;
    try {
      let resp;
      if (files && files.length) {
        const form = new FormData();
        form.append('body', html);
        files.forEach((f) => form.append('files', f, f.name));
        resp = await api.post(`/api/lms/questions/${questionId}/replies`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        resp = await api.post(`/api/lms/questions/${questionId}/replies`, { body: html }).catch(() => null);
      }
      // Only call onSubmit if server responds successfully
      if (resp && resp.data) onSubmit(html, files);
    } catch (_) { /* Optionally show error */ }

    setEditorState(EditorState.createEmpty());
    setFiles([]);
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) { }
  };

  return (
    <div className="reply-box">
      <div className="reply-avatar" aria-hidden>
        {(typeof window !== 'undefined' ? (localStorage.getItem('full_name') || 'You') : 'You').split(' ').map((s: any) => s.charAt(0)).slice(0, 2).join('').toUpperCase()}
      </div>
      <div style={{ flex: 1 }} className="reply-input-wrapper">
        <Editor
          editorState={editorState}
          onEditorStateChange={setEditorState}
          toolbar={{
            options: ['inline', 'list', 'link', 'remove', 'history'],
          }}
          editorStyle={{ minHeight: 120, border: '1px solid #ddd', padding: 10, borderRadius: 4, background: '#fff' }}
          placeholder="Write a reply — press Enter to send"
        />
        <div className="reply-controls">
          <div className="left">
            <span className="muted">Rich text supported</span>
            <span className="muted">Paste, drop, or click to add files</span>
          </div>
          <div className="right">
            <label className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              📎
              <input type="file" multiple style={{ display: 'none' }} onChange={onAttach} />
            </label>
            <button className="btn" onClick={() => { setEditorState(EditorState.createEmpty()); setFiles([]); }}>Cancel</button>
            <button className="btn primary" onClick={handleSubmit} disabled={!editorState.getCurrentContent().hasText()} aria-label="Send reply">Reply</button>
          </div>
        </div>
        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {files.map((f, i) => (
              <div key={i} className="file-badge">
                <span>{f.name}</span>
                <button className="btn small" onClick={() => removeFile(i)}>x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ReportModal: React.FC<{ open: boolean; onClose: () => void; onSubmit: (reason: string) => void }> = ({ open, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Report comment</h3>
        <textarea placeholder="Why are you reporting this comment?" value={reason} onChange={e => setReason(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-outline" onClick={() => { setReason(''); onClose(); }}>Cancel</button>
          <button className="btn" onClick={() => { onSubmit(reason); setReason(''); onClose(); }} disabled={!reason.trim()}>Submit</button>
        </div>
      </div>
    </div>
  );
};

type QASectionProps = {
  courseId: number;
  lessonId?: string;
};

const QASection: React.FC<QASectionProps> = ({ courseId, lessonId }) => {
  const [questions, setQuestions] = useState<QAItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLecture, setFilterLecture] = useState('All lectures');
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState<{ open: boolean; targetType?: 'reply'|'question'; targetId?: number | null }>({ open: false, targetType: undefined, targetId: null });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; kind?: 'reply'|'question'; id?: number | null; parentId?: number | null }>({ open: false });
  const location = useLocation();
  const focusRef = useRef<Record<string, any>>({});
  const emojiCache = useRef<Record<string, any>>({});
  const [menuOpen, setMenuOpen] = useState<{ kind: 'reply'|'question'; id: string | number } | null>(null);
  const [editing, setEditing] = useState<{ kind: 'reply'|'question'; id: number | null; html: string } | null>(null);

  const formatTimeAgo = (when?: string) => {
    try {
      if (!when) return '';
      if (when === 'just now') return 'just now';
      const ts = Date.parse(when);
      if (isNaN(ts)) return when;
      const diff = Math.max(0, Date.now() - ts);
      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return seconds <= 1 ? 'just now' : `${seconds} seconds ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes === 1 ? 'a minute ago' : `${minutes} minutes ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return days === 1 ? 'a day ago' : `${days} days ago`;
      const weeks = Math.floor(days / 7);
      if (weeks < 5) return weeks === 1 ? 'a week ago' : `${weeks} weeks ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`;
      const years = Math.floor(days / 365);
      return years === 1 ? 'a year ago' : `${years} years ago`;
    } catch (_) { return when || ''; }
  };

  // Helper: determine if a question/reply author is an instructor according to server-provided flags
  const isInstructorAuthor = (item: any) => {
    if (!item) return false;
    return ((item.role && String(item.role).toLowerCase() === 'instructor') || item.isInstructor === true || (item.authorRole && String(item.authorRole).toLowerCase() === 'instructor') || item.authorIsInstructor === true);
  };

  useEffect(() => {
    let mounted = true;
    let connection: signalR.HubConnection | null = null;
    const load = async () => {
      setLoadingQ(true);
      try {
        let resp: any;
        if (lessonId) {
          resp = await api.get(`/api/lms/lessons/${lessonId}/questions`).catch(() => ({ data: null }));
        } else {
          resp = await api.get(`/api/lms/courses/${courseId}/questions`).catch(() => ({ data: null }));
        }
        const data: any = resp?.data;
        if (mounted) {
          if (Array.isArray(data) && data.length) setQuestions(data as QAItem[]);
          else setQuestions([]);
        }
      } finally { if (mounted) setLoadingQ(false); }

      const setupHub = async () => {
        if (!courseId) return;
        try {
          connection = new signalR.HubConnectionBuilder()
            .withUrl((process.env.REACT_APP_API_BASE || '') + '/hubs/qa', { accessTokenFactory: () => localStorage.getItem('auth_token') || '' })
            .withAutomaticReconnect()
            .build();

          connection.on('questionAdded', (payload: any) => {
            setQuestions(prev => [payload, ...prev.filter(p => !String(p.id).startsWith('temp-'))]);
          });
          connection.on('replyAdded', (payload: any) => {
            setQuestions(prev => prev.map(q => {
              if (q.id === payload.questionId) {
                const replies = (q.replies || []).concat([payload]);
                return { ...q, replies };
              }
              return q;
            }));
          });
          connection.on('questionDeleted', (payload: any) => {
            setQuestions(prev => prev.filter(q => String(q.id) !== String(payload.questionId)));
          });
          connection.on('replyDeleted', (payload: any) => {
            setQuestions(prev => prev.map(q => q.id === payload.questionId ? { ...q, replies: (q.replies || []).filter((r:any) => String(r.id) !== String(payload.replyId)) } : q));
          });

          await connection.start();
          await connection.invoke('JoinLessonGroup', lessonId ? `lesson-${lessonId}` : `course-${courseId}`);
        } catch (err) {
          // ignore
        }
      };
      setupHub();
    };
    load();
    return () => {
      mounted = false;
      if (connection) {
        // Safely leave group and stop connection, suppress errors
        Promise.resolve(connection.invoke('LeaveLessonGroup', lessonId ? `lesson-${lessonId}` : `course-${courseId}`))
          .catch(() => { /* Suppress invocation canceled errors */ });
        Promise.resolve(connection.stop())
          .catch(() => { /* Suppress invocation canceled errors */ });
        connection = null;
      }
    };
  }, [courseId, lessonId]);

  // fetch current user for ownership checks
  useEffect(() => {
    (async () => {
      try {
        const resp: any = await api.get('/api/lms/users/me').catch(() => ({ data: null }));
        if (resp && resp.data) setCurrentUser(resp.data);
      } catch (_) { }
    })();
  }, []);

  // read query params for focusQuestion/focusReply
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fq = params.get('focusQuestion');
    const fr = params.get('focusReply');
    if (fq) focusRef.current.questionId = isNaN(Number(fq)) ? fq : Number(fq);
    if (fr) focusRef.current.replyId = isNaN(Number(fr)) ? fr : Number(fr);
  }, [location.search]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Autofocus and scroll into view for question or reply specified via query params
  useEffect(() => {
    // wait a tick for DOM to render
    const t = setTimeout(() => {
      try {
        const qEl = document.querySelector('.qa-item.focus') as HTMLElement | null;
        if (qEl) {
          qEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // remove focus class after a short delay so the animation runs once
          setTimeout(() => qEl.classList.remove('focus'), 2500);
        }
        const rEl = document.querySelector('.qa-reply.focus-reply') as HTMLElement | null;
        if (rEl) {
          rEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => rEl.classList.remove('focus-reply'), 2500);
        }
      } catch (_) { }
    }, 300);
    return () => clearTimeout(t);
  }, [questions]);

  const filtered = questions.filter(q => {
    const matchesSearch = !search || (q.title + ' ' + (q.excerpt || '') + ' ' + (q.body || '')).toLowerCase().includes(search.toLowerCase());
    const matchesLecture = filterLecture === 'All lectures' || (q.lecture && q.lecture === filterLecture);
    return matchesSearch && matchesLecture;
  });

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSubmitting(true);
    try {
      const payload = { title: newQuestion.slice(0, 120), body: newQuestion };
      const temp: QAItem = { id: `temp-${Date.now()}`, title: payload.title, body: payload.body, author: 'You', createdAt: 'just now', upvotes: 0, answers: 0, replies: [] };
      setQuestions(prev => [temp, ...prev]);
      setNewQuestion('');
      const resp: any = await api.post(`/api/lms/courses/${courseId}/questions`, payload).catch(() => null);
      if (resp && resp.data) setQuestions(prev => prev.map(p => (String(p.id).startsWith('temp-') ? (resp.data as QAItem) : p)));
    } finally { setSubmitting(false); }
  };

  const submitReply = async (questionId: any, replyHtml: string) => {
    if (!replyHtml.trim()) return;
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, replies: [...(q.replies || []), { id: `r-${Date.now()}`, body: replyHtml, author: 'You', createdAt: 'just now' } as Reply] } : q));
    const resp: any = await api.post(`/api/lms/questions/${questionId}/replies`, { body: replyHtml }).catch(() => null);
    if (resp && resp.data) {
      const serverReply = resp.data;
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, replies: [...(q.replies || []), serverReply] } : q));
    }
  };

  const upvoteReply = async (replyId: number) => {
    try {
      const resp: any = await api.post(`/api/lms/replies/${replyId}/upvote`).catch(() => null);
      if (resp && resp.data) {
        const { replyId: rId, upvotes } = resp.data;
        // find the question containing the reply and update upvote count on that reply object if present
        setQuestions(prev => prev.map(q => ({
          ...q,
          replies: (q.replies || []).map(r => r.id === rId ? { ...r, upvotes } : r)
        })));
      }
    } catch (_) { }
  };

  const unvoteReply = async (replyId: number) => {
    try {
      const resp: any = await api.post(`/api/lms/replies/${replyId}/unvote`).catch(() => null);
      if (resp && resp.data) {
        const { replyId: rId, upvotes } = resp.data;
        setQuestions(prev => prev.map(q => ({
          ...q,
          replies: (q.replies || []).map(r => r.id === rId ? { ...r, upvotes, userVoted: false } : r)
        })));
      }
    } catch (_) { }
  };

  const reportComment = async (targetType: 'reply' | 'question', targetId: number, reason?: string) => {
    try {
      const resp: any = await api.post('/api/lms/reports', { targetType, targetId, reason }).catch(() => null);
      if (resp && resp.data) {
        console.log('reported', resp.data);
      }
    } catch (_) { }
  };
  const refreshQuestions = async () => {
    if (!courseId) return;
    setLoadingQ(true);
    try {
      const resp: any = await api.get(`/api/lms/courses/${courseId}/questions`).catch(() => ({ data: null }));
      const data: any = resp?.data;
      if (Array.isArray(data)) setQuestions(data as QAItem[]);
    } finally { setLoadingQ(false); }
  };

  const deleteQuestion = async (questionId: number) => {
    const ok = await api.delete(`/api/lms/questions/${questionId}`).catch(() => null);
    if (ok) {
      // try to refresh from server to ensure state matches backend (SignalR should handle this when available)
      await refreshQuestions();
    }
    setConfirmDelete({ open: false });
  };

  const deleteReply = async (replyId: number, questionId: number) => {
    // optimistic UI: remove reply locally first
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, replies: (q.replies || []).filter(r => String(r.id) !== String(replyId)) } : q));
    const ok = await api.delete(`/api/lms/replies/${replyId}`).catch(() => null);
    if (ok) {
      // refresh from server to ensure consistency
      await refreshQuestions();
    } else {
      // if delete failed, re-fetch to restore state
      await refreshQuestions();
    }
    setConfirmDelete({ open: false });
  };

  return (
    <div className="tab-pane qa" style={{ marginTop: '8px' }}>
      {/* Report modal */}
      <ReportModal open={reporting.open} onClose={() => setReporting({ open: false, targetType: undefined, targetId: null })} onSubmit={(reason: string) => {
        if (reporting.targetType && reporting.targetId) reportComment(reporting.targetType, Number(reporting.targetId), reason);
        setReporting({ open: false, targetType: undefined, targetId: null });
      }} />
      {/* Confirm delete modal */}
      {confirmDelete.open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm delete</h3>
            <p>Are you sure you want to delete this {confirmDelete.kind === 'reply' ? 'reply' : 'question'}? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setConfirmDelete({ open: false })}>Cancel</button>
              <button className="btn" onClick={() => {
                if (confirmDelete.kind === 'reply' && confirmDelete.id && confirmDelete.parentId) deleteReply(Number(confirmDelete.id), Number(confirmDelete.parentId));
                if (confirmDelete.kind === 'question' && confirmDelete.id) deleteQuestion(Number(confirmDelete.id));
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Removed the assistant banner */}
      {/* <div className="qa-banner">
        <div className="qa-banner-text">
          <strong>Get an instant answer from the assistant</strong>
          <div className="muted">Our AI uses context from the course to help answer most questions immediately.</div>
        </div>
        <div>
          <button className="btn">Get an instant answer</button>
        </div>
      </div> */}

      <div className="qa-search-row">
        <input aria-label="Search questions" placeholder="Search all course questions" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="qa-search-btn">🔍</button>
      </div>

      <div className="qa-controls">
        <div>
          <label>Filters:</label>
          <select value={filterLecture} onChange={e => setFilterLecture(e.target.value)}>
            <option>All lectures</option>
          </select>
        </div>
        <div>
          <label>Sort by:</label>
          <select>
            <option>Sort by recommended</option>
            <option>Newest</option>
            <option>Most answers</option>
          </select>
          <button className="btn-outline">Filter questions</button>
        </div>
      </div>

      <div className="qa-new">
        <textarea placeholder="Ask a question to the instructor or classmates..." value={newQuestion} onChange={e => setNewQuestion(e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn-outline" onClick={() => setNewQuestion('')}>Cancel</button>
          <button className="btn" onClick={submitQuestion} disabled={submitting}>{submitting ? 'Posting…' : 'Post question'}</button>
        </div>
      </div>

      <h4 style={{ marginTop: 18 }}>{loadingQ ? 'Loading questions…' : `All questions in this course (${filtered.length})`}</h4>
      <div className="qa-list">
        {filtered.map(q => {
          const isCollapsed = collapsed[String(q.id)] ?? false;
          const shouldFocus = (focusRef.current.questionId && String(focusRef.current.questionId) === String(q.id));
          return (
            <div key={q.id} className={`qa-item ${isCollapsed ? 'collapsed' : 'expanded'} ${shouldFocus ? 'focus' : ''}`}>
              <div className="qa-left">
                <div className="qa-avatar">{(q.author || 'U').split(' ').map((s: any) => s.charAt(0)).slice(0, 2).join('').toUpperCase()}</div>
                <div className="qa-body">
                  <div className="qa-title" onClick={() => setCollapsed(prev => ({ ...prev, [String(q.id)]: !isCollapsed }))} style={{ cursor: 'pointer' }}>{q.title}</div>
                  <div className="qa-time"><span className="muted">{formatTimeAgo(q.createdAt)}</span></div>
                  <div style={{ marginTop: 6 }}>
                    <span className="author-label" style={{ fontWeight: 600 }}>{q.author || q.authorName || 'unknown'}</span>
                    {isInstructorAuthor(q) && <span className="muted"> — Instructor</span>}
                  </div>
                  <div className="qa-reply-count">{(q.replies || []).length} {(q.replies || []).length === 1 ? 'reply' : 'replies'}</div>
                  {!isCollapsed && (
                    <>
                      <div className="qa-replies">
                        {(q.replies || []).map((r: any) => {
                          const shouldFocusReply = focusRef.current.replyId && String(focusRef.current.replyId) === String(r.id);
                          return (
                            <div key={r.id} className={`qa-reply ${shouldFocusReply ? 'focus-reply' : ''}`}>
                              <div className="qa-avatar" aria-hidden>{(r.authorName || r.author || 'U').split(' ').map((s: any) => s.charAt(0)).slice(0, 2).join('').toUpperCase()}</div>
                              <div className="reply-body">
                                <div className={`message-bubble ${r.userId && String(r.userId) === String(currentUser?.id) ? 'mine' : 'theirs'}`}>
                                  <div className="message-header">
                                    <div className="message-meta">
                                      <span className="author-label">{r.author || r.authorName || 'unknown'}</span>
                                      {isInstructorAuthor(r) && <span className="muted"> — Instructor</span>}
                                      <span className="muted">{formatTimeAgo(r.createdAt)}</span>
                                    </div>
                                    <div className="reply-actions-inline">
                                      <Tooltip title={r.userVoted ? 'Remove upvote' : 'Upvote reply'}>
                                        <button aria-label="Upvote reply" className="inline-action" onClick={() => r.userVoted ? unvoteReply(r.id) : upvoteReply(r.id)}>{r.userVoted ? '▲' : '△'} {r.upvotes || 0}</button>
                                      </Tooltip>
                                      {/* ellipsis menu for reply actions */}
                                      <div style={{ position: 'relative' }}>
                                        <button aria-label="More" className="ellipsis-trigger" onClick={() => setMenuOpen(menuOpen && menuOpen.kind === 'reply' && String(menuOpen.id) === String(r.id) ? null : { kind: 'reply', id: r.id })}>
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                                            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                            <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                                          </svg>
                                        </button>
                                        {menuOpen && menuOpen.kind === 'reply' && String(menuOpen.id) === String(r.id) && (
                                          <div className="ellipsis-menu" style={{ position: 'absolute', top: 24, right: 0, background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 8px rgba(0,0,0,0.08)', zIndex: 40 }}>
                                            <button className="inline-action" onClick={() => { setReporting({ open: true, targetType: 'reply', targetId: Number(r.id) }); setMenuOpen(null); }}>Report abuse</button>
                                          </div>
                                        )}
                                      </div>
                                      {(currentUser && (currentUser.roles?.includes('Admin') || String(currentUser.id) === String(r.userId))) && (
                                        <Tooltip title="Delete reply">
                                          <button aria-label="Delete reply" className="inline-action danger" onClick={() => setConfirmDelete({ open: true, kind: 'reply', id: Number(r.id), parentId: Number(q.id) })}>🗑️</button>
                                        </Tooltip>
                                      )}
                                      {(currentUser && String(currentUser.id) === String(r.userId)) && (
                                        <button className="inline-action" onClick={() => setEditing({ kind: 'reply', id: Number(r.id), html: r.body })}>Edit</button>
                                      )}
                                    </div>
                                  </div>
                                  {editing && editing.kind === 'reply' && editing.id === Number(r.id) ? (
                                    <div style={{ marginTop: 6 }}>
                                      <textarea value={editing.html} onChange={e => setEditing({ ...editing, html: e.target.value })} style={{ width: '100%', minHeight: 80 }} />
                                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                        <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                                        <button className="btn" onClick={async () => {
                                          setQuestions(prev => prev.map(q => ({
                                            ...q,
                                            replies: (q.replies || []).map(r => r.id === editing.id ? { ...r, body: editing.html, edited: true } : r)
                                          })));
                                          try {
                                            const resp: any = await api.put(`/api/lms/replies/${editing.id}`, { body: editing.html }).catch(() => null);
                                            await refreshQuestions();
                                          } catch (err) {
                                            console.error('Error saving reply edit', err);
                                            await refreshQuestions();
                                          }
                                          setEditing(null);
                                        }}>Update Reply</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="message-text" dangerouslySetInnerHTML={{ __html: r.body }} />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Use RichReplyForm for new replies */}
                      <div className="qa-body-composer" style={{ marginTop: 10 }}>
                        <RichReplyForm
                          questionId={q.id}
                          onSubmit={async (html: string, files?: File[]) => {
                            await refreshQuestions();
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="qa-stats">
                  <div className="qa-votes">{q.upvotes || 0}</div>
                  <div className="qa-answers">{(q.replies || []).length}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {/* ellipsis menu for question actions */}
                    <div style={{ position: 'relative' }}>
                      <button aria-label="More" className="ellipsis-trigger" onClick={() => setMenuOpen(menuOpen && menuOpen.kind === 'question' && String(menuOpen.id) === String(q.id) ? null : { kind: 'question', id: q.id })}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                        </svg>
                      </button>
                      {menuOpen && menuOpen.kind === 'question' && String(menuOpen.id) === String(q.id) && (
                        <div className="ellipsis-menu" style={{ position: 'absolute', top: 24, right: 0, background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 8px rgba(0,0,0,0.08)', zIndex: 40 }}>
                          <button className="inline-action" onClick={() => { setReporting({ open: true, targetType: 'question', targetId: Number(q.id) }); setMenuOpen(null); }}>Report abuse</button>
                        </div>
                      )}
                    </div>
                    {(currentUser && (currentUser.roles?.includes('Admin') || String(currentUser.id) === String(q.userId))) && (
                      <Tooltip title="Delete question">
                        <button aria-label="Delete question" className="inline-action danger" onClick={() => setConfirmDelete({ open: true, kind: 'question', id: Number(q.id) })}>🗑️</button>
                      </Tooltip>
                    )}
                    {(currentUser && String(currentUser.id) === String(q.userId)) && (
                      <button className="inline-action" onClick={() => setEditing({ kind: 'question', id: Number(q.id), html: q.body || '' })}>Edit</button>
                    )}
                  </div>
                </div>
                {editing && editing.kind === 'question' && editing.id === Number(q.id) && (
                  <div style={{ marginTop: 8 }}>
                    <textarea value={editing.html} onChange={e => setEditing({ ...editing, html: e.target.value })} style={{ width: '100%', minHeight: 120 }} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                      <button className="btn" onClick={async () => {
                        // optimistic update: update question body locally
                        setQuestions(prev => prev.map(q => q.id === editing.id ? { ...q, body: editing.html, edited: true } : q));
                        try {
                          const resp: any = await api.put(`/api/lms/questions/${editing.id}`, { body: editing.html }).catch(() => null);
                          await refreshQuestions();
                        } catch (err) {
                          console.error('Error saving question edit', err);
                          await refreshQuestions();
                        }
                        setEditing(null);
                      }}>Update Question</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QASection;

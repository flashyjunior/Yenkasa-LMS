import React, { useEffect, useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import './AdminListStyles.css';

type Template = { id: number; key: string; subject: string; body: string };

const EmailTemplates: React.FC = () => {
  const { hasPrivilege } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<Template | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState<string>('');
  const quillRef = useRef<any>(null);

  useEffect(() => { if (hasPrivilege && hasPrivilege('ViewAdminMenu')) load(); }, [hasPrivilege]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/email-templates');
      setTemplates((res.data || []) as Template[]);
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to load'), 'error');
    } finally { setLoading(false); }
  }

  function openNew() { setEdit({ id: 0, key: '', subject: '', body: '' }); setShowModal(true); }
  function openEdit(t: Template) { setEdit({ ...t, body: decodeHtmlEntities(t.body) }); setShowModal(true); }

  async function saveTemplate() {
    if (!edit) return;
    setLoading(true);
    try {
      // get raw HTML from quill instance if available
      const editorHtml = (quillRef.current && (quillRef.current as any).getEditor)
        ? (quillRef.current as any).getEditor().root.innerHTML
        : (quillRef.current?.root?.innerHTML ?? edit.body);
      const payload: Template = { ...edit, body: editorHtml };
      if (edit.id === 0) {
        await api.post('/api/admin/email-templates', payload);
        (window as any).showAppToast?.('Template created', 'success');
      } else {
        await api.put(`/api/admin/email-templates/${edit.id}`, payload);
        (window as any).showAppToast?.('Template saved', 'success');
      }
      setShowModal(false);
      await load();
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to save'), 'error');
    } finally { setLoading(false); }
  }

  async function deleteTemplate(id: number) {
    if (!window.confirm('Delete template?')) return;
    setLoading(true);
    try {
      await api.delete(`/api/admin/email-templates/${id}`);
      (window as any).showAppToast?.('Template deleted', 'success');
      await load();
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to delete'), 'error');
    } finally { setLoading(false); }
  }

  async function sendTestEmail() {
    if (!edit) return;
    const to = testEmail.trim();
    if (!to) {
      (window as any).showAppToast?.('Please enter a test email address', 'error');
      return;
    }

    // show toast and loader
    (window as any).showAppToast?.('Sending test email…', 'info');
    setSendingTest(true);
    try {
      const editorHtml = (quillRef.current && (quillRef.current as any).getEditor)
        ? (quillRef.current as any).getEditor().root.innerHTML
        : (quillRef.current?.root?.innerHTML ?? edit.body);

      const payload = {
        subject: edit.subject,
        body: editorHtml,
        email: to
      };

      const url = edit.id && edit.id > 0 ? `/api/admin/email-templates/${edit.id}/send-test` : `/api/admin/email-templates/send-test`;
      await api.post(url, payload);

      (window as any).showAppToast?.('Test email sent', 'success');
    } catch (ex: any) {
      const msg = String(ex?.response?.data || ex?.message || 'Failed to send test email');
      (window as any).showAppToast?.(msg, 'error');
    } finally {
      setSendingTest(false);
    }
  }

  function openPreviewInNewTab() {
    if (!edit) return;
    const decoded = decodeHtmlEntities(edit.body);
    const sanitized = DOMPurify.sanitize(decoded || '');
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Template Preview - ${escapeHtml(edit.subject || '')}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>${previewStyles} body{background:#f6f6f6;padding:20px}</style>
  </head>
  <body>
    <div class="email-preview">${sanitized}</div>
  </body>
</html>`;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } else {
      (window as any).showAppToast?.('Unable to open preview tab (popup blocked)', 'error');
    }
  }

  // stronger preview normalization to avoid big gaps and spacing issues
  const previewStyles = `
    .email-preview { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #333; line-height: 1.45; font-size: 15px; }
    .email-preview * { box-sizing: border-box; }
    .email-preview p { margin: 0 0 12px; padding: 0; }
    .email-preview h1, .email-preview h2, .email-preview h3 { margin: 0 0 10px; line-height: 1.2; }
    .email-preview img { max-width: 100%; height: auto; display: block; }
    .email-preview a { color: #0078d4; text-decoration: underline; }
    .email-preview .btn { display:inline-block; text-decoration:none; }
    .email-preview table { border-collapse: collapse; }
    /* remove stray large gaps often introduced by editors */
    .email-preview br { line-height: normal; }
  `;

  // decode HTML entities (e.g. "&lt;div&gt;...") into real HTML string
  function decodeHtmlEntities(input?: string) {
    if (!input) return '';
    const ta = document.createElement('textarea');
    ta.innerHTML = input;
    return ta.value;
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  if (!hasPrivilege || !hasPrivilege('ViewAdminMenu')) return <div>You are not authorized to view this page.</div>;

  return (
    <div className="main-content">
      <h1>Email Templates</h1>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#666' }}>Manage email templates used by the system.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={openNew}>+ Create Template</button>
          <button onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
      </div>

      <div className="admin-list">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Key</th>
              <th style={{ textAlign: 'left' }}>Subject</th>
              <th style={{ textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id}>
                <td style={{ width: 260 }}>{t.key}</td>
                <td>{t.subject}</td>
                <td>
                  <button onClick={() => openEdit(t)}>Edit</button>
                  <button onClick={() => deleteTemplate(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && edit && (
        <Modal
          title={edit.id === 0 ? 'Create Template' : 'Edit Template'}
          onClose={() => setShowModal(false)}
          onConfirm={saveTemplate}
          confirmLabel="Save"
          maxWidth={1200} // make modal wide enough for editor + preview
        >
          {/* inject preview CSS (scoped to this document) */}
          <style dangerouslySetInnerHTML={{ __html: previewStyles }} />

          {/* make modal content wider and responsive so editor + preview fit */}
          <div style={{ display: 'flex', gap: 20, width: 'min(95vw, 1200px)', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 700 }}>
               <label style={{ display: 'flex', flexDirection: 'column' }}>
                 Key (internal)
                 <input value={edit.key} onChange={e => setEdit({ ...edit, key: e.target.value })} disabled={edit.id !== 0} />
               </label>
               <label style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
                 Subject
                 <input value={edit.subject} onChange={e => setEdit({ ...edit, subject: e.target.value })} />
               </label>
               <label style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
                 Body (HTML allowed)
                 <div style={{ marginTop: 6 }}>
                   <ReactQuill
                     ref={quillRef}
                     theme="snow"
                     value={edit.body}
                     onChange={(val: string) => setEdit({ ...edit, body: val })}
                     modules={{
                       toolbar: [
                         [{ header: [1, 2, 3, false] }],
                         ['bold', 'italic', 'underline', 'strike'],
                         [{ list: 'ordered' }, { list: 'bullet' }],
                         ['link', 'image'],
                         ['clean']
                       ]
                     }}
                   />
                 </div>
               </label>
               <div style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
                 Available tokens: {'{{userName}}'}, {'{{resetLink}}'}, {'{{courseName}}'}, {'{{certificateLink}}'}, {'{{applicationUrl}}'}, {'{{companyName}}'}
               </div>

               {/* Test email controls */}
               <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                 <input
                   placeholder="test@domain.com"
                   value={testEmail}
                   onChange={e => setTestEmail(e.target.value)}
                   style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', minWidth: 220 }}
                   disabled={sendingTest}
                 />
                 <button onClick={sendTestEmail} className="btn btn-primary" disabled={sendingTest}>
                   {sendingTest ? 'Sending…' : 'Send test email'}
                 </button>
                 <button onClick={openPreviewInNewTab} className="btn" disabled={sendingTest}>Preview in new tab</button>
               </div>

               {/* loader overlay inside modal when sending */}
               {sendingTest && (
                 <div className="loader-overlay" aria-hidden="true">
                   <div className="spinner" />
                   <div style={{ marginTop: 8, color: '#fff', fontWeight: 600 }}>Sending email…</div>
                 </div>
               )}
             </div>

             <div style={{ width: 520, maxWidth: '42%', borderLeft: '1px solid #eee', paddingLeft: 12 }}>
               <h4 style={{ marginTop: 0 }}>Preview (sanitized)</h4>
               <div style={{ border: '1px solid #ddd', borderRadius: 6, overflow: 'auto', height: '65vh', padding: 12, background: '#fff', position: 'relative' }}>
+                {/* inject preview normalizing styles (scoped) */}
+                <style dangerouslySetInnerHTML={{ __html: previewStyles }} />
                 {/* decode any encoded entities then sanitize for preview */}
-                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHtmlEntities(edit.body) || '') }} aria-label="Email preview" />
+                <div className="email-preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHtmlEntities(edit.body) || '') }} aria-label="Email preview" />
               </div>
               <p style={{ marginTop: 8, color: '#666', fontSize: 13 }}>
                 Preview is sanitized for safety. Images with cid: sources will not render in the preview.
               </p>
             </div>
           </div>
         </Modal>
       )}

       {/* Global fixed loader so it cannot be clipped by modal body */}
       {sendingTest && (
         <div className="global-loader-overlay" role="status" aria-live="polite">
           <div>
             <div className="spinner" />
             <div style={{ color: '#fff', marginTop: 10, fontWeight: 600, textAlign: 'center' }}>Sending email…</div>
           </div>
         </div>
       )}
    </div>
  );
};

export default EmailTemplates;

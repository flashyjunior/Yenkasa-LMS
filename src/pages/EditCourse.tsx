import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { EditorState, convertToRaw, ContentState } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

const EditCourse: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [published, setPublished] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState<any[]>([] as any[]);
  const { userName, hasPrivilege } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get(`/api/lms/admin/courses/${id}`)
      .then(res => {
        const data: any = res.data;
        if (!mounted) return;
        setTitle(data.title);
        setDescription(data.description || '');
        setPublished(!!data.published);
        setThumbnailUrl(data.thumbnailUrl || data.ThumbnailUrl || '');
        setCreatedBy(data.createdBy || data.CreatedBy || null);

        // Initialize editorState from HTML description
        const blocksFromHtml = htmlToDraft(data.description || '');
        const contentState = ContentState.createFromBlockArray(blocksFromHtml.contentBlocks, blocksFromHtml.entityMap);
        setEditorState(EditorState.createWithContent(contentState));

        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load course.');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  const fetchMaterials = async () => {
    try {
      const res = await api.get(`/api/lms/courses/${id}/materials`);
      const data = res?.data;
      setMaterials(Array.isArray(data) ? data : []);
    } catch {
      setMaterials([]);
    }
  };

  useEffect(() => { if (!loading) fetchMaterials(); }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const htmlDescription = draftToHtml(convertToRaw(editorState.getCurrentContent()));
      await api.put(`/api/lms/courses/${id}`, { id, title, description: htmlDescription, published, thumbnailUrl });
      navigate('/admin-courses');
    } catch (err) {
      setError('Failed to update course.');
    }
  };

  const canManageMaterials = () => {
    if (!createdBy) return hasPrivilege && hasPrivilege('ViewAdminMenu');
    if (hasPrivilege && hasPrivilege('ViewAdminMenu')) return true;
    return userName && createdBy && userName === createdBy;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      await api.post(`/api/lms/courses/${id}/materials`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchMaterials();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card" style={{ maxWidth: 900, margin: '2rem auto' }}> {/* Increased width from 500 to 900 */}
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#00bfae', fontWeight: 'bold', marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
      <h2>Edit Course</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Description</label>
          <Editor
            editorState={editorState}
            onEditorStateChange={setEditorState}
            toolbar={{
              options: ['inline', 'list', 'link', 'remove', 'history'],
              inline: { options: ['bold', 'italic', 'underline', 'strikethrough'] },
              list: { options: ['unordered', 'ordered'] },
            }}
            editorStyle={{ minHeight: 120, border: '1px solid #ddd', padding: 10, borderRadius: 4, background: '#fff' }}
            placeholder="Enter course description..."
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Thumbnail URL</label>
          <input type="text" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://.../image.jpg" style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        {createdBy && (
          <div style={{ marginBottom: 16 }}>
            <label>Facilitator</label>
            <div style={{ padding: 8, marginTop: 4, background: '#f7f7f7', borderRadius: 4 }}>{createdBy}</div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label>
            <input
              type="checkbox"
              checked={published}
              onChange={e => setPublished(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Published
          </label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold' }}>
          Save Changes
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          style={{ background: '#ff5252', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold', marginLeft: 12 }}
        >
          Delete Course
        </button>
        {showDeleteModal && (
          <Modal
            title="Delete Course"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              try {
                await api.delete(`/api/lms/courses/${id}`);
                if (hasPrivilege && hasPrivilege('ViewAdminMenu')) navigate('/admin-courses');
              } catch {
                setError('Failed to delete course.');
              }
            }}
          >
            <p>Are you sure you want to delete this course? This action cannot be undone.</p>
          </Modal>
        )}
        {canManageMaterials() && (
          <div style={{ marginTop: 18 }}>
            <h3>Supplementary Materials</h3>
            <input type="file" multiple onChange={e => handleFiles(e.target.files)} />
            {uploading && <div>Uploading...</div>}
            {materials.length > 0 && (
              <ul style={{ marginTop: 8 }}>
                {materials.map(m => (
                  <li key={m.id}>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await api.get(`/api/lms/courses/${id}/materials/${m.id}/download`, { responseType: 'blob' });
                          const blob = new Blob([res.data as any], { type: (res as any).headers?.['content-type'] || 'application/octet-stream' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = m.fileName || 'download';
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch {
                          window.location.href = `/api/lms/courses/${id}/materials/${m.id}/download`;
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#00bfae', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                    >
                      {m.fileName}
                    </button>
                    <span style={{ color: '#666' }}> by {m.uploadedBy}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default EditCourse;

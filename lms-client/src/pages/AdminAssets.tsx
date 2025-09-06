import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const AdminAssets: React.FC = () => {
  // raw selected files
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [fontFile, setFontFile] = useState<File | null>(null);

  // simple selected files (no client-side crop/resize)

  // preview URLs
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [previewSig, setPreviewSig] = useState<string | null>(null);

  const [uploads, setUploads] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // no crop/resize client-side -- server handles normalization

  useEffect(() => { load(); }, []);

  useEffect(() => {
    // simple preview for selected files
    if (logoFile) {
      const u = URL.createObjectURL(logoFile);
      setPreviewLogo(u);
      return () => URL.revokeObjectURL(u);
    }
    setPreviewLogo(null);
  }, [logoFile]);

  useEffect(() => {
    if (sigFile) {
      const u = URL.createObjectURL(sigFile);
      setPreviewSig(u);
      return () => URL.revokeObjectURL(u);
    }
    setPreviewSig(null);
  }, [sigFile]);

  const load = async () => {
    try {
      const res = await api.get('/api/lms/admin/uploads');
      const data = res.data;
      if (Array.isArray(data)) setUploads(data as string[]);
      else setUploads([] as string[]);
    } catch {
      setUploads([] as string[]);
    }
  };

  // removed client-side crop/resize helpers; server will normalize uploads

  const uploadPrepared = async (which: 'logo' | 'signature') => {
    const selected = which === 'logo' ? logoFile : sigFile;
    if (!selected) return setMessage('Select a file to upload');
    const fd = new FormData();
    const name = which === 'logo' ? 'logo.jpg' : 'signature.jpg';
    fd.append('file', selected, name);
    try {
      setMessage('Uploading...');
      await api.post(`/api/lms/admin/uploads/${which}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Uploaded');
      // clear selections and previews
      if (which === 'logo') setLogoFile(null);
      else setSigFile(null);
      setPreviewLogo(null); setPreviewSig(null);
      load();
    } catch (err) { setMessage('Upload failed'); }
  };

  const uploadFont = async () => {
    if (!fontFile) return setMessage('Select a font file (.ttf or .otf)');
    const fd = new FormData();
    fd.append('file', fontFile, fontFile.name);
    try {
      setMessage('Uploading font...');
      await api.post('/api/lms/admin/uploads/font', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Font uploaded');
      setFontFile(null);
      load();
    } catch (err) { setMessage('Font upload failed'); }
  };

  return (
    <div className="main-content">
      <div className="card" style={{ maxWidth: 1100 }}>
        <h2>Manage Certificate Assets</h2>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ width: 420 }}>
            <div>Logo (saved as <code>/uploads/logo.jpg</code>)</div>
            <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => uploadPrepared('logo')}>Upload Logo</button>
            </div>
            <div style={{ marginTop: 8 }}>
              {previewLogo && <img src={previewLogo} alt="logo preview" style={{ maxWidth: '100%', border: '1px solid #ddd' }} />}
            </div>
          </div>

          <div style={{ width: 360 }}>
            <div>Signature (saved as <code>/uploads/signature.jpg</code>)</div>
            <input type="file" accept="image/*" onChange={e => setSigFile(e.target.files?.[0] ?? null)} />
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => uploadPrepared('signature')}>Upload Signature</button>
            </div>
            <div style={{ marginTop: 8 }}>
              {previewSig && <img src={previewSig} alt="signature preview" style={{ maxWidth: '100%', border: '1px solid #ddd' }} />}
            </div>
          </div>

          <div style={{ width: 320 }}>
            <div>Certificate font (upload .ttf or .otf)</div>
            <input type="file" accept=".ttf,.otf" onChange={e => setFontFile(e.target.files?.[0] ?? null)} />
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={uploadFont}>Upload Font</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <strong>Note</strong>: upload a font to embed in generated certificates. After upload, generate a test certificate to verify appearance.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>{message}</div>

  {/* file list hidden as requested */}
      </div>
    </div>
  );
};

export default AdminAssets;

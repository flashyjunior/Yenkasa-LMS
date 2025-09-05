import React, { useEffect, useState } from 'react';
import api from '../api';
import './UserProfile.css';

interface MeUser {
  id: string;
  userName: string;
  email: string;
  fullName?: string;
  profileImageUrl?: string;
  roles?: string[];
  isActive?: boolean;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  const showToast = (msg: string, type: 'success' | 'error' = 'success', ms = 4000) => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/lms/users/me') as any;
        const data = res?.data;
        setUser(data);
        setFullName(data?.fullName || '');
        setEmail(data?.email || '');
      } catch (err) {
        showToast('Failed to load profile', 'error');
        console.error('UserProfile: fetchMe error ->', (err as any));
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // persist basic fields
      // include userName so server doesn't try to set it to empty
      await api.put(`/api/lms/users/${user.id}`, { userName: user.userName, fullName, email });
      // upload photo if selected
      if (photoFile) {
        const fd = new FormData();
        fd.append('file', photoFile);
        await api.post(`/api/lms/users/${user.id}/upload-photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      // refresh
      const res = await api.get('/api/lms/users/me') as any;
      const data = res?.data;
      setUser(data);
      setFullName(data?.fullName || '');
      setEmail(data?.email || '');
      setPhotoFile(null);
      setPhotoPreview(null);
      setEditMode(false);
      showToast('Profile updated', 'success');
    } catch (err: any) {
      const resp = (err as any)?.response;
      const msg = resp?.data || (err as any)?.message || 'Failed to save';
      showToast(String(msg), 'error');
      console.error('UserProfile: handleSave error ->', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) return <div className="profile-root">Loading...</div>;

  return (
    <div className="profile-root">
      {toast && <div className={`profile-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="profile-card">
        <div className="profile-avatar">
          {photoPreview ? (
            <img src={photoPreview} alt="preview" />
          ) : user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="avatar" />
          ) : (
            <div className="avatar-placeholder">{user?.userName?.charAt(0)?.toUpperCase()}</div>
          )}
        </div>

        <div className="profile-details">
          <div className="row">
            <label>Username</label>
            <div className="value">{user?.userName}</div>
          </div>

          <div className="row">
            <label>Full name</label>
            {editMode ? (
              <input value={fullName} onChange={e => setFullName(e.target.value)} />
            ) : (
              <div className="value">{user?.fullName || '—'}</div>
            )}
          </div>

          <div className="row">
            <label>Email</label>
            {editMode ? (
              <input value={email} onChange={e => setEmail(e.target.value)} />
            ) : (
              <div className="value">{user?.email}</div>
            )}
          </div>

          <div className="row">
            <label>Roles</label>
            <div className="value">{(user?.roles || []).join(', ') || '—'}</div>
          </div>

          <div className="row">
            <label>Status</label>
            <div className="value">{user?.isActive ? 'Active' : 'Inactive'}</div>
          </div>

          {editMode && (
            <div className="row">
              <label>Profile photo</label>
              <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files ? e.target.files[0] : null)} />
              {photoPreview && <div className="preview-small"><img src={photoPreview} alt="preview" /></div>}
            </div>
          )}

          <div className="profile-actions">
            {editMode ? (
              <>
                <button className="btn-save" onClick={handleSave} disabled={loading}>Save</button>
                <button className="btn-cancel" onClick={() => { setEditMode(false); setPhotoFile(null); setPhotoPreview(null); }}>Cancel</button>
              </>
            ) : (
              <button className="btn-edit" onClick={() => setEditMode(true)}>Edit profile</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default UserProfile;
import React, { useEffect, useState } from 'react';
import api from '../api';
import './UserManagement.css';

interface User {
  id: string;
  userName: string;
  email: string;
  // roles normalized to string names in the UI
  roles?: string[];
  isActive?: boolean;
  fullName?: string;
  profileImageUrl?: string;
}

interface Role {
  id?: string;
  name?: string;
  normalizedName?: string;
}

// new: minimal create response shape (api may return different shapes)
interface CreateUserResponse {
  id?: string;
  userName?: string;
  email?: string;
  // extend if backend returns more fields
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rawUsersJson, setRawUsersJson] = useState<any>(null);
  // Create / Edit user states
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    isActive: true,
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editFullName, setEditFullName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  // reset password input used in the Edit User modal
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  // photo used on the create form
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null);

  // Toast state for success/error messages
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 4000) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), duration);
  };

  // search + filtered users
  const [searchQuery, setSearchQuery] = useState<string>('');
  const normalize = (s: any) => (s ?? '').toString().toLowerCase().trim();
  const filteredUsers = users.filter(u => {
    const q = normalize(searchQuery);
    if (!q) return true;
    const rolesText = (u.roles || []).join(' ');
    return normalize(u.id).includes(q)
      || normalize(u.userName).includes(q)
      || normalize(u.fullName).includes(q)
      || normalize(u.email).includes(q)
      || normalize(rolesText).includes(q)
      || normalize(u.profileImageUrl).includes(q);
  });
  
  // Export CSV (Excel-friendly). If you want XLSX later we can add sheetjs.
  const exportUsersCsv = (items: User[]) => {
    const headers = ['Id','Username','FullName','Email','Roles','IsActive','ProfileImageUrl'];
    const rows = items.map(u => [
      u.id || '',
      u.userName || '',
      u.fullName || '',
      u.email || '',
      (u.roles || []).join('; '),
      u.isActive ? 'Active' : 'Inactive',
      u.profileImageUrl || ''
    ]);
    const escapeCell = (c: any) => {
      const s = (c ?? '').toString();
      // wrap in quotes and escape existing quotes
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [headers.map(escapeCell).join(','), ...rows.map(r => r.map(escapeCell).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0,10).replace(/-/g,'');
    a.download = `users-export-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const handleExport = () => exportUsersCsv(filteredUsers);
  
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // create modal preview management
  useEffect(() => {
    if (!createPhotoFile) {
      setCreatePhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(createPhotoFile);
    setCreatePhotoPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [createPhotoFile]);

  const fetchUsers = async (): Promise<User[]> => {
    setLoading(true);
    try {
      const res = await api.get('/api/lms/users');
      console.debug('GET /api/lms/users response:', res.data);
      // expose raw response for quick debugging in dev
      if (process.env.NODE_ENV === 'development') setRawUsersJson(res.data);
      // Normalize user roles: API may return role objects; convert to array of role names
      const rawUsers = res.data as any[];
      const usersData: User[] = rawUsers.map(u => {
        const rawRoles = u.roles || [];
        const roleNames: string[] = rawRoles.map((r: any) => {
          if (!r) return '';
          if (typeof r === 'string') return r;
          return r.name || r.normalizedName || r.id || '';
        }).filter(Boolean);
        return { ...u, roles: roleNames, isActive: u.isActive, fullName: u.fullName, profileImageUrl: u.profileImageUrl } as User;
      });
      
      setUsers(usersData);
      setError(null);
      setSuccess(null);
      return usersData;
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
    return [];
  };

   const fetchRoles = async () => {
     try {
       const res = await api.get('/api/lms/roles');
      // API returns role objects; store them as Role[]
      const raw = res.data as any[];
      const rolesData: Role[] = raw.map(r => ({ id: r.id, name: r.name, normalizedName: r.normalizedName }));
      setRoles(rolesData);
     } catch (err) {
       setError('Failed to fetch roles');
     }
   };

   const handleAssignRole = async () => {
     if (!selectedUser || !selectedRole) return;
     setLoading(true);
     try {
       // send as JSON object to match backend RoleRequest DTO / JsonElement
       await api.post(`/api/lms/users/${selectedUser.id}/roles`, { role: selectedRole });
       await fetchUsers();
       showToast(`Role '${selectedRole}' assigned to ${selectedUser.userName}`, 'success');
       setSelectedUser(null);
       setSelectedRole('');
     } catch (err: any) {
      // If server expects a raw string and JSON caused a model binding error, retry sending plain text
      const resp = (err as any)?.response;
      const status = resp?.status;
      const errors = resp?.data?.errors || resp?.data;
      const conversionError = JSON.stringify(errors || '').includes('could not be converted to System.String') || JSON.stringify(errors || '').toLowerCase().includes('role field is required');
      if (status === 400 && conversionError) {
        try {
          await api.post(`/api/lms/users/${selectedUser.id}/roles`, selectedRole, { headers: { 'Content-Type': 'text/plain' } });
          await fetchUsers();
          showToast(`Role '${selectedRole}' assigned to ${selectedUser.userName}`, 'success');
          setSelectedUser(null);
          setSelectedRole('');
        } catch (err2) {
          showToast('Failed to assign role', 'error');
        }
      } else {
        showToast('Failed to assign role', 'error');
      }
    } finally {
      setLoading(false);
    }
   };

  const handleRemoveRole = async (user: User, role: string) => {
     setLoading(true);
     try {
       // send as JSON object to match backend RoleRequest DTO
       await api.post(`/api/lms/users/${user.id}/roles/remove`, { role });
       await fetchUsers();
       showToast(`Role '${role}' removed from ${user.userName}`, 'success');
     } catch (err: any) {
      const resp = (err as any)?.response;
      const status = resp?.status;
      const errors = resp?.data?.errors || resp?.data;
      const conversionError = JSON.stringify(errors || '').includes('could not be converted to System.String') || JSON.stringify(errors || '').toLowerCase().includes('role field is required');
      if (status === 400 && conversionError) {
        try {
          await api.post(`/api/lms/users/${user.id}/roles/remove`, role, { headers: { 'Content-Type': 'text/plain' } });
          await fetchUsers();
          showToast(`Role '${role}' removed from ${user.userName}`, 'success');
        } catch (err2) {
          showToast('Failed to remove role', 'error');
        }
      } else {
        showToast('Failed to remove role', 'error');
      }
    } finally {
      setLoading(false);
    }
   };

  // Create user
  // returns the created User (or null) so callers can use it
  const handleCreateUser = async (): Promise<User | null> => {
    setLoading(true);
    try {
      if (newUser.password !== newUser.confirmPassword) { setError('Passwords do not match'); setLoading(false); return null; }
      // create and capture created user (api should return created user object)
      const res = await api.post('/api/lms/users/create', { userName: newUser.userName, email: newUser.email, fullName: newUser.fullName, password: newUser.password, isActive: newUser.isActive });
      const created = res?.data as CreateUserResponse | null;
      // If API returned created.id use it; otherwise refresh list and try to locate the new user by username/email
      let createdId = created?.id;
      const usersAfter = await fetchUsers();
      if (!createdId) {
        const found = usersAfter.find(u => u.userName?.toLowerCase() === newUser.userName.toLowerCase() || u.email?.toLowerCase() === newUser.email.toLowerCase());
        createdId = found?.id;
      }
      // if a profile photo was selected during creation, upload it (only when we have an id)
      if (createPhotoFile && createdId) {
        const form = new FormData();
        form.append('file', createPhotoFile);
        await api.post(`/api/lms/users/${createdId}/upload-photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (createPhotoFile && !createdId) {
        // helpful error when we can't upload because the server didn't return id and user not found
        showToast('User created but could not determine user id to upload profile photo. Photo not uploaded.', 'error');
      }
      // ensure UI reflects latest state
      await fetchUsers();
      showToast(`User '${newUser.userName}' created`, 'success');
      setShowCreate(false);
      // clear form and file
      setNewUser({ userName: '', email: '', password: '', confirmPassword: '', fullName: '', isActive: true });
      setCreatePhotoFile(null);
      setCreatePhotoPreview(null);
      // try to return the created User object
      const all = await fetchUsers();
      const createdUser = createdId ? all.find(u => u.id === createdId) : all.find(u => u.userName?.toLowerCase() === newUser.userName.toLowerCase() || u.email?.toLowerCase() === newUser.email.toLowerCase());
      return createdUser || null;
    } catch (err: any) {
       // surface server validation if available (safe access)
       const resp = (err as any)?.response;
       const serverMsg = resp?.data || (err as any)?.message;
      showToast(String(serverMsg || 'Failed to create user'), 'error');
      return null;
    } finally { setLoading(false); }
  };

  // Open edit modal
  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.userName);
    setEditEmail(user.email);
  setEditFullName((user as any).fullName || '');
    setResetPasswordValue('');
  // default active state true; if backend returns IsActive include it in User model mapping later
  setEditIsActive((user as any).isActive ?? true);
  setPhotoFile(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
   await api.put(`/api/lms/users/${editingUser.id}`, { userName: editUserName, email: editEmail, isActive: editIsActive, fullName: editFullName });
       // if a photo file is selected, upload it
       if (photoFile) {
         const form = new FormData();
         form.append('file', photoFile);
         await api.post(`/api/lms/users/${editingUser.id}/upload-photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
       }
       await fetchUsers();
       showToast(`User '${editUserName}' updated`, 'success');
       setEditingUser(null);
     } catch (err: any) {
      showToast(((err as any)?.response?.data) || (err as any)?.message || 'Failed to update user', 'error');
     } finally { setLoading(false); }
  };

   const handleResetPassword = async () => {
     if (!editingUser) return;
     if (!resetPasswordValue) { setError('Password required'); return; }
     setLoading(true);
     try {
       await api.post(`/api/lms/users/${editingUser.id}/reset-password`, { newPassword: resetPasswordValue });
       showToast('Password reset', 'success');
       setResetPasswordValue('');
       setEditingUser(null);
     } catch (err: any) {
      showToast(((err as any)?.response?.data) || (err as any)?.message || 'Failed to reset password', 'error');
     } finally { setLoading(false); }
   };

  // helper to open create modal and clear browser autofill / previous values
  const openCreate = () => {
    // reset controlled inputs so browser autofill text won't persist
    setNewUser({
      userName: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      isActive: true,
    });
    setCreatePhotoFile(null);
    setCreatePhotoPreview(null);
    setShowCreate(true);
  };

  // example create handler (wire to your existing API call)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.password !== newUser.confirmPassword) {
      // show validation error according to your UI patterns
      return;
    }
    try {
      // reuse shared create flow to avoid duplication
      await handleCreateUser();
    } catch (err) {
      setError(((err as any)?.response?.data) || (err as any)?.message || 'Failed to create user');
    } finally { setLoading(false); }
  };

  // open assign role - keep selectedUser for details + opens modal (existing UI uses selectedUser to show modal)
  const openAssignRole = (user: any) => {
    setSelectedUser(user); // this also drives the details panel on main page
    // if you have separate modal flag, set it here; otherwise modal renders from selectedUser
  };

  return (
    <div className="user-management">
      <h2>Users</h2>
      {/* toast */}
      {toast && (
        <div className={`um-toast um-toast-${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
      <div className="um-actions-row" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Search by id, username, full name, email or role..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
          aria-label="Search users"
        />
        <button onClick={() => { setSearchQuery(''); }} className="btn-cancel">Clear</button>
        <button onClick={handleExport} className="btn-export">Export CSV</button>
      </div>
      {/* Selected user details on main page (visible even when modal is open) */}
      {selectedUser && (
        <div className="selected-user-details" role="region" aria-label="Selected user details">
          <div className="selected-user-left">
            {selectedUser.profileImageUrl ? (
              <img src={selectedUser.profileImageUrl} alt="avatar" />
            ) : (
              <div className="avatar-placeholder">{selectedUser.userName?.charAt(0)?.toUpperCase()}</div>
            )}
          </div>
          <div className="selected-user-info">
            <div className="su-line"><strong>Username:</strong> {selectedUser.userName}</div>
            <div className="su-line"><strong>Full name:</strong> {selectedUser.fullName || '—'}</div>
            <div className="su-line"><strong>Email:</strong> {selectedUser.email}</div>
            <div className="su-line"><strong>Roles:</strong> {(selectedUser.roles || []).join(', ') || '—'}</div>
            <div className="su-line"><strong>Status:</strong> {selectedUser.isActive ? 'Active' : 'Inactive'}</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <button onClick={openCreate} className="btn-create">Create user</button>
      </div>

      <table>
        <thead>
           <tr>
            <th>Avatar</th>
            <th>Username</th>
            <th>Full name</th>
            <th>Email</th>
            <th>Roles</th>
             <th>Actions</th>
           </tr>
         </thead>
         <tbody>
           {filteredUsers.map((user) => (
             <tr key={user.id}>
              <td>
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="avatar" style={{ width: 48, height: 48, borderRadius: 6 }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>{user.userName?.charAt(0)?.toUpperCase()}</div>
                )}
              </td>
              <td>{user.userName}</td>
              <td>{(user as any).fullName || ''}</td>
              <td>{user.email}</td>
               <td>
                {/* roles normalized during fetch; fallback defensively */}
                {(user.roles || []).length === 0 ? (
                  <em className="no-roles">—</em>
                ) : (
                  // show joined roles string for visibility and still render chips
                  <div className="roles-inline">
                    {(user.roles || []).join(', ')}
                    {(user.roles || []).map((role) => (
                      <span key={role} className="role-chip">
                        {role}
                        <button onClick={() => handleRemoveRole(user, role)} title="Remove Role">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
               </td>
               <td className="row-actions">
                <button onClick={() => openAssignRole(user)} className="btn-assign">Assign Role</button>
                <button onClick={() => openEditUser(user)} className="btn-edit" style={{ marginLeft: 8 }}>Edit</button>
               </td>
             </tr>
           ))}
         </tbody>
       </table>
  {selectedUser && (
         <div className="assign-role-modal">
           <h3>Assign Role to {selectedUser.userName}</h3>
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
            <option value="">Select Role</option>
            {roles.map(role => (
              <option key={role.id || role.name || role.normalizedName} value={role.name || role.normalizedName || role.id}>{role.name || role.normalizedName || role.id}</option>
            ))}
            </select>
           <button onClick={handleAssignRole} disabled={!selectedRole}>Assign</button>
           <button onClick={() => setSelectedUser(null)}>Cancel</button>
         </div>
       )}
      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-container create-user" onClick={(e) => e.stopPropagation()}>
            <h3>Create User</h3>
            <form onSubmit={handleCreateSubmit} autoComplete="off">
              <label>Username</label>
              <input
                autoComplete="off"
                value={newUser.userName}
                onChange={(e) => setNewUser({ ...newUser, userName: e.target.value })}
                required
              />
              <label>Full name</label>
              <input
                autoComplete="off"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              />
              <label>Email</label>
              <input
                type="email"
                autoComplete="off"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
              <label>Password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
              <label>Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                required
              />
              <label>Profile photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setCreatePhotoFile(e.target.files ? e.target.files[0] : null)}
              />
             {/* preview */}
             {createPhotoPreview && (
               <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                 <img src={createPhotoPreview} alt="Preview" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                 <div>
                   <div style={{ marginBottom: 8 }}>{newUser.fullName || newUser.userName}</div>
                   <button type="button" onClick={() => { setCreatePhotoFile(null); setCreatePhotoPreview(null); }} className="btn-cancel">Remove</button>
                 </div>
               </div>
             )}
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-cancel">Cancel</button>
                <button type="submit" className="btn-save" style={{ marginLeft: 8 }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role modal (keeps using selectedUser so main details remain shown) */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-container assign-role-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Role to {selectedUser.userName}</h3>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
              <option value="">Select Role</option>
              {roles.map(role => (
                <option key={role.id || role.name || role.normalizedName} value={role.name || role.normalizedName || role.id}>{role.name || role.normalizedName || role.id}</option>
              ))}
            </select>
            <button onClick={handleAssignRole} disabled={!selectedRole}>Assign</button>
            <button onClick={() => setSelectedUser(null)}>Cancel</button>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button onClick={() => setSelectedUser(null)} className="btn-cancel">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-container edit-user-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {editingUser.userName}</h3>

            <label htmlFor="edit-username">Username</label>
            <input id="edit-username" value={editUserName} onChange={e => setEditUserName(e.target.value)} />

            <label htmlFor="edit-email">Email</label>
            <input id="edit-email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />

            <label htmlFor="edit-fullname">Full name</label>
            <input id="edit-fullname" placeholder="Full name" value={editFullName} onChange={e => setEditFullName(e.target.value)} />

            <div style={{ marginTop: 8 }} className="toggle-switch">
              <label htmlFor="edit-isactive" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input id="edit-isactive" type="checkbox" checked={editIsActive} onChange={e => setEditIsActive(e.target.checked)} />
                <span>{editIsActive ? 'Active' : 'Inactive'}</span>
              </label>
            </div>

            <div style={{ marginTop: 8 }}>
              <label htmlFor="edit-photo">Profile photo</label>
              <input id="edit-photo" type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files ? e.target.files[0] : null)} />
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={handleSaveUser} className="btn-save">Save</button>
              <button onClick={() => setEditingUser(null)} className="btn-cancel" style={{ marginLeft: 8 }}>Cancel</button>
            </div>

            <hr />
            <h4>Reset Password</h4>
            <label htmlFor="reset-password">New password</label>
            <input id="reset-password" placeholder="New password" type="password" value={resetPasswordValue} onChange={e => setResetPasswordValue(e.target.value)} />
            <div style={{ marginTop: 8 }}>
              <button onClick={handleResetPassword} disabled={!resetPasswordValue} className="btn-reset">Reset Password</button>
            </div>

            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button onClick={() => setEditingUser(null)} className="btn-edit">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Dev debug JSON commented out. Uncomment during troubleshooting:
          {process.env.NODE_ENV === 'development' && rawUsersJson && (
            <div className="raw-json-block" style={{ marginTop: 16 }}>
              <h4>Raw /api/lms/users response (dev only)</h4>
              <pre style={{ maxHeight: 300, overflow: 'auto', background: '#f7fafc', padding: 12, borderRadius: 6 }}>
                {JSON.stringify(rawUsersJson, null, 2)}
              </pre>
            </div>
          )}
      */}
    </div>
  );
};
 
export default UserManagement;
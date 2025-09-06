import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import './AdminRolePrivileges.css';

type Priv = { id: number; name: string; description?: string };
type RolePriv = { id: number; roleName: string; privilegeId: number; privilegeName: string };
type UserSummary = { id: string; userName: string; email?: string; roles?: string[] };

const AdminRolePrivileges: React.FC = () => {
  const { hasPrivilege } = useAuth();
  const [privileges, setPrivileges] = useState<Priv[]>([]);
  const [mappings, setMappings] = useState<RolePriv[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [draggingRole, setDraggingRole] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [userSearchQ, setUserSearchQ] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [newPrivName, setNewPrivName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPrivId, setSelectedPrivId] = useState<number | null>(null);
  const [userIdToAssign, setUserIdToAssign] = useState('');
  const [assignRoleName, setAssignRoleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; body: React.ReactNode; onConfirm: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!hasPrivilege || !hasPrivilege('ViewAdminMenu')) return;
    loadAll();
  }, [hasPrivilege]);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, rp, r] = await Promise.all([api.get('/api/admin/privileges'), api.get('/api/admin/role-privileges'), api.get('/api/admin/roles')]);
      const pData = (p.data as any[]) || [];
      const rpData = (rp.data as any[]) || [];
      setPrivileges(pData as Priv[]);
      setMappings(rpData as RolePriv[]);
      setRoles((r.data as string[]) || []);
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to load data'), 'error');
    } finally { setLoading(false); }
  }

  // reorder roles locally and persist order to server
  async function persistRoleOrder(newOrder: string[]) {
    setRoles(newOrder);
    setOpLoading(true);
    try {
  // call bulk order endpoint
  await api.put('/api/admin/roles/order', { roles: newOrder });
      (window as any).showAppToast?.('Role order saved', 'success');
      await loadAll();
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to save order'), 'error');
    } finally { setOpLoading(false); }
  }

  async function addPrivilege() {
    if (!newPrivName.trim()) return;
    setOpLoading(true);
    try {
      await api.post('/api/admin/privileges', { name: newPrivName.trim() });
      setNewPrivName('');
      (window as any).showAppToast?.('Privilege added', 'success');
      await loadAll();
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to add'), 'error');
    } finally { setOpLoading(false); }
  }

  async function deletePrivilege(id: number) {
    setConfirmModal({
      title: 'Delete Privilege',
      body: 'Delete privilege? This will remove any role mappings for it.',
      onConfirm: async () => {
        setOpLoading(true);
        try {
          await api.delete(`/api/admin/privileges/${id}`);
          (window as any).showAppToast?.('Privilege deleted', 'success');
          await loadAll();
        } catch (ex: any) {
          (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to delete'), 'error');
        } finally { setOpLoading(false); setConfirmModal(null); }
      }
    });
  }

  async function addRolePriv() {
    // kept for backward compatibility (not used in matrix UI)
    if (!selectedRole || !selectedPrivId) return;
    setOpLoading(true);
    try {
      await api.post('/api/admin/role-privileges', { roleName: selectedRole, privilegeId: selectedPrivId });
      (window as any).showAppToast?.('Role-privilege mapping added', 'success');
      await loadAll();
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to map'), 'error');
    } finally { setOpLoading(false); }
  }

  async function deleteRolePriv(id: number) {
    setConfirmModal({
      title: 'Remove Mapping',
      body: 'Remove this role → privilege mapping?',
      onConfirm: async () => {
        setOpLoading(true);
        try {
          await api.delete(`/api/admin/role-privileges/${id}`);
          (window as any).showAppToast?.('Mapping removed', 'success');
          await loadAll();
        } catch (ex: any) {
          (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to remove'), 'error');
        } finally { setOpLoading(false); setConfirmModal(null); }
      }
    });
  }

  async function assignRole() {
    if (!userIdToAssign || !assignRoleName) return;
    setConfirmModal({
      title: 'Assign Role',
      body: `Assign role '${assignRoleName}' to user ${userIdToAssign}?`,
      onConfirm: async () => {
        setOpLoading(true);
        try {
          await api.post(`/api/admin/users/${encodeURIComponent(userIdToAssign)}/roles`, { roleName: assignRoleName });
          (window as any).showAppToast?.('Role assigned', 'success');
          setUserIdToAssign('');
          setAssignRoleName('');
        } catch (ex: any) {
          (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to assign'), 'error');
        } finally { setOpLoading(false); setConfirmModal(null); }
      }
    });
  }

  async function searchUsers() {
    setOpLoading(true);
    try {
      const q = userSearchQ.trim();
      const res = await api.get('/api/admin/users', { params: { q } });
      setUsers((res.data as any[]) || []);
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to search'), 'error');
    } finally { setOpLoading(false); }
  }

  async function removeRoleFromUser(userId: string, roleName: string) {
    setConfirmModal({
      title: 'Remove Role',
      body: `Remove role '${roleName}' from user ${userId}?`,
      onConfirm: async () => {
        setOpLoading(true);
        try {
          await api.delete(`/api/admin/users/${encodeURIComponent(userId)}/roles`, { params: { roleName } });
          (window as any).showAppToast?.('Role removed from user', 'success');
          await searchUsers();
        } catch (ex: any) {
          (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to remove role'), 'error');
        } finally { setOpLoading(false); setConfirmModal(null); }
      }
    });
  }

  if (!hasPrivilege || !hasPrivilege('ViewAdminMenu')) return <div>You are not authorized to view this page.</div>;
  return (
    <div className="main-content">
      <h1>Roles & Permissions</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#666' }}>Manage roles and assign privileges per role.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddRole(true)}>+ Add Role</button>
          <button onClick={loadAll} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => {
            // CSV export: flatten roles+privileges
            const rows: string[] = [];
            const header = ['Permission', ...roles];
            rows.push(header.join(','));
            privileges.forEach(p => {
              const line = [ `"${p.name.replace(/"/g,'""')}"` ];
              roles.forEach(rn => {
                const mapped = mappings.find(m => m.privilegeId === p.id && m.roleName === rn);
                line.push(mapped ? 'YES' : 'NO');
              });
              rows.push(line.join(','));
            });
            const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `roles-privileges-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          }}>Export CSV</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input id="import-json-input" type="file" accept="application/json" style={{ display: 'none' }} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setImportFileName(f.name);
              const txt = await f.text();
              try {
                const parsed = JSON.parse(txt);
                // show preview (dry-run)
                const res = await api.post('/api/admin/roles/import', parsed, { params: { dryRun: true } });
                const preview = res.data;
                setConfirmModal({
                  title: 'Import Preview',
                  body: (<div style={{ maxHeight: 300, overflow: 'auto' }}>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre>
                    <div style={{ marginTop: 8 }}>Apply import?</div>
                  </div>),
                  onConfirm: async () => {
                    setOpLoading(true);
                    try {
                      await api.post('/api/admin/roles/import', parsed);
                      (window as any).showAppToast?.('Import applied', 'success');
                      await loadAll();
                    } catch (ex: any) {
                      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to import'), 'error');
                    } finally { setOpLoading(false); setConfirmModal(null); }
                  }
                });
              } catch (ex: any) {
                (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to import'), 'error');
              }
            }} />
            <span style={{ padding: '6px 10px', border: '1px dashed #ccc', borderRadius: 6 }}>{importFileName || 'Import JSON (preview)'}</span>
          </label>
        </div>
        <div style={{ color: '#666' }}>{roles.length} roles</div>
      </div>

      <div className="roles-matrix">
        <table>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: 12, textAlign: 'left', minWidth: 220 }}>Permission</th>
              {roles.map((rn, idx) => (
                <th key={rn} style={{ padding: 12, textAlign: 'center', minWidth: 120 }} draggable
                  onDragStart={(e) => { setDraggingRole(rn); e.dataTransfer?.setData('text/plain', rn); e.dataTransfer!.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'move'; }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const from = draggingRole || e.dataTransfer.getData('text/plain');
                    const to = rn;
                    if (!from || from === to) return;
                    const newOrder = roles.slice();
                    const fromIdx = newOrder.indexOf(from);
                    const toIdx = newOrder.indexOf(to);
                    newOrder.splice(fromIdx, 1);
                    newOrder.splice(toIdx, 0, from);
                    await persistRoleOrder(newOrder);
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ cursor: 'grab' }} aria-hidden>☰</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div>{rn}</div>
                      <button title={`Delete role ${rn}`} onClick={(ev) => { ev.stopPropagation(); setConfirmModal({ title: 'Delete Role', body: `Delete role '${rn}'? This will remove mappings.`, onConfirm: async () => {
                        setOpLoading(true);
                        try {
                          await api.delete(`/api/admin/roles/${encodeURIComponent(rn)}`, { params: { confirm: true } });
                          (window as any).showAppToast?.('Role deleted', 'success');
                          await loadAll();
                        } catch (ex: any) {
                          (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to delete role'), 'error');
                        } finally { setOpLoading(false); setConfirmModal(null); }
                      } }); }}>🗑️</button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {privileges.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: 12 }}>{p.name}</td>
                {roles.map(rn => {
                  const mapped = mappings.find(m => m.privilegeId === p.id && m.roleName === rn);
                  const yes = !!mapped;
                  return (
                    <td key={rn} style={{ padding: 10, textAlign: 'center' }}>
                      <button
                        onClick={async () => {
                          setOpLoading(true);
                          try {
                            if (yes) {
                              await api.delete(`/api/admin/role-privileges/${mapped!.id}`);
                              (window as any).showAppToast?.('Mapping removed', 'success');
                            } else {
                              await api.post('/api/admin/role-privileges', { roleName: rn, privilegeId: p.id });
                              (window as any).showAppToast?.('Mapping added', 'success');
                            }
                            await loadAll();
                          } catch (ex: any) {
                            (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed'), 'error');
                          } finally { setOpLoading(false); }
                        }}
                        disabled={opLoading}
                        style={{ padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <span className={yes ? 'badge-yes' : 'badge-no'}>{yes ? 'YES' : 'NO'}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddRole && (
        <Modal title="Add Role" onClose={() => setShowAddRole(false)} onConfirm={async () => {
          if (!newRoleName.trim()) return;
          setOpLoading(true);
          try {
            await api.post('/api/admin/roles', { roleName: newRoleName.trim() });
            (window as any).showAppToast?.('Role created', 'success');
            setNewRoleName('');
            setShowAddRole(false);
            await loadAll();
          } catch (ex: any) {
            (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to create role'), 'error');
          } finally { setOpLoading(false); }
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name (e.g. Manager)" style={{ flex: 1 }} />
          </div>
        </Modal>
      )}

      {confirmModal && (
        <Modal
          title={confirmModal.title}
          onClose={() => setConfirmModal(null)}
          onConfirm={() => confirmModal.onConfirm()}
        >
          {confirmModal.body}
        </Modal>
      )}
    </div>
  );
};

export default AdminRolePrivileges;

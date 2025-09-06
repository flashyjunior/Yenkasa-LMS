import React from 'react';
import api from '../api';

type Material = {
  id: number;
  fileName: string;
  uploadedBy: string;
  description?: string;
  downloadCount?: number;
};
const apiBase = process.env.REACT_APP_API_BASE || '';
const logDownload = async (materialId: number) => {
  try {
    await api.post(`/api/lms/materials/${materialId}/download-log`);
  } catch {
    // ignore log errors
  }
};
const downloadMaterial = async (courseId: number, materialId: number, fileName: string) => {
  try {
    await logDownload(materialId);
    const token = localStorage.getItem('auth_token');
    const url = `${apiBase}/api/lms/courses/${courseId}/materials/${materialId}/download`;
    const response = await api.get<Blob>(url, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    alert('Download failed. Please check your login or permissions.');
  }
};

const LearningTools: React.FC<{ materials: Material[]; courseId: number }> = ({ materials, courseId }) => (
  <div>
    <p>
      Here you'll find downloadable resources, guides, and supplementary materials to help you succeed in this course.
      If you need additional support materials, please contact your instructor.
    </p>
    {(!materials || materials.length === 0) ? (
      <p>No supplementary materials available for this course.</p>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ background: '#f7f7f7' }}>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>File Name</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Description</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Uploaded By</th>
            <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #ddd' }}>Download</th>
            <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #ddd' }}>Total Downloads</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(m => (
            <tr key={m.id}>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{m.fileName}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>{m.description || '-'}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#888', fontSize: 13 }}>{m.uploadedBy}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                <button
                  onClick={() => downloadMaterial(courseId, m.id, m.fileName)}
                  style={{
                    padding: '6px 16px',
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Download
                </button>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                {m.downloadCount ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default LearningTools;
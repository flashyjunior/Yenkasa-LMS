import React from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, onConfirm, children }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, minWidth: 340, maxWidth: 400, padding: 32, boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'
      }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontWeight: 700, fontSize: '1.3rem', color: '#e53e3e' }}>{title}</h2>
        <div style={{ marginBottom: 24, textAlign: 'center', color: '#4a5568' }}>{children}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={onClose} style={{ background: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: 6, padding: '0.6rem 1.3rem', fontWeight: 500, fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.6rem 1.3rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

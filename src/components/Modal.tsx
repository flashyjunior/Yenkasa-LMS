import React from 'react';
import './Modal.css';

type ModalProps = {
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  maxWidth?: number | string; // new optional prop
};

const Modal: React.FC<ModalProps> = ({ title, children, onClose, onConfirm, confirmLabel, maxWidth }) => {
  // allow parent to override width; fall back to CSS default
  const contentStyle: React.CSSProperties = maxWidth ? { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : String(maxWidth) } : {};

  return (
    <div className="app-modal-backdrop" role="dialog" aria-modal="true">
      <div className="app-modal" style={contentStyle}>
        <div className="app-modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="app-modal-body">
          {children}
        </div>
        <div className="app-modal-footer">
          {onConfirm && <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel ?? 'OK'}</button>}
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

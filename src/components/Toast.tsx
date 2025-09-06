import React, { useEffect } from 'react';
import './Toast.css';

const Toast: React.FC<{ message?: string; onClose?: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => { onClose && onClose(); }, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast">
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={() => onClose && onClose()} aria-label="close">×</button>
    </div>
  );
};

export default Toast;

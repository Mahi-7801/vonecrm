import React, { useState, useEffect, useCallback } from 'react';

let toastId = 0;
let listeners = [];

export function showToast(message, type = 'info') {
  const id = ++toastId;
  listeners.forEach(fn => fn({ id, message, type }));
  setTimeout(() => {
    listeners.forEach(fn => fn({ id, remove: true }));
  }, 4000);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const handler = useCallback((toast) => {
    if (toast.remove) {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    } else {
      setToasts(prev => [...prev, toast]);
    }
  }, []);

  useEffect(() => {
    listeners.push(handler);
    return () => { listeners = listeners.filter(l => l !== handler); };
  }, [handler]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from 'react';
import styles from './LiveToast.module.css';

interface Toast {
  id: string;
  type: 'prediction' | 'update' | 'success' | 'error';
  title: string;
  message: string;
  icon?: string;
}

interface LiveToastProps {
  maxToasts?: number;
}

// Global toast state for external triggering
let toastListeners: ((toast: Toast) => void)[] = [];

export function showToast(toast: Omit<Toast, 'id'>) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  toastListeners.forEach(listener => listener({ ...toast, id }));
}

export function LiveToast({ maxToasts = 3 }: LiveToastProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts(prev => {
      const updated = [toast, ...prev].slice(0, maxToasts);
      return updated;
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 5000);
  }, [maxToasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter(l => l !== addToast);
    };
  }, [addToast]);

  // Demo: Show a toast on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      showToast({
        type: 'update',
        title: 'Live Data',
        message: 'Markets refreshed with latest odds',
        icon: '🔄',
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const getTypeStyles = (type: Toast['type']) => {
    switch (type) {
      case 'prediction':
        return styles.prediction;
      case 'success':
        return styles.success;
      case 'error':
        return styles.error;
      default:
        return styles.update;
    }
  };

  const getDefaultIcon = (type: Toast['type']) => {
    switch (type) {
      case 'prediction':
        return '🤖';
      case 'success':
        return '✓';
      case 'error':
        return '⚠';
      default:
        return '📢';
    }
  };

  return (
    <div className={styles.container}>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${getTypeStyles(toast.type)}`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <span className={styles.icon}>{toast.icon || getDefaultIcon(toast.type)}</span>
          <div className={styles.content}>
            <strong className={styles.title}>{toast.title}</strong>
            <span className={styles.message}>{toast.message}</span>
          </div>
          <button className={styles.dismiss} onClick={() => dismissToast(toast.id)}>
            ✕
          </button>
          <div className={styles.progressBar}>
            <div className={styles.progress} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default LiveToast;

import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let addToastFn: ((type: ToastType, message: string) => void) | null = null;

export function toast(type: ToastType, message: string) {
  addToastFn?.(type, message);
}

const ICONS: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
};

const COLORS: Record<ToastType, { border: string; bg: string; text: string }> = {
  success: { border: 'border-l-status-success', bg: 'bg-surface', text: 'text-emerald-700 dark:text-emerald-400' },
  error: { border: 'border-l-status-error', bg: 'bg-surface', text: 'text-red-700 dark:text-red-400' },
  warning: { border: 'border-l-status-warning', bg: 'bg-surface', text: 'text-amber-700 dark:text-amber-400' },
  info: { border: 'border-l-status-info', bg: 'bg-surface', text: 'text-blue-700 dark:text-blue-400' },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    // Error toasts don't auto-dismiss
    if (type !== 'error') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-80">
      {toasts.map(t => {
        const color = COLORS[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto animate-slide-in-right flex items-center gap-2.5 px-4 py-3 rounded-lg border border-border border-l-4 ${color.border} ${color.bg} shadow-md text-sm`}
          >
            <Icon name={ICONS[t.type]} size={16} className={color.text} />
            <span className="flex-1 text-text-primary">{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-1 text-text-tertiary hover:text-text-primary"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

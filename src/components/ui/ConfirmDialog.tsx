import { useState, useEffect } from 'react';
import Icon from './Icon';

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  variant?: 'default' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  requireInput?: string;
}

export default function ConfirmDialog({
  open, onConfirm, onCancel, title, description,
  variant = 'default', confirmLabel, cancelLabel = '取消', requireInput,
}: Props) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (open) setInputValue('');
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === 'danger';
  const canConfirm = !requireInput || inputValue === requireInput;
  const defaultConfirmLabel = confirmLabel || (isDanger ? '删除' : '确认');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-xl border border-border shadow-lg w-full max-w-md animate-scale-in p-6">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isDanger ? 'bg-status-error-bg' : 'bg-status-info-bg'
          }`}>
            <Icon
              name={isDanger ? 'alert-triangle' : 'info'}
              size={20}
              className={isDanger ? 'text-status-error' : 'text-status-info'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
          </div>
        </div>

        {requireInput && (
          <div className="mt-4">
            <p className="text-sm text-text-secondary mb-2">
              请输入 <span className="font-mono font-semibold text-text-primary">{requireInput}</span> 以确认
            </p>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="input"
              placeholder={requireInput}
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="btn-secondary">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={isDanger ? 'btn-danger' : 'btn-primary'}
          >
            {defaultConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

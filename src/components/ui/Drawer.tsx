import { useEffect, useRef } from 'react';
import Icon from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Drawer({ open, onClose, title, subtitle, width = 600, children, footer }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={drawerRef}
        className="bg-surface shadow-drawer animate-slide-in-right flex flex-col w-full md:w-auto overflow-hidden"
        style={{ maxWidth: '100vw', width: window.innerWidth < 768 ? '100%' : width }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex justify-between items-start z-10 shrink-0">
          <div className="min-w-0">
            <h2 className="section-title truncate">{title}</h2>
            {subtitle && <p className="text-sm text-text-secondary mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost p-1 ml-3 shrink-0">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import Icon from './ui/Icon';
import { exportToDocx, exportToPdf } from '@lib/export/resumeToDocx';
import type { Resume } from '@lib/types';

interface Props {
  resume: Resume;
}

export default function ExportMenu({ resume }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="btn-ghost p-1.5 flex items-center gap-1 text-xs"
      >
        <Icon name="download" size={14} />
        导出
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-20 min-w-[120px]">
          <button
            className="w-full px-3 py-2 text-sm text-left hover:bg-surface-secondary flex items-center gap-2 rounded-t-lg"
            onClick={() => { exportToDocx(resume); setOpen(false); }}
          >
            <Icon name="file-text" size={14} /> Word (.docx)
          </button>
          <button
            className="w-full px-3 py-2 text-sm text-left hover:bg-surface-secondary flex items-center gap-2 rounded-b-lg"
            onClick={() => { exportToPdf(); setOpen(false); }}
          >
            <Icon name="download" size={14} /> PDF（打印）
          </button>
        </div>
      )}
    </div>
  );
}

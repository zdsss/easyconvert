import Icon from './ui/Icon';

interface Props {
  file: File;
  onRemove: () => void;
}

const FORMAT_ICONS: Record<string, string> = {
  pdf: 'file-text',
  docx: 'file-text',
  doc: 'file-text',
};

import { formatSize } from '@lib/utils';

export default function FilePreviewCard({ file, onRemove }: Props) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const icon = FORMAT_ICONS[ext] || 'file-text';

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
        <Icon name={icon} size={20} className="text-brand-600 dark:text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
        <p className="text-xs text-text-tertiary mt-0.5">
          {formatSize(file.size)} · {ext.toUpperCase()} · {new Date().toLocaleTimeString()}
        </p>
      </div>
      <button onClick={onRemove} className="btn-ghost p-1.5 text-text-tertiary hover:text-status-error">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

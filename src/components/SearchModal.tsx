import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './ui/Icon';

const PAGES = [
  { path: '/parse', label: '解析简历', icon: 'file-text' },
  { path: '/parse/batch', label: '批量处理', icon: 'layers' },
  { path: '/parse/monitor', label: '监控仪表盘', icon: 'activity' },
  { path: '/parse/history', label: '解析历史', icon: 'clock' },
  { path: '/evaluation', label: '评测任务', icon: 'clipboard' },
  { path: '/evaluation/new', label: '新建评测', icon: 'plus' },
  { path: '/api', label: 'API 概览', icon: 'globe' },
  { path: '/api/keys', label: 'API Keys', icon: 'key' },
  { path: '/api/usage', label: '用量统计', icon: 'bar-chart' },
];

export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    const handleCustom = () => setOpen(true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('open-search', handleCustom);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('open-search', handleCustom);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query
    ? PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()) || p.path.includes(query.toLowerCase()))
    : PAGES;

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
    // Save to recent
    const recent = JSON.parse(localStorage.getItem('recent-search') || '[]');
    const updated = [path, ...recent.filter((p: string) => p !== path)].slice(0, 5);
    localStorage.setItem('recent-search', JSON.stringify(updated));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIndex]) handleSelect(filtered[selectedIndex].path);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-surface rounded-xl border border-border shadow-lg w-full max-w-lg animate-scale-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Icon name="search" size={18} className="text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面..."
            className="flex-1 py-3.5 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary text-xs text-text-tertiary font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">无匹配结果</p>
          ) : (
            filtered.map((page, i) => (
              <button
                key={page.path}
                onClick={() => handleSelect(page.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  i === selectedIndex ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' : 'text-text-secondary hover:bg-surface-tertiary'
                }`}
              >
                <Icon name={page.icon} size={16} className={i === selectedIndex ? 'text-brand-600 dark:text-brand-400' : 'text-text-tertiary'} />
                <span className="flex-1 text-left">{page.label}</span>
                <span className="text-xs text-text-tertiary font-mono">{page.path}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

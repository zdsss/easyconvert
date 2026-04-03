import { useThemeStore } from '@lib/store/themeStore';
import Icon from './ui/Icon';

interface Props {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: Props) {
  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const themeIcon = theme === 'dark' ? 'moon' : theme === 'system' ? 'monitor' : 'sun';

  return (
    <header className="fixed top-0 right-0 left-0 h-14 bg-surface border-b border-border z-50 flex items-center justify-between px-4 md:pl-sidebar">
      {/* Left: mobile menu + search trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden btn-ghost p-1.5"
          aria-label="Toggle menu"
        >
          <Icon name="menu" size={20} />
        </button>

        <button
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-text-tertiary text-sm hover:bg-surface-tertiary transition-colors"
          onClick={() => document.dispatchEvent(new CustomEvent('open-search'))}
        >
          <Icon name="search" size={15} />
          <span>搜索...</span>
          <kbd className="ml-4 px-1.5 py-0.5 rounded bg-surface-tertiary text-xs font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <button className="btn-ghost p-2 rounded-lg" title="通知">
          <Icon name="bell" size={18} />
        </button>

        <button
          onClick={cycleTheme}
          className="btn-ghost p-2 rounded-lg"
          title={`主题: ${theme}`}
        >
          <Icon name={themeIcon} size={18} />
        </button>

        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center ml-1">
          <Icon name="user" size={16} className="text-brand-600 dark:text-brand-400" />
        </div>
      </div>
    </header>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './ui/Icon';

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
  match?: RegExp;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'nav.parse',
    items: [
      { path: '/parse', labelKey: 'nav.parse', icon: 'file-text', match: /^\/parse$/ },
      { path: '/parse/batch', labelKey: 'nav.batch', icon: 'layers', match: /^\/parse\/batch/ },
      { path: '/parse/monitor', labelKey: 'nav.monitor', icon: 'activity', match: /^\/parse\/monitor/ },
      { path: '/parse/history', labelKey: 'nav.history', icon: 'clock', match: /^\/parse\/history/ },
    ],
  },
  {
    titleKey: 'nav.evaluation',
    items: [
      { path: '/evaluation', labelKey: 'nav.evaluation', icon: 'clipboard', match: /^\/evaluation(?!\/new)/ },
      { path: '/evaluation/new', labelKey: 'nav.newEvaluation', icon: 'plus', match: /^\/evaluation\/new/ },
      { path: '/data-flywheel', labelKey: 'nav.dataFlywheel', icon: 'refresh-cw', match: /^\/data-flywheel/ },
      { path: '/prompt-lab', labelKey: 'nav.promptLab', icon: 'settings', match: /^\/prompt-lab/ },
    ],
  },
  {
    titleKey: 'nav.apiOverview',
    items: [
      { path: '/api', labelKey: 'nav.apiOverview', icon: 'globe', match: /^\/api$/ },
      { path: '/api/keys', labelKey: 'nav.apiKeys', icon: 'key', match: /^\/api\/keys/ },
      { path: '/api/usage', labelKey: 'nav.apiUsage', icon: 'bar-chart', match: /^\/api\/usage/ },
      { path: '/tenants', labelKey: 'nav.tenants', icon: 'users', match: /^\/tenants/ },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: Props) {
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (item: NavItem) => {
    if (item.match) return item.match.test(location.pathname);
    return location.pathname === item.path;
  };

  const sidebarContent = (
    <aside
      className={`fixed top-0 left-0 h-screen bg-surface border-r border-border flex flex-col z-40 transition-all duration-200 ease-smooth ${
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      }`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <Link to="/parse" className="flex items-center gap-2.5 overflow-hidden" onClick={onMobileClose}>
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Icon name="zap" size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-text-primary whitespace-nowrap">
              EasyConvert
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.titleKey} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                {t(group.titleKey)}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item);
                const label = t(item.labelKey);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onMobileClose}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ease-smooth ${
                      active
                        ? 'bg-[var(--primary-subtle)] text-brand-700 dark:text-brand-400'
                        : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                    }`}
                    title={collapsed ? label : undefined}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-600 rounded-r" />
                    )}
                    <Icon name={item.icon} size={18} className={active ? 'text-brand-600 dark:text-brand-400' : 'text-text-tertiary'} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border shrink-0 hidden md:block">
        <button
          onClick={() => onCollapse(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:bg-surface-tertiary transition-colors duration-150"
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
        </button>
      </div>
    </aside>
  );

  if (mobileOpen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onMobileClose} />
        <div className="md:hidden">{sidebarContent}</div>
      </>
    );
  }

  return <div className="hidden md:block">{sidebarContent}</div>;
}

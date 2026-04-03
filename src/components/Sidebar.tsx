import { Link, useLocation } from 'react-router-dom';
import Icon from './ui/Icon';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  match?: RegExp;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: '解析',
    items: [
      { path: '/parse', label: '解析简历', icon: 'file-text', match: /^\/parse$/ },
      { path: '/parse/batch', label: '批量处理', icon: 'layers', match: /^\/parse\/batch/ },
      { path: '/parse/monitor', label: '监控仪表盘', icon: 'activity', match: /^\/parse\/monitor/ },
      { path: '/parse/history', label: '解析历史', icon: 'clock', match: /^\/parse\/history/ },
    ],
  },
  {
    title: '评测',
    items: [
      { path: '/evaluation', label: '任务列表', icon: 'clipboard', match: /^\/evaluation(?!\/new)/ },
      { path: '/evaluation/new', label: '新建任务', icon: 'plus', match: /^\/evaluation\/new/ },
      { path: '/data-flywheel', label: '数据飞轮', icon: 'refresh-cw', match: /^\/data-flywheel/ },
      { path: '/prompt-lab', label: '提示词实验室', icon: 'settings', match: /^\/prompt-lab/ },
    ],
  },
  {
    title: 'API 管理',
    items: [
      { path: '/api', label: '概览', icon: 'globe', match: /^\/api$/ },
      { path: '/api/keys', label: 'Keys', icon: 'key', match: /^\/api\/keys/ },
      { path: '/api/usage', label: '用量', icon: 'bar-chart', match: /^\/api\/usage/ },
      { path: '/tenants', label: '租户管理', icon: 'users', match: /^\/tenants/ },
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
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item);
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
                    title={collapsed ? item.label : undefined}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-600 rounded-r" />
                    )}
                    <Icon name={item.icon} size={18} className={active ? 'text-brand-600 dark:text-brand-400' : 'text-text-tertiary'} />
                    {!collapsed && <span>{item.label}</span>}
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
          title={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
          {!collapsed && <span className="text-xs">收起</span>}
        </button>
      </div>
    </aside>
  );

  // Mobile overlay
  if (mobileOpen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onMobileClose} />
        <div className="md:hidden">{sidebarContent}</div>
      </>
    );
  }

  // Desktop
  return <div className="hidden md:block">{sidebarContent}</div>;
}

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Breadcrumb from './Breadcrumb';
import BottomTabBar from './BottomTabBar';
import SearchModal from './SearchModal';

const BREADCRUMB_MAP: Record<string, { label: string; path?: string }[]> = {
  '/parse': [{ label: '解析', path: '/parse' }, { label: '解析简历' }],
  '/parse/batch': [{ label: '解析', path: '/parse' }, { label: '批量处理' }],
  '/parse/monitor': [{ label: '解析', path: '/parse' }, { label: '监控仪表盘' }],
  '/parse/history': [{ label: '解析', path: '/parse' }, { label: '解析历史' }],
  '/evaluation': [{ label: '评测' }, { label: '任务列表' }],
  '/evaluation/new': [{ label: '评测', path: '/evaluation' }, { label: '新建任务' }],
  '/api': [{ label: 'API 管理' }, { label: '概览' }],
  '/api/keys': [{ label: 'API 管理', path: '/api' }, { label: 'Keys' }],
  '/api/usage': [{ label: 'API 管理', path: '/api' }, { label: '用量' }],
};

function getBreadcrumbs(pathname: string) {
  if (BREADCRUMB_MAP[pathname]) return BREADCRUMB_MAP[pathname];
  if (/^\/evaluation\/[^/]+\/report$/.test(pathname)) {
    return [{ label: '评测', path: '/evaluation' }, { label: '任务详情', path: pathname.replace('/report', '') }, { label: '报告' }];
  }
  if (/^\/evaluation\/[^/]+$/.test(pathname)) {
    return [{ label: '评测', path: '/evaluation' }, { label: '任务详情' }];
  }
  return [{ label: '首页' }];
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <TopBar onMenuToggle={() => setMobileOpen(!mobileOpen)} />

      <main
        className={`pt-topbar min-h-screen transition-all duration-200 ease-smooth pb-16 md:pb-0 ${
          collapsed ? 'md:ml-sidebar-collapsed' : 'md:ml-sidebar'
        }`}
      >
        <div className="px-4 md:px-6 pt-4 pb-2">
          <Breadcrumb items={breadcrumbs} />
        </div>
        <div className="max-w-[1280px] mx-auto">
          {children}
        </div>
      </main>

      <BottomTabBar />
      <SearchModal />
    </div>
  );
}

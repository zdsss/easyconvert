import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './ui/Icon';

const TABS = [
  { path: '/parse', label: '解析', icon: 'file-text', match: /^\/parse/ },
  { path: '/evaluation', label: '评测', icon: 'clipboard', match: /^\/evaluation/ },
  { path: '/api', label: 'API', icon: 'globe', match: /^\/api/ },
  { path: '/parse/monitor', label: '监控', icon: 'activity', match: /^\/parse\/monitor/ },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-surface border-t border-border z-40 flex items-center justify-around md:hidden">
      {TABS.map(tab => {
        const active = tab.match.test(location.pathname);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
              active ? 'text-brand-600 dark:text-brand-400' : 'text-text-tertiary'
            }`}
          >
            <Icon name={tab.icon} size={20} />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

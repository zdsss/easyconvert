import { Link } from 'react-router-dom';
import Icon from './ui/Icon';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-tertiary">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <Icon name="chevron-right" size={14} className="text-text-tertiary" />}
            {isLast || !item.path ? (
              <span className={isLast ? 'text-text-primary font-medium' : ''}>{item.label}</span>
            ) : (
              <Link to={item.path} className="hover:text-text-primary transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

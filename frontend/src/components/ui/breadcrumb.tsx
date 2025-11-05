import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("breadcrumb", className)} aria-label="Breadcrumb">
      <div className="breadcrumb-item">
        <Link to="/" className="breadcrumb-link flex items-center hover:text-primary transition-colors">
          <Home className="h-4 w-4" />
        </Link>
      </div>
      {items.map((item, index) => (
        <div key={index} className="breadcrumb-item flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {item.path ? (
            <Link to={item.path} className="breadcrumb-link hover:text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}


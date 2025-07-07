import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path?: string;
  active?: boolean;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  className?: string;
}

const BreadcrumbNavigation = ({ items, className }: BreadcrumbNavigationProps) => {
  return (
    <nav 
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
      aria-label="Breadcrumb navigation"
    >
      <Home className="h-4 w-4" />
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4" />
          <span 
            className={cn(
              "truncate ml-1",
              item.active 
                ? "text-foreground font-medium" 
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={item.active ? "page" : undefined}
          >
            {item.label}
          </span>
        </div>
      ))}
    </nav>
  );
};

export default BreadcrumbNavigation;
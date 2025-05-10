
import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarProps {
  children?: ReactNode;
}

const Sidebar = ({ children }: SidebarProps) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold text-center mb-6">School Admin</h2>
        <nav className="space-y-1">
          {children}
        </nav>
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  to: string;
  icon?: ReactNode;
  children: ReactNode;
}

export const SidebarLink = ({ to, icon, children }: SidebarLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
        isActive 
          ? "bg-gray-100 text-primary" 
          : "text-gray-600 hover:bg-gray-50 hover:text-primary"
      )}
    >
      {icon && <span className="mr-3">{icon}</span>}
      <span>{children}</span>
    </Link>
  );
};

export default Sidebar;

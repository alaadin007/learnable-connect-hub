
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type AdminNavLink = {
  name: string;
  href: string;
};

const defaultNavLinks: AdminNavLink[] = [
  { name: "Dashboard", href: "/admin" },
  { name: "Teacher Management", href: "/admin/teacher-management" },
  { name: "Students", href: "/admin/students" },
  { name: "Analytics", href: "/admin/analytics" },
  { name: "Settings", href: "/admin/settings" },
  { name: "Chat", href: "/chat" },
  { name: "Documents", href: "/documents" },
];

interface AdminNavbarProps {
  navLinks?: AdminNavLink[];
  className?: string;
}

const AdminNavbar = ({ navLinks = defaultNavLinks, className }: AdminNavbarProps) => {
  const location = useLocation();
  
  return (
    <div className={cn("border-b mb-6", className)}>
      <nav className="flex space-x-4 overflow-x-auto pb-2">
        {navLinks.map((link) => {
          // Check if the current path matches this link's path exactly
          // For the dashboard, only highlight when exactly on /admin
          // For other routes, check exact match or if it's a sub-route (starts with the link path + /)
          const isActive = 
            link.href === "/admin"
              ? location.pathname === "/admin"
              : location.pathname === link.href || 
                (location.pathname.startsWith(link.href + "/") && link.href !== "/");
          
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-blue-600"
              )}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminNavbar;


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
  
  // Function to determine if a link is active
  const isLinkActive = (linkHref: string): boolean => {
    // Exact match for dashboard
    if (linkHref === "/admin" && location.pathname === "/admin") {
      return true;
    }
    
    // For other pages, make sure it's not just a prefix match but a proper path segment match
    if (linkHref !== "/admin" && location.pathname.startsWith(linkHref)) {
      // Make sure it's either an exact match or a subpath (with / after the href)
      const remainingPath = location.pathname.slice(linkHref.length);
      return remainingPath === "" || remainingPath.startsWith("/");
    }
    
    return false;
  };
  
  return (
    <div className={cn("border-b mb-6", className)}>
      <nav className="flex space-x-4 overflow-x-auto pb-2">
        {navLinks.map((link) => {
          const active = isLinkActive(link.href);
          
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                active
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

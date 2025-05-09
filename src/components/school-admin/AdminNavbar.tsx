
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
    // Special case for dashboard (exact match only)
    if (linkHref === "/admin" && location.pathname === "/admin") {
      return true;
    }
    
    // For other pages, need to check parent paths
    if (linkHref !== "/admin" && location.pathname.startsWith(linkHref)) {
      // Make sure it's at path boundaries to avoid partial matches
      const remainingPath = location.pathname.slice(linkHref.length);
      return remainingPath === "" || remainingPath.startsWith("/");
    }
    
    return false;
  };
  
  // Extra check to ensure only one link is active when there are multiple matches
  const getActiveLink = (): string => {
    // First look for exact match
    const exactMatch = navLinks.find(link => link.href === location.pathname);
    if (exactMatch) return exactMatch.href;
    
    // If no exact match, get the longest matching prefix (most specific match)
    const matchingLinks = navLinks
      .filter(link => location.pathname.startsWith(link.href))
      .filter(link => {
        // Don't count the admin link as a match for subpages like /admin/settings
        if (link.href === "/admin" && location.pathname !== "/admin") {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.href.length - a.href.length);
    
    return matchingLinks.length > 0 ? matchingLinks[0].href : "";
  };
  
  const activeLink = getActiveLink();
  
  return (
    <div className={cn("border-b mb-6", className)}>
      <nav className="flex space-x-4 overflow-x-auto pb-2">
        {navLinks.map((link) => {
          const active = link.href === activeLink;
          
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

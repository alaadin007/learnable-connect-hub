
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  BarChart2, 
  Settings, 
  MessageSquare, 
  FileText 
} from "lucide-react";

type AdminNavLink = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const defaultNavLinks: AdminNavLink[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Teacher Management", href: "/admin/teacher-management", icon: UserPlus },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart2 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Documents", href: "/documents", icon: FileText },
];

interface AdminNavbarProps {
  navLinks?: AdminNavLink[];
  className?: string;
}

const AdminNavbar = ({ navLinks = defaultNavLinks, className }: AdminNavbarProps) => {
  const location = useLocation();
  
  // Determine the single active link based on current path
  const determineActiveLink = (): string => {
    // Case 1: Exact match for any link (highest priority)
    const exactMatch = navLinks.find(link => link.href === location.pathname);
    if (exactMatch) return exactMatch.href;
    
    // Case 2: Special handling for root admin path
    // Only highlight dashboard when exactly at /admin
    if (location.pathname === "/admin") {
      return "/admin";
    }
    
    // Case 3: Find the most specific path match (longest prefix)
    // Filter out the admin root path when we're on a subpage
    const matchingLinks = navLinks
      .filter(link => {
        // Skip the dashboard link when on subpages
        if (link.href === "/admin" && location.pathname !== "/admin") {
          return false;
        }
        
        return location.pathname.startsWith(link.href);
      })
      .sort((a, b) => b.href.length - a.href.length); // Sort by length descending
    
    return matchingLinks.length > 0 ? matchingLinks[0].href : "";
  };
  
  const activeLink = determineActiveLink();
  
  return (
    <div className={cn("bg-white rounded-lg shadow mb-6", className)}>
      <nav className="flex overflow-x-auto p-1">
        {navLinks.map((link) => {
          const isActive = link.href === activeLink;
          
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap rounded-md",
                isActive
                  ? "bg-blue-50 text-blue-600 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminNavbar;

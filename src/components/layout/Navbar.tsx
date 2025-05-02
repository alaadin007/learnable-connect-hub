
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  
  const isPublicPage = 
    location.pathname === "/" || 
    location.pathname === "/features" || 
    location.pathname === "/pricing" || 
    location.pathname === "/about" || 
    location.pathname === "/contact";
  
  const isAuthPage = 
    location.pathname === "/login" || 
    location.pathname === "/register" ||
    location.pathname === "/school-registration" ||
    location.pathname === "/test-accounts" ||
    location.pathname.startsWith("/invitation/");

  const isLoggedIn = user && !isPublicPage && !isAuthPage;

  const toggleMenu = () => setIsOpen(!isOpen);
  
  const handleLogout = async () => {
    await signOut();
    navigate("/");
    setIsOpen(false);
  };

  const getProfileType = () => {
    if (!profile) return null;
    return profile.user_type;
  };

  const userType = getProfileType();

  // Navigation links based on user type
  const getNavLinks = () => {
    // For the test accounts page, show no navigation
    if (location.pathname === "/test-accounts") {
      return [];
    }
    
    if (!isLoggedIn) {
      return [
        { name: "Home", href: "/" },
        { name: "Features", href: "/features" },
        { name: "Pricing", href: "/pricing" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
      ];
    }

    if (userType === "school") {
      return [
        { name: "Dashboard", href: "/dashboard" },
        { name: "School Admin", href: "/admin" },
        { name: "Teachers", href: "/admin/teacher-management" },
        { name: "Analytics", href: "/admin/analytics" },
        { name: "Chat", href: "/chat" },
        { name: "Documents", href: "/documents" },
      ];
    }

    if (userType === "teacher") {
      return [
        { name: "Dashboard", href: "/dashboard" },
        { name: "Students", href: "/teacher/students" },
        { name: "Analytics", href: "/teacher/analytics" },
        { name: "Chat", href: "/chat" },
        { name: "Documents", href: "/documents" },
      ];
    }

    // Default for students and others
    return [
      { name: "Dashboard", href: "/dashboard" },
      { name: "Chat", href: "/chat" },
      { name: "Documents", href: "/documents" },
    ];
  };

  const navLinks = getNavLinks();
  
  // Check if we're on the test accounts page to hide the entire navbar
  const isTestAccountsPage = location.pathname === "/test-accounts";

  // Fixed helper function to determine if a link is active
  const isActiveLink = (href) => {
    const currentPath = location.pathname;
    
    // Handle dashboard link
    if (href === "/dashboard") {
      return currentPath === "/dashboard";
    }
    
    // Special case for the admin section
    if (href === "/admin") {
      // Only highlight when exactly on /admin page
      return currentPath === "/admin";
    }
    
    // Special case for teacher management
    if (href === "/admin/teacher-management") {
      return currentPath === "/admin/teacher-management";
    }
    
    // Special case for teachers
    if (href === "/admin/teachers") {
      return currentPath === "/admin/teachers";
    }
    
    // Special case for analytics
    if (href === "/admin/analytics") {
      return currentPath === "/admin/analytics";
    }
    
    // Special case for teacher sections
    if (href === "/teacher/students") {
      return currentPath === "/teacher/students";
    }
    
    if (href === "/teacher/analytics") {
      return currentPath === "/teacher/analytics";
    }
    
    // Special case for chat and documents
    if (href === "/chat") {
      return currentPath === "/chat";
    }
    
    if (href === "/documents") {
      return currentPath === "/documents";
    }
    
    // Direct match for other pages
    return currentPath === href;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <span className="ml-2 text-xl font-bold gradient-text">
                LearnAble
              </span>
            </Link>
          </div>

          {/* Mobile menu button - hide on test accounts page */}
          {!isTestAccountsPage && (
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={toggleMenu}>
                {isOpen ? <X /> : <Menu />}
              </Button>
            </div>
          )}

          {/* Desktop navigation - hide on test accounts page */}
          {!isTestAccountsPage && (
            <nav className="hidden md:flex space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "text-learnable-gray hover:text-learnable-blue font-medium",
                    isActiveLink(link.href) && "text-learnable-blue font-bold"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          )}

          {/* Auth buttons - desktop */}
          {!isTestAccountsPage && (
            <div className="hidden md:flex items-center space-x-4">
              {isLoggedIn ? (
                <Button onClick={handleLogout} variant="outline">
                  Log Out
                </Button>
              ) : (
                <>
                  {!isAuthPage && (
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/login")}
                    >
                      Log In
                    </Button>
                  )}
                  {!isAuthPage && (
                    <Button 
                      onClick={() => navigate("/register")}
                    >
                      Get Started
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ top: "64px" }}
      >
        <div className="pt-5 pb-6 px-4 space-y-4 divide-y divide-gray-100">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  "block px-3 py-2 text-base font-medium rounded-md",
                  isActiveLink(link.href)
                    ? "bg-learnable-super-light text-learnable-blue"
                    : "text-learnable-dark hover:bg-learnable-super-light"
                )}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 space-y-4">
            {isLoggedIn ? (
              <Button onClick={handleLogout} variant="outline" className="w-full">
                Log Out
              </Button>
            ) : (
              <>
                {!isAuthPage && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigate("/login");
                      setIsOpen(false);
                    }}
                    className="w-full"
                  >
                    Log In
                  </Button>
                )}
                {!isAuthPage && (
                  <Button 
                    onClick={() => {
                      navigate("/register");
                      setIsOpen(false);
                    }}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

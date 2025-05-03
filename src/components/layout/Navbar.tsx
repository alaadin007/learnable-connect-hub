
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  
  // Check if this is a test account by email or ID pattern
  const isTestAccount = user?.email?.includes('.test@learnable.edu') || 
                     user?.id?.startsWith('test-');
  
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

  const handleBackToTestAccounts = async () => {
    await signOut();
    navigate("/test-accounts");
    setIsOpen(false);
  };

  const getProfileType = () => {
    if (!profile) return null;
    return profile.user_type;
  };

  const userType = getProfileType();

  // Improved navigation function to prevent flickering and redirection loops
  const handleNavigation = (path) => {
    // Don't navigate if already on the same path
    if (location.pathname === path) return;
    
    // Only for dashboard navigation, add special state to prevent redirect loops
    if (path === "/dashboard") {
      navigate(path, { state: { fromNavigation: true } });
    } else if (path === "/admin") {
      navigate(path, { state: { fromNavigation: true } });
    } else {
      navigate(path);
    }
    
    setIsOpen(false);
  };

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

  // Fixed isActiveLink function to correctly handle TypeScript string literal types
  const isActiveLink = (href: string) => {
    const currentPath = location.pathname;
    
    // Special handling for Dashboard link - make it mutually exclusive with School Admin
    if (href === "/dashboard") {
      // Dashboard is active only when exactly on dashboard
      const isDashboardPath = currentPath === "/dashboard";
      const isNotAdminPath = currentPath !== "/admin" && !currentPath.startsWith("/admin/");
      return isDashboardPath && isNotAdminPath;
    }
    
    // Special handling for School Admin link - make it mutually exclusive with Dashboard
    if (href === "/admin") {
      // Admin is active when on any admin page
      const isAdminPath = currentPath === "/admin" || currentPath.startsWith("/admin/");
      const isNotDashboardPath = currentPath !== "/dashboard";
      return isAdminPath && isNotDashboardPath;
    }
    
    // For Teachers menu item
    if (href === "/admin/teacher-management") {
      return currentPath === "/admin/teacher-management" || currentPath === "/admin/teachers";
    }
    
    // For Analytics menu item
    if (href === "/admin/analytics") {
      return currentPath === "/admin/analytics";
    }

    // For other links, exact matching
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
                <button
                  key={link.name}
                  onClick={() => handleNavigation(link.href)}
                  className={cn(
                    "text-learnable-gray hover:text-learnable-blue font-medium",
                    isActiveLink(link.href) && "text-learnable-blue font-bold"
                  )}
                >
                  {link.name}
                </button>
              ))}
            </nav>
          )}

          {/* Auth buttons - desktop */}
          {!isTestAccountsPage && (
            <div className="hidden md:flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  {isTestAccount && (
                    <div className="flex items-center mr-2 px-3 py-1 bg-amber-100 rounded-full">
                      <span className="text-amber-700 text-xs font-medium">Test Account</span>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    {isTestAccount && (
                      <Button 
                        onClick={handleBackToTestAccounts} 
                        variant="outline"
                        size="sm"
                        className="flex items-center text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        Test Accounts
                      </Button>
                    )}
                    <Button 
                      onClick={handleLogout} 
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Log Out
                    </Button>
                  </div>
                </>
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
              <button
                key={link.name}
                onClick={() => handleNavigation(link.href)}
                className={cn(
                  "block w-full text-left px-3 py-2 text-base font-medium rounded-md",
                  isActiveLink(link.href)
                    ? "bg-learnable-super-light text-learnable-blue"
                    : "text-learnable-dark hover:bg-learnable-super-light"
                )}
              >
                {link.name}
              </button>
            ))}
          </div>
          <div className="pt-4 space-y-4">
            {isLoggedIn ? (
              <>
                {isTestAccount && (
                  <div className="mb-2 px-3 py-2 bg-amber-100 rounded-md">
                    <span className="text-amber-700 text-sm font-medium">You're using a test account</span>
                  </div>
                )}
                {isTestAccount && (
                  <Button 
                    onClick={handleBackToTestAccounts} 
                    variant="outline" 
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    Back to Test Accounts
                  </Button>
                )}
                <Button onClick={handleLogout} variant="outline" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </>
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

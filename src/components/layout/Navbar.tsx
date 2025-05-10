import React, { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { isSchoolAdmin, getUserRoleWithFallback } from "@/utils/apiHelpers";

// Define a more complete type for our navigation state
interface NavigationState {
  fromNavigation?: boolean;
  preserveContext?: boolean;
  timestamp?: number;
  schoolAdminReturn?: boolean;
  adminRedirect?: boolean;
  fromTestAccounts?: boolean;
  [key: string]: any; // Allow for additional properties
}

const Navbar = () => {
  const { user, signOut, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMobile = useIsMobile();

  // Set loaded status after initial render to prevent flickering
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Enhanced check for school admin role with immediate action
  useEffect(() => {
    const fallbackRole = getUserRoleWithFallback();
    const effectiveRole = userRole || fallbackRole;
    
    // If school admin is on /dashboard, redirect to /admin immediately
    if (isSchoolAdmin(effectiveRole) && location.pathname === '/dashboard') {
      console.log('NAVBAR: School admin detected on /dashboard, redirecting to /admin');
      // Navigate with proper state to maintain context
      navigate('/admin', { 
        state: { preserveContext: true, adminRedirect: true },
        replace: true
      });
    }
  }, [location.pathname, userRole, navigate]);

  const toggleMenu = () => setIsOpen((open) => !open);

  const handleLogout = useCallback(async () => {
    try {
      console.log("Navbar: Initiating logout");
      await signOut();
      // Always navigate to the home page after logout
      navigate("/", { replace: true }); 
      setIsOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to log out. Please try again.");
    }
  }, [signOut, navigate]);

  const handleBackToTestAccounts = useCallback(async () => {
    try {
      await signOut();
      navigate("/test-accounts", { replace: true });
      setIsOpen(false);
    } catch (error) {
      console.error("Navigation to test accounts failed:", error);
    }
  }, [signOut, navigate]);

  // Get effective user role from context or localStorage
  const fallbackRole = getUserRoleWithFallback();
  const effectiveUserRole = userRole || fallbackRole;
  
  // Make sure this value is correctly calculated based on userRole
  const isAdmin = isSchoolAdmin(effectiveUserRole);
  
  const isTestAccount = user?.email?.includes(".test@learnable.edu") || user?.id?.startsWith("test-");
  const isPublicPage = ["/", "/features", "/pricing", "/about", "/contact"].includes(location.pathname);
  const isAuthPage = ["/login", "/register", "/school-registration", "/test-accounts"].some(path =>
    location.pathname === path || location.pathname.startsWith("/invitation/")
  );
  const isLoggedIn = !!user && !isPublicPage && !isAuthPage;
  const isTestAccountsPage = location.pathname === "/test-accounts";
  const isAdminPage = location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  // Determine default dashboard path based on user role - specifically handling school admin
  const getDashboardPath = useCallback(() => {
    if (isSchoolAdmin(effectiveUserRole)) {
      return '/admin';
    } else if (effectiveUserRole === 'teacher') {
      return '/teacher/analytics';
    } else {
      return '/dashboard';
    }
  }, [effectiveUserRole]);

  // Handle click on logo with role-based navigation while preserving auth state
  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    // Only prevent default if user is logged in
    if (user) {
      e.preventDefault();
      
      // Navigate to the appropriate dashboard based on user role
      navigate(getDashboardPath(), { 
        state: { 
          preserveContext: true, 
          fromNavigation: true,
          timestamp: Date.now()
        } 
      });
    }
    // Otherwise let it navigate to home page normally
  }, [user, navigate, getDashboardPath]);

  // Simplified admin navbar links with more options
  const getSchoolAdminNavLinks = () => {
    return [
      { name: "Teacher Management", href: "/admin/teacher-management" },
      { name: "Students", href: "/admin/students" },
      { name: "Analytics", href: "/admin/analytics" },
      { name: "Settings", href: "/admin/settings" },
    ];
  };

  // Student navigation links
  const getStudentNavLinks = () => {
    return [
      { name: "Dashboard", href: "/dashboard" },
      { name: "Chat with AI", href: "/chat" },
      { name: "Assessments", href: "/student/assessments" },
      { name: "My Progress", href: "/student/progress" },
    ];
  };

  const getNavLinks = useCallback(() => {
    if (isTestAccountsPage) return [];

    if (!isLoggedIn) {
      return [
        { name: "Home", href: "/" },
        { name: "Features", href: "/features" },
        { name: "Pricing", href: "/pricing" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
      ];
    }

    // For school admin role, show expanded admin links
    if (isAdmin) {
      return getSchoolAdminNavLinks();
    } 
    // For teacher role
    else if (effectiveUserRole === "teacher") {
      return [
        { name: "Analytics", href: "/teacher/analytics" },
        { name: "Students", href: "/teacher/students" },
      ];
    } 
    // Student role - show student navigation
    else if (effectiveUserRole === "student") {
      return getStudentNavLinks();
    }
    // Default case
    else {
      return [];
    }
  }, [effectiveUserRole, isLoggedIn, isTestAccountsPage, isAdmin]);

  const isActiveLink = useCallback((href: string): boolean => {
    const currentPath = location.pathname;
    
    // Special case for Dashboard link for school admins
    if (isSchoolAdmin(effectiveUserRole) && href === '/admin' && 
        (currentPath === '/admin' || currentPath.startsWith('/admin/'))) {
      return true;
    }

    // Special case for Dashboard link for other users
    if (href === getDashboardPath() && (currentPath === getDashboardPath() || currentPath.startsWith(`${getDashboardPath()}/`))) {
      return true;
    }

    // Handle other specific paths
    switch (href) {
      case '/chat':
        return currentPath === '/chat';
      case '/student/assessments':
        return currentPath === '/student/assessments';
      case '/student/progress':
        return currentPath === '/student/progress';
      default:
        return currentPath === href;
    }
  }, [location.pathname, getDashboardPath, effectiveUserRole]);

  // Enhanced navigation handler with school admin check
  const handleNavigation = useCallback((path: string) => {
    if (location.pathname === path) {
      setIsOpen(false);
      return;
    }
    
    // Create navigation state with proper typing
    const navState: NavigationState = {
      fromNavigation: true,
      preserveContext: true,
      timestamp: Date.now()
    };
    
    // If we're a school admin, add the return flag
    if (isAdmin) {
      navState.schoolAdminReturn = true;
      
      // Force redirection to /admin if trying to access dashboard
      if (path === "/dashboard") {
        path = "/admin";
        navState.adminRedirect = true;
      }
    }
    
    navigate(path, { state: navState });
    setIsOpen(false);
  }, [location.pathname, navigate, isAdmin]);

  // Don't render until we've determined loading state to prevent flickering
  if (!isLoaded) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <span className="ml-2 text-xl font-bold gradient-text">LearnAble</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            {user ? (
              // For logged-in users, use onClick handler to preserve context
              <button 
                onClick={handleLogoClick}
                className="flex items-center text-left"
              >
                <span className="ml-2 text-xl font-bold gradient-text">LearnAble</span>
              </button>
            ) : (
              // For non-logged in users, use regular Link
              <Link to="/" className="flex items-center">
                <span className="ml-2 text-xl font-bold gradient-text">LearnAble</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMenu}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X /> : <Menu />}
            </Button>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex space-x-8">
            {getNavLinks().map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavigation(link.href)}
                className={cn(
                  "text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 px-4 py-2 rounded-md",
                  isActiveLink(link.href) && "text-blue-600 font-semibold"
                )}
              >
                {link.name}
              </button>
            ))}
          </nav>

          {/* Authentication buttons */}
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
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/login")}
                    >
                      Log In
                    </Button>
                    <Button 
                      onClick={() => navigate("/register")}
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden pt-16",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        <div className="px-4 space-y-4 divide-y divide-gray-100 h-full overflow-y-auto">
          <div className="space-y-1 py-4">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavigation(link.href)}
                className={cn(
                  "block w-full text-left px-3 py-2 text-base font-medium rounded-md",
                  isActiveLink(link.href)
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
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
                  <div className="mb-2 px-3 py-2 bg-amber-100 rounded-md text-amber-700 text-sm font-medium">
                    You're using a test account
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
                <Button onClick={handleLogout} variant="outline" className="w-full flex items-center justify-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </>
            ) : (
              <>
                {!isAuthPage && (
                  <>
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
                    <Button 
                      onClick={() => {
                        navigate("/register");
                        setIsOpen(false);
                      }}
                      className="w-full"
                    >
                      Get Started
                    </Button>
                  </>
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

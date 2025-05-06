
import React, { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRBAC } from "@/contexts/RBACContext";

const Navbar = () => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMobile = useIsMobile();
  const { hasRole, hasAnyRole } = useRBAC();

  // Set loaded status after initial render to prevent flickering
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const toggleMenu = () => setIsOpen((open) => !open);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/");
    setIsOpen(false);
  }, [signOut, navigate]);

  const handleBackToTestAccounts = useCallback(async () => {
    await signOut();
    navigate("/test-accounts");
    setIsOpen(false);
  }, [signOut, navigate]);

  const isTestAccount = user?.email?.includes(".test@learnable.edu") || user?.id?.startsWith("test-");
  const isPublicPage = ["/", "/features", "/pricing", "/about", "/contact"].includes(location.pathname);
  const isAuthPage = ["/login", "/register", "/school-registration", "/test-accounts"].some(path =>
    location.pathname === path || location.pathname.startsWith("/invitation/")
  );
  const isLoggedIn = !!user && !isPublicPage && !isAuthPage;

  const profileUserType = profile?.user_type ?? null;

  const isTestAccountsPage = location.pathname === "/test-accounts";

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

    // Use RBAC to determine navigation links
    const links = [
      { name: "Dashboard", href: "/dashboard" },
    ];

    // School admin links
    if (hasRole('school_admin')) {
      links.push(
        { name: "School Admin", href: "/admin" },
        { name: "Teachers", href: "/admin/teacher-management" },
        { name: "Students", href: "/admin/students" },
        { name: "Analytics", href: "/admin/analytics" }
      );
    }

    // Teacher links (both regular and supervisors)
    if (hasAnyRole(['teacher', 'teacher_supervisor'])) {
      links.push(
        { name: "Students", href: "/teacher/students" },
        { name: "Analytics", href: "/teacher/analytics" }
      );
    }

    // Student links
    if (hasRole('student')) {
      links.push(
        { name: "Assessments", href: "/student/assessments" },
        { name: "Progress", href: "/student/progress" }
      );
    }

    // Common links for all authenticated users
    links.push(
      { name: "Chat", href: "/chat" },
      { name: "Documents", href: "/documents" }
    );

    return links;
  }, [isLoggedIn, isTestAccountsPage, hasRole, hasAnyRole]);

  const navLinks = getNavLinks();

  const isActiveLink = useCallback((href: string): boolean => {
    const currentPath = location.pathname;

    // Special case for admin/students path
    if (href === "/admin/students" && currentPath === "/admin/students") {
      return true;
    }

    // Check if the path starts with the href for students links
    if (href === "/teacher/students" && currentPath.startsWith("/teacher/students")) {
      return true;
    }

    switch (href) {
      case "/dashboard":
        return currentPath === "/dashboard";
      case "/admin":
        // Active for /admin exactly but not for known subpaths handled separately
        return currentPath === "/admin";
      case "/admin/teacher-management":
        return currentPath === "/admin/teacher-management" || currentPath === "/admin/teachers";
      case "/admin/analytics":
        return currentPath === "/admin/analytics";
      case "/teacher/analytics":
        return currentPath === "/teacher/analytics";
      case "/chat":
        return currentPath === "/chat" || currentPath.startsWith("/chat/");
      case "/documents":
        return currentPath === "/documents" || currentPath.startsWith("/documents/");
      default:
        return currentPath === href;
    }
  }, [location.pathname]);

  // Fixed navigation handler - use Link components instead of manual navigation
  const handleNavigation = useCallback((path: string) => {
    if (path === location.pathname) {
      setIsOpen(false);
      return;
    }
    
    navigate(path, { 
      state: { 
        fromNavigation: true,
        preserveContext: true,
        timestamp: Date.now() // Add timestamp to ensure state is unique
      } 
    });
    setIsOpen(false);
  }, [location.pathname, navigate]);

  if (isTestAccountsPage) {
    // optionally hide navbar entirely on test accounts page:
    return null;
  }

  // Don't render until we've determined loading state to prevent flickering
  if (!isLoaded) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Minimal placeholder during initial load */}
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
            <Link to="/" className="flex items-center">
              <span className="ml-2 text-xl font-bold gradient-text">LearnAble</span>
            </Link>
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

          {/* Desktop nav - Using Link components directly instead of buttons */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  "text-learnable-gray hover:text-learnable-blue font-medium transition-colors duration-200",
                  isActiveLink(link.href) && "text-learnable-blue font-bold"
                )}
              >
                {link.name}
              </Link>
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

      {/* Mobile menu - Also using Link components directly */}
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
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  "block w-full text-left px-3 py-2 text-base font-medium rounded-md",
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

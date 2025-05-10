import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown,
  Menu,
  X,
  User,
  LogOut,
  BookOpen,
  MessageSquare,
  Settings,
  BarChart,
  Users,
  FileText,
  Home,
  GraduationCap,
  Coffee,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isSchoolAdmin, getUserRoleWithFallback } from "@/utils/apiHelpers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { UserRole } from "@/components/auth/ProtectedRoute";

const Navbar: React.FC = () => {
  const { user, userRole, profile, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get effective user role, fallback to stored role if context hasn't loaded yet
  const fallbackRole = getUserRoleWithFallback();
  const effectiveRole = userRole || fallbackRole;
  const isAdmin = isSchoolAdmin(effectiveRole as UserRole);
  
  const handleSignOut = async () => {
    try {
      await signOut();
      // No need to navigate, AuthContext will handle this
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out. Please try again.");
    }
  };

  // Define navigation links based on user role
  const getNavLinks = () => {
    // Default links for all users
    const links = [
      { to: "/", label: "Home", icon: <Home className="mr-2 h-4 w-4" /> }
    ];
    
    // Admin-specific links
    if (isAdmin) {
      return [
        { to: "/admin", label: "Dashboard", icon: <BarChart className="mr-2 h-4 w-4" /> },
        { to: "/admin/teachers", label: "Teachers", icon: <GraduationCap className="mr-2 h-4 w-4" /> },
        { to: "/admin/students", label: "Students", icon: <Users className="mr-2 h-4 w-4" /> },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="mr-2 h-4 w-4" /> },
        { to: "/documents", label: "Documents", icon: <FileText className="mr-2 h-4 w-4" /> }
      ];
    }
    
    // Teacher-specific links
    if (effectiveRole === "teacher") {
      return [
        { to: "/teacher/analytics", label: "Analytics", icon: <BarChart className="mr-2 h-4 w-4" /> },
        { to: "/teacher/students", label: "Students", icon: <Users className="mr-2 h-4 w-4" /> },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="mr-2 h-4 w-4" /> },
        { to: "/documents", label: "Documents", icon: <FileText className="mr-2 h-4 w-4" /> }
      ];
    }
    
    // Student-specific links
    if (effectiveRole === "student") {
      return [
        { to: "/dashboard", label: "Dashboard", icon: <Home className="mr-2 h-4 w-4" /> },
        { to: "/student/lectures", label: "Lectures", icon: <BookOpen className="mr-2 h-4 w-4" /> },
        { to: "/student/assessments", label: "Assessments", icon: <FileText className="mr-2 h-4 w-4" /> },
        { to: "/student/progress", label: "Progress", icon: <BarChart className="mr-2 h-4 w-4" /> },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="mr-2 h-4 w-4" /> },
        { to: "/documents", label: "Documents", icon: <FileText className="mr-2 h-4 w-4" /> }
      ];
    }
    
    return links;
  };
  
  const navLinks = getNavLinks();

  // Toggle the mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close the menu when a link is clicked or location changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="relative">
                <div className="h-10 w-10 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  L
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-800 hidden sm:block">
                Learnable
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex md:items-center space-x-1">
            {user && navLinks.map((link, index) => (
              <Link
                key={index}
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === link.to
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Help and Resources */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Resources
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Link to="/about" className="flex w-full">
                    About Learnable
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/features" className="flex w-full">
                    Features
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/contact" className="flex w-full">
                    Contact Us
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {!user ? (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  className="px-3 py-2"
                  onClick={() => navigate("/login")}
                >
                  Log in
                </Button>
                <Button
                  className="px-3 py-2 gradient-bg"
                  onClick={() => navigate("/register")}
                >
                  Sign up
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {profile?.full_name || "Account"}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium text-gray-900">
                    {profile?.full_name || "User"}
                  </div>
                  <div className="px-2 py-1.5 text-xs text-gray-500 truncate">
                    {user?.email || ""}
                  </div>
                  <DropdownMenuSeparator />
                  {effectiveRole === "student" && (
                    <DropdownMenuItem>
                      <Link to="/student/settings" className="flex w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {effectiveRole === "teacher" && (
                    <DropdownMenuItem>
                      <Link to="/school/settings" className="flex w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link to="/school/settings" className="flex w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        School Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {/* Show test accounts option */}
                  <DropdownMenuItem>
                    <Link to="/test-accounts" className="flex w-full">
                      <Coffee className="mr-2 h-4 w-4" />
                      Test Accounts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700"
              onClick={toggleMenu}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="md:hidden bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {user && navLinks.map((link, index) => (
              <Link
                key={index}
                to={link.to}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === link.to
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center">
                  {link.icon}
                  {link.label}
                </div>
              </Link>
            ))}

            {!user ? (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                {effectiveRole === "student" && (
                  <Link
                    to="/student/settings"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </div>
                  </Link>
                )}
                {(effectiveRole === "teacher" || isAdmin) && (
                  <Link
                    to="/school/settings"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      {isAdmin ? "School Settings" : "Settings"}
                    </div>
                  </Link>
                )}
                {/* Test accounts link */}
                <Link
                  to="/test-accounts"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <Coffee className="mr-2 h-4 w-4" />
                    Test Accounts
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  <div className="flex items-center">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

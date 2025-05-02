
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
  
  // Check if we're on a page that should never show the logged-in state
  // like the homepage, even if there's a session in localStorage
  const isPublicPage = 
    location.pathname === "/" || 
    location.pathname === "/features" || 
    location.pathname === "/pricing" || 
    location.pathname === "/about" || 
    location.pathname === "/contact";

  // Only consider the user as logged in if they have a session AND we're not on a public landing page
  const isLoggedIn = user && !isPublicPage;

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

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              {isOpen ? <X /> : <Menu />}
            </Button>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-learnable-gray hover:text-learnable-blue font-medium"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Auth buttons - desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <Button onClick={handleLogout} variant="outline">
                Log Out
              </Button>
            ) : (
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
          </div>
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
                className="block px-3 py-2 text-base font-medium text-learnable-dark hover:bg-learnable-super-light rounded-md"
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

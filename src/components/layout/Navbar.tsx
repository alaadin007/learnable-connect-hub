
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user, profile, signOut } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-learnable-light-gray sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold gradient-text">LearnAble</span>
            </Link>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <Link
                to="/features"
                className="text-learnable-gray hover:text-learnable-blue transition-colors border-transparent inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Features
              </Link>
              <Link
                to="/pricing"
                className="text-learnable-gray hover:text-learnable-blue transition-colors border-transparent inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Pricing
              </Link>
              <Link
                to="/about"
                className="text-learnable-gray hover:text-learnable-blue transition-colors border-transparent inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-learnable-gray hover:text-learnable-blue transition-colors border-transparent inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Contact
              </Link>
              {user && (
                <Link
                  to="/dashboard"
                  className="text-learnable-blue hover:text-learnable-dark-blue transition-colors border-learnable-blue border-b-2 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user ? (
              <>
                <span className="text-learnable-gray">
                  {profile?.full_name || user.email}
                </span>
                <Button 
                  variant="outline"
                  className="text-learnable-gray hover:text-learnable-blue flex items-center space-x-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-learnable-gray hover:text-learnable-blue">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild className="gradient-bg text-white">
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-learnable-gray hover:text-learnable-blue focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-4 space-y-1">
            <Link
              to="/features"
              className="block pl-3 pr-4 py-2 text-base font-medium text-learnable-gray hover:bg-learnable-super-light hover:text-learnable-blue"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="block pl-3 pr-4 py-2 text-base font-medium text-learnable-gray hover:bg-learnable-super-light hover:text-learnable-blue"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              to="/about"
              className="block pl-3 pr-4 py-2 text-base font-medium text-learnable-gray hover:bg-learnable-super-light hover:text-learnable-blue"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/contact"
              className="block pl-3 pr-4 py-2 text-base font-medium text-learnable-gray hover:bg-learnable-super-light hover:text-learnable-blue"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className="block pl-3 pr-4 py-2 text-base font-medium text-learnable-blue hover:bg-learnable-super-light"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
            <div className="pt-4 pb-2 border-t border-learnable-light-gray">
              {user ? (
                <>
                  <div className="flex items-center px-3 py-2">
                    <User className="h-5 w-5 mr-2 text-learnable-blue" />
                    <span className="text-sm font-medium text-learnable-gray">
                      {profile?.full_name || user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full pl-3 pr-4 py-2 text-base font-medium text-learnable-gray hover:bg-learnable-super-light hover:text-learnable-blue"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block pl-3 pr-4 py-2 text-base font-medium text-learnable-gray hover:bg-learnable-super-light hover:text-learnable-blue"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="block pl-3 pr-4 py-2 text-base font-medium text-white bg-learnable-blue hover:bg-learnable-light-blue mx-3 my-2 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

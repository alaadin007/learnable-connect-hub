
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User } from "lucide-react";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getUserMenu = (profile: any) => {
    if (!profile) return [];
    
    const userType = profile.user_type;
    const menuItems = [];
    
    if (userType === 'school' || userType === 'school_admin') {
      menuItems.push({ label: 'Admin Panel', href: '/admin' });
      menuItems.push({ label: 'Teacher Management', href: '/admin/teacher-management' });
      menuItems.push({ label: 'Analytics', href: '/admin/analytics' });
    } else if (userType === 'teacher') {
      menuItems.push({ label: 'Dashboard', href: '/dashboard' });
      menuItems.push({ label: 'Student Management', href: '/teacher/students' });
      menuItems.push({ label: 'Analytics', href: '/teacher/analytics' });
    } else if (userType === 'student') {
      menuItems.push({ label: 'Dashboard', href: '/dashboard' });
      menuItems.push({ label: 'Chat with AI', href: '/chat' });
    }
    
    menuItems.push({ label: 'Sign Out', href: '#', action: 'signOut' });
    
    return menuItems;
  };

  return (
    <nav className="bg-white py-4 shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          Learnable
        </Link>
        <div className="flex items-center space-x-6">
          <Link to="/about" className="text-gray-600 hover:text-gray-800">
            About
          </Link>
          <Link to="/contact" className="text-gray-600 hover:text-gray-800">
            Contact
          </Link>
          {!user ? (
            <div className="space-x-3">
              <Link to="/login">
                <Button variant="outline">Log In</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-blue-600 hover:bg-blue-700">Sign Up</Button>
              </Link>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {profile?.full_name?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {getUserMenu(profile).map((item, index) => (
                  <DropdownMenuItem key={index} onClick={item.action === 'signOut' ? handleSignOut : () => navigate(item.href)}>
                    {item.label === 'Sign Out' ? <LogOut className="mr-2 h-4 w-4" /> : item.label === 'Settings' ? <Settings className="mr-2 h-4 w-4" /> : <User className="mr-2 h-4 w-4" />}
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, BarChart3, FolderOpen } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IL</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Internal Link Tool</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/dashboard"
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <BarChart3 size={18} />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/projects"
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <FolderOpen size={18} />
              <span>Projects</span>
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.plan} Plan</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to="/profile"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Profile"
              >
                <User size={18} />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-4 py-2 flex justify-around">
          <Link
            to="/dashboard"
            className="flex flex-col items-center space-y-1 text-gray-700 hover:text-primary-600 transition-colors"
          >
            <BarChart3 size={18} />
            <span className="text-xs">Dashboard</span>
          </Link>
          <Link
            to="/projects"
            className="flex flex-col items-center space-y-1 text-gray-700 hover:text-primary-600 transition-colors"
          >
            <FolderOpen size={18} />
            <span className="text-xs">Projects</span>
          </Link>
          <Link
            to="/profile"
            className="flex flex-col items-center space-y-1 text-gray-700 hover:text-primary-600 transition-colors"
          >
            <User size={18} />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

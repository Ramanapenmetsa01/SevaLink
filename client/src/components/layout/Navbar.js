import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
// import { useTheme } from '../../contexts/ThemeContext'; // Commented out for now

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  // const { theme, toggleTheme } = useTheme(); // Commented out for now
  const navigate = useNavigate();
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: null },
    { name: 'Services', path: '#services', icon: null },
    { name: 'About', path: '#about', icon: null },
    { name: 'Contact', path: '#contact', icon: null },
  ];



  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-md shadow-2xl border-b border-purple-500/30'
          : 'bg-gradient-to-r from-slate-900/80 via-purple-900/80 to-slate-900/80 backdrop-blur-sm'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-18 lg:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"
            >
              <span className="text-white font-bold text-lg lg:text-xl">S</span>
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-xl lg:text-2xl font-bold font-display bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                SevaLink
              </h1>
              <p className="text-xs text-gray-300 -mt-1">Community Portal</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-lg font-semibold transition-colors duration-200 hover:text-purple-400 ${
                  location.pathname === link.path
                    ? 'text-purple-400'
                    : 'text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden lg:flex items-center space-x-6">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="px-8 py-3 text-lg font-semibold rounded-xl transition-all duration-200 text-white hover:text-purple-300"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {user?.name}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-white" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-md rounded-xl shadow-xl border border-purple-500/30"
                    >
                      <div className="p-2">
                        <Link
                          to="/dashboard"
                          className="block px-4 py-3 text-sm text-white hover:bg-purple-500/20 hover:text-purple-300 rounded-lg transition-colors duration-200"
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/profile"
                          className="block px-4 py-3 text-sm text-white hover:bg-purple-500/20 hover:text-purple-300 rounded-lg transition-colors duration-200"
                        >
                          Profile
                        </Link>
                        <hr className="my-2" />
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                        >
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg transition-colors duration-200 text-white hover:bg-white/10"
          >
            {isOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-t border-purple-500/30 shadow-lg"
            >
              <div className="p-4 space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="block text-white hover:text-purple-400 font-medium transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                ))}
                
                <hr className="my-4" />
                
                {!isAuthenticated ? (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="block w-full text-center py-3 text-white border border-white/30 rounded-lg hover:bg-white/10 font-semibold transition-colors duration-200"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="block w-full text-center py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 font-semibold transition-colors duration-200"
                    >
                      Get Started
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/dashboard"
                      className="block text-white hover:text-purple-400 font-medium transition-colors duration-200"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="block text-white hover:text-purple-400 font-medium transition-colors duration-200"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left text-red-400 hover:text-red-300 font-medium transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;

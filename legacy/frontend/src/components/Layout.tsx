import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, BookOpen, LogIn, LogOut, User, Layout as LayoutIcon, Menu, X } from 'lucide-react';

export default function Layout() {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Check if current page is a dashboard page
  const isDashboardPage = location.pathname.includes('/dashboard') || 
                          location.pathname.includes('/achievements') ||
                          location.pathname.includes('/bookmarks') ||
                          location.pathname.includes('/resources') ||
                          location.pathname.includes('/assignments/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0" onClick={closeMobileMenu}>
              <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EduQuiz Platform
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link to="/" className="text-slate-700 hover:text-blue-600 transition font-medium">
                Quiz Challenge
              </Link>
              <Link to="/courses" className="text-slate-700 hover:text-blue-600 transition font-medium flex items-center space-x-1">
                <BookOpen className="h-4 w-4" />
                <span>Courses</span>
              </Link>

              {user && profile ? (
                <>
                  {profile.role === 'student' && (
                    <Link to="/student/dashboard" className="text-slate-700 hover:text-blue-600 transition font-medium flex items-center space-x-1">
                      <LayoutIcon className="h-4 w-4" />
                      <span>My Dashboard</span>
                    </Link>
                  )}
                  {profile.role === 'teacher' && (
                    <Link to="/teacher/dashboard" className="text-slate-700 hover:text-blue-600 transition font-medium flex items-center space-x-1">
                      <LayoutIcon className="h-4 w-4" />
                      <span>Teacher Dashboard</span>
                    </Link>
                  )}
                  {profile.role === 'admin' && (
                    <Link to="/admin/dashboard" className="text-slate-700 hover:text-blue-600 transition font-medium flex items-center space-x-1">
                      <LayoutIcon className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700">{profile.full_name || profile.email}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
                        {profile.role}
                      </span>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center space-x-1 text-slate-700 hover:text-red-600 transition"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button - Only show on dashboard pages */}
            {isDashboardPage && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6 text-slate-700" />
                ) : (
                  <Menu className="h-6 w-6 text-slate-700" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu - Only show on dashboard pages */}
        {mobileMenuOpen && isDashboardPage && (
          <div className="lg:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className="block py-2 px-3 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
              >
                Quiz Challenge
              </Link>
              <Link
                to="/courses"
                onClick={closeMobileMenu}
                className="flex items-center space-x-2 py-2 px-3 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
              >
                <BookOpen className="h-5 w-5" />
                <span>Courses</span>
              </Link>

              {user && profile ? (
                <>
                  {profile.role === 'student' && (
                    <Link
                      to="/student/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center space-x-2 py-2 px-3 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      <LayoutIcon className="h-5 w-5" />
                      <span>My Dashboard</span>
                    </Link>
                  )}
                  {profile.role === 'teacher' && (
                    <Link
                      to="/teacher/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center space-x-2 py-2 px-3 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      <LayoutIcon className="h-5 w-5" />
                      <span>Teacher Dashboard</span>
                    </Link>
                  )}
                  {profile.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center space-x-2 py-2 px-3 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      <LayoutIcon className="h-5 w-5" />
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <div className="flex items-center space-x-2 py-2 px-3 bg-slate-50 rounded-lg mb-2">
                      <User className="h-5 w-5 text-slate-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{profile.full_name || profile.email}</p>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize inline-block mt-1">
                          {profile.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        closeMobileMenu();
                      }}
                      className="w-full flex items-center space-x-2 py-2 px-3 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <main>
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-300 py-6 sm:py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm sm:text-base">2025 EduQuiz Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

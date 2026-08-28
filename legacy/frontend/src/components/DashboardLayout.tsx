import { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import StudentDrawer from './drawer/StudentDrawer';
import TeacherDrawer from './drawer/TeacherDrawer';
import AdminDrawer from './drawer/AdminDrawer';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const renderDrawer = () => {
    switch (profile?.role) {
      case 'student':
        return <StudentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />;
      case 'teacher':
        return <TeacherDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />;
      case 'admin':
        return <AdminDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Header with Drawer Toggle */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Toggle navigation drawer"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-900">
                {profile?.role === 'student' && 'Student Dashboard'}
                {profile?.role === 'teacher' && 'Teacher Dashboard'}
                {profile?.role === 'admin' && 'Admin Dashboard'}
              </h1>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {profile?.role}
                </p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Drawer (Visible on Large Screens) */}
      <div className="hidden lg:block">
        <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full overflow-hidden">
            {renderDrawer()}
          </div>
        </div>
        <div className={`transition-all duration-300 ease-in-out ${
          isDrawerOpen ? 'ml-64' : 'ml-0'
        }`}>
          {/* Desktop content with drawer offset */}
          <div className="h-[calc(100vh-4rem)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay and Drawer */}
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawerOpen(false);
            }}
          />
          
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out">
            {renderDrawer()}
          </div>
        </>
      )}

      {/* Mobile Content (without drawer) */}
      <div className="lg:hidden">
        <div className="h-[calc(100vh-4rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

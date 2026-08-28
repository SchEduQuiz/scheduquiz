import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { X, LogOut } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Award,
  FolderOpen,
  Megaphone,
  User,
  GraduationCap,
  MessageSquare
} from 'lucide-react';

interface TeacherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherDrawer({ isOpen, onClose }: TeacherDrawerProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/teacher/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/teacher/dashboard'
    },
    {
      name: 'My Courses',
      href: '/teacher/dashboard?tab=courses',
      icon: BookOpen,
      current: location.pathname === '/teacher/dashboard' && location.search.includes('tab=courses')
    },
    {
      name: 'Assignments',
      href: '/teacher/dashboard?tab=assignments',
      icon: FileText,
      current: location.pathname === '/teacher/dashboard' && location.search.includes('tab=assignments')
    },
    {
      name: 'Pending Grading',
      href: '/teacher/dashboard?tab=submissions',
      icon: Award,
      current: location.pathname === '/teacher/dashboard' && location.search.includes('tab=submissions')
    },
    {
      name: 'Course Resources',
      href: '/teacher/dashboard?tab=resources',
      icon: FolderOpen,
      current: location.pathname === '/teacher/dashboard' && location.search.includes('tab=resources')
    },
    {
      name: 'Announcements',
      href: '/teacher/dashboard?tab=announcements',
      icon: Megaphone,
      current: location.pathname === '/teacher/dashboard' && location.search.includes('tab=announcements')
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      current: location.pathname.startsWith('/messages')
    },
  ];



  const handleNavigation = (href: string) => {
    // Close drawer on mobile when navigation item is clicked
    if (window.innerWidth < 1024) {
      onClose();
    }
    // Small delay to allow drawer to close before navigation
    setTimeout(() => {
      navigate(href);
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-lg">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-800">EduQuiz</h1>
            <p className="text-xs text-slate-500">Teacher Portal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close navigation drawer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-slate-200 bg-purple-50">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.full_name || 'Teacher'}
            </p>
            <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`
                w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${item.current
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <Icon className={`mr-3 h-5 w-5 ${item.current ? 'text-purple-600' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-200 space-y-1">
        <button
          onClick={signOut}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-slate-400" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

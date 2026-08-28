import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { X, LogOut } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  Bookmark,
  FolderOpen,
  User,
  GraduationCap,
  Medal,
  MessageSquare
} from 'lucide-react';

interface StudentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentDrawer({ isOpen, onClose }: StudentDrawerProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/student/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/student/dashboard'
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: BookOpen,
      current: location.pathname.startsWith('/courses')
    },
    {
      name: 'Assignments',
      href: '/student/dashboard?tab=assignments',
      icon: FileText,
      current: location.pathname === '/student/dashboard' && location.search.includes('tab=assignments')
    },
    {
      name: 'Recent Grades',
      href: '/student/dashboard?tab=grades',
      icon: Award,
      current: location.pathname === '/student/dashboard' && location.search.includes('tab=grades')
    },
    {
      name: 'Achievements',
      href: '/student/achievements',
      icon: Medal,
      current: location.pathname === '/student/achievements'
    },
    {
      name: 'Bookmarks',
      href: '/student/bookmarks',
      icon: Bookmark,
      current: location.pathname === '/student/bookmarks'
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      current: location.pathname.startsWith('/messages')
    },
    {
      name: 'Course Resources',
      href: '/student/resources',
      icon: FolderOpen,
      current: location.pathname === '/student/resources'
    }
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
    // Close drawer on mobile when navigation item is clicked
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-lg">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-800">EduQuiz</h1>
            <p className="text-xs text-slate-500">Student Portal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors lg:hidden"
          aria-label="Close navigation drawer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-slate-200 bg-blue-50">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.full_name || 'Student'}
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
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <Icon className={`mr-3 h-5 w-5 ${item.current ? 'text-blue-600' : 'text-slate-400'}`} />
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

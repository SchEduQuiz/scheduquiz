import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { X, LogOut } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Activity,
  Settings,
  Shield,
  User,
  GraduationCap,
  MessageSquare,
  TestTube
} from 'lucide-react';

interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDrawer({ isOpen, onClose }: AdminDrawerProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/admin/dashboard' && !location.search
    },
    {
      name: 'User Management',
      href: '/admin/dashboard?tab=users',
      icon: Users,
      current: location.pathname === '/admin/dashboard' && location.search.includes('tab=users')
    },
    {
      name: 'Question Management',
      href: '/admin/dashboard?tab=questions',
      icon: GraduationCap,
      current: location.pathname === '/admin/dashboard' && location.search.includes('tab=questions')
    },
    {
      name: 'Bulk Operations',
      href: '/admin/dashboard?tab=bulk',
      icon: Settings,
      current: location.pathname === '/admin/dashboard' && location.search.includes('tab=bulk')
    },
    {
      name: 'Password Resets',
      href: '/admin/dashboard?tab=password-resets',
      icon: Shield,
      current: location.pathname === '/admin/dashboard' && location.search.includes('tab=password-resets')
    },
    {
      name: 'Platform Analytics',
      href: '/admin/dashboard?tab=analytics',
      icon: BarChart3,
      current: location.pathname === '/admin/dashboard' && location.search.includes('tab=analytics')
    },
    {
      name: 'Activity Logs',
      href: '/admin/dashboard?tab=activity',
      icon: Activity,
      current: location.pathname === '/admin/dashboard' && location.search.includes('tab=activity')
    },
    {
      name: 'System Settings',
      href: '/admin/dashboard?tab=system',
      icon: Settings,
      current: location.pathname === '/admin/dashboard' && location.search.includes('tab=system')
    },
    {
      name: 'Dashboard Testing',
      href: '/admin/test',
      icon: TestTube,
      current: location.pathname === '/admin/test'
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      current: location.pathname.startsWith('/messages')
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
          <Shield className="h-8 w-8 text-orange-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-800">EduQuiz</h1>
            <p className="text-xs text-slate-500">Admin Portal</p>
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
      <div className="p-4 border-b border-slate-200 bg-orange-50">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-orange-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.full_name || 'Administrator'}
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
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <Icon className={`mr-3 h-5 w-5 ${item.current ? 'text-orange-600' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span>System Online</span>
        </div>
      </div>

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

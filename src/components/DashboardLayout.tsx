import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useNotifications } from './NotificationProvider';
import { Dog, Home, Calendar, CreditCard, MessageSquare, User, LogOut, PawPrint, LayoutDashboard, Users, Settings, Moon, Sun, Bell, Workflow } from 'lucide-react';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const { unreadCount, inboxUnreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  const customerLinks = [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/pets', icon: PawPrint, label: 'My Pets' },
    { to: '/book', icon: Calendar, label: 'Book Appointment' },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const WorkflowIcon = Workflow;

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/admin/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/admin/customers', icon: Users, label: 'Customers' },
    { to: '/admin/services', icon: Settings, label: 'Services' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
    { to: '/admin/automation', icon: WorkflowIcon, label: 'Automation' },
    { to: '/admin/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const links = isAdmin ? adminLinks : customerLinks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border-b-2 border-pink-100 dark:border-gray-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-2 rounded-xl">
                <Dog className="w-7 h-7 text-white" />
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-pink-600 to-blue-500 bg-clip-text text-transparent">Groomy Paws</span>
            </Link>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                type="button"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-3">
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url.startsWith('http') 
                      ? user.profile_picture_url 
                      : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${user.profile_picture_url}`}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-pink-200 dark:border-pink-500 shadow-md"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-avatar')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 dark:from-pink-900 dark:to-blue-900 flex items-center justify-center border-2 border-pink-200 dark:border-pink-500 fallback-avatar';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 dark:from-pink-900 dark:to-blue-900 flex items-center justify-center border-2 border-pink-200 dark:border-pink-500">
                    <User className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">{user?.name}</span>
                  {isAdmin && (
                    <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-full font-bold">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 space-y-2 border border-pink-100 dark:border-gray-700 transition-colors duration-200">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                const isMessagesLink = link.to === '/messages' || link.to === '/admin/messages';
                const isNotificationsLink = link.to === '/notifications';
                const badgeCount = isMessagesLink
                  ? unreadCount
                  : isNotificationsLink
                  ? inboxUnreadCount
                  : 0;
                const showBadge = badgeCount > 0;
                
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all relative ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                    {showBadge && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        <span className="text-xs font-bold text-white">{badgeCount > 9 ? '9+' : badgeCount}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

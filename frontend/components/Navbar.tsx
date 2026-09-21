import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Home, 
  BookOpen, 
  MessageSquare, 
  Users, 
  User, 
  LogOut, 
  Bell,
  Trophy,
  Flower2
} from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/diaries', label: '花园日记', icon: BookOpen },
  { path: '/topics', label: '话题广场', icon: MessageSquare },
  { path: '/moments', label: '花友圈', icon: Users },
  { path: '/challenges', label: '种植挑战', icon: Trophy },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:top-0 md:bottom-auto z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="hidden md:flex items-center space-x-2">
            <Flower2 className="w-8 h-8 text-green-500" />
            <span className="text-xl font-bold text-green-600">园艺社区</span>
          </Link>

          <div className="flex items-center space-x-1 md:space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden md:inline text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              <Bell className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <Link href={`/profile/${user.id}`} className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                  ) : (
                    <User className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">{user.username}</span>
                <span className={`level-badge level-${user.level}`}>{user.level}</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <Link
            href={`/profile/${user.id}`}
            className="md:hidden p-2 text-gray-600"
          >
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}

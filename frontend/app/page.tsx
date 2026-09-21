'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Flower2, 
  BookOpen, 
  Users, 
  Trophy, 
  Bell, 
  MessageCircle,
  CalendarCheck
} from 'lucide-react';
import { pointsApi, messageApi } from '@/lib/api';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadStatus();
    }
  }, [user]);

  const loadStatus = async () => {
    try {
      const [checkInRes, unreadRes] = await Promise.all([
        pointsApi.getCheckInStatus(),
        messageApi.getUnreadCount()
      ]);
      setCheckedIn(checkInRes.data.checkedIn);
      setUnreadCount(unreadRes.data.unreadCount);
    } catch (error) {
      console.error('加载状态失败', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await pointsApi.checkIn();
      setCheckedIn(true);
      alert('签到成功！获得 10 积分');
    } catch (error: any) {
      alert(error.response?.data?.error || '签到失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = [
    { label: '花园日记', path: '/diaries', icon: BookOpen, color: 'bg-green-500', count: '记录生活' },
    { label: '话题广场', path: '/topics', icon: MessageCircle, color: 'bg-blue-500', count: '交流心得' },
    { label: '花友圈', path: '/moments', icon: Users, color: 'bg-purple-500', count: '分享动态' },
    { label: '种植挑战', path: '/challenges', icon: Trophy, color: 'bg-orange-500', count: '赢取奖励' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🌱</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">你好，{user.username}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`level-badge level-${user.level}`}>
                  {user.level === 'SEED' && '🌰 种子'}
                  {user.level === 'SPROUT' && '🌱 幼苗'}
                  {user.level === 'FLOWER' && '🌸 花朵'}
                  {user.level === 'TREE' && '🌳 参天大树'}
                </span>
                <span className="text-sm text-gray-500">{user.points} 积分</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/messages" className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleCheckIn}
              disabled={checkedIn}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                checkedIn
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <CalendarCheck className="w-5 h-5" />
              <span>{checkedIn ? '已签到' : '签到'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.path}
              className="card p-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-medium text-gray-800">{stat.label}</h3>
              <p className="text-sm text-gray-500">{stat.count}</p>
            </Link>
          );
        })}
      </div>

      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Flower2 className="w-6 h-6 text-green-500" />
          <h3 className="text-lg font-bold text-gray-800">欢迎来到园艺社区</h3>
        </div>
        <p className="text-gray-600 leading-relaxed">
          这是一个充满热爱的园艺爱好者社区。在这里，你可以：
        </p>
        <ul className="mt-3 space-y-2 text-gray-600">
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>记录植物的生长过程，分享你的花园日记</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>参与热门话题讨论，与花友交流经验</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>关注志同道合的花友，看他们的最新动态</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>参加种植挑战，赢取积分和荣誉</span>
          </li>
        </ul>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">积分等级说明</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <span className="text-2xl">🌰</span>
            <p className="font-medium mt-1">种子</p>
            <p className="text-sm text-gray-500">0 - 499 积分</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <span className="text-2xl">🌱</span>
            <p className="font-medium mt-1">幼苗</p>
            <p className="text-sm text-gray-500">500 - 2999 积分</p>
          </div>
          <div className="text-center p-3 bg-pink-50 rounded-lg">
            <span className="text-2xl">🌸</span>
            <p className="font-medium mt-1">花朵</p>
            <p className="text-sm text-gray-500">3000 - 9999 积分</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <span className="text-2xl">🌳</span>
            <p className="font-medium mt-1">参天大树</p>
            <p className="text-sm text-gray-500">10000+ 积分</p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { userApi, diaryApi, momentApi } from '@/lib/api';
import { formatTime } from '@/lib/time';
import { User, Diary, Moment } from '@/types';
import { 
  BookOpen, 
  Users, 
  UserPlus,
  UserMinus,
  MessageCircle,
  Calendar,
  User as UserIcon
} from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const rawUserId = params?.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const [profileUser, setProfileUser] = useState<any>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'diaries' | 'moments'>('diaries');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (userId) {
      loadProfile();
    }
  }, [userId, user, router]);

  useEffect(() => {
    if (userId) {
      loadContent();
    }
  }, [userId, activeTab]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const [profileRes, followRes] = await Promise.all([
        userApi.getProfile(userId),
        userApi.checkFollow(userId)
      ]);
      setProfileUser(profileRes.data);
      setIsFollowing(followRes.data.isFollowing);
    } catch (error) {
      console.error('加载用户信息失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    if (!userId) return;
    try {
      if (activeTab === 'diaries') {
        const res = await diaryApi.getList({ userId, page: 1, limit: 20 });
        setDiaries(res.data.diaries);
      } else {
        const res = await momentApi.getByUser(userId, { page: 1, limit: 20 });
        setMoments(res.data.moments);
      }
    } catch (error) {
      console.error('加载内容失败', error);
    }
  };

  const handleFollow = async () => {
    if (!userId) return;
    try {
      if (isFollowing) {
        await userApi.unfollow(userId);
      } else {
        await userApi.follow(userId);
      }
      setIsFollowing(!isFollowing);
      loadProfile();
    } catch (error) {
      alert('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">用户不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            {profileUser.avatar ? (
              <img
                src={profileUser.avatar}
                alt={profileUser.username}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <UserIcon className="w-12 h-12 text-green-600" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <h1 className="text-2xl font-bold text-gray-800">
                {profileUser.username}
              </h1>
              <span className={`level-badge level-${profileUser.level}`}>
                {profileUser.level === 'SEED' && '🌰 种子'}
                {profileUser.level === 'SPROUT' && '🌱 幼苗'}
                {profileUser.level === 'FLOWER' && '🌸 花朵'}
                {profileUser.level === 'TREE' && '🌳 参天大树'}
              </span>
            </div>
            
            <p className="text-gray-500 mt-2">{profileUser.points} 积分</p>
            
            {profileUser.bio && (
              <p className="text-gray-600 mt-3">{profileUser.bio}</p>
            )}

            <div className="flex items-center justify-center md:justify-start space-x-6 mt-4">
              <div className="text-center">
                <p className="font-bold text-gray-800">{profileUser._count?.diaries || 0}</p>
                <p className="text-sm text-gray-500">日记</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800">{profileUser._count?.following || 0}</p>
                <p className="text-sm text-gray-500">关注</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800">{profileUser._count?.followers || 0}</p>
                <p className="text-sm text-gray-500">粉丝</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            {!isOwnProfile && (
              <>
                <button
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isFollowing ? (
                    <><UserMinus className="w-5 h-5" /><span>取消关注</span></>
                  ) : (
                    <><UserPlus className="w-5 h-5" /><span>关注</span></>
                  )}
                </button>
                <Link
                  href="/messages"
                  className="px-6 py-2 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>私信</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setActiveTab('diaries')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'diaries'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>花园日记</span>
        </button>
        <button
          onClick={() => setActiveTab('moments')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
            activeTab === 'moments'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>花友圈</span>
        </button>
      </div>

      {activeTab === 'diaries' ? (
        diaries.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">还没有日记</p>
          </div>
        ) : (
          <div className="space-y-4">
            {diaries.map((diary) => (
              <Link
                key={diary.id}
                href={`/diaries/${diary.id}`}
                className="card p-4 hover:shadow-md transition-shadow block"
              >
                <h3 className="font-medium text-gray-800">{diary.title}</h3>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                  {diary.content}
                </p>
                {diary.images && diary.images.length > 0 && (
                  <div className="flex space-x-2 mt-3">
                    {diary.images.slice(0, 3).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="w-16 h-16 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-3">
                  {formatTime(diary.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        )
      ) : (
        moments.length === 0 ? (
          <div className="card p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">还没有动态</p>
          </div>
        ) : (
          <div className="space-y-4">
            {moments.map((moment) => (
              <div key={moment.id} className="card p-4">
                {moment.content && (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {moment.content}
                  </p>
                )}
                {moment.images && moment.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {moment.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-3">
                  {formatTime(moment.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

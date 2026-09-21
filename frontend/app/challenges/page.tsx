'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { challengeApi } from '@/lib/api';
import { formatDate } from '@/lib/time';
import { Challenge } from '@/types';
import {
  Trophy,
  Calendar,
  Users,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadChallenges();
  }, [user, router]);

  const loadChallenges = async () => {
    try {
      const res = await challengeApi.getList();
      setChallenges(res.data.challenges);
    } catch (error) {
      console.error('加载挑战失败', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center space-x-3 mb-6">
        <Trophy className="w-8 h-8 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-800">种植挑战</h1>
      </div>

      {challenges.length === 0 ? (
        <div className="card p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无挑战活动</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => {
            const now = new Date();
            const isActive = now >= new Date(challenge.startDate) && now <= new Date(challenge.endDate);
            const remainingSlots = challenge.remainingSlots ?? Math.max(0, challenge.capacity - challenge.registeredCount);

            return (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className="card p-4 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-start space-x-4">
                  {challenge.coverImage ? (
                    <img
                      src={challenge.coverImage}
                      alt={challenge.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-lg flex items-center justify-center">
                      <Trophy className="w-10 h-10 text-white" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-gray-800">{challenge.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        isActive
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isActive ? '进行中' : '已结束'}
                      </span>
                      {challenge.myRegistered && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          已报名
                        </span>
                      )}
                      {challenge.mySubmitted && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-600 flex items-center">
                          <Trophy className="w-3 h-3 mr-1" />
                          已提交
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {challenge.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{challenge._count?.submissions || 0} 人参与</span>
                      </span>
                      <span className={`flex items-center space-x-1 ${
                        remainingSlots > 0 ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                        <span>剩余名额 {remainingSlots}/{challenge.capacity}</span>
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

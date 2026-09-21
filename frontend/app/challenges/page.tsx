'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { challengeApi } from '@/lib/api';
import { formatDate } from '@/lib/time';
import { Challenge } from '@/types';
import {
  Trophy,
  CalendarClock,
  Users,
  ChevronRight,
  CheckCircle2,
  FileCheck2,
  Plus,
  X
} from 'lucide-react';

const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    capacity: 10,
    registrationDeadline: toLocalInputValue(new Date(Date.now() + 7 * 86400000)),
    submissionDeadline: toLocalInputValue(new Date(Date.now() + 30 * 86400000))
  });
  const { user } = useAuth();
  const router = useRouter();

  const loadChallenges = useCallback(async () => {
    try {
      const res = await challengeApi.getList();
      setChallenges(res.data.challenges);
    } catch (error) {
      console.error('加载挑战失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadChallenges();
  }, [user, router, loadChallenges]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert('请填写标题和描述');
      return;
    }
    const regDate = new Date(form.registrationDeadline);
    const subDate = new Date(form.submissionDeadline);
    if (Number.isNaN(regDate.getTime()) || Number.isNaN(subDate.getTime())) {
      alert('请选择有效的截止时间');
      return;
    }
    if (subDate.getTime() < regDate.getTime()) {
      alert('成果截止时间不能早于报名截止时间');
      return;
    }

    setCreating(true);
    try {
      await challengeApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        capacity: Number(form.capacity),
        registrationDeadline: regDate.toISOString(),
        submissionDeadline: subDate.toISOString()
      });
      setShowCreate(false);
      setForm((f) => ({ ...f, title: '', description: '' }));
      await loadChallenges();
    } catch (error: any) {
      alert(error.response?.data?.error || '创建失败');
    } finally {
      setCreating(false);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-800">种植挑战</h1>
        </div>
        {user?.isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary px-4 py-2 flex items-center space-x-1 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>发起挑战</span>
          </button>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="card p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无挑战活动</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => {
            const full = challenge.remainingSlots <= 0;
            const registered = challenge.registrationStatus === 'registered';
            const submitted = !!challenge.mySubmission;

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
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-bold text-gray-800">{challenge.title}</h3>
                      {challenge.registrationOpen && !full && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600">
                          报名中
                        </span>
                      )}
                      {full && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">
                          名额已满
                        </span>
                      )}
                      {!challenge.registrationOpen && !full && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                          报名已截止
                        </span>
                      )}
                      {registered && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600 flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> 已报名
                        </span>
                      )}
                      {submitted && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-600 flex items-center">
                          <FileCheck2 className="w-3 h-3 mr-0.5" /> 已提交
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {challenge.description}
                    </p>

                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <CalendarClock className="w-4 h-4" />
                        <span>报名截止 {formatDate(challenge.registrationDeadline)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span className={full ? 'text-red-500 font-medium' : ''}>
                          剩余 {challenge.remainingSlots}/{challenge.capacity} 名
                        </span>
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

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">发起种植挑战</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">挑战标题</label>
                <input
                  className="input-field"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="如：30 天多肉养成记"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">挑战描述</label>
                <textarea
                  className="input-field min-h-[100px] resize-y"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="玩法、要求、评选方式..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名额</label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">报名截止时间</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={form.registrationDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, registrationDeadline: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">成果截止时间</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={form.submissionDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, submissionDeadline: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {creating ? '创建中...' : '发布挑战'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

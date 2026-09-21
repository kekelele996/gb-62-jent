'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { challengeApi, uploadApi } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/time';
import { Challenge } from '@/types';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Users,
  Plus,
  X,
  Send,
  User as UserIcon,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function ChallengeDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const challengeId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitContent, setSubmitContent] = useState('');
  const [submitImages, setSubmitImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (challengeId) {
      loadChallenge();
    }
  }, [challengeId]);

  const loadChallenge = async () => {
    try {
      if (!challengeId) return;
      const res = await challengeApi.getById(challengeId);
      setChallenge(res.data);
    } catch (error) {
      router.push('/challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!challenge || registering) return;

    setRegistering(true);
    try {
      await challengeApi.register(challenge.id);
      await loadChallenge();
    } catch (error: any) {
      alert(error.response?.data?.error || '报名失败');
      await loadChallenge();
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!challenge || registering) return;
    if (!confirm('确定要取消报名吗？')) return;

    setRegistering(true);
    try {
      await challengeApi.cancelRegistration(challenge.id);
      await loadChallenge();
    } catch (error: any) {
      alert(error.response?.data?.error || '取消报名失败');
      await loadChallenge();
    } finally {
      setRegistering(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileList = Array.from(files);
      const res = await uploadApi.uploadMultiple(fileList);
      setSubmitImages(prev => [...prev, ...res.data.urls]);
    } catch (error) {
      alert('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setSubmitImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!submitContent.trim() && submitImages.length === 0) {
      alert('请输入内容或添加图片');
      return;
    }

    if (!challenge) return;

    setSubmitting(true);
    try {
      await challengeApi.submit(challenge.id, {
        content: submitContent,
        images: submitImages
      });
      setShowSubmit(false);
      setSubmitContent('');
      setSubmitImages([]);
      await loadChallenge();
      alert('提交成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '提交失败');
      await loadChallenge();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !challenge) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const now = new Date();
  const isActive = now >= new Date(challenge.startDate) && now <= new Date(challenge.endDate);
  const remainingSlots = challenge.remainingSlots ?? Math.max(0, challenge.capacity - challenge.registeredCount);
  const registrationOpen = now <= new Date(challenge.registrationDeadline);
  const submissionOpen = now <= new Date(challenge.submissionDeadline);
  const isRegistered = !!challenge.myRegistered;
  const hasSubmitted = !!challenge.mySubmitted;
  const canRegister = registrationOpen && remainingSlots > 0 && challenge.isActive;
  const canSubmit = isRegistered && !hasSubmitted && submissionOpen;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{challenge.title}</h1>
      </div>

      <div className="card p-6">
        {challenge.coverImage && (
          <img
            src={challenge.coverImage}
            alt={challenge.title}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isActive
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {isActive ? '🔥 进行中' : '已结束'}
          </span>
          <span className="flex items-center space-x-1 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}</span>
          </span>
          <span className="flex items-center space-x-1 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{challenge._count?.submissions || 0} 人参与</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{remainingSlots}</div>
            <div className="text-xs text-gray-500 mt-1">剩余名额 / 共 {challenge.capacity} 名</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center text-blue-600 text-sm font-medium h-8">
              <Clock className="w-4 h-4 mr-1" />
              <span>{formatDate(challenge.registrationDeadline)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">报名截止</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center text-purple-600 text-sm font-medium h-8">
              <Clock className="w-4 h-4 mr-1" />
              <span>{formatDate(challenge.submissionDeadline)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">成果截止</div>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm flex items-center ${
              isRegistered
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <CheckCircle className="w-4 h-4 mr-1" />
              {isRegistered ? '已报名' : '未报名'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm flex items-center ${
              hasSubmitted
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <Trophy className="w-4 h-4 mr-1" />
              {hasSubmitted ? '已提交成果' : '未提交成果'}
            </span>
          </div>
        )}

        <p className="text-gray-700 whitespace-pre-wrap">{challenge.description}</p>

        <div className="mt-6 space-y-3">
          {!isRegistered && (
            canRegister ? (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="w-full btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                <span>{registering ? '报名中...' : '立即报名'}</span>
              </button>
            ) : (
              <div className="w-full py-3 text-center rounded-lg bg-gray-100 text-gray-500">
                {!challenge.isActive
                  ? '活动已结束'
                  : !registrationOpen
                    ? '报名已截止'
                    : '名额已满'}
              </div>
            )
          )}

          {isRegistered && (
            <>
              {registrationOpen && (
                <button
                  onClick={handleCancelRegistration}
                  disabled={registering}
                  className="w-full py-3 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  {registering ? '处理中...' : '取消报名'}
                </button>
              )}

              {canSubmit && (
                <button
                  onClick={() => setShowSubmit(true)}
                  className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>提交成果</span>
                </button>
              )}

              {hasSubmitted && (
                <div className="w-full py-3 text-center rounded-lg bg-green-50 text-green-600 flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>成果已提交</span>
                </div>
              )}

              {!hasSubmitted && !submissionOpen && (
                <div className="w-full py-3 text-center rounded-lg bg-gray-100 text-gray-500">
                  成果提交已截止
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">提交成果</h3>
              <button
                onClick={() => setShowSubmit(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <textarea
                value={submitContent}
                onChange={(e) => setSubmitContent(e.target.value)}
                className="input-field min-h-[120px] resize-y"
                placeholder="分享你的种植过程和心得..."
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  成果图片
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {submitImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {submitImages.length < 9 && (
                    <label className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <Plus className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">
                        {uploading ? '上传中...' : '添加图片'}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>{submitting ? '提交中...' : '提交'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {challenge.submissions && challenge.submissions.length > 0 && (
        <div className="card p-6 mt-4">
          <h3 className="font-bold text-gray-800 mb-4">
            参与作品 ({challenge.submissions.length})
          </h3>
          <div className="space-y-4">
            {challenge.submissions.map((submission) => (
              <div key={submission.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    {submission.user.avatar ? (
                      <img
                        src={submission.user.avatar}
                        alt={submission.user.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">
                      {submission.user.username}
                    </span>
                    <span className={`level-badge level-${submission.user.level} ml-1`}>
                      {submission.user.level === 'SEED' && '🌰'}
                      {submission.user.level === 'SPROUT' && '🌱'}
                      {submission.user.level === 'FLOWER' && '🌸'}
                      {submission.user.level === 'TREE' && '🌳'}
                    </span>
                    <span className="text-sm text-gray-400 ml-2">
                      {formatTime(submission.createdAt)}
                    </span>
                  </div>
                  {submission.isWinning && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 text-xs rounded-full flex items-center">
                      <Trophy className="w-3 h-3 mr-1" /> 获奖
                    </span>
                  )}
                </div>
                {submission.content && (
                  <p className="text-gray-600 text-sm mb-2">{submission.content}</p>
                )}
                {submission.images && submission.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {submission.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

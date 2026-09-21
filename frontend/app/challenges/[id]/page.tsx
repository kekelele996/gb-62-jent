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
  CalendarClock,
  Users,
  Plus,
  X,
  Send,
  User as UserIcon,
  CheckCircle2,
  LogOut
} from 'lucide-react';

export default function ChallengeDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const challengeId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitContent, setSubmitContent] = useState('');
  const [submitImages, setSubmitImages] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (challengeId) {
      loadChallenge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!challenge) return;
    setActionLoading(true);
    try {
      const res = await challengeApi.register(challenge.id);
      setChallenge(res.data.challenge);
      alert('报名成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '报名失败');
      await loadChallenge();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!challenge) return;
    if (!window.confirm('确定取消报名吗？将释放你的名额。')) return;
    setActionLoading(true);
    try {
      const res = await challengeApi.cancel(challenge.id);
      setChallenge(res.data.challenge);
      alert('已取消报名');
    } catch (error: any) {
      alert(error.response?.data?.error || '取消失败');
      await loadChallenge();
    } finally {
      setActionLoading(false);
    }
  };

  const openSubmitModal = () => {
    if (!challenge) return;
    if (challenge.mySubmission) {
      setEditing(true);
      setSubmitContent(challenge.mySubmission.content || '');
      setSubmitImages(challenge.mySubmission.images || []);
    } else {
      setEditing(false);
      setSubmitContent('');
      setSubmitImages([]);
    }
    setShowSubmit(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileList = Array.from(files);
      const res = await uploadApi.uploadMultiple(fileList);
      setSubmitImages((prev) => [...prev, ...res.data.urls]);
    } catch (error) {
      alert('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setSubmitImages((prev) => prev.filter((_, i) => i !== index));
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
      const payload = { content: submitContent, images: submitImages };
      const res = editing
        ? await challengeApi.updateSubmission(challenge.id, payload)
        : await challengeApi.submit(challenge.id, payload);
      setShowSubmit(false);
      setSubmitContent('');
      setSubmitImages([]);
      setChallenge(res.data.challenge);
      alert(editing ? '成果已更新！' : '提交成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '提交失败');
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

  const full = challenge.remainingSlots <= 0;
  const registered = challenge.registrationStatus === 'registered';
  const hasSubmission = !!challenge.mySubmission;
  const now = new Date();
  const registrationPassed = now > new Date(challenge.registrationDeadline);
  const submissionPassed = now > new Date(challenge.submissionDeadline);

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

        <div className="flex items-center flex-wrap gap-3 mb-4">
          {challenge.registrationOpen && !full && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-600">
              🔥 报名中
            </span>
          )}
          {full && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600">
              名额已满
            </span>
          )}
          {registrationPassed && !full && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
              报名已截止
            </span>
          )}
          <span className="flex items-center space-x-1 text-sm text-gray-500">
            <CalendarClock className="w-4 h-4" />
            <span>报名截止 {formatDate(challenge.registrationDeadline)}</span>
          </span>
          <span className="flex items-center space-x-1 text-sm text-gray-500">
            <CalendarClock className="w-4 h-4" />
            <span>成果截止 {formatDate(challenge.submissionDeadline)}</span>
          </span>
        </div>

        {/* 剩余名额 */}
        <div className="bg-green-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center text-sm font-medium text-green-700">
              <Users className="w-4 h-4 mr-1" />
              名额情况
            </span>
            <span className={`text-sm font-bold ${full ? 'text-red-500' : 'text-green-600'}`}>
              剩余 {challenge.remainingSlots} / {challenge.capacity}
            </span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${full ? 'bg-red-400' : 'bg-green-500'}`}
              style={{
                width: `${Math.min(100, (challenge.registeredCount / challenge.capacity) * 100)}%`
              }}
            />
          </div>
        </div>

        <p className="text-gray-700 whitespace-pre-wrap">{challenge.description}</p>

        {/* 个人状态与操作区 */}
        <div className="mt-6 space-y-3">
          {registered ? (
            <>
              <div className="flex items-center text-blue-600 bg-blue-50 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">
                  你已报名成功
                  {hasSubmission ? '，且已提交成果' : '，记得在成果截止前提交哦'}
                </span>
              </div>

              <div className="flex gap-3">
                {hasSubmission ? (
                  <button
                    onClick={openSubmitModal}
                    disabled={submissionPassed}
                    className="flex-1 btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    <span>{submissionPassed ? '成果已截止，不可修改' : '修改我的成果'}</span>
                  </button>
                ) : (
                  <button
                    onClick={openSubmitModal}
                    disabled={submissionPassed}
                    className="flex-1 btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    <span>{submissionPassed ? '成果提交已截止' : '提交成果'}</span>
                  </button>
                )}

                <button
                  onClick={handleCancel}
                  disabled={actionLoading || registrationPassed || hasSubmission}
                  title={
                    hasSubmission
                      ? '已提交成果，不能取消'
                      : registrationPassed
                      ? '报名截止后不能取消'
                      : '取消报名并释放名额'
                  }
                  className="px-4 py-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">取消报名</span>
                </button>
              </div>

              {registrationPassed && (
                <p className="text-xs text-gray-400">报名已截止，报名信息已锁定</p>
              )}
              {submissionPassed && (
                <p className="text-xs text-gray-400">成果提交已截止，提交内容已锁定</p>
              )}
            </>
          ) : (
            <button
              onClick={handleRegister}
              disabled={actionLoading || full || registrationPassed}
              className="w-full btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {actionLoading
                  ? '处理中...'
                  : full
                  ? '名额已满'
                  : registrationPassed
                  ? '报名已截止'
                  : '立即报名'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 我的成果卡片 */}
      {hasSubmission && challenge.mySubmission && (
        <div className="card p-6 mt-4 border-2 border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-purple-700">我的成果</h3>
            <span className="text-xs text-gray-400">
              更新于 {formatTime(challenge.mySubmission.updatedAt || challenge.mySubmission.createdAt)}
            </span>
          </div>
          {challenge.mySubmission.content && (
            <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
              {challenge.mySubmission.content}
            </p>
          )}
          {challenge.mySubmission.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {challenge.mySubmission.images.map((img, idx) => (
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
      )}

      {showSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing ? '修改成果' : '提交成果'}</h3>
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
                <span>{submitting ? '提交中...' : editing ? '保存修改' : '提交'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {challenge.submissions && challenge.submissions.length > 0 && (
        <div className="card p-6 mt-4">
          <h3 className="font-bold text-gray-800 mb-4">
            全部成果 ({challenge.submissions.length})
          </h3>
          <div className="space-y-4">
            {challenge.submissions.map((submission) => (
              <div key={submission.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    {submission.user?.avatar ? (
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
                      {submission.user?.username}
                    </span>
                    {submission.user && (
                      <span className={`level-badge level-${submission.user.level} ml-1`}>
                        {submission.user.level === 'SEED' && '🌰'}
                        {submission.user.level === 'SPROUT' && '🌱'}
                        {submission.user.level === 'FLOWER' && '🌸'}
                        {submission.user.level === 'TREE' && '🌳'}
                      </span>
                    )}
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

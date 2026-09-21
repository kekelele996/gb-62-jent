'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { diaryApi, interactionApi } from '@/lib/api';
import { formatTime } from '@/lib/time';
import { Diary, Comment } from '@/types';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Send,
  User as UserIcon,
  Trash2
} from 'lucide-react';

export default function DiaryDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const diaryId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [diary, setDiary] = useState<Diary | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (diaryId) {
      loadDiary();
    }
  }, [diaryId]);

  const loadDiary = async () => {
    try {
      if (!diaryId) return;
      const res = await diaryApi.getById(diaryId);
      setDiary(res.data);
    } catch (error) {
      router.push('/diaries');
    }
  };

  const handleLike = async () => {
    if (!diary) return;
    try {
      const res = await interactionApi.toggleLike({ diaryId: diary.id });
      setLiked(res.data.liked);
      if (diary._count) {
        diary._count.likes += res.data.liked ? 1 : -1;
      }
    } catch (error) {
      console.error('点赞失败', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !diary) return;

    setSubmitting(true);
    try {
      const res = await interactionApi.createComment({
        content: comment,
        diaryId: diary.id
      });
      setComment('');
      loadDiary();
    } catch (error) {
      alert('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!diary) return;
    if (!confirm('确定要删除这篇日记吗？')) return;

    try {
      await diaryApi.delete(diary.id);
      router.push('/diaries');
    } catch (error) {
      alert('删除失败');
    }
  };

  if (!diary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const isOwner = user?.id === diary.authorId;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">{diary.title}</h1>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            title="删除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Link href={`/profile/${diary.author.id}`} className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              {diary.author.avatar ? (
                <img
                  src={diary.author.avatar}
                  alt={diary.author.username}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <span className="font-medium text-gray-800">
                {diary.author.username}
              </span>
              <div className="flex items-center space-x-2">
                <span className={`level-badge level-${diary.author.level}`}>
                  {diary.author.level === 'SEED' && '🌰'}
                  {diary.author.level === 'SPROUT' && '🌱'}
                  {diary.author.level === 'FLOWER' && '🌸'}
                  {diary.author.level === 'TREE' && '🌳'}
                </span>
                <span className="text-sm text-gray-400">
                  {formatTime(diary.createdAt)}
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {diary.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-green-50 text-green-600 text-sm rounded-full"
            >
              {tag === 'SOWING' && '🌰 播种'}
              {tag === 'GERMINATION' && '🌱 发芽'}
              {tag === 'FLOWERING' && '🌸 开花'}
              {tag === 'HARVEST' && '🍅 收获'}
              {tag === 'CARE' && '🌿 养护'}
              {tag === 'OTHER' && '📝 其他'}
            </span>
          ))}
        </div>

        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{diary.content}</p>
        </div>

        {diary.images && diary.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            {diary.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        <div className="flex items-center space-x-6 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 ${
              liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
            <span>{diary._count?.likes || 0}</span>
          </button>
          <span className="flex items-center space-x-2 text-gray-500">
            <MessageCircle className="w-5 h-5" />
            <span>{diary.comments?.length || 0}</span>
          </span>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <h3 className="font-bold text-gray-800 mb-4">
          评论 ({diary.comments?.length || 0})
        </h3>

        <form onSubmit={handleComment} className="flex space-x-3 mb-6">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 input-field"
            placeholder="写下你的评论..."
          />
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="btn-primary disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {diary.comments && diary.comments.length > 0 ? (
          <div className="space-y-4">
            {diary.comments.map((c) => (
              <div key={c.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {c.author.avatar ? (
                    <img
                      src={c.author.avatar}
                      alt={c.author.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-800">
                      {c.author.username}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">还没有评论</p>
        )}
      </div>
    </div>
  );
}

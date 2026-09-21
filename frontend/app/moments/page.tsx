'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { momentApi, uploadApi, interactionApi } from '@/lib/api';
import { formatTime } from '@/lib/time';
import { Moment, Comment } from '@/types';
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  Send,
  X,
  Image as ImageIcon,
  User as UserIcon
} from 'lucide-react';

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [content, setContent] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadMoments();
  }, [user, router]);

  const loadMoments = async () => {
    try {
      const res = await momentApi.getList({ page: 1, limit: 20 });
      setMoments(res.data.moments);
    } catch (error) {
      console.error('加载动态失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileList = Array.from(files);
      const res = await uploadApi.uploadMultiple(fileList);
      setUploadedImages(prev => [...prev, ...res.data.urls]);
    } catch (error) {
      alert('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && uploadedImages.length === 0) {
      alert('请输入内容或添加图片');
      return;
    }

    setSubmitting(true);
    try {
      await momentApi.create({
        content,
        images: uploadedImages
      });
      setContent('');
      setUploadedImages([]);
      loadMoments();
    } catch (error) {
      alert('发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (momentId: string) => {
    try {
      await interactionApi.toggleLike({ momentId });
      loadMoments();
    } catch (error) {
      console.error('点赞失败', error);
    }
  };

  const handleComment = async (momentId: string) => {
    const commentText = commentInputs[momentId]?.trim();
    if (!commentText) return;

    try {
      await interactionApi.createComment({
        content: commentText,
        momentId
      });
      setCommentInputs(prev => ({ ...prev, [momentId]: '' }));
      loadMoments();
    } catch (error) {
      alert('评论失败');
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
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center space-x-3 mb-6">
        <MessageCircle className="w-8 h-8 text-purple-500" />
        <h1 className="text-2xl font-bold text-gray-800">花友圈</h1>
      </div>

      <div className="card p-4 mb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field min-h-[80px] resize-none"
            placeholder="分享你的种植日常..."
          />

          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {uploadedImages.map((img, idx) => (
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
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-gray-500 cursor-pointer hover:text-green-500">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm">{uploading ? '上传中...' : '添加图片'}</span>
            </label>
            <button
              type="submit"
              disabled={submitting || (!content.trim() && uploadedImages.length === 0)}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? '发布中...' : '发布'}
            </button>
          </div>
        </form>
      </div>

      {moments.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">还没有动态</p>
          <p className="text-gray-400 text-sm mt-2">关注更多花友来查看他们的动态</p>
        </div>
      ) : (
        <div className="space-y-4">
          {moments.map((moment) => (
            <div key={moment.id} className="card p-4">
              <div className="flex items-start space-x-3">
                <Link href={`/profile/${moment.author.id}`} className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    {moment.author.avatar ? (
                      <img
                        src={moment.author.avatar}
                        alt={moment.author.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Link href={`/profile/${moment.author.id}`} className="font-medium text-gray-800">
                      {moment.author.username}
                    </Link>
                    <span className={`level-badge level-${moment.author.level}`}>
                      {moment.author.level === 'SEED' && '🌰'}
                      {moment.author.level === 'SPROUT' && '🌱'}
                      {moment.author.level === 'FLOWER' && '🌸'}
                      {moment.author.level === 'TREE' && '🌳'}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatTime(moment.createdAt)}
                    </span>
                  </div>

                  {moment.content && (
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                      {moment.content}
                    </p>
                  )}

                  {moment.images && moment.images.length > 0 && (
                    <div className={`grid gap-2 mt-3 ${
                      moment.images.length === 1 ? 'grid-cols-1' :
                      moment.images.length === 2 ? 'grid-cols-2' :
                      'grid-cols-3'
                    }`}>
                      {moment.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt=""
                          className={`object-cover rounded-lg ${
                            moment.images!.length === 1 ? 'w-full max-h-80' : 'w-full aspect-square'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-6 mt-4">
                    <button
                      onClick={() => handleLike(moment.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-red-500"
                    >
                      <Heart className="w-5 h-5" />
                      <span className="text-sm">{moment._count?.likes || 0}</span>
                    </button>
                    <span className="flex items-center space-x-1 text-gray-500">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{moment._count?.comments || 0}</span>
                    </span>
                  </div>

                  {moment.comments && moment.comments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {moment.comments.slice(0, 3).map((comment) => (
                        <div key={comment.id} className="text-sm py-1">
                          <Link href={`/profile/${comment.author.id}`} className="font-medium text-gray-800">
                            {comment.author.username}
                          </Link>
                          <span className="text-gray-600 ml-1">{comment.content}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-2 mt-3">
                    <input
                      type="text"
                      value={commentInputs[moment.id] || ''}
                      onChange={(e) => setCommentInputs(prev => ({
                        ...prev,
                        [moment.id]: e.target.value
                      }))}
                      className="flex-1 input-field py-1 text-sm"
                      placeholder="评论..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleComment(moment.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleComment(moment.id)}
                      className="p-1 text-green-500 hover:bg-green-50 rounded"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

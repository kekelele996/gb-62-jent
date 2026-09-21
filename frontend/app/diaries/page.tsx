'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { diaryApi } from '@/lib/api';
import { formatTime } from '@/lib/time';
import { Diary, DiaryTag } from '@/types';
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  Calendar,
  BookOpen,
  User as UserIcon
} from 'lucide-react';

const tagOptions: { value: DiaryTag | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'SOWING', label: '播种' },
  { value: 'GERMINATION', label: '发芽' },
  { value: 'FLOWERING', label: '开花' },
  { value: 'HARVEST', label: '收获' },
  { value: 'CARE', label: '养护' },
  { value: 'OTHER', label: '其他' },
];

export default function DiariesPage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [selectedTag, setSelectedTag] = useState<DiaryTag | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadDiaries();
  }, [selectedTag, user, router]);

  const loadDiaries = async () => {
    try {
      const params: any = { page: 1, limit: 20 };
      if (selectedTag !== 'ALL') {
        params.tag = selectedTag;
      }
      const res = await diaryApi.getList(params);
      setDiaries(res.data.diaries);
    } catch (error) {
      console.error('加载日记失败', error);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8 text-green-500" />
          <h1 className="text-2xl font-bold text-gray-800">花园日记</h1>
        </div>
        <Link
          href="/diaries/new"
          className="flex items-center space-x-2 btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>写日记</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tagOptions.map((tag) => (
          <button
            key={tag.value}
            onClick={() => setSelectedTag(tag.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedTag === tag.value
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {diaries.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">还没有日记</p>
          <Link href="/diaries/new" className="inline-block mt-4 btn-primary">
            写第一篇日记
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {diaries.map((diary) => (
            <Link
              key={diary.id}
              href={`/diaries/${diary.id}`}
              className="card p-4 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-800">
                      {diary.author.username}
                    </span>
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
                  <h3 className="font-medium text-gray-800 mt-1">{diary.title}</h3>
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
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex flex-wrap gap-1">
                      {diary.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded"
                        >
                          {tag === 'SOWING' && '播种'}
                          {tag === 'GERMINATION' && '发芽'}
                          {tag === 'FLOWERING' && '开花'}
                          {tag === 'HARVEST' && '收获'}
                          {tag === 'CARE' && '养护'}
                          {tag === 'OTHER' && '其他'}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center space-x-4 ml-auto text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Heart className="w-4 h-4" />
                        <span>{diary._count?.likes || 0}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{diary._count?.comments || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

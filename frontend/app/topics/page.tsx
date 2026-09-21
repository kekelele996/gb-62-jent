'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { postApi } from '@/lib/api';
import { formatTime } from '@/lib/time';
import { Post, TopicCategory } from '@/types';
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  MessageSquare,
  User as UserIcon
} from 'lucide-react';

const categoryOptions: { value: TopicCategory | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: '全部', icon: '🌍' },
  { value: 'BALCONY_GARDEN', label: '阳台花园', icon: '🏠' },
  { value: 'COURTYARD_DESIGN', label: '庭院设计', icon: '🏡' },
  { value: 'INDOOR_PLANTS', label: '室内绿植', icon: '🪴' },
  { value: 'HYDROPONICS', label: '水培', icon: '💧' },
  { value: 'COMPOST', label: '堆肥', icon: '🌱' },
  { value: 'OTHER', label: '其他', icon: '📝' },
];

export default function TopicsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadPosts();
  }, [selectedCategory, user, router]);

  const loadPosts = async () => {
    try {
      const params: any = { page: 1, limit: 20 };
      if (selectedCategory !== 'ALL') {
        params.category = selectedCategory;
      }
      const res = await postApi.getList(params);
      setPosts(res.data.posts);
    } catch (error) {
      console.error('加载帖子失败', error);
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
          <MessageSquare className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">话题广场</h1>
        </div>
        <Link
          href="/topics/new"
          className="flex items-center space-x-2 btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>发帖</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categoryOptions.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
              selectedCategory === cat.value
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">还没有帖子</p>
          <Link href="/topics/new" className="inline-block mt-4 btn-primary">
            发第一篇帖子
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/topics/${post.id}`}
              className="card p-4 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {post.author.avatar ? (
                    <img
                      src={post.author.avatar}
                      alt={post.author.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-800">
                      {post.author.username}
                    </span>
                    <span className={`level-badge level-${post.author.level}`}>
                      {post.author.level === 'SEED' && '🌰'}
                      {post.author.level === 'SPROUT' && '🌱'}
                      {post.author.level === 'FLOWER' && '🌸'}
                      {post.author.level === 'TREE' && '🌳'}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatTime(post.createdAt)}
                    </span>
                  </div>
                  
                  <div className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded mt-1">
                    {post.category === 'BALCONY_GARDEN' && '🏠 阳台花园'}
                    {post.category === 'COURTYARD_DESIGN' && '🏡 庭院设计'}
                    {post.category === 'INDOOR_PLANTS' && '🪴 室内绿植'}
                    {post.category === 'HYDROPONICS' && '💧 水培'}
                    {post.category === 'COMPOST' && '🌱 堆肥'}
                    {post.category === 'OTHER' && '📝 其他'}
                  </div>

                  <h3 className="font-medium text-gray-800 mt-2">{post.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {post.content}
                  </p>
                  
                  {post.images && post.images.length > 0 && (
                    <div className="flex space-x-2 mt-3">
                      {post.images.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{post._count?.likes || 0}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post._count?.comments || 0}</span>
                    </span>
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

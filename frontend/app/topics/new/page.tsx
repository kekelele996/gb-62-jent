'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postApi, uploadApi } from '@/lib/api';
import { TopicCategory } from '@/types';
import { ArrowLeft, Plus, X } from 'lucide-react';

const categoryOptions: { value: TopicCategory; label: string; icon: string }[] = [
  { value: 'BALCONY_GARDEN', label: '阳台花园', icon: '🏠' },
  { value: 'COURTYARD_DESIGN', label: '庭院设计', icon: '🏡' },
  { value: 'INDOOR_PLANTS', label: '室内绿植', icon: '🪴' },
  { value: 'HYDROPONICS', label: '水培', icon: '💧' },
  { value: 'COMPOST', label: '堆肥', icon: '🌱' },
  { value: 'OTHER', label: '其他', icon: '📝' },
];

export default function NewTopicPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<TopicCategory>('OTHER');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

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

    if (!title.trim()) {
      alert('请输入标题');
      return;
    }

    if (!content.trim()) {
      alert('请输入内容');
      return;
    }

    setSubmitting(true);
    try {
      await postApi.create({
        title,
        content,
        images: uploadedImages,
        category
      });
      router.push('/topics');
    } catch (error) {
      alert('发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">发布话题</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分类
          </label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
                  category === cat.value
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="写下你的话题标题..."
            maxLength={100}
          />
        </div>

        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field min-h-[200px] resize-y"
            placeholder="分享你的经验和想法..."
          />
        </div>

        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            图片（最多9张）
          </label>
          
          <div className="grid grid-cols-3 gap-3">
            {uploadedImages.map((img, index) => (
              <div key={index} className="relative">
                <img
                  src={img}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {uploadedImages.length < 9 && (
              <label className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Plus className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-500 mt-1">
                  {uploading ? '上传中...' : '添加图片'}
                </span>
              </label>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full btn-primary py-3 text-lg disabled:opacity-50"
        >
          {submitting ? '发布中...' : '发布'}
        </button>
      </form>
    </div>
  );
}

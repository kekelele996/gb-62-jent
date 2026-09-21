import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3103';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: { email: string; password: string }) => 
    api.post('/auth/login', data),
  register: (data: { username: string; email: string; password: string }) => 
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Partial<{ username: string; bio: string; avatar: string }>) => 
    api.put('/auth/profile', data),
};

export const diaryApi = {
  getList: (params?: { page?: number; limit?: number; tag?: string; userId?: string }) => 
    api.get('/diaries', { params }),
  getById: (id: string) => api.get(`/diaries/${id}`),
  create: (data: { title: string; content: string; images?: string[]; tags?: string[] }) => 
    api.post('/diaries', data),
  update: (id: string, data: Partial<{ title: string; content: string; images?: string[]; tags?: string[] }>) => 
    api.put(`/diaries/${id}`, data),
  delete: (id: string) => api.delete(`/diaries/${id}`),
};

export const postApi = {
  getList: (params?: { page?: number; limit?: number; category?: string; userId?: string }) => 
    api.get('/posts', { params }),
  getById: (id: string) => api.get(`/posts/${id}`),
  create: (data: { title: string; content: string; images?: string[]; category?: string }) => 
    api.post('/posts', data),
  update: (id: string, data: Partial<{ title: string; content: string; images?: string[]; category?: string }>) => 
    api.put(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
};

export const momentApi = {
  getList: (params?: { page?: number; limit?: number }) => 
    api.get('/moments', { params }),
  getByUser: (userId: string, params?: { page?: number; limit?: number }) => 
    api.get(`/moments/user/${userId}`, { params }),
  create: (data: { content: string; images?: string[] }) => 
    api.post('/moments', data),
  delete: (id: string) => api.delete(`/moments/${id}`),
};

export const userApi = {
  getProfile: (userId: string) => api.get(`/users/profile/${userId}`),
  follow: (targetUserId: string) => api.post(`/users/follow/${targetUserId}`),
  unfollow: (targetUserId: string) => api.delete(`/users/follow/${targetUserId}`),
  checkFollow: (targetUserId: string) => api.get(`/users/check-follow/${targetUserId}`),
  getFollowing: (userId: string) => api.get(`/users/following/${userId}`),
  getFollowers: (userId: string) => api.get(`/users/followers/${userId}`),
};

export const interactionApi = {
  createComment: (data: { content: string; diaryId?: string; postId?: string; momentId?: string }) => 
    api.post('/interactions/comments', data),
  deleteComment: (id: string) => api.delete(`/interactions/comments/${id}`),
  toggleLike: (data: { diaryId?: string; postId?: string; momentId?: string; commentId?: string }) => 
    api.post('/interactions/likes', data),
};

export const pointsApi = {
  checkIn: () => api.post('/points/check-in'),
  getCheckInStatus: () => api.get('/points/check-in/status'),
};

export const messageApi = {
  send: (data: { receiverId: string; content?: string; image?: string }) => 
    api.post('/messages', data),
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (otherUserId: string, params?: { page?: number; limit?: number }) => 
    api.get(`/messages/${otherUserId}`, { params }),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

export const challengeApi = {
  getList: (params?: { active?: boolean }) =>
    api.get('/challenges', { params }),
  getById: (id: string) => api.get(`/challenges/${id}`),
  create: (data: {
    title: string;
    description: string;
    coverImage?: string;
    startDate: string;
    endDate: string;
    capacity: number;
    registrationDeadline: string;
    submissionDeadline: string;
  }) =>
    api.post('/challenges', data),
  register: (challengeId: string) =>
    api.post(`/challenges/${challengeId}/register`),
  cancelRegistration: (challengeId: string) =>
    api.delete(`/challenges/${challengeId}/register`),
  submit: (challengeId: string, data: { content: string; images?: string[] }) =>
    api.post(`/challenges/${challengeId}/submit`, data),
};

export const reportApi = {
  create: (data: { targetType: string; targetId: string; reason: string; description?: string }) => 
    api.post('/reports', data),
  getList: (params?: { status?: string }) => 
    api.get('/reports', { params }),
  handle: (id: string, data: { status: string; deleteContent?: boolean; warningUser?: boolean }) => 
    api.put(`/reports/${id}/handle`, data),
};

export const uploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post('/upload/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

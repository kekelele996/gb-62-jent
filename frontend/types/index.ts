export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  level: UserLevel;
  points: number;
  isAdmin: boolean;
  createdAt?: string;
}

export type UserLevel = 'SEED' | 'SPROUT' | 'FLOWER' | 'TREE';

export type DiaryTag = 'SOWING' | 'GERMINATION' | 'FLOWERING' | 'HARVEST' | 'CARE' | 'OTHER';

export type TopicCategory = 'BALCONY_GARDEN' | 'COURTYARD_DESIGN' | 'INDOOR_PLANTS' | 'HYDROPONICS' | 'COMPOST' | 'OTHER';

export interface Diary {
  id: string;
  title: string;
  content: string;
  images: string[];
  tags: DiaryTag[];
  authorId: string;
  author: Pick<User, 'id' | 'username' | 'avatar' | 'level'>;
  _count?: {
    likes: number;
    comments: number;
  };
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  category: TopicCategory;
  authorId: string;
  author: Pick<User, 'id' | 'username' | 'avatar' | 'level'>;
  _count?: {
    likes: number;
    comments: number;
  };
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Moment {
  id: string;
  content: string;
  images: string[];
  authorId: string;
  author: Pick<User, 'id' | 'username' | 'avatar' | 'level'>;
  comments?: Comment[];
  _count?: {
    likes: number;
    comments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: Pick<User, 'id' | 'username' | 'avatar'>;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content?: string;
  image?: string;
  isRead: boolean;
  sender: Pick<User, 'id' | 'username' | 'avatar'>;
  receiver: Pick<User, 'id' | 'username' | 'avatar'>;
  createdAt: string;
}

export interface Conversation {
  userId: string;
  user: Pick<User, 'id' | 'username' | 'avatar'>;
  lastMessage: Message;
  unreadCount: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  submissionDeadline: string;
  capacity: number;
  registeredCount: number;
  remainingSlots?: number;
  isActive: boolean;
  myRegistered?: boolean;
  mySubmitted?: boolean;
  myRegistration?: ChallengeRegistration | null;
  mySubmission?: ChallengeSubmission | null;
  _count?: {
    submissions: number;
    registrations?: number;
  };
  submissions?: ChallengeSubmission[];
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeRegistration {
  id: string;
  challengeId: string;
  userId: string;
  createdAt: string;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  content: string;
  images: string[];
  isWinning: boolean;
  user: Pick<User, 'id' | 'username' | 'avatar' | 'level'>;
  createdAt: string;
}

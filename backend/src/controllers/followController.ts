import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';

export const followUser = async (req: AuthRequest, res: Response) => {
  const { targetUserId } = req.params;
  const currentUserId = req.userId!;

  if (targetUserId === currentUserId) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ error: '已经关注该用户' });
    }

    await prisma.follow.create({
      data: {
        followerId: currentUserId,
        followingId: targetUserId
      }
    });

    res.json({ message: '关注成功' });
  } catch (error) {
    res.status(500).json({ error: '关注失败' });
  }
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  const { targetUserId } = req.params;
  const currentUserId = req.userId!;

  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId
        }
      }
    });

    res.json({ message: '取消关注成功' });
  } catch (error) {
    res.status(500).json({ error: '取消关注失败' });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const followings = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true,
            bio: true
          }
        }
      }
    });

    res.json({
      users: followings.map(f => f.following),
      count: followings.length
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const getFollowers = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true,
            bio: true
          }
        }
      }
    });

    res.json({
      users: followers.map(f => f.follower),
      count: followers.length
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        level: true,
        points: true,
        createdAt: true,
        _count: {
          select: {
            diaries: true,
            posts: true,
            following: true,
            followers: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const checkFollow = async (req: AuthRequest, res: Response) => {
  const { targetUserId } = req.params;
  const currentUserId = req.userId!;

  try {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId
        }
      }
    });

    res.json({ isFollowing: !!follow });
  } catch (error) {
    res.status(500).json({ error: '查询失败' });
  }
};

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { addPoints } from './authController';

export const createMoment = async (req: AuthRequest, res: Response) => {
  const { content, images } = req.body;

  try {
    const moment = await prisma.moment.create({
      data: {
        content,
        images: images || [],
        authorId: req.userId!
      }
    });

    const momentWithAuthor = await prisma.moment.findUnique({
      where: { id: moment.id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true
          }
        }
      }
    });

    await addPoints(req.userId!, 10);

    res.status(201).json({ message: '动态发布成功', moment: momentWithAuthor });
  } catch (error) {
    res.status(500).json({ error: '发布失败' });
  }
};

export const getMoments = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const userId = req.userId;

  try {
    const followings = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = followings.map(f => f.followingId);

    const where: any = {};
    if (followingIds.length > 0) {
      where.authorId = { in: followingIds };
    }

    const moments = await prisma.moment.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: { likes: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.moment.count({ where });

    res.json({
      moments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const getUserMoments = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const moments = await prisma.moment.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true
          }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.moment.count({ where: { authorId: userId } });

    res.json({
      moments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const deleteMoment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const moment = await prisma.moment.findUnique({ where: { id } });

    if (!moment) {
      return res.status(404).json({ error: '动态不存在' });
    }

    if (moment.authorId !== req.userId && !req.isAdmin) {
      return res.status(403).json({ error: '无权限删除' });
    }

    await prisma.moment.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
};

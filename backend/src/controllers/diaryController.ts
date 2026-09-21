import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { addPoints } from './authController';

type DiaryTag = 'SOWING' | 'GERMINATION' | 'FLOWERING' | 'HARVEST' | 'CARE' | 'OTHER';

export const createDiary = async (req: AuthRequest, res: Response) => {
  const { title, content, images, tags } = req.body;

  try {
    const diary = await prisma.diary.create({
      data: {
        title,
        content,
        images: images || [],
        tags: tags || [],
        authorId: req.userId!
      },
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

    await addPoints(req.userId!, 20);

    res.status(201).json({ message: '日记发布成功', diary });
  } catch (error) {
    res.status(500).json({ error: '发布失败' });
  }
};

export const getDiaries = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, tag, userId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const where: any = {};
    if (tag) {
      where.tags = { has: tag as DiaryTag };
    }
    if (userId) {
      where.authorId = userId;
    }

    const diaries = await prisma.diary.findMany({
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
        _count: {
          select: { likes: true, comments: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.diary.count({ where });

    res.json({
      diaries,
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

export const getDiaryById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const diary = await prisma.diary.findUnique({
      where: { id },
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
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { likes: true }
        }
      }
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    res.json(diary);
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const updateDiary = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content, images, tags } = req.body;

  try {
    const diary = await prisma.diary.findUnique({ where: { id } });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    if (diary.authorId !== req.userId && !req.isAdmin) {
      return res.status(403).json({ error: '无权限修改' });
    }

    const updatedDiary = await prisma.diary.update({
      where: { id },
      data: {
        title: title || undefined,
        content: content || undefined,
        images: images || undefined,
        tags: tags || undefined
      }
    });

    res.json({ message: '更新成功', diary: updatedDiary });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
};

export const deleteDiary = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const diary = await prisma.diary.findUnique({ where: { id } });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    if (diary.authorId !== req.userId && !req.isAdmin) {
      return res.status(403).json({ error: '无权限删除' });
    }

    await prisma.diary.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
};

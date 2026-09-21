import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { addPoints } from './authController';

const DEFAULT_TOPIC_CATEGORY = 'OTHER';

export const createPost = async (req: AuthRequest, res: Response) => {
  const { title, content, images, category } = req.body;

  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        images: images || [],
        category: category || DEFAULT_TOPIC_CATEGORY,
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

    await addPoints(req.userId!, 15);

    res.status(201).json({ message: '帖子发布成功', post });
  } catch (error) {
    res.status(500).json({ error: '发布失败' });
  }
};

export const getPosts = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, category, userId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (userId) {
      where.authorId = userId;
    }

    const posts = await prisma.post.findMany({
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

    const total = await prisma.post.count({ where });

    res.json({
      posts,
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

export const getPostById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const post = await prisma.post.findUnique({
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

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content, images, category } = req.body;

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    if (post.authorId !== req.userId && !req.isAdmin) {
      return res.status(403).json({ error: '无权限修改' });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title: title || undefined,
        content: content || undefined,
        images: images || undefined,
        category: category || undefined
      }
    });

    res.json({ message: '更新成功', post: updatedPost });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    if (post.authorId !== req.userId && !req.isAdmin) {
      return res.status(403).json({ error: '无权限删除' });
    }

    await prisma.post.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
};

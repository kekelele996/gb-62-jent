import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { addPoints } from './authController';

export const createComment = async (req: AuthRequest, res: Response) => {
  const { content, diaryId, postId, momentId } = req.body;

  if (!diaryId && !postId && !momentId) {
    return res.status(400).json({ error: '请指定评论目标' });
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: req.userId!,
        diaryId: diaryId || undefined,
        postId: postId || undefined,
        momentId: momentId || undefined
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    await addPoints(req.userId!, 5);

    res.status(201).json({ message: '评论成功', comment });
  } catch (error) {
    res.status(500).json({ error: '评论失败' });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.authorId !== req.userId && !req.isAdmin) {
      return res.status(403).json({ error: '无权限删除' });
    }

    await prisma.comment.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  const { diaryId, postId, momentId, commentId } = req.body;
  const userId = req.userId!;

  if (!diaryId && !postId && !momentId && !commentId) {
    return res.status(400).json({ error: '请指定点赞目标' });
  }

  try {
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        diaryId: diaryId || undefined,
        postId: postId || undefined,
        momentId: momentId || undefined,
        commentId: commentId || undefined
      }
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      res.json({ message: '取消点赞', liked: false });
    } else {
      await prisma.like.create({
        data: {
          userId,
          diaryId: diaryId || undefined,
          postId: postId || undefined,
          momentId: momentId || undefined,
          commentId: commentId || undefined
        }
      });
      res.json({ message: '点赞成功', liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
};

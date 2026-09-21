import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';

export const createChallenge = async (req: AuthRequest, res: Response) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const { title, description, coverImage, startDate, endDate } = req.body;

  try {
    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        coverImage,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    });

    res.status(201).json({ message: '活动创建成功', challenge });
  } catch (error) {
    res.status(500).json({ error: '创建失败' });
  }
};

export const getChallenges = async (req: Request, res: Response) => {
  const { active } = req.query;

  try {
    const where: any = {};
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const challenges = await prisma.challenge.findMany({
      where,
      include: {
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ challenges });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const getChallengeById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                level: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { submissions: true }
        }
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: '活动不存在' });
    }

    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const submitChallenge = async (req: AuthRequest, res: Response) => {
  const { challengeId } = req.params;
  const { content, images } = req.body;
  const userId = req.userId!;

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const now = new Date();
    if (now < challenge.startDate || now > challenge.endDate) {
      return res.status(400).json({ error: '活动不在参与时间范围内' });
    }

    const existingSubmission = await prisma.challengeSubmission.findFirst({
      where: {
        challengeId,
        userId
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: '您已提交过作品' });
    }

    const submission = await prisma.challengeSubmission.create({
      data: {
        challengeId,
        userId,
        content,
        images: images || []
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true
          }
        }
      }
    });

    res.status(201).json({ message: '提交成功', submission });
  } catch (error) {
    res.status(500).json({ error: '提交失败' });
  }
};

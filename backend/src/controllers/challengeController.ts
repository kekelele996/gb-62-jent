import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';

// 释放一个已占名额（带重试），用于报名写入失败或取消报名时的补偿
const releaseSlot = async (challengeId: string) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.challenge.updateMany({
        where: { id: challengeId, registeredCount: { gt: 0 } },
        data: { registeredCount: { decrement: 1 } }
      });
      return;
    } catch (error) {
      if (attempt === 2) {
        console.error('释放挑战名额失败:', challengeId, error);
      }
    }
  }
};

export const createChallenge = async (req: AuthRequest, res: Response) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const {
    title,
    description,
    coverImage,
    startDate,
    endDate,
    capacity,
    registrationDeadline,
    submissionDeadline
  } = req.body;

  if (!title || !startDate || !endDate) {
    return res.status(400).json({ error: '请填写完整的活动信息' });
  }

  const parsedCapacity = parseInt(capacity, 10);
  if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
    return res.status(400).json({ error: '名额必须为正整数' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const regDeadline = registrationDeadline ? new Date(registrationDeadline) : end;
  const subDeadline = submissionDeadline ? new Date(submissionDeadline) : end;

  if ([start, end, regDeadline, subDeadline].some(d => isNaN(d.getTime()))) {
    return res.status(400).json({ error: '日期格式不正确' });
  }

  if (regDeadline > subDeadline) {
    return res.status(400).json({ error: '报名截止不能晚于成果截止' });
  }

  try {
    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        coverImage,
        startDate: start,
        endDate: end,
        capacity: parsedCapacity,
        registrationDeadline: regDeadline,
        submissionDeadline: subDeadline
      }
    });

    res.status(201).json({ message: '活动创建成功', challenge });
  } catch (error) {
    res.status(500).json({ error: '创建失败' });
  }
};

export const getChallenges = async (req: AuthRequest, res: Response) => {
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
          select: { submissions: true, registrations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 登录用户额外返回各活动的报名/提交状态
    let registeredIds = new Set<string>();
    let submittedIds = new Set<string>();
    if (req.userId && challenges.length > 0) {
      const challengeIds = challenges.map(c => c.id);
      const [myRegistrations, mySubmissions] = await Promise.all([
        prisma.challengeRegistration.findMany({
          where: { userId: req.userId, challengeId: { in: challengeIds } },
          select: { challengeId: true }
        }),
        prisma.challengeSubmission.findMany({
          where: { userId: req.userId, challengeId: { in: challengeIds } },
          select: { challengeId: true }
        })
      ]);
      registeredIds = new Set(myRegistrations.map(r => r.challengeId));
      submittedIds = new Set(mySubmissions.map(s => s.challengeId));
    }

    res.json({
      challenges: challenges.map(c => ({
        ...c,
        remainingSlots: Math.max(0, c.capacity - c.registeredCount),
        myRegistered: registeredIds.has(c.id),
        mySubmitted: submittedIds.has(c.id)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const getChallengeById = async (req: AuthRequest, res: Response) => {
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
          select: { submissions: true, registrations: true }
        }
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 登录用户返回自己的报名记录与成果提交
    let myRegistration = null;
    let mySubmission = null;
    if (req.userId) {
      [myRegistration, mySubmission] = await Promise.all([
        prisma.challengeRegistration.findUnique({
          where: { challengeId_userId: { challengeId: id, userId: req.userId } }
        }),
        prisma.challengeSubmission.findUnique({
          where: { challengeId_userId: { challengeId: id, userId: req.userId } }
        })
      ]);
    }

    res.json({
      ...challenge,
      remainingSlots: Math.max(0, challenge.capacity - challenge.registeredCount),
      myRegistered: !!myRegistration,
      mySubmitted: !!mySubmission,
      myRegistration,
      mySubmission
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const registerChallenge = async (req: AuthRequest, res: Response) => {
  const { challengeId } = req.params;
  const userId = req.userId!;

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (!challenge.isActive) {
      return res.status(400).json({ error: '活动已结束' });
    }

    const now = new Date();
    if (now > challenge.registrationDeadline) {
      return res.status(400).json({ error: '报名已截止' });
    }

    const existing = await prisma.challengeRegistration.findUnique({
      where: { challengeId_userId: { challengeId, userId } }
    });
    if (existing) {
      return res.status(400).json({ error: '您已报名，请勿重复报名' });
    }

    // 原子占用名额：容量与报名截止在单次写入中校验，并发下不会超发名额
    const claimed = await prisma.challenge.updateMany({
      where: {
        id: challengeId,
        registeredCount: { lt: challenge.capacity },
        registrationDeadline: { gte: now }
      },
      data: { registeredCount: { increment: 1 } }
    });

    if (claimed.count === 0) {
      const fresh = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!fresh) {
        return res.status(404).json({ error: '活动不存在' });
      }
      if (new Date() > fresh.registrationDeadline) {
        return res.status(400).json({ error: '报名已截止' });
      }
      return res.status(400).json({ error: '名额已满' });
    }

    try {
      const registration = await prisma.challengeRegistration.create({
        data: { challengeId, userId }
      });

      res.status(201).json({ message: '报名成功', registration });
    } catch (error: any) {
      // 报名记录写入失败：释放已占名额，挑战与个人状态保持原样
      await releaseSlot(challengeId);
      if (error?.code === 'P2002') {
        return res.status(400).json({ error: '您已报名，请勿重复报名' });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: '报名失败' });
  }
};

export const cancelRegistration = async (req: AuthRequest, res: Response) => {
  const { challengeId } = req.params;
  const userId = req.userId!;

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return res.status(404).json({ error: '活动不存在' });
    }

    // 取消仅在报名截止前生效
    if (new Date() >= challenge.registrationDeadline) {
      return res.status(400).json({ error: '报名已截止，无法取消报名' });
    }

    const deleted = await prisma.challengeRegistration.deleteMany({
      where: { challengeId, userId }
    });

    if (deleted.count === 0) {
      return res.status(400).json({ error: '您尚未报名该活动' });
    }

    // 释放名额
    await releaseSlot(challengeId);

    res.json({ message: '已取消报名' });
  } catch (error) {
    res.status(500).json({ error: '取消报名失败' });
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

    // 成果截止后不能提交或修改
    if (new Date() > challenge.submissionDeadline) {
      return res.status(400).json({ error: '成果提交已截止' });
    }

    // 报名成功后才能提交成果
    const registration = await prisma.challengeRegistration.findUnique({
      where: { challengeId_userId: { challengeId, userId } }
    });
    if (!registration) {
      return res.status(400).json({ error: '请先报名后再提交成果' });
    }

    try {
      // 唯一索引保证每人限一份，并发重复提交整次拒绝
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
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return res.status(400).json({ error: '您已提交过作品' });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: '提交失败' });
  }
};

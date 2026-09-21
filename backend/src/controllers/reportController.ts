import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';

export const createReport = async (req: AuthRequest, res: Response) => {
  const { targetType, targetId, reason, description } = req.body;
  const reporterId = req.userId!;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: '请填写完整的举报信息' });
  }

  try {
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason,
        description
      }
    });

    res.status(201).json({ message: '举报成功', report });
  } catch (error) {
    res.status(500).json({ error: '举报失败' });
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const { status } = req.query;

  try {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const handleReport = async (req: AuthRequest, res: Response) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const { id } = req.params;
  const { status, deleteContent, warningUser } = req.body;

  try {
    const report = await prisma.report.findUnique({ where: { id } });

    if (!report) {
      return res.status(404).json({ error: '举报不存在' });
    }

    if (deleteContent) {
      const targetDeleteMap: Record<string, any> = {
        diary: prisma.diary,
        post: prisma.post,
        moment: prisma.moment,
        comment: prisma.comment
      };

      const model = targetDeleteMap[report.targetType];
      if (model) {
        try {
          await model.delete({ where: { id: report.targetId } });
        } catch (e) {
          console.log('内容已删除或不存在');
        }
      }
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: status || 'HANDLED',
        handledBy: req.userId,
        handledAt: new Date()
      }
    });

    res.json({ message: '处理成功', report: updatedReport });
  } catch (error) {
    res.status(500).json({ error: '处理失败' });
  }
};

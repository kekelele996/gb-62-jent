import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { addPoints } from './authController';

export const checkIn = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId,
        date: {
          gte: today
        }
      }
    });

    if (existingCheckIn) {
      return res.status(400).json({ error: '今日已签到' });
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        userId,
        date: today,
        points: 10
      }
    });

    await addPoints(userId, 10);

    res.json({ message: '签到成功', points: 10, checkIn });
  } catch (error) {
    res.status(500).json({ error: '签到失败' });
  }
};

export const getCheckInStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const checkIn = await prisma.checkIn.findFirst({
      where: {
        userId,
        date: {
          gte: today
        }
      }
    });

    res.json({ checkedIn: !!checkIn });
  } catch (error) {
    res.status(500).json({ error: '查询失败' });
  }
};

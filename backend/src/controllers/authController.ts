import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

type UserLevel = 'SEED' | 'SPROUT' | 'FLOWER' | 'TREE';

export const registerValidators = [
  body('username').isLength({ min: 3, max: 20 }).withMessage('用户名长度应为3-20个字符'),
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符')
];

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });

    const token = generateToken(user.id, user.isAdmin);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        level: user.level,
        points: user.points
      }
    });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
};

export const loginValidators = [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').exists().withMessage('请输入密码')
];

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = generateToken(user.id, user.isAdmin);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        level: user.level,
        points: user.points,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        level: true,
        points: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { username, bio, avatar } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        username: username || undefined,
        bio: bio !== undefined ? bio : undefined,
        avatar: avatar !== undefined ? avatar : undefined
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        level: true,
        points: true
      }
    });

    res.json({ message: '更新成功', user });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: '用户名已被占用' });
    }
    res.status(500).json({ error: '更新失败' });
  }
};

const getLevelFromPoints = (points: number): UserLevel => {
  if (points >= 10000) return 'TREE';
  if (points >= 3000) return 'FLOWER';
  if (points >= 500) return 'SPROUT';
  return 'SEED';
};

export const addPoints = async (userId: string, pointsToAdd: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) return;

  const newPoints = user.points + pointsToAdd;
  const newLevel = getLevelFromPoints(newPoints);

  await prisma.user.update({
    where: { id: userId },
    data: {
      points: newPoints,
      level: newLevel
    }
  });
};

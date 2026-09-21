import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/prisma';
import { AuthRequest } from './auth';

// 可选认证：携带合法令牌时填充 req.userId，未携带也放行
export const optionalAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);

      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true }
        });

        if (user) {
          req.userId = payload.userId;
          req.isAdmin = payload.isAdmin;
        }
      }
    }
  } catch (error) {
    // 可选认证失败时按匿名用户处理
  }
  next();
};

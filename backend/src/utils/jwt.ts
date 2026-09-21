import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config';

interface JwtPayload {
  userId: string;
  isAdmin?: boolean;
}

export const generateToken = (userId: string, isAdmin: boolean = false): string => {
  const options: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(
    { userId, isAdmin },
    config.jwt.secret as Secret,
    options
  );
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
};

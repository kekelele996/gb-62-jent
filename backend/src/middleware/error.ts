import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: err.message
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: '接口不存在' });
};

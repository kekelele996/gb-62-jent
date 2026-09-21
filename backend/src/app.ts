import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import prisma from './config/prisma';
import { verifyToken } from './utils/jwt';

import authRoutes from './routes/authRoutes';
import diaryRoutes from './routes/diaryRoutes';
import postRoutes from './routes/postRoutes';
import momentRoutes from './routes/momentRoutes';
import userRoutes from './routes/userRoutes';
import interactionRoutes from './routes/interactionRoutes';
import pointsRoutes from './routes/pointsRoutes';
import messageRoutes from './routes/messageRoutes';
import challengeRoutes from './routes/challengeRoutes';
import reportRoutes from './routes/reportRoutes';
import uploadRoutes from './routes/uploadRoutes';

import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/moments', momentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

const userSockets = new Map<string, string>();

io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      userSockets.set(payload.userId, socket.id);
      socket.join(`user:${payload.userId}`);
    }
  }

  socket.on('send-message', async (data) => {
    const { receiverId, message } = data;
    const receiverSocketId = userSockets.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new-message', message);
    }

    try {
      const unreadCount = await prisma.message.count({
        where: { receiverId, isRead: false }
      });
      io.to(`user:${receiverId}`).emit('unread-count', { count: unreadCount });
    } catch (error) {
      console.error('Error counting messages:', error);
    }
  });

  socket.on('read-messages', (data) => {
    const { senderId, userId } = data;
    io.to(`user:${senderId}`).emit('messages-read', { userId });
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

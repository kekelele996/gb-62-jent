import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { receiverId, content, image } = req.body;
  const senderId = req.userId!;

  if (!content && !image) {
    return res.status(400).json({ error: '消息内容不能为空' });
  }

  try {
    const sentMessage = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: content || undefined,
        image: image || undefined
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({ message: '发送成功', data: sentMessage });
  } catch (error) {
    res.status(500).json({ error: '发送失败' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  const { otherUserId } = req.params;
  const currentUserId = req.userId!;
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  const currentUserId = req.userId!;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId },
          { receiverId: currentUserId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const conversations = new Map<string, any>();

    messages.forEach(msg => {
      const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === currentUserId ? msg.receiver : msg.sender;

      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          userId: otherUserId,
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0
        });
      }

      const conversation = conversations.get(otherUserId);
      if (msg.receiverId === currentUserId && !msg.isRead) {
        conversation.unreadCount++;
      }
    });

    res.json({
      conversations: Array.from(conversations.values())
    });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  const currentUserId = req.userId!;

  try {
    const count = await prisma.message.count({
      where: {
        receiverId: currentUserId,
        isRead: false
      }
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
};

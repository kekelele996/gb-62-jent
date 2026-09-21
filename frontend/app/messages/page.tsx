'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { messageApi, uploadApi } from '@/lib/api';
import { formatTime } from '@/lib/time';
import { Conversation, Message } from '@/types';
import { 
  ArrowLeft, 
  Send,
  Image as ImageIcon,
  User as UserIcon,
  MessageCircle
} from 'lucide-react';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadConversations();
  }, [user, router]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await messageApi.getConversations();
      setConversations(res.data.conversations);
    } catch (error) {
      console.error('加载会话失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const res = await messageApi.getMessages(userId);
      setMessages(res.data.messages);
      setSelectedConversation(userId);
    } catch (error) {
      console.error('加载消息失败', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage;
    setNewMessage('');
    setSending(true);

    try {
      await messageApi.send({
        receiverId: selectedConversation,
        content: messageText
      });
      loadMessages(selectedConversation);
    } catch (error) {
      setNewMessage(messageText);
      alert('发送失败');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center space-x-3 mb-6">
        {selectedConversation && (
          <button
            onClick={() => {
              setSelectedConversation(null);
              loadConversations();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <MessageCircle className="w-8 h-8 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-800">私信</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="flex h-[600px]">
          <div className={`${
            selectedConversation ? 'hidden md:block' : 'block'
          } w-full md:w-80 border-r border-gray-100 overflow-y-auto`}>
            {conversations.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无私信</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => loadMessages(conv.userId)}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                    selectedConversation === conv.userId ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      {conv.user.avatar ? (
                        <img
                          src={conv.user.avatar}
                          alt={conv.user.username}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <UserIcon className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 truncate">
                        {conv.user.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {conv.lastMessage.content || '[图片]'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className={`${
            selectedConversation ? 'block' : 'hidden md:block'
          } flex-1 flex flex-col`}>
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-800">
                    {conversations.find(c => c.userId === selectedConversation)?.user.username || '用户'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${
                          isMe ? 'order-2' : 'order-1'
                        }`}>
                          <div className={`px-4 py-2 rounded-2xl ${
                            isMe
                              ? 'bg-green-500 text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          }`}>
                            {msg.content && <p>{msg.content}</p>}
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt=""
                                className="max-w-xs rounded-lg"
                              />
                            )}
                          </div>
                          <p className={`text-xs text-gray-400 mt-1 ${
                            isMe ? 'text-right' : 'text-left'
                          }`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex space-x-2">
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-green-500"
                    title="发送图片"
                  >
                    <ImageIcon className="w-6 h-6" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 input-field"
                    placeholder="输入消息..."
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                选择一个会话开始聊天
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

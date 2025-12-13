import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { Message, User, Project } from '../types';

interface ChatPanelProps {
  project: Project;
  currentUser: User;
  otherUser: User;
  onClose: () => void;
  onMessageSent?: () => void;
  inline?: boolean;
  onDeleteConversation?: () => void;
  defaultFullscreen?: boolean;
}

export function ChatPanel({
  project,
  currentUser,
  otherUser,
  onClose,
  onMessageSent,
  inline = false,
  onDeleteConversation,
  defaultFullscreen = false
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getId = (x: any) => x?.id || x?._id;
  const currentUserId = getId(currentUser);
  const otherUserId = getId(otherUser);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const normalizedProjectId =
    (project as any).id ||
    (project as any)._id ||
    (project as any).projectId ||
    '';

  const fetchMessages = async () => {
    try {
      if (!normalizedProjectId || !currentUserId || !otherUserId) return;

      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/messages/thread?projectId=${normalizedProjectId}&user1=${currentUserId}&user2=${otherUserId}`
      );

      if (response.ok) {
        const data = await response.json();
        const formatted = (data || []).map((m: any) => ({
          id: m._id || m.id,
          projectId: m.projectId?._id || m.projectId?.id || m.projectId || normalizedProjectId,
          text: m.text,
          createdAt: m.createdAt || m.timestamp || new Date().toISOString(),
          readAt: m.readAt ?? null,
          fromUserId: m.fromUserId,
          toUserId: m.toUserId,
        }));

        setMessages(formatted);
        setTimeout(scrollToBottom, 0);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      if (!normalizedProjectId || !currentUserId || !otherUserId) return;

      await fetch('http://127.0.0.1:5000/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: normalizedProjectId,
          userId: currentUserId,
          otherUserId: otherUserId,
        }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm(`Delete all messages in this conversation with ${otherUser.name}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/messages/delete-conversation`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: normalizedProjectId,
          userId: currentUserId,
          otherUserId: otherUserId
        }),
      });

      if (response.ok) {
        await response.json();
        setMessages([]);
        onClose();
        onDeleteConversation?.();
        window.dispatchEvent(new Event('message-sent'));
      } else {
        const errorText = await response.text();
        alert('Failed to delete conversation: ' + errorText);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    if (!normalizedProjectId || normalizedProjectId.startsWith('temp-')) {
      alert('Cannot send message: Invalid project.');
      return;
    }

    try {
      setSending(true);

      const response = await fetch('http://127.0.0.1:5000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: normalizedProjectId,
          fromUserId: currentUserId,
          toUserId: otherUserId,
          text: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await fetchMessages();
        setTimeout(scrollToBottom, 0);
        onMessageSent?.();
        window.dispatchEvent(new Event('message-sent'));
      } else {
        const errorText = await response.text();
        alert('Failed to send message: ' + errorText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!normalizedProjectId || !currentUserId || !otherUserId) return;

    fetchMessages();
    markAsRead();

    refreshIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [normalizedProjectId, currentUserId, otherUserId]);

  useEffect(() => {
    setTimeout(scrollToBottom, 0);
  }, [messages]);

  const getSenderName = (message: any) => {
    const fromObj = message.fromUserId;
    if (fromObj && typeof fromObj === 'object' && fromObj.name) return fromObj.name;
    const fromId = typeof fromObj === 'object' ? (fromObj._id || fromObj.id) : fromObj;
    return fromId === currentUserId ? currentUser.name : otherUser.name;
  };

  const isFromCurrentUser = (message: any) => {
    const fromObj = message.fromUserId;
    const fromId = typeof fromObj === 'object' ? (fromObj._id || fromObj.id) : fromObj;
    return fromId === currentUserId;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const groupMessages = (msgs: any[]) => {
    const grouped: Array<{
      date: string;
      messages: Array<{
        message: any;
        showAvatar: boolean;
        showName: boolean;
        showTime: boolean;
      }>;
    }> = [];

    let currentDate = '';
    let currentGroup: any[] = [];

    msgs.forEach((msg, idx) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      const prevMsg = idx > 0 ? msgs[idx - 1] : null;
      const nextMsg = idx < msgs.length - 1 ? msgs[idx + 1] : null;

      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) grouped.push({ date: currentDate, messages: currentGroup });
        currentDate = msgDate;
        currentGroup = [];
      }

      const isFromMe = isFromCurrentUser(msg);
      const prevIsFromMe = prevMsg ? isFromCurrentUser(prevMsg) : false;
      const nextIsFromMe = nextMsg ? isFromCurrentUser(nextMsg) : false;
      const nextDate = nextMsg ? new Date(nextMsg.createdAt).toDateString() : '';

      const timeDiffPrev = prevMsg
        ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
        : Infinity;
      const showAvatar = !prevMsg || (isFromMe !== prevIsFromMe) || timeDiffPrev > 5;

      const showName = !isFromMe && (!prevMsg || isFromMe !== prevIsFromMe);

      const timeDiffNext = nextMsg
        ? (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) / 60000
        : Infinity;
      const showTime = !nextMsg || (isFromMe !== nextIsFromMe) || timeDiffNext > 5 || msgDate !== nextDate;

      currentGroup.push({ message: msg, showAvatar, showName, showTime });
    });

    if (currentGroup.length > 0) grouped.push({ date: currentDate, messages: currentGroup });
    return grouped;
  };

  // Minimized (only for non-inline mode)
  if (isMinimized && !inline) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white shadow-2xl rounded-lg border border-gray-200 z-50">
        <div
          className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between cursor-pointer rounded-t-lg"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">
              {otherUser.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">{otherUser.name}</div>
              <div className="text-xs text-gray-500">{project.title}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-2.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Maximize2 className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Layout classes
  const containerClasses = inline
    ? `w-full h-full max-w-full bg-white border border-gray-200 overflow-hidden flex flex-col min-h-0`
    : `fixed ${isFullscreen ? 'inset-0' : 'bottom-4 right-4 w-96'} bg-white shadow-2xl z-50 border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-0`;

  const fixedHeight = isFullscreen ? '100vh' : `min(600px, calc(100vh - 2rem))`;

  return (
    // ✅ ÖNEMLİ: flex + min-h-0 (input'un en alta oturması için)
    <div
      className={containerClasses}
      style={
        inline
          ? { height: '100%' }
          : (!isFullscreen ? { height: fixedHeight } : undefined)
      }
    >
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
            {otherUser.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">{otherUser.name}</div>
            <div className="text-xs text-gray-500">{project.title}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDeleteConversation}
            className="p-2.5 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
            title="Delete conversation"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          {!inline && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minimize2 className="h-5 w-5 text-gray-600" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages (scroll area) */}
      <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          groupMessages(messages).map((group, groupIdx) => (
            <div key={groupIdx} className="py-2">
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDate(group.messages[0].message.createdAt)}
                </div>
              </div>

              <div className="px-4 space-y-1">
                {group.messages.map(({ message, showAvatar, showName, showTime }) => {
                  const isFromMe = isFromCurrentUser(message);

                  return (
                    <div key={message.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} group`}>
                      {!isFromMe && (
                        <div className="flex-shrink-0 mr-2 self-end">
                          {showAvatar ? (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                              {getSenderName(message).charAt(0)}
                            </div>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </div>
                      )}

                      <div className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                        {showName && !isFromMe && (
                          <div className="text-xs font-medium text-gray-600 mb-1 px-1">{getSenderName(message)}</div>
                        )}

                        <div
                          className={`rounded-lg px-3 py-2 ${
                            isFromMe
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none shadow-sm'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                          {showTime && (
                            <div className={`text-xs mt-1 ${isFromMe ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatTime(message.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      {isFromMe && (
                        <div className="flex-shrink-0 ml-2 self-end">
                          {showAvatar ? (
                            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                              {currentUser.name.charAt(0)}
                            </div>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ✅ Input (en alta sabit) */}
      <div className="border-t border-gray-200 p-4 bg-white mt-auto shrink-0">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className={`p-2 rounded-lg ${
              newMessage.trim() && !sending
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } transition-colors`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { Message, User, Project } from '../types';
import { api } from '../api';


interface ChatPanelProps {
  project: Project;
  currentUser: User;
  otherUser: User;
  onClose: () => void;
  onMessageSent?: () => void;
  inline?: boolean;
  onDeleteConversation?: () => void;
  defaultFullscreen?: boolean;
  showProjectTitle?: boolean;
}

export function ChatPanel({
  project,
  currentUser,
  otherUser,
  onClose,
  onMessageSent,
  inline = false,
  onDeleteConversation,
  defaultFullscreen = false,
  showProjectTitle = false
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  const getId = (x: any) => x?.id || x?._id;
  const currentUserId = getId(currentUser);
  const otherUserId = getId(otherUser);

  // Chat scroll behavior (WhatsApp-style):
  // - Auto-scroll only on send or initial open
  // - Never override manual user scrolling
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
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
      const response = await fetch(api(
        `/api/messages/thread?projectId=${normalizedProjectId}&user1=${currentUserId}&user2=${otherUserId}`
      ));

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

      await fetch(api('/api/messages/mark-read'), {
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
      const response = await fetch(api('/api/messages/delete-conversation'), {
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

      const response = await fetch(api('/api/messages'), {
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
        // Auto-scroll after sending message
        scrollToBottom();
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
    
    // Initial fetch - scroll to bottom after first load
    const initialLoad = async () => {
      await fetchMessages();
      setTimeout(() => scrollToBottom(), 100);
    };
    initialLoad();
    markAsRead();

    // Interval ONLY fetches messages - does NOT affect scroll
    refreshIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [normalizedProjectId, currentUserId, otherUserId]);

  // Disable auto-scroll when user manually scrolls
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldAutoScrollRef.current = false;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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

  // WhatsApp-style message grouping: group consecutive messages from same sender ONLY
  const groupMessages = (msgs: any[]) => {
    if (msgs.length === 0) return [];

    const grouped: Array<{
      date: string;
      messageGroups: Array<{
        senderId: string;
        senderName: string;
        isFromMe: boolean;
      messages: Array<{
        message: any;
        showTime: boolean;
        }>;
      }>;
    }> = [];

    let currentDate = '';
    let currentDateGroup: Array<{
      senderId: string;
      senderName: string;
      isFromMe: boolean;
      messages: Array<{ message: any; showTime: boolean }>;
    }> = [];

    msgs.forEach((msg, idx) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      const isFromMe = isFromCurrentUser(msg);
      const senderId = typeof msg.fromUserId === 'object' 
        ? (msg.fromUserId._id || msg.fromUserId.id) 
        : msg.fromUserId;
      const senderName = getSenderName(msg);
      const nextMsg = idx < msgs.length - 1 ? msgs[idx + 1] : null;
      const nextSenderId = nextMsg 
        ? (typeof nextMsg.fromUserId === 'object' 
            ? (nextMsg.fromUserId._id || nextMsg.fromUserId.id) 
            : nextMsg.fromUserId)
        : null;
      const timeDiffNext = nextMsg
        ? (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) / 60000
        : Infinity;
      const nextDate = nextMsg ? new Date(nextMsg.createdAt).toDateString() : '';

      // New date group
      if (msgDate !== currentDate) {
        if (currentDateGroup.length > 0) {
          grouped.push({ date: currentDate, messageGroups: currentDateGroup });
        }
        currentDate = msgDate;
        currentDateGroup = [];
      }

      // Check if this message starts a new sender group
      // IMPORTANT: time difference must NOT create new message groups (WhatsApp behavior)
      // New group ONLY when senderId changes
      const lastGroup = currentDateGroup[currentDateGroup.length - 1];
      const shouldStartNewGroup = !lastGroup || lastGroup.senderId !== senderId;

      // Show timestamp if: last message OR next message is from different sender OR >5 min gap OR different date
      const showTime = !nextMsg || senderId !== nextSenderId || timeDiffNext > 5 || msgDate !== nextDate;

      if (shouldStartNewGroup) {
        // Start new sender group
        currentDateGroup.push({
          senderId,
          senderName,
          isFromMe,
          messages: [{
            message: msg,
            showTime
          }]
        });
      } else {
        // Add to existing sender group
        lastGroup.messages.push({
          message: msg,
          showTime
        });
      }
    });

    if (currentDateGroup.length > 0) {
      grouped.push({ date: currentDate, messageGroups: currentDateGroup });
    }

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
              {showProjectTitle && (
                <div className="text-xs text-gray-500">{project.title}</div>
              )}
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
    ? `w-full max-w-full bg-white border border-gray-200 min-h-0 h-full max-h-full overflow-hidden`
    : `fixed ${isFullscreen ? 'inset-0' : 'bottom-4 right-4 w-96'} bg-white shadow-2xl z-50 border border-gray-200 rounded-lg flex flex-col min-h-0`;
  
  const fixedHeight = isFullscreen ? '100vh' : `min(600px, calc(100vh - 2rem))`;

  return (
    <div
      className={containerClasses}
      style={
        inline
          ? { display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0, height: '100%', maxHeight: '100%' }
          : (!isFullscreen ? { height: fixedHeight, display: 'flex', flexDirection: 'column', position: 'relative' } : { display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' })
      }
    >
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between shrink-0" style={{ flexShrink: 0 }}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
            {otherUser.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">{otherUser.name}</div>
            {showProjectTitle && (
              <div className="text-xs text-gray-500">{project.title}</div>
            )}
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

      {/* Messages (scroll area) - SINGLE CONTAINER, NORMAL FLOW */}
      <div 
        ref={messagesContainerRef}
        className="min-h-0 max-h-full overflow-y-auto bg-gray-50 overscroll-contain touch-pan-y"
        tabIndex={0}
        aria-label="Chat messages"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overflowY: 'auto',
          minHeight: 0
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-y-2 py-4">
            {groupMessages(messages).map((dateGroup, dateGroupIdx) => (
              <React.Fragment key={dateGroupIdx}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-2">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatDate(dateGroup.date)}
                </div>
              </div>

                {/* Message groups by sender - ALL IN NORMAL FLOW */}
                {dateGroup.messageGroups.map((senderGroup, senderGroupIdx) => {
                  const isFromMe = senderGroup.isFromMe;
                  // Show sender name for each non-me group (WhatsApp style)
                  const showSenderName = !isFromMe;

                  return (
                    <div 
                      key={`${senderGroup.senderId}-${senderGroupIdx}`}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} items-end gap-2 px-4`}
                    >
                      {/* Avatar - only for others, show once per group */}
                      {!isFromMe && (
                        <div className="flex-shrink-0 self-end">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                            {senderGroup.senderName.charAt(0)}
                            </div>
                        </div>
                      )}

                      {/* Message bubbles */}
                      <div className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'}`} style={{ maxWidth: 'calc(100% - 3rem)' }}>
                        {/* Sender name - only for others, show on each group */}
                        {showSenderName && (
                          <div className="text-xs font-medium text-gray-600 mb-1 px-1">
                            {senderGroup.senderName}
                          </div>
                        )}

                        {/* Message bubbles in group - Each message is a separate bubble */}
                        <div className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'} gap-2`}>
                          {senderGroup.messages.map(({ message, showTime }, msgIdx) => {
                            return (
                              <div
                                key={message.id}
                                className={`rounded-lg px-3 py-2 ${
                                  isFromMe
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                                }`}
                              >
                                <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                                <div className={`text-xs mt-1 ${isFromMe ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {formatTime(message.createdAt)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Avatar for current user - show once per group */}
                      {isFromMe && (
                        <div className="flex-shrink-0 self-end">
                            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                              {currentUser.name.charAt(0)}
                            </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
            </div>
        )}
      </div>

      {/* Input (fixed at bottom) */}
      <div className="border-t border-gray-200 p-4 bg-white shrink-0" style={{ flexShrink: 0 }}>
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

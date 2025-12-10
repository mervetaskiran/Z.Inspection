import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minimize2, Maximize2, Square, Trash2 } from 'lucide-react';
import { Message, User, Project } from '../types';

interface ChatPanelProps {
  project: Project;
  currentUser: User;
  otherUser: User;
  onClose: () => void;
  onMessageSent?: () => void; // Callback to refresh notifications
  inline?: boolean; // If true, render inline instead of fixed position
  onDeleteConversation?: () => void; // Callback when conversation is deleted
}

export function ChatPanel({ project, currentUser, otherUser, onClose, onMessageSent, inline = false, onDeleteConversation }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Normalize project id (supports id or _id)
  const normalizedProjectId =
    (project as any).id ||
    (project as any)._id ||
    (project as any).projectId ||
    '';

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/messages/thread?projectId=${normalizedProjectId}&user1=${currentUser.id}&user2=${otherUser.id}`
      );
      if (response.ok) {
        const data = await response.json();
        const formatted = data.map((m: any) => ({
          ...m,
          id: m._id || m.id,
          createdAt: m.createdAt || m.timestamp,
          fromUserId: m.fromUserId?._id || m.fromUserId?.id || m.fromUserId,
          toUserId: m.toUserId?._id || m.toUserId?.id || m.toUserId,
        }));
        setMessages(formatted);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch('http://127.0.0.1:5000/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: normalizedProjectId,
          userId: currentUser.id,
          otherUserId: otherUser.id,
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
          userId: currentUser.id,
          otherUserId: otherUser.id
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Conversation deleted:', result);
        // Clear messages
        setMessages([]);
        // Close panel
        onClose();
        // Call callback if provided
        if (onDeleteConversation) {
          onDeleteConversation();
        }
        // Dispatch event
        window.dispatchEvent(new Event('message-sent'));
      } else {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Unknown error' };
        }
        alert('Failed to delete conversation: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    // Validate project ID
    if (!normalizedProjectId || normalizedProjectId === 'temp-chat-' || normalizedProjectId.startsWith('temp-')) {
      console.error('Invalid project ID:', normalizedProjectId, project);
      alert('Cannot send message: Invalid project. Please contact support.');
      return;
    }

    try {
      setSending(true);
      console.log('Sending message:', {
        projectId: normalizedProjectId,
        fromUserId: currentUser.id,
        toUserId: otherUser.id,
        text: newMessage.trim().substring(0, 50)
      });

      const response = await fetch('http://127.0.0.1:5000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: normalizedProjectId,
          fromUserId: currentUser.id,
          toUserId: otherUser.id,
          text: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Message sent successfully:', result);
        setNewMessage('');
        await fetchMessages();
        scrollToBottom();
        // Trigger notification refresh
        if (onMessageSent) {
          onMessageSent();
        }
        // Also dispatch event directly
        window.dispatchEvent(new Event('message-sent'));
      } else {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Unknown error' };
        }
        console.error('Failed to send message:', response.status, error);
        alert('Failed to send message: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!normalizedProjectId) {
      console.error('Invalid project ID:', project);
      return;
    }
    
    fetchMessages();
    markAsRead();

    // Auto-refresh every 3 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [normalizedProjectId, currentUser.id, otherUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getSenderName = (message: Message) => {
    if (typeof message.fromUserId === 'object' && message.fromUserId?.name) {
      return message.fromUserId.name;
    }
    return message.fromUserId === currentUser.id ? currentUser.name : otherUser.name;
  };

  const isFromCurrentUser = (message: Message) => {
    const fromId = typeof message.fromUserId === 'object' ? message.fromUserId?.id : message.fromUserId;
    return fromId === currentUser.id;
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

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  // Group messages by date and sender
  const groupMessages = (msgs: Message[]) => {
    const grouped: Array<{
      date: string;
      messages: Array<{
        message: Message;
        showAvatar: boolean;
        showName: boolean;
        showTime: boolean;
      }>;
    }> = [];

    let currentDate = '';
    let currentGroup: typeof grouped[0]['messages'] = [];

    msgs.forEach((msg, idx) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      const prevMsg = idx > 0 ? msgs[idx - 1] : null;
      const nextMsg = idx < msgs.length - 1 ? msgs[idx + 1] : null;

      // Check if we need a new date group
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          grouped.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [];
      }

      const isFromMe = isFromCurrentUser(msg);
      const prevIsFromMe = prevMsg ? isFromCurrentUser(prevMsg) : false;
      const nextIsFromMe = nextMsg ? isFromCurrentUser(nextMsg) : false;
      const nextDate = nextMsg ? new Date(nextMsg.createdAt).toDateString() : '';

      // Show avatar if: first message, different sender, or 5+ minutes gap
      const timeDiffPrev = prevMsg ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000 : Infinity;
      const showAvatar = !prevMsg || !prevIsFromMe || (isFromMe !== prevIsFromMe) || timeDiffPrev > 5;

      // Show name if not from me and (first message or different sender)
      const showName = !isFromMe && (!prevMsg || isFromMe !== prevIsFromMe);

      // Show time if: last message, different sender, or 5+ minutes gap, or different date
      const timeDiffNext = nextMsg ? (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) / 60000 : Infinity;
      const showTime = !nextMsg || isFromMe !== nextIsFromMe || timeDiffNext > 5 || msgDate !== nextDate;

      currentGroup.push({
        message: msg,
        showAvatar,
        showName,
        showTime,
      });
    });

    if (currentGroup.length > 0) {
      grouped.push({ date: currentDate, messages: currentGroup });
    }

    return grouped;
  };

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
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <Maximize2 className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If inline mode, don't use fixed positioning
  const containerClasses = inline
    ? `flex flex-col h-full bg-white border border-gray-200 overflow-hidden`
    : `fixed ${isFullscreen ? 'inset-0' : 'bottom-4 right-4 w-96'} bg-white shadow-2xl flex flex-col z-50 border border-gray-200 rounded-lg overflow-hidden`;
  
  // Calculate height for fixed mode (not fullscreen) - ensure it fits viewport
  const fixedHeight = isFullscreen ? '100vh' : `min(600px, calc(100vh - 2rem))`;

  return (
    <div className={containerClasses} style={!inline && !isFullscreen ? { height: fixedHeight } : undefined}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
            {otherUser.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">{otherUser.name}</div>
            <div className="text-xs text-gray-500">{project.title}</div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {/* Delete conversation button */}
          <button
            onClick={handleDeleteConversation}
            className="p-1.5 hover:bg-red-50 rounded transition-colors text-red-600 hover:text-red-700"
            title="Delete conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {!inline && (
            <>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Minimize"
              >
                <Minimize2 className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                <Square className="h-4 w-4 text-gray-600" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
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
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDate(group.messages[0].message.createdAt)}
                </div>
              </div>

              {/* Messages in this group */}
              <div className="px-4 space-y-1">
                {group.messages.map(({ message, showAvatar, showName, showTime }) => {
                  const isFromMe = isFromCurrentUser(message);
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} group`}
                    >
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
                          <div className="text-xs font-medium text-gray-600 mb-1 px-1">
                            {getSenderName(message)}
                          </div>
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
                            <div
                              className={`text-xs mt-1 ${
                                isFromMe ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
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

      {/* Input - Always visible for all roles */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
            autoFocus
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


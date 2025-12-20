import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Pin, MessageSquare, Hash, Loader2, Trash2 } from 'lucide-react';
import { User, Project, Message } from '../types';
import { roleColors } from '../utils/constants';
import { formatTime, getProjectById } from '../utils/helpers';
import { api } from '../api';

interface SharedAreaProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  onBack: () => void;
}

interface SharedDiscussionResponse {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  text: string;
  projectId?: {
    _id: string;
    title: string;
  };
  isPinned: boolean;
  replyTo?: any;
  mentions?: any[];
  createdAt: string;
  updatedAt: string;
}

export function SharedArea({ currentUser, projects, users, onBack }: SharedAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const roleColor = roleColors[currentUser.role as keyof typeof roleColors];

  // Store full discussion data with populated user info
  const [discussionsData, setDiscussionsData] = useState<SharedDiscussionResponse[]>([]);

  // Fetch discussions from backend
  useEffect(() => {
    const fetchDiscussions = async () => {
      setLoading(true);
      try {
        const projectParam = selectedProject !== 'all' ? `projectId=${selectedProject}` : '';
        const url = projectParam ? api(`/api/shared-discussions?${projectParam}`) : api('/api/shared-discussions');
        const response = await fetch(url);
        if (response.ok) {
          const data: SharedDiscussionResponse[] = await response.json();
          setDiscussionsData(data);
          // Transform backend response to frontend Message format
          const transformedMessages: Message[] = data.map((discussion) => ({
            id: discussion._id,
            userId: discussion.userId._id,
            text: discussion.text,
            timestamp: discussion.createdAt,
            isPinned: discussion.isPinned,
            relatedProject: discussion.projectId?._id,
            replyTo: discussion.replyTo?._id,
            mentions: discussion.mentions?.map((m: any) => m._id || m) || []
          }));
          setMessages(transformedMessages);
        } else {
          console.error('Failed to fetch discussions');
        }
      } catch (error) {
        console.error('Error fetching discussions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscussions();
  }, [selectedProject]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const userId = currentUser.id || (currentUser as any)._id;
      
      if (!userId) {
        alert('User ID not found. Please log in again.');
        setSending(false);
        return;
      }

      const projectId = selectedProject !== 'all' ? selectedProject : null;

      const payload = {
        userId,
        text: newMessage,
        projectId: projectId || undefined,
        replyTo: replyingTo || undefined
      };

      console.log('Sending message with payload:', payload);
      console.log('Current user:', currentUser);

      const response = await fetch(api('/api/shared-discussions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const newDiscussion: SharedDiscussionResponse = await response.json();
        console.log('Message sent successfully:', newDiscussion);
        // Add to discussions data
        setDiscussionsData([newDiscussion, ...discussionsData]);
        // Transform and add to messages
        const newMessageObj: Message = {
          id: newDiscussion._id,
          userId: newDiscussion.userId._id,
          text: newDiscussion.text,
          timestamp: newDiscussion.createdAt,
          isPinned: newDiscussion.isPinned,
          relatedProject: newDiscussion.projectId?._id,
          replyTo: newDiscussion.replyTo?._id,
          mentions: newDiscussion.mentions?.map((m: any) => m._id || m) || []
        };
        setMessages([newMessageObj, ...messages]);
        setNewMessage('');
        setReplyingTo(null);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSending(false);
    }
  };

  const togglePin = async (messageId: string) => {
    if (currentUser.role !== 'admin') return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      const response = await fetch(api(`/api/shared-discussions/${messageId}/pin`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPinned: !message.isPinned
        })
      });

      if (response.ok) {
        const updated: SharedDiscussionResponse = await response.json();
        setMessages(messages.map(msg =>
          msg.id === messageId
            ? { ...msg, isPinned: updated.isPinned }
            : msg
        ));
        // Update discussionsData too
        setDiscussionsData(discussionsData.map(d =>
          d._id === messageId
            ? { ...d, isPinned: updated.isPinned }
            : d
        ));
      } else {
        alert('Failed to update pin status');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin status');
    }
  };

  const handleDelete = async (messageId: string) => {
    const discussion = discussionsData.find(d => d._id === messageId);
    if (!discussion) return;

    const currentUserId = currentUser.id || (currentUser as any)._id;
    const discussionUserId = discussion.userId._id || discussion.userId;
    const isOwner = currentUserId === discussionUserId;
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      alert('You can only delete your own messages or be an admin to delete messages.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const response = await fetch(api(`/api/shared-discussions/${messageId}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessages(messages.filter(msg => msg.id !== messageId));
        setDiscussionsData(discussionsData.filter(d => d._id !== messageId));
      } else {
        const errorText = await response.text();
        alert(`Failed to delete message: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  // Get user info from discussion data or users list
  const getUserFromMessage = (messageId: string): User | null => {
    const discussion = discussionsData.find(d => d._id === messageId);
    if (discussion && discussion.userId) {
      // Use populated user data from backend
      return {
        id: discussion.userId._id,
        name: discussion.userId.name,
        email: discussion.userId.email,
        role: discussion.userId.role as any
      };
    }
    // Fallback to users list
    const message = messages.find(m => m.id === messageId);
    if (message) {
      return users.find(u => u.id === message.userId) || null;
    }
    return null;
  };

  const filteredMessages = selectedProject === 'all' 
    ? messages 
    : messages.filter(msg => msg.relatedProject === selectedProject || msg.isPinned);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <div>
                <h1 className="text-xl text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Shared Discussion Area
                </h1>
                <p className="text-gray-600">Collaborative space for cross-functional discussions</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Discussions</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-73px)]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {filteredMessages.map(message => {
                const user = getUserFromMessage(message.id);
                const discussion = discussionsData.find(d => d._id === message.id);
                const project = discussion?.projectId 
                  ? { id: discussion.projectId._id, title: discussion.projectId.title }
                  : (message.relatedProject ? getProjectById(message.relatedProject, projects) : null);
                const userColor = user ? roleColors[user.role as keyof typeof roleColors] : '#6B7280';

              return (
                <div key={message.id} className={`${message.isPinned ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border'} rounded-lg p-4 shadow-sm`}>
                  <div className="flex items-start space-x-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                      style={{ backgroundColor: userColor }}
                    >
                      {user?.name.charAt(0) || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm text-gray-900">{user?.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: userColor }}>
                          {user?.role}
                        </span>
                        <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                        {message.isPinned && (
                          <Pin className="h-3 w-3 text-yellow-600" />
                        )}
                      </div>

                      {project && (
                        <div className="text-xs text-blue-600 mb-2 flex items-center">
                          <Hash className="h-3 w-3 mr-1" />
                          {project.title}
                        </div>
                      )}

                      {/* Show reply to message if exists */}
                      {discussion?.replyTo && (() => {
                        const replyToObj = discussion.replyTo;
                        const replyToText = typeof replyToObj === 'object' && replyToObj !== null && 'text' in replyToObj
                          ? (replyToObj as any).text
                          : null;
                        const replyToUserId = typeof replyToObj === 'object' && replyToObj !== null && 'userId' in replyToObj
                          ? (replyToObj as any).userId
                          : null;
                        const replyToUserName = typeof replyToUserId === 'object' && replyToUserId !== null && 'name' in replyToUserId
                          ? replyToUserId.name
                          : null;
                        
                        if (!replyToText) return null;
                        
                        return (
                          <div className="bg-gray-50 border-l-2 border-blue-500 pl-3 py-2 mb-2 rounded text-xs text-gray-600">
                            <div className="font-medium text-gray-700">
                              Replying to {replyToUserName ? `${replyToUserName}:` : 'message:'}
                            </div>
                            <div className="text-gray-600 mt-1">
                              {replyToText.substring(0, 100)}{replyToText.length > 100 ? '...' : ''}
                            </div>
                          </div>
                        );
                      })()}

                      <p className="text-gray-800 text-sm leading-relaxed">{message.text}</p>

                      <div className="flex items-center space-x-3 mt-2">
                        <button 
                          onClick={() => {
                            setReplyingTo(message.id);
                            // Scroll to input
                            setTimeout(() => {
                              const textarea = document.querySelector('textarea');
                              textarea?.focus();
                            }, 100);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Reply
                        </button>
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => togglePin(message.id)}
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                          >
                            <Pin className="h-3 w-3 mr-1" />
                            {message.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                        )}
                        {(currentUser.role === 'admin' || (user && (currentUser.id || (currentUser as any)._id) === (user.id || (user as any)._id))) && (
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

              {filteredMessages.length === 0 && !loading && (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg text-gray-900 mb-2">No discussions yet</h3>
                  <p className="text-gray-600">Start the conversation by posting the first message.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <div className="flex-1">
                {replyingTo && (() => {
                  const replyToMessage = discussionsData.find(d => d._id === replyingTo);
                  const replyToUser = replyToMessage ? getUserFromMessage(replyingTo) : null;
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2 flex items-center justify-between">
                      <div className="text-xs text-gray-700">
                        <span className="font-medium">Replying to {replyToUser?.name || 'message'}:</span>
                        <span className="ml-2 text-gray-600">
                          {replyToMessage?.text.substring(0, 50)}{replyToMessage && replyToMessage.text.length > 50 ? '...' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })()}
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={replyingTo ? 'Write your reply...' : `Share your thoughts${selectedProject !== 'all' ? ` about ${getProjectById(selectedProject, projects)?.title}` : ''}...`}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                    if (e.key === 'Escape' && replyingTo) {
                      setReplyingTo(null);
                    }
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {replyingTo ? 'Press Enter to send reply, Esc to cancel' : 'Use @username to mention someone • Press Enter to send, Shift+Enter for new line'}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className={`px-6 py-3 text-white rounded-lg transition-colors hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center ${
                  newMessage.trim() && !sending ? 'shadow-md' : ''
                }`}
                style={{ backgroundColor: newMessage.trim() && !sending ? '#2563eb' : roleColor }}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Guidelines Sidebar */}
      <div className="fixed right-6 top-24 w-72 bg-white rounded-lg shadow-lg border p-4 max-h-96 overflow-y-auto hidden lg:block">
        <h3 className="text-sm mb-3 text-gray-900">Discussion Guidelines</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Keep discussions focused on ethical AI evaluation topics</span>
          </div>
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Use @mentions to notify specific team members</span>
          </div>
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Link discussions to relevant projects when possible</span>
          </div>
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Admins can pin important messages for visibility</span>
          </div>
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Transform key insights into formal project claims</span>
          </div>
        </div>
      </div>
    </div>
  );
}
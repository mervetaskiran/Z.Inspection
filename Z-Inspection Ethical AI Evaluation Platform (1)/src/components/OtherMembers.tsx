import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Globe, Mail, MessageSquare, Clock } from 'lucide-react';
import { User, Project, Message } from '../types';
import { ChatPanel } from './ChatPanel';
import { roleColors } from '../utils/constants';
import { getUserProjects, formatRoleName, formatLastSeen } from '../utils/helpers';

interface OtherMembersProps {
  currentUser: User;
  users: User[];
  projects: Project[];
  onBack: () => void;
}

export function OtherMembers({ currentUser, users, projects, onBack }: OtherMembersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'members' | 'chats'>('members');
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatOtherUser, setChatOtherUser] = useState<User | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);

  // Kendim hariç diğer kullanıcılar
  // Admin hariç diğer uzmanlar use-case-owner'ı göremez
  const otherUsers = users.filter((user) => {
    if (user.id === currentUser.id) return false;
    // Admin herkesi görebilir
    if (currentUser.role === 'admin') return true;
    // Diğer uzmanlar use-case-owner'ı göremez
    if (user.role === 'use-case-owner') return false;
    return true;
  });

  const filteredUsers = otherUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    const isOnline = (user as any).isOnline as boolean | undefined;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && isOnline) ||
      (statusFilter === 'offline' && !isOnline);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Find or create a project for communication with a user (UseCaseOwner-Admin mantığı)
  const getCommunicationProject = async (otherUser: User): Promise<Project> => {
    // Try to find an existing project where both users are assigned
    let commProject = projects.find(p => 
      p.assignedUsers.includes(currentUser.id) && 
      p.assignedUsers.includes(otherUser.id)
    );
    
    // If not found, try to find a project with similar name
    if (!commProject) {
      const projectName = `Communication: ${currentUser.name} & ${otherUser.name}`;
      commProject = projects.find(p => 
        p.title === projectName || 
        p.title.includes('Communication') ||
        (p.assignedUsers.includes(currentUser.id) && p.assignedUsers.includes(otherUser.id))
      );
    }
    
    // If still not found, use first project as fallback
    if (!commProject && projects.length > 0) {
      commProject = projects[0];
    }
    
    // If still no project, create one via API
    if (!commProject) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Communication: ${currentUser.name} & ${otherUser.name}`,
            shortDescription: `Direct communication between ${currentUser.name} and ${otherUser.name}`,
            fullDescription: 'This project is used for direct communication between team members.',
            stage: 'set-up',
            status: 'ongoing',
            targetDate: new Date().toISOString(),
            assignedUsers: [currentUser.id, otherUser.id],
            progress: 0
          }),
        });
        if (response.ok) {
          const newProject = await response.json();
          commProject = { ...newProject, id: newProject._id || newProject.id };
          console.log('Created communication project:', commProject);
        } else {
          const error = await response.text();
          console.error('Failed to create project:', response.status, error);
        }
      } catch (error) {
        console.error('Error creating communication project:', error);
      }
    }
    
    // Final fallback - use existing project
    if (!commProject) {
      // Try to use any project where current user is assigned
      commProject = projects.find(p => p.assignedUsers.includes(currentUser.id));
      
      if (!commProject) {
        console.error('No project available for communication. Please create a project first.');
        alert('Cannot start conversation: No project available. Please contact an admin to create a project.');
        throw new Error('No project available');
      }
    }
    
    console.log('Using project for communication:', commProject);
    return commProject;
  };

  const handleContactUser = async (user: User) => {
    try {
      console.log('handleContactUser called for:', { user, currentUser });
      const commProject = await getCommunicationProject(user);
      console.log('Opening chat with:', { user, project: commProject });
      if (!commProject) {
        throw new Error('No project available for communication');
      }
      
      // Navigate to Chats tab first
      setActiveTab('chats');
      
      // Fetch conversations to ensure we have the latest data
      await fetchConversations();
      
      // Set chat state
      setChatOtherUser(user);
      setChatProject(commProject);
      setChatPanelOpen(true);
    } catch (error) {
      console.error('Error opening chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Cannot open chat: ' + errorMessage);
    }
  };

  // Fetch all conversations (chats)
  const fetchConversations = async () => {
    try {
      // Get all messages where current user is involved
      const response = await fetch(`http://127.0.0.1:5000/api/messages/conversations?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'chats') {
      fetchConversations();
      // Refresh conversations every 10 seconds
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser.id]);

  // Listen for new messages
  useEffect(() => {
    const handleMessageSent = () => {
      if (activeTab === 'chats') {
        setTimeout(fetchConversations, 1000);
      }
    };
    window.addEventListener('message-sent', handleMessageSent);
    return () => window.removeEventListener('message-sent', handleMessageSent);
  }, [activeTab]);

  const handleOpenChat = (conversation: any) => {
    const otherUser = users.find(u => u.id === conversation.otherUserId);
    const project = projects.find(p => p.id === conversation.projectId);
    if (otherUser && project) {
      setChatOtherUser(otherUser);
      setChatProject(project);
      setChatPanelOpen(true);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b flex-shrink-0">
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
                    <Users className="h-5 w-5 mr-2" />
                    Team Members
                  </h1>
                  <p className="text-gray-600">
                    Connect with other experts on the platform
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {activeTab === 'members' 
                  ? `${filteredUsers.length} of ${otherUsers.length} members`
                  : `${conversations.length} conversations`}
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="px-6 border-t border-gray-200">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'members'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Members
              </button>
              <button
                onClick={() => setActiveTab('chats')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'chats'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Chats
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="ethical-expert">Ethical Expert</option>
            <option value="medical-expert">Medical Expert</option>
            <option value="use-case-owner">Use Case Owner</option>
            <option value="education-expert">Education Expert</option>
            <option value="technical-expert">Technical Expert</option>
            <option value="legal-expert">Legal Expert</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'members' ? (
            <div className="px-6 py-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => {
            const userColor =
              roleColors[user.role as keyof typeof roleColors] || '#1F2937';

            // Backend tarafında projeler id üzerinden atanıyorsa helper'ı kullan
            const userProjects = getUserProjects(user.id, projects);

            const isOnline = (user as any).isOnline as boolean | undefined;
            const lastSeen = (user as any).lastSeen;

            return (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
                      style={{ backgroundColor: userColor }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg text-gray-900 truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>

                    <div className="flex items-center mt-1 space-x-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 border capitalize"
                        style={{
                          color: userColor,
                          borderColor: `${userColor}30`,
                          backgroundColor: `${userColor}10`
                        }}
                      >
                        {formatRoleName(user.role)}
                      </span>
                      <div className="flex items-center text-xs text-gray-500">
                        <Globe className="h-3 w-3 mr-1" />
                        {isOnline ? (
                          <span className="text-green-600">Online</span>
                        ) : lastSeen ? (
                          <span>
                            Last seen {formatLastSeen(lastSeen)}
                          </span>
                        ) : (
                          <span>Last seen unknown</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Active Projects ({userProjects.length})
                  </div>
                  <div className="space-y-1">
                    {userProjects.length > 0 ? (
                      userProjects.slice(0, 2).map((project) => (
                        <div
                          key={project.id}
                          className="text-xs text-gray-700 bg-gray-50 px-2 py-1.5 rounded border border-gray-100 truncate"
                        >
                          {project.title}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 italic">
                        No active projects assigned
                      </div>
                    )}

                    {userProjects.length > 2 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{userProjects.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    console.log('Contact Member button clicked for user:', user);
                    handleContactUser(user);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: userColor }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Member
                </button>
              </div>
            );
            })}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 col-span-full">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg text-gray-900 mb-2">No members found</h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? 'No members match your search criteria.'
                    : 'There are no other members on the platform yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Chats List - Microsoft Teams style */
        <div className="px-6 py-6">
          <div className="max-w-4xl mx-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-600">
                  Start a conversation with a team member to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const otherUser = users.find(u => u.id === conv.otherUserId);
                  const project = projects.find(p => p.id === conv.projectId);
                  if (!otherUser || !project) return null;

                  const userColor = roleColors[otherUser.role as keyof typeof roleColors] || '#1F2937';
                  const hasUnread = conv.unreadCount > 0;

                  return (
                    <div
                      key={`${conv.projectId}-${conv.otherUserId}`}
                      onClick={() => handleOpenChat(conv)}
                      className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-all ${
                        hasUnread ? 'border-blue-500 border-l-4' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
                            style={{ backgroundColor: userColor }}
                          >
                            {otherUser.name.charAt(0).toUpperCase()}
                          </div>
                          {hasUnread && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <h3 className={`text-base font-medium ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                {otherUser.name}
                              </h3>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {formatRoleName(otherUser.role)}
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(conv.lastMessageTime)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-1 truncate">
                            {project.title}
                          </p>
                          <p className={`text-sm ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-600'} line-clamp-2`}>
                            {conv.lastMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          )}

          {/* Basit İstatistikler */}
          <div className="bg-white border-t px-6 py-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'admin').length}
            </div>
            <div className="text-sm text-gray-600">Admins</div>
          </div>
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'ethical-expert').length}
            </div>
            <div className="text-sm text-gray-600">Ethical Experts</div>
          </div>
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'technical-expert').length}
            </div>
            <div className="text-sm text-gray-600">Technical Experts</div>
          </div>
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'medical-expert').length}
            </div>
            <div className="text-sm text-gray-600">Medical Experts</div>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Chat Panel - Sidebar style */}
      {chatPanelOpen && chatOtherUser && chatProject && (
        <div className="w-96 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col overflow-hidden">
          <ChatPanel
            project={chatProject}
            currentUser={currentUser}
            otherUser={chatOtherUser}
            inline={true}
            onClose={() => {
              setChatPanelOpen(false);
              setChatOtherUser(null);
              setChatProject(null);
              if (activeTab === 'chats') {
                fetchConversations();
              }
            }}
            onMessageSent={() => {
              window.dispatchEvent(new Event('message-sent'));
              if (activeTab === 'chats') {
                setTimeout(fetchConversations, 1000);
              }
            }}
            onDeleteConversation={() => {
              setChatPanelOpen(false);
              setChatOtherUser(null);
              setChatProject(null);
              if (activeTab === 'chats') {
                fetchConversations();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

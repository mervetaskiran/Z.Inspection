import React, { useState, useEffect, useRef } from 'react';
import { Plus, Folder, MessageSquare, Users, LogOut, Search, BarChart3, AlertTriangle, UserPlus, X, Link as LinkIcon, CheckCircle2, Trash2, Bell, Clock } from 'lucide-react';
import { Project, User, UseCase } from '../types';
import { ChatPanel } from './ChatPanel';
import { ProfileModal } from './ProfileModal';

interface AdminDashboardEnhancedProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  useCases?: UseCase[];
  onViewProject: (project: Project, chatUserId?: string) => void;
  onStartEvaluation: (project: Project) => void;
  onCreateProject: (project: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
}

const statusColors = {
  ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  proven: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  disproven: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
};

const stageLabels = {
  'set-up': 'Set-up',
  assess: 'Assess',
  resolve: 'Resolve'
};

const useCaseStatusColors = {
  'assigned': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'in-review': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'completed': { bg: 'bg-green-100', text: 'text-green-800' }
};

export function AdminDashboardEnhanced({
  currentUser,
  projects,
  users,
  useCases = [],
  onViewProject,
  onStartEvaluation,
  onCreateProject,
  onDeleteProject,
  onNavigate,
  onLogout,
  onUpdateUser
}: AdminDashboardEnhancedProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'use-case-assignments' | 'project-creation' | 'reports' | 'chats'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignExpertsModal, setShowAssignExpertsModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatOtherUser, setChatOtherUser] = useState<User | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  // Fetch all conversations (chats)
  const fetchConversations = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/messages/conversations?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setAllConversations(data || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

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
        alert('Cannot start conversation: No project available. Please create a project first.');
        throw new Error('No project available');
      }
    }
    
    console.log('Using project for communication:', commProject);
    return commProject;
  };

  const handleOpenChat = async (conversation: any) => {
    const otherUser = users.find(u => u.id === conversation.otherUserId);
    if (otherUser) {
      try {
        const project = await getCommunicationProject(otherUser);
        console.log('Opening chat with:', { otherUser, project });
        setChatOtherUser(otherUser);
        setChatProject(project);
        setChatPanelOpen(true);
      } catch (error) {
        console.error('Error opening chat:', error);
        alert('Cannot open chat: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleDeleteConversation = async (projectId: string, otherUserId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/messages/delete-conversation`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: currentUser.id,
          otherUserId
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        // Close chat panel if this conversation is open
        if (chatProject?.id === projectId && chatOtherUser?.id === otherUserId) {
          setChatPanelOpen(false);
          setChatOtherUser(null);
          setChatProject(null);
        }
        // Refresh conversations list
        fetchConversations();
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

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/messages/unread-count?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Admin unread count fetched:', data);
        setUnreadCount(data.totalCount || 0);
        setUnreadConversations(data.conversations || []);
      } else {
        console.error('Admin failed to fetch unread count:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Poll for unread messages every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30 seconds
    
    // Listen for message sent events to refresh immediately
    const handleMessageSent = () => {
      setTimeout(fetchUnreadCount, 1000);
      if (activeTab === 'chats') {
        setTimeout(fetchConversations, 1000);
      }
    };
    window.addEventListener('message-sent', handleMessageSent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('message-sent', handleMessageSent);
    };
  }, [currentUser.id, activeTab]);

  // Fetch conversations when chats tab is shown
  useEffect(() => {
    if (activeTab === 'chats') {
      fetchConversations();
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser.id]);


  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle notification click - open chat panel
  const handleNotificationClick = async (conversation: any) => {
    const project = projects.find(p => p.id === conversation.projectId);
    const otherUser = users.find(u => u.id === conversation.fromUserId);
    
    if (project && otherUser) {
      // Mark messages as read
      try {
        await fetch('http://127.0.0.1:5000/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: conversation.projectId,
            userId: currentUser.id,
            otherUserId: conversation.fromUserId,
          }),
        });
        fetchUnreadCount();
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
      
      // Open chat panel
      setChatProject(project);
      setChatOtherUser(otherUser);
      setChatPanelOpen(true);
      setShowNotifications(false);
    }
  };
  const [selectedUseCaseForAssignment, setSelectedUseCaseForAssignment] = useState<UseCase | null>(null);

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const riskLevels = [
    { level: 'Critical', count: projects.filter(p => p.status === 'disproven').length, color: 'bg-red-500', percentage: 15 },
    { level: 'High', count: 5, color: 'bg-orange-500', percentage: 35 },
    { level: 'Medium', count: projects.filter(p => p.status === 'ongoing').length, color: 'bg-yellow-500', percentage: 50 },
    { level: 'Low', count: projects.filter(p => p.status === 'proven').length, color: 'bg-green-500', percentage: 80 }
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-800" />

        <div className="p-6 border-b border-gray-200">
          <div className="text-xl font-bold text-gray-900 mb-1">Z-Inspection</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Admin Portal</div>
        </div>

        <button
          onClick={() => setShowProfile(true)}
          className="w-full px-6 py-6 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center">
            {(currentUser as any).profileImage ? (
              <img
                src={(currentUser as any).profileImage}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium mr-3">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div className="text-sm overflow-hidden">
              <div className="text-gray-900 font-medium truncate">{currentUser.name}</div>
              <div className="text-gray-500 text-xs">Administrator</div>
            </div>
          </div>
        </button>

        <nav className="flex-1 px-3 py-6 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Folder className="h-5 w-5 mr-3" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('use-case-assignments')}
            className={`w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'use-case-assignments' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <UserPlus className="h-5 w-5 mr-3" />
            Assignments
          </button>
          <button
            onClick={() => setActiveTab('project-creation')}
            className={`w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'project-creation' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Plus className="h-5 w-5 mr-3" />
            Create Project
          </button>
          <button
            onClick={() => onNavigate('other-members')}
            className="w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Users className="h-5 w-5 mr-3" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="h-5 w-5 mr-3" />
            Analytics
          </button>
          <button
            onClick={() => {
              onNavigate('shared-area');
            }}
            className="w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <MessageSquare className="h-5 w-5 mr-3" />
            Shared Area
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 flex items-center text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
        {/* Top Bar with Notifications */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'use-case-assignments' && 'Use Case Assignments'}
              {activeTab === 'project-creation' && 'Create Project'}
              {activeTab === 'reports' && 'Reports'}
              {activeTab === 'chats' && 'Chats'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] overflow-hidden flex flex-col" style={{ maxHeight: 'min(500px, calc(100vh - 80px))', maxWidth: 'min(320px, calc(100vw - 2rem))', bottom: 'auto' }}>
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0">
                    {unreadConversations.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm">No unread messages</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {unreadConversations.map((conv, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleNotificationClick(conv)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                                    {conv.fromUserName?.charAt(0) || 'U'}
                                  </div>
                                  <div className="font-medium text-gray-900 text-sm truncate">
                                    {conv.fromUserName}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600 font-medium mb-1 truncate">
                                  {conv.projectTitle}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-2">
                                  {conv.lastMessage}
                                </div>
                              </div>
                              {conv.count > 1 && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                                  {conv.count}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {activeTab === 'dashboard' && (
            <DashboardTab
              projects={filteredProjects}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onViewProject={onViewProject}
              riskLevels={riskLevels}
              onCreateNew={() => setActiveTab('project-creation')}
              onDeleteProject={onDeleteProject}
            />
          )}

          {activeTab === 'use-case-assignments' && (
            <UseCaseAssignmentsTab
              useCases={useCases}
              users={users}
              onAssignExperts={(useCase: UseCase) => {
                setSelectedUseCaseForAssignment(useCase);
                setShowAssignExpertsModal(true);
              }}
            />
          )}

          {activeTab === 'project-creation' && (
            <ProjectCreationTab
              users={users}
              useCases={useCases}
              onCreateProject={onCreateProject}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              projects={projects}
              riskLevels={riskLevels}
            />
          )}

        {activeTab === 'chats' && (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Conversations List */}
              <div className={`${chatPanelOpen ? 'w-1/3' : 'w-full'} border-r border-gray-200 overflow-y-auto bg-white flex flex-col`}>
                <div className="p-6 flex-1 overflow-y-auto">
                  {allConversations.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg text-gray-900 mb-2">No conversations yet</h3>
                      <p className="text-gray-600">
                        Start a conversation with a team member to see it here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allConversations.map((conv) => {
                        const otherUser = users.find(u => u.id === conv.otherUserId);
                        const project = projects.find(p => p.id === conv.projectId);
                        if (!otherUser || !project) return null;

                        const hasUnread = conv.unreadCount > 0;
                        const isSelected = chatOtherUser?.id === otherUser.id && chatProject?.id === project.id;

                        return (
                          <div
                            key={`${conv.projectId}-${conv.otherUserId}`}
                            className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-all relative group ${
                              hasUnread ? 'border-blue-500 border-l-4' : 'border-gray-200'
                            } ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`}
                          >
                            <div onClick={() => handleOpenChat(conv)}>
                              <div className="flex items-start space-x-4">
                                <div className="relative flex-shrink-0">
                                  <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
                                    style={{ backgroundColor: '#1F2937' }}
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
                                        {otherUser.role}
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
                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete conversation with ${otherUser.name}?`)) {
                                  handleDeleteConversation(conv.projectId, conv.otherUserId);
                                }
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-50 rounded transition-opacity"
                              title="Delete conversation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Chat Panel - Inline when conversation selected */}
              {chatPanelOpen && chatOtherUser && chatProject && (
                <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
                  <ChatPanel
                    project={chatProject}
                    currentUser={currentUser}
                    otherUser={chatOtherUser}
                    inline={true}
                    onClose={() => {
                      setChatPanelOpen(false);
                      setChatOtherUser(null);
                      setChatProject(null);
                    }}
                    onMessageSent={() => {
                      window.dispatchEvent(new Event('message-sent'));
                      fetchUnreadCount();
                      fetchConversations();
                    }}
                    onDeleteConversation={() => {
                      setChatPanelOpen(false);
                      setChatOtherUser(null);
                      setChatProject(null);
                      fetchUnreadCount();
                      fetchConversations();
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign Experts Modal */}
      {showAssignExpertsModal && selectedUseCaseForAssignment && (
        <AssignExpertsModal
          useCase={selectedUseCaseForAssignment}
          users={users}
          onClose={() => {
            setShowAssignExpertsModal(false);
            setSelectedUseCaseForAssignment(null);
          }}
          onAssign={async (expertIds, notes) => {
              try {
               const response = await fetch(`http://127.0.0.1:5000/api/use-cases/${selectedUseCaseForAssignment.id}/assign`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   assignedExperts: expertIds,
                   adminNotes: notes
                 })
               });

               if (response.ok) {
                 alert("Experts assigned successfully!");
               }
             } catch (error) {
               console.error("Assignment error:", error);
               alert("Failed to assign experts.");
             }
             setShowAssignExpertsModal(false);
             setSelectedUseCaseForAssignment(null);
           }}
        />
      )}
      
      {/* CHAT PANEL */}
      {chatPanelOpen && chatOtherUser && chatProject && (
        <ChatPanel
          project={chatProject}
          currentUser={currentUser}
          otherUser={chatOtherUser}
          onClose={() => {
            setChatPanelOpen(false);
            setChatOtherUser(null);
            setChatProject(null);
          }}
          onMessageSent={() => {
            window.dispatchEvent(new Event('message-sent'));
            fetchUnreadCount();
          }}
        />
      )}

      {/* PROFILE MODAL */}
      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            if (onUpdateUser) {
              onUpdateUser(updatedUser);
            }
            setShowProfile(false);
          }}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function DashboardTab({ projects, searchQuery, setSearchQuery, onViewProject, riskLevels, onCreateNew, onDeleteProject }: any) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Overview</h1>
            <p className="text-gray-600">Monitor all evaluation projects and risk assessments</p>
          </div>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 flex items-center shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center uppercase tracking-wider">
          <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
          Risk Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {riskLevels.map((risk: any) => (
            <div key={risk.level} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{risk.level}</span>
                <div className={`w-2 h-2 rounded-full ${risk.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{risk.count}</div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`${risk.color} h-1.5 rounded-full`}
                  style={{ width: `${risk.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <div
              key={project.id}
              onClick={() => onViewProject(project)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 h-10">{project.shortDescription}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm(`Delete project "${project.title}"?`);
                    if (confirmed) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="ml-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColors[project.status].bg} ${statusColors[project.status].text}`}>
                  {project.status.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                  {stageLabels[project.stage]}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span className="font-medium text-gray-700">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                <span>Updated: {new Date(project.createdAt).toLocaleDateString()}</span>
                {project.isNew && <span className="text-blue-600 font-medium">New Project</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function UseCaseAssignmentsTab({ useCases, users, onAssignExperts }: any) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Use Case Assignments</h1>
        <p className="text-gray-600">Manage expert assignments for specific use cases</p>
      </div>

      <div className="px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Use Case</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Experts</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {useCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No use cases found. Use Case Owners need to create them first.
                  </td>
                </tr>
              ) : (
                useCases.map((useCase: UseCase) => {
                  const owner = users.find((u: User) => u.id === useCase.ownerId);
                  const assignedExperts = users.filter((u: User) => useCase.assignedExperts?.includes(u.id));

                  return (
                    <tr key={useCase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{useCase.title}</div>
                        <div className="text-xs text-gray-500">{useCase.aiSystemCategory || 'No category'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{owner?.name || 'Unknown'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${useCaseStatusColors[useCase.status]?.bg || 'bg-gray-100'} ${useCaseStatusColors[useCase.status]?.text || 'text-gray-800'}`}>
                          {useCase.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-2">
                          {assignedExperts.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">None</span>
                          ) : (
                            assignedExperts.map((expert: User) => (
                              <div
                                key={expert.id}
                                className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-700 text-xs font-medium"
                                title={`${expert.name} (${expert.role})`}
                              >
                                {expert.name.charAt(0)}
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onAssignExperts(useCase)}
                          className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          Manage Team
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ProjectCreationTab({ users, useCases = [], onCreateProject }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedUseCaseId, setSelectedUseCaseId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  // ⚠️ YENİ STATE'LER: 7 Temel Soru İçin Eklenmiştir
  const [requester, setRequester] = useState('');
  const [inspectionReason, setInspectionReason] = useState('');
  const [relevantFor, setRelevantFor] = useState('');
  const [isMandatory, setIsMandatory] = useState('');
  const [conditionsToAnalyze, setConditionsToAnalyze] = useState('');
  const [resultsUsage, setResultsUsage] = useState('');
  const [resultsSharing, setResultsSharing] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTeam.length === 0) {
      alert("Please assign at least one team member (Expert or Owner) to create a project.");
      return;
    }

    // ⚠️ GÜNCELLENMİŞ onCreateProject çağrısı: inspectionContext eklendi
    onCreateProject({
      title,
      shortDescription: description.substring(0, 100),
      fullDescription: description,
      targetDate,
      assignedUsers: selectedTeam,
      useCase: selectedUseCaseId || undefined,
      inspectionContext: {
        requester,
        inspectionReason,
        relevantFor,
        isMandatory,
        conditionsToAnalyze,
        resultsUsage,
        resultsSharing
      }
    });

    // Alanları temizle
    setTitle('');
    setDescription('');
    setTags('');
    setTargetDate('');
    setSelectedUseCaseId('');
    setSelectedTeam([]);
    setRequester('');
    setInspectionReason('');
    setRelevantFor('');
    setIsMandatory('');
    setConditionsToAnalyze('');
    setResultsUsage('');
    setResultsSharing('');
  };

  const toggleUser = (userId: string) => {
    if (selectedTeam.includes(userId)) {
      setSelectedTeam(selectedTeam.filter(id => id !== userId));
    } else {
      setSelectedTeam([...selectedTeam, userId]);
    }
  };

  const experts = users.filter((u: User) => u.role !== 'admin'); // Admin olmayan kullanıcılar (Expert/Owner)

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Project</h1>
        <p className="text-gray-600">Initialize a new evaluation project linked to a Use Case</p>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Project Info Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="block text-sm font-medium mb-2 text-blue-900 flex items-center">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link to a Use Case (Optional)
                </label>
                <select
                  value={selectedUseCaseId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedUseCaseId(id);
                    if (id) {
                      const uc = useCases.find((u: UseCase) => u.id === id);
                      if (uc) {
                        setTitle(uc.title);
                        setDescription(uc.description);
                      }
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-blue-900"
                >
                  <option value="">Select a submitted Use Case...</option>
                  {useCases.map((uc: UseCase) => (
                    <option key={uc.id} value={uc.id}>
                      {uc.title} (Owner: {users.find((u: User) => u.id === uc.ownerId)?.name || 'Unknown'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Project Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Cardiac AI Diagnosis System"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the AI system and evaluation goals..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Target Date *</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Category Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="medical, finance..."
                  />
                </div>
              </div>

            </div>

            {/* 2. Project Context and Scope Questions (7 Soru) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">Project Context and Scope</h2>

              {/* Soru 1: Who requested the inspection? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">1. Who requested the inspection?</label>
                <input
                  type="text"
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Legal Department, Product Owner, Regulatory Body"
                />
              </div>

              {/* Soru 2: Why carry out an inspection? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">2. Why carry out an inspection?</label>
                <input
                  type="text"
                  value={inspectionReason}
                  onChange={(e) => setInspectionReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Compliance check, Risk mitigation, Public trust building"
                />
              </div>

              {/* Soru 3: For whom is the inspection relevant? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">3. For whom is the inspection relevant?</label>
                <input
                  type="text"
                  value={relevantFor}
                  onChange={(e) => setRelevantFor(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Internal auditors, Customers, Regulators"
                />
              </div>

              {/* Soru 4: Is it recommended or required (mandatory inspection)? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">4. Is it recommended or required (mandatory inspection)?</label>
                <select
                  value={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select one...</option>
                  <option value="recommended">Recommended</option>
                  <option value="mandatory">Required (Mandatory)</option>
                </select>
              </div>

              {/* Soru 5: What are the sufficient vs. necessary conditions that need to be analyzed? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">5. What are the sufficient vs. necessary conditions that need to be analyzed?</label>
                <textarea
                  value={conditionsToAnalyze}
                  onChange={(e) => setConditionsToAnalyze(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Minimum legal requirements (necessary), Best practice standards (sufficient)"
                />
              </div>

              {/* Soru 6: How are the inspection results to be used? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">6. How are the inspection results to be used? (e.g. verification, certification, sanctions)</label>
                <input
                  type="text"
                  value={resultsUsage}
                  onChange={(e) => setResultsUsage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Internal risk report, External certification for compliance"
                />
              </div>

              {/* Soru 7: Will the results be shared (public) or kept private? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">7. Will the results be shared (public) or kept private? (If private, why?)</label>
                <textarea
                  value={resultsSharing}
                  onChange={(e) => setResultsSharing(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Public (for transparency), Private (due to sensitive trade secrets)"
                />
              </div>
            </div>
            {/* End of Project Context Section */}


            {/* 3. Assignment Section (Ekip Atama) - Düzeltilmiş Görünüm */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-700">
                  Assign Evaluation Team (Experts & Owners) *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  
                  {experts.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">No users available for assignment.</div>
                  ) : (
                    experts.map((user: User) => (
                      <label 
                        key={user.id} 
                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                          selectedTeam.includes(user.id) ? 'bg-blue-100 border border-blue-200' : 'hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeam.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-3"
                        />
                        <div className="flex items-center flex-1">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600 mr-3 font-medium border-2 border-white shadow-sm">
                            {user.name.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-900 font-medium">{user.name}</span>
                          <span className={`text-xs ml-auto px-2 py-0.5 rounded-full capitalize ${
                            user.role !== 'use-case-owner' && user.role !== 'admin' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {user.role.replace('-', ' ')}
                          </span>
                        </div>
                        {selectedTeam.includes(user.id) && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-3" />}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* End of Assignment Section */}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function ReportsTab({ projects, riskLevels }: any) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
        <p className="text-gray-600">Analytics and reporting dashboard</p>
      </div>
      <div className="flex items-center justify-center py-12 text-gray-500">
        Reports module coming soon...
      </div>
    </>
  );
}

// Assign Experts Modal
interface AssignExpertsModalProps {
  useCase: UseCase;
  users: User[];
  onClose: () => void;
  onAssign: (expertIds: string[], notes: string) => void;
}

function AssignExpertsModal({ useCase, users, onClose, onAssign }: AssignExpertsModalProps) {
  const [selectedExperts, setSelectedExperts] = useState<string[]>(useCase.assignedExperts || []);
  const [adminNotes, setAdminNotes] = useState(useCase.adminNotes || '');

  const experts = users.filter(u => u.role !== 'admin' && u.role !== 'use-case-owner');

  const toggleExpert = (expertId: string) => {
    if (selectedExperts.includes(expertId)) {
      setSelectedExperts(selectedExperts.filter(id => id !== expertId));
    } else {
      setSelectedExperts([...selectedExperts, expertId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(selectedExperts, adminNotes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Assign Evaluation Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Use Case</div>
            <div className="text-base font-medium text-gray-900">{useCase.title}</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-gray-700">Select Experts</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
              {experts.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-2">No experts available to assign.</div>
              ) : (
                experts.map(expert => (
                  <label
                    key={expert.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                      selectedExperts.includes(expert.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-white border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedExperts.includes(expert.id)}
                      onChange={() => toggleExpert(expert.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-3 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{expert.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{expert.role.replace('-', ' ')}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Instructions / Notes</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Specific instructions for the evaluation team..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
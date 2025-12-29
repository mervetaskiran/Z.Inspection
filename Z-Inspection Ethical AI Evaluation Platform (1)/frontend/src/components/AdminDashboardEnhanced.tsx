import React, { useState, useEffect, useRef } from 'react';
import { Plus, Folder, MessageSquare, Users, LogOut, Search, BarChart3, UserPlus, X, Link as LinkIcon, CheckCircle2, Trash2, Bell, Clock, FileText, Download, ArrowLeft, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { Project, User, UseCase } from '../types';
import { fetchUserProgress } from '../utils/userProgress';
import { ChatPanel } from './ChatPanel';
import { ProfileModal } from './ProfileModal';
import { api } from '../api';

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
  resolve: 'Resolve / Results'
};

// Progress'e göre stage belirle
// 0% → Set-up (henüz sorular çözülmeye başlanmamış)
// 1-99% → Assess (sorular çözülmeye başlanmış, değerlendirme aşamasında)
// 100% + rapor varsa → Resolve / Results (tüm sorular çözülmüş ve rapor oluşturulmuş)
// 100% ama rapor yok → Assess (devam ediyor)
const getStageFromProgress = (progress: number, hasReport: boolean = false): 'set-up' | 'assess' | 'resolve' => {
  if (progress === 0) return 'set-up';
  if (progress < 100) return 'assess';
  // 100% ama rapor yoksa hala Assess
  if (progress === 100 && !hasReport) return 'assess';
  // 100% ve rapor varsa Resolve
  return 'resolve';
};

const useCaseStatusColors = {
  'assigned': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'in-review': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'completed': { bg: 'bg-green-100', text: 'text-green-800' }
};

const ProjectCard: React.FC<{
  project: Project;
  currentUser: User;
  onViewProject: (p: Project) => void;
  onStartEvaluation: (p: Project) => void;
  onDeleteProject: (id: string) => void;
}> = ({ project, currentUser, onViewProject, onStartEvaluation, onDeleteProject }) => {
  const [userProgress, setUserProgress] = useState<number>(project.progress ?? 0);
  const [hasReport, setHasReport] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const fetchProgress = async () => {
      try {
        const val = await fetchUserProgress(project, currentUser);
        if (mounted) setUserProgress(val);
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };
    
    fetchProgress();
    // Progress'i periyodik olarak güncelle (her 3 saniyede bir)
    const interval = setInterval(fetchProgress, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [project.id, (project as any)._id, currentUser.id, (currentUser as any)._id]);

  // Check if project has a report
  useEffect(() => {
    let mounted = true;
    const checkReport = async () => {
      try {
        const projectId = project.id || (project as any)._id;
        const response = await fetch(api(`/api/reports?userId=${currentUser.id}&projectId=${projectId}`));
        if (response.ok) {
          const reports = await response.json();
          if (mounted) {
            setHasReport(Array.isArray(reports) && reports.length > 0);
          }
        }
      } catch (error) {
        console.error('Error checking reports:', error);
      }
    };

    checkReport();
    // Check reports periodically (every 10 seconds)
    const interval = setInterval(checkReport, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [project.id, (project as any)._id, currentUser.id]);

  const progressDisplay = Math.max(0, Math.min(100, userProgress));
  // Progress'e göre dinamik stage belirle (rapor kontrolü ile)
  const currentStage = getStageFromProgress(progressDisplay, hasReport);

  return (
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

      <div className="mb-4">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[project.status].bg} ${statusColors[project.status].text}`}>
          {project.status.toUpperCase()} {stageLabels[currentStage]}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span className="font-medium text-gray-700">{progressDisplay}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all"
            style={{ width: `${progressDisplay}%`, minWidth: progressDisplay > 0 ? '8px' : '0' }}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
        <span>Updated: {new Date(project.createdAt).toLocaleDateString()}</span>
        {project.isNew && <span className="text-blue-600 font-medium">New Project</span>}
      </div>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'use-case-assignments' | 'project-creation' | 'reports' | 'chats' | 'created-reports'>('dashboard');
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

  // Allow deep-linking to a specific admin tab via URL query, e.g. /?tab=created-reports
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const tab = params.get("tab");
      const allowed = new Set([
        "dashboard",
        "use-case-assignments",
        "project-creation",
        "reports",
        "chats",
        "created-reports",
      ]);
      if (tab && allowed.has(tab)) {
        setActiveTab(tab as any);
      }
    } catch {
      // ignore URL parsing issues
    }
  }, []);

  // Fetch all conversations (chats)
  const fetchConversations = async () => {
    try {
      const response = await fetch(api(`/api/messages/conversations?userId=${encodeURIComponent(currentUser.id)}`));
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
        const response = await fetch(api('/api/projects'), {
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
      const response = await fetch(api('/api/messages/delete-conversation'), {
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
          // Keep project/user so ChatPanel stays mounted
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
      const response = await fetch(api(`/api/messages/unread-count?userId=${encodeURIComponent(currentUser.id)}`));
      if (response.ok) {
        const data = await response.json();
        console.log('Admin unread count fetched:', data);
        const conversations = data.conversations || [];
        // Calculate actual unread count from conversations to ensure consistency
        // Backend uses 'count' field, not 'unreadCount'
        const actualUnreadCount = conversations.reduce((sum: number, conv: any) => sum + (conv.count || conv.unreadCount || 0), 0);
        // Only show badge if there are actual conversations with unread messages
        setUnreadCount(actualUnreadCount);
        setUnreadConversations(conversations);
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
    const project =
      projects.find(p => p.id === conversation.projectId) ||
      ({
        id: conversation.projectId,
        title: conversation.projectTitle || 'Project',
      } as any);
    const otherUser =
      users.find(u => u.id === conversation.fromUserId) ||
      ({
        id: conversation.fromUserId,
        name: conversation.fromUserName || 'User',
      } as any);
    
    if (project && otherUser) {
      // Mark messages as read
      try {
        await fetch(api('/api/messages/mark-read'), {
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

      // Open chat panel (also for notification-only messages)
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
            onClick={() => setActiveTab('created-reports')}
            className={`w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'created-reports' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-5 w-5 mr-3" />
            Created Reports
          </button>
          <button
            onClick={() => onNavigate('other-members')}
            className="w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Users className="h-5 w-5 mr-3" />
            Members
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
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        {/* Top Bar with Notifications */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'use-case-assignments' && 'Use Case Assignments'}
              {activeTab === 'project-creation' && 'Create Project'}
              {activeTab === 'created-reports' && 'Created Reports'}
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
                <div 
                  className="absolute top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] overflow-hidden flex flex-col"
                  style={{ 
                    right: '0',
                    width: 'min(320px, calc(100vw - 2rem))',
                    maxHeight: 'min(500px, calc(100vh - 100px))',
                    maxWidth: 'calc(100vw - 1rem)'
                  }}
                >
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
                                <div className="text-xs text-gray-500 line-clamp-2">
                                  {String(conv.lastMessage || '').startsWith('[NOTIFICATION]')
                                    ? String(conv.lastMessage).replace(/^\[NOTIFICATION\]\s*/, '')
                                    : conv.lastMessage}
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
        
        {/* Chats Tab - Always mounted for stable height */}
        <div className={`flex-1 min-h-0 flex flex-col ${activeTab === 'chats' ? '' : 'hidden'}`}>
          <div className="flex-1 min-h-0 flex">
            {/* Conversations List */}
            <div className={`${chatPanelOpen ? 'w-1/3' : 'w-full'} border-r border-gray-200 bg-white flex flex-col min-h-0`}>
              <div className="p-6 flex-1 overflow-y-auto min-h-0">
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

                      const hasUnread = (conv.count || conv.unreadCount || 0) > 0;
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
                                    {(conv.count || conv.unreadCount || 0) > 9 ? '9+' : (conv.count || conv.unreadCount || 0)}
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
            
            {/* Chat Panel - Always mounted when project/user exist, shown when chatPanelOpen */}
            {chatProject && chatOtherUser ? (
              <div className={`flex-1 min-h-0 flex flex-col bg-white ${chatPanelOpen ? '' : 'hidden'}`}>
                <ChatPanel
                  project={chatProject}
                  currentUser={currentUser}
                  otherUser={chatOtherUser}
                  inline={true}
                  onClose={() => {
                    setChatPanelOpen(false);
                    // Keep project/user so ChatPanel stays mounted
                  }}
                  onMessageSent={() => {
                    window.dispatchEvent(new Event('message-sent'));
                    fetchUnreadCount();
                    fetchConversations();
                  }}
                  onDeleteConversation={() => {
                    setChatPanelOpen(false);
                    // Keep project/user so ChatPanel stays mounted
                    fetchUnreadCount();
                    fetchConversations();
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Other Tabs */}
        <div className={`flex-1 min-h-0 overflow-y-auto ${activeTab === 'chats' ? 'hidden' : ''}`}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              projects={filteredProjects}
              users={users}
              currentUser={currentUser}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onViewProject={onViewProject}
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
              onClose={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'created-reports' && (
            <CreatedReportsTab
              projects={projects}
              currentUser={currentUser}
            />
          )}
        </div>
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
               const response = await fetch(api(`/api/use-cases/${selectedUseCaseForAssignment.id}/assign`), {
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
      
      {/* CHAT PANEL - Always mounted when project/user exist, shown when chatPanelOpen and not in chats tab */}
      {chatProject && chatOtherUser ? (
        <div className={chatPanelOpen && activeTab !== 'chats' ? 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4' : 'hidden'}>
          <div className="w-full max-w-4xl h-full max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <ChatPanel
              project={chatProject}
              currentUser={currentUser}
              otherUser={chatOtherUser}
              inline={true}
              defaultFullscreen={false}
              showProjectTitle={true}
              onClose={() => {
                setChatPanelOpen(false);
                // Keep project/user so ChatPanel stays mounted
              }}
              onMessageSent={() => {
                window.dispatchEvent(new Event('message-sent'));
                fetchUnreadCount();
              }}
            />
          </div>
        </div>
      ) : null}

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

// Project Progress Component - Atanan kullanıcıların progress ortalamasını hesaplar
function ProjectProgressCard({ project, users, onViewProject, onDeleteProject, currentUser }: { project: Project; users: User[]; onViewProject: (p: Project) => void; onDeleteProject: (id: string) => void; currentUser?: User }) {
  const [averageProgress, setAverageProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasReport, setHasReport] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    
    const calculateAverageProgress = async () => {
      if (!project.assignedUsers || project.assignedUsers.length === 0) {
        if (mounted) {
          setAverageProgress(0);
          setLoading(false);
        }
        return;
      }

      try {
        const assignedUserIds = project.assignedUsers;
        const progressPromises = assignedUserIds.map(async (userId: string) => {
          const user = users.find(u => (u.id || (u as any)._id) === userId);
          if (!user) return 0;
          
          try {
            const progress = await fetchUserProgress(project, user);
            return progress;
          } catch (error) {
            console.error(`Error fetching progress for user ${userId}:`, error);
            return 0;
          }
        });

        const progresses = await Promise.all(progressPromises);
        const validProgresses = progresses.filter(p => p > 0);
        
        if (validProgresses.length > 0) {
          const average = validProgresses.reduce((sum, p) => sum + p, 0) / validProgresses.length;
          if (mounted) {
            setAverageProgress(Math.round(average));
            setLoading(false);
          }
        } else {
          if (mounted) {
            setAverageProgress(0);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error calculating average progress:', error);
        if (mounted) {
          setAverageProgress(0);
          setLoading(false);
        }
      }
    };

    calculateAverageProgress();
    
    // Progress'i periyodik olarak güncelle (her 5 saniyede bir)
    const interval = setInterval(calculateAverageProgress, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [project.id, (project as any)._id, project.assignedUsers, users]);

  // Check if project has a report
  useEffect(() => {
    let mounted = true;
    if (!currentUser) return;

    const checkReport = async () => {
      try {
        const projectId = project.id || (project as any)._id;
        const response = await fetch(api(`/api/reports?userId=${currentUser.id}&projectId=${projectId}`));
        if (response.ok) {
          const reports = await response.json();
          if (mounted) {
            setHasReport(Array.isArray(reports) && reports.length > 0);
          }
        }
      } catch (error) {
        console.error('Error checking reports:', error);
      }
    };

    checkReport();
    // Check reports periodically (every 10 seconds)
    const interval = setInterval(checkReport, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [project.id, (project as any)._id, currentUser?.id]);

  const progressDisplay = Math.max(0, Math.min(100, averageProgress));
  // Progress'e göre dinamik stage belirle (rapor kontrolü ile)
  const currentStage = getStageFromProgress(progressDisplay, hasReport);

  return (
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

      <div className="mb-4">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[project.status].bg} ${statusColors[project.status].text}`}>
          {project.status.toUpperCase()} {stageLabels[currentStage]}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span className="font-medium text-gray-700">
            {loading ? '...' : `${progressDisplay}%`}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all"
            style={{ width: `${progressDisplay}%`, minWidth: progressDisplay > 0 ? '8px' : '0' }}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
        <span>Updated: {new Date(project.createdAt).toLocaleDateString()}</span>
        {project.isNew && <span className="text-blue-600 font-medium">New Project</span>}
      </div>
    </div>
  );
}

function DashboardTab({ projects, users, searchQuery, setSearchQuery, onViewProject, onCreateNew, onDeleteProject, currentUser }: any) {
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
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center shadow-sm"
          >
            +Project
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

      <div className="px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <ProjectProgressCard
              key={project.id}
              project={project}
              users={users}
              currentUser={currentUser}
              onViewProject={onViewProject}
              onDeleteProject={onDeleteProject}
            />
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

function ProjectCreationTab({ users, useCases = [], onCreateProject, onClose }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedUseCaseId, setSelectedUseCaseId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [autoUseCaseOwnerId, setAutoUseCaseOwnerId] = useState<string>('');

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

    const effectiveTeam = Array.from(new Set([
      ...selectedTeam,
      ...(autoUseCaseOwnerId ? [autoUseCaseOwnerId] : [])
    ]));

    if (effectiveTeam.length === 0) {
      alert("Please assign at least one team member (Expert or Owner) to create a project.");
      return;
    }

    // ⚠️ GÜNCELLENMİŞ onCreateProject çağrısı: inspectionContext eklendi
    onCreateProject({
      title,
      shortDescription: description.substring(0, 100),
      fullDescription: description,
      targetDate,
      assignedUsers: effectiveTeam,
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
    setAutoUseCaseOwnerId('');
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

  // Admin Create Project ekranında use-case-owner listede görünmesin.
  // UseCase seçilirse owner otomatik atanır (autoUseCaseOwnerId).
  const experts = users.filter((u: User) => u.role !== 'admin' && u.role !== 'use-case-owner');

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Project</h1>
          <p className="text-gray-600">Initialize a new evaluation project linked to a Use Case</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
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
                        // Use case owner'ını otomatik ata (listede göstermeden)
                        setAutoUseCaseOwnerId((uc as any).ownerId || '');
                      }
                    } else {
                      setAutoUseCaseOwnerId('');
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
                {autoUseCaseOwnerId && (
                  <div className="mt-2 text-xs text-blue-800">
                    Use Case owner will be assigned automatically:{" "}
                    <span className="font-medium">
                      {users.find((u: User) => u.id === autoUseCaseOwnerId)?.name || 'Unknown'}
                    </span>
                  </div>
                )}
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

function CreatedReportsTab({ projects, currentUser }: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsReport, setDetailsReport] = useState<any | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    ethical_principles: string[];
    risk_tone: "low" | "medium" | "high";
    warning_signal: boolean;
    confidence: "low" | "medium" | "high";
  } | null>(null);

  // Fetch all reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = filterProjectId 
        ? api(`/api/reports?userId=${currentUser.id}&projectId=${filterProjectId}`)
        : api(`/api/reports?userId=${currentUser.id}`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // View report
  const handleViewDetails = async (reportId: string) => {
    try {
      const response = await fetch(api(`/api/reports/${reportId}?userId=${currentUser.id}`));
      if (response.ok) {
        const data = await response.json();
        setDetailsReport(data);
      } else {
        alert('Rapor yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Rapor yüklenemedi');
    }
  };

  // Download report as PDF
  const handleDownloadPDF = async (reportId: string, reportTitle: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card click event
    }
    try {
      const response = await fetch(api(`/api/reports/${reportId}/download?userId=${currentUser.id}`));
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${reportId}.pdf`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert('PDF indirilemedi: ' + (error.error || 'Bilinmeyen hata'));
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      alert('PDF indirilemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Download report as Word (DOCX)
  const handleDownloadDOCX = async (reportId: string, reportTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(api(`/api/reports/${reportId}/download-docx?userId=${currentUser.id}`));
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${reportId}.docx`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json().catch(() => ({} as any));
        alert('Word indirilemedi: ' + (error.error || 'Bilinmeyen hata'));
      }
    } catch (error: any) {
      console.error('Error downloading Word:', error);
      alert('Word indirilemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string, reportTitle: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card click event
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete the report "${reportTitle}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(api(`/api/reports/${reportId}?userId=${currentUser.id}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        alert('✅ Report deleted successfully');
        fetchReports(); // Refresh reports list
        if (detailsReport && (detailsReport._id === reportId || detailsReport.id === reportId)) {
          setDetailsReport(null); // Close details if deleted report is being viewed
        }
      } else {
        const error = await response.json();
        alert('❌ Error: ' + (error.error || 'Failed to delete report'));
      }
    } catch (error: any) {
      console.error('Error deleting report:', error);
      alert('❌ Error: ' + (error.message || 'Failed to delete report'));
    }
  };

  // Analyze expert comments
  const handleAnalyzeComments = async () => {
    if (!detailsReport?.expertComments || detailsReport.expertComments.length === 0) {
      alert("No expert comments to analyze.");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const comments = detailsReport.expertComments
        .map((c: any) => c.commentText)
        .filter((text: string) => text && text.trim());

      if (comments.length === 0) {
        alert("No valid comments to analyze.");
        return;
      }

      const res = await fetch(api("/api/reports/analyze-expert-comments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertComments: comments }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.error || "Failed to analyze comments");
      }

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e: any) {
      alert(e?.message || "Failed to analyze expert comments");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterProjectId]);

  if (detailsReport) {
    const comments = Array.isArray(detailsReport?.expertComments) ? detailsReport.expertComments : [];
    const reportId = detailsReport._id || detailsReport.id;
    return (
      <>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setDetailsReport(null)}
                className="mt-1 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                aria-label="Back to created reports"
                title="Back to created reports"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Report Details</h1>
                <p className="text-gray-600">{detailsReport.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPDF(reportId, detailsReport.title)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => handleDownloadDOCX(reportId, detailsReport.title)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                title="Download Word"
              >
                <FileText className="h-4 w-4" />
                Word
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Expert Comments</h2>
              {comments.length > 0 && (
                <button
                  onClick={handleAnalyzeComments}
                  disabled={analyzing}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      AI Analysis
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="p-6 space-y-4">
              {comments.length > 0 ? (
                comments.map((c: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-gray-900">{c.expertName || "Expert"}</div>
                      <div className="text-xs text-gray-500">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleString("tr-TR") : ""}
                      </div>
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{String(c.commentText || "")}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No expert comments yet.</div>
              )}
            </div>
          </div>

          {analysisResult && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">AI Analysis Results</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Summary</div>
                  <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{analysisResult.summary}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Risk Tone</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      analysisResult.risk_tone === "high" 
                        ? "bg-red-100 text-red-700" 
                        : analysisResult.risk_tone === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {analysisResult.risk_tone === "high" && <AlertTriangle className="h-3 w-3" />}
                      {analysisResult.risk_tone === "medium" && <AlertTriangle className="h-3 w-3" />}
                      {analysisResult.risk_tone === "low" && <CheckCircle2 className="h-3 w-3" />}
                      {analysisResult.risk_tone.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Warning Signal</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      analysisResult.warning_signal
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {analysisResult.warning_signal ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          Warning Detected
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          No Critical Warnings
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {analysisResult.ethical_principles.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Ethical Principles Identified</div>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.ethical_principles.map((principle, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium"
                        >
                          {principle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Confidence Level</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    analysisResult.confidence === "high"
                      ? "bg-green-100 text-green-700"
                      : analysisResult.confidence === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {analysisResult.confidence.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Created Reports</h1>
            <p className="text-gray-600">View created reports</p>
          </div>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id || p._id} value={p.id || p._id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Reports List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Created Reports</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-2">No reports created yet</p>
              <p className="text-sm text-gray-400">You can create reports from the project detail page</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report: any) => {
                const reportId = report._id || report.id;
                const projectTitle = report.projectId?.title || 'Unknown Project';
                const generatedBy = report.generatedBy?.name || 'System';
                const generatedAt = new Date(report.generatedAt || report.createdAt).toLocaleString('en-US');

                return (
                  <div
                    key={reportId}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{report.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{projectTitle}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Created by: {generatedBy}</span>
                          <span>•</span>
                          <span>{generatedAt}</span>
                          {report.metadata && (
                            <>
                              <span>•</span>
                              <span>{report.metadata.totalScores || 0} scores</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDownloadPDF(reportId, report.title, e)}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                        <button
                          onClick={(e) => handleDownloadDOCX(reportId, report.title, e)}
                          className="px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                          title="Download Word"
                        >
                          <FileText className="h-4 w-4" />
                          Word
                        </button>
                        <button
                          onClick={() => handleViewDetails(reportId)}
                          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => handleDeleteReport(reportId, report.title, e)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                          title="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                        {report.status !== 'draft' && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              report.status === 'final'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {report.status === 'final' ? 'Final' : 'Archived'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ReportsTab({ projects, currentUser, users }: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showGeneratingMessage, setShowGeneratingMessage] = useState(false);
  const [detailsReport, setDetailsReport] = useState<any | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [projectProgresses, setProjectProgresses] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    ethical_principles: string[];
    risk_tone: "low" | "medium" | "high";
    warning_signal: boolean;
    confidence: "low" | "medium" | "high";
  } | null>(null);

  // Fetch all reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = filterProjectId 
        ? api(`/api/reports?userId=${currentUser.id}&projectId=${filterProjectId}`)
        : api(`/api/reports?userId=${currentUser.id}`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate report for a project
  const handleGenerateReport = async (projectId: string) => {
    try {
      setGenerating(projectId);
      setShowGeneratingMessage(true);
      const response = await fetch(api('/api/reports/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          userId: currentUser?.id || currentUser?._id
        })
      });

      if (response.ok) {
        const result = await response.json();
        setShowGeneratingMessage(false);
        alert('✅ Report generated successfully!');
        fetchReports(); // Refresh reports list
      } else {
        const error = await response.json();
        setShowGeneratingMessage(false);
        alert('❌ Error: ' + (error.error || 'Failed to generate report'));
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      setShowGeneratingMessage(false);
      alert('❌ Error: ' + (error.message || 'Failed to generate report'));
    } finally {
      setGenerating(null);
    }
  };

  // View details
  const handleViewDetails = async (reportId: string) => {
    try {
      const response = await fetch(api(`/api/reports/${reportId}?userId=${currentUser.id}`));
      if (response.ok) {
        const data = await response.json();
        setDetailsReport(data);
      } else {
        alert('Rapor yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Rapor yüklenemedi');
    }
  };

  // Download report as PDF
  const handleDownloadPDF = async (reportId: string, reportTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(api(`/api/reports/${reportId}/download?userId=${currentUser.id}`));
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${reportId}.pdf`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json().catch(() => ({} as any));
        alert('PDF indirilemedi: ' + (error.error || 'Bilinmeyen hata'));
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      alert('PDF indirilemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Download report as Word (DOCX)
  const handleDownloadDOCX = async (reportId: string, reportTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(api(`/api/reports/${reportId}/download-docx?userId=${currentUser.id}`));
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${reportId}.docx`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json().catch(() => ({} as any));
        alert('Word indirilemedi: ' + (error.error || 'Bilinmeyen hata'));
      }
    } catch (error: any) {
      console.error('Error downloading Word:', error);
      alert('Word indirilemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string, reportTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the report "${reportTitle}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(api(`/api/reports/${reportId}?userId=${currentUser.id}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        alert('✅ Report deleted successfully');
        fetchReports();
        if (detailsReport && (detailsReport._id === reportId || detailsReport.id === reportId)) {
          setDetailsReport(null);
        }
      } else {
        const error = await response.json().catch(() => ({} as any));
        alert('❌ Error: ' + (error.error || 'Failed to delete report'));
      }
    } catch (error: any) {
      console.error('Error deleting report:', error);
      alert('❌ Error: ' + (error.message || 'Failed to delete report'));
    }
  };

  // Fetch progress for all projects
  useEffect(() => {
    const fetchAllProgresses = async () => {
      if (!users || users.length === 0) return;
      
      const progresses: Record<string, number> = {};
      await Promise.all(
        projects.map(async (project: any) => {
          const projectId = project.id || (project as any)._id;
          if (!project.assignedUsers || project.assignedUsers.length === 0) {
            progresses[projectId] = 0;
            return;
          }

          try {
            const assignedUserIds = project.assignedUsers;
            const progressPromises = assignedUserIds.map(async (userId: string) => {
              const user = users.find((u: any) => (u.id || (u as any)._id) === userId);
              if (!user) return 0;
              
              try {
                const { fetchUserProgress } = await import('../utils/userProgress');
                const progress = await fetchUserProgress(project, user);
                return progress;
              } catch (error) {
                console.error(`Error fetching progress for user ${userId}:`, error);
                return 0;
              }
            });

            const progressesList = await Promise.all(progressPromises);
            const validProgresses = progressesList.filter(p => p > 0);
            
            if (validProgresses.length > 0) {
              const average = validProgresses.reduce((sum, p) => sum + p, 0) / validProgresses.length;
              progresses[projectId] = Math.round(average);
            } else {
              progresses[projectId] = 0;
            }
          } catch (error) {
            console.error(`Error calculating progress for project ${projectId}:`, error);
            progresses[projectId] = 0;
          }
        })
      );
      
      setProjectProgresses(progresses);
    };

    if (projects.length > 0 && users && users.length > 0) {
      fetchAllProgresses();
      const interval = setInterval(fetchAllProgresses, 5000);
      return () => clearInterval(interval);
    }
  }, [projects, users]);

  useEffect(() => {
    fetchReports();
  }, [filterProjectId]);

  if (detailsReport) {
    const comments = Array.isArray(detailsReport?.expertComments) ? detailsReport.expertComments : [];
    const reportId = detailsReport._id || detailsReport.id;
    return (
      <>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setDetailsReport(null)}
                className="mt-1 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                aria-label="Back to created reports"
                title="Back to created reports"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Report Details</h1>
                <p className="text-gray-600">{detailsReport.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPDF(reportId, detailsReport.title)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => handleDownloadDOCX(reportId, detailsReport.title)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                title="Download Word"
              >
                <FileText className="h-4 w-4" />
                Word
              </button>
              <button
                onClick={() => handleDeleteReport(reportId, detailsReport.title)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Expert Comments</h2>
              {comments.length > 0 && (
                <button
                  onClick={handleAnalyzeComments}
                  disabled={analyzing}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      AI Analysis
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="p-6 space-y-4">
              {comments.length > 0 ? (
                comments.map((c: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-gray-900">{c.expertName || "Expert"}</div>
                      <div className="text-xs text-gray-500">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleString("tr-TR") : ""}
                      </div>
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{String(c.commentText || "")}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No expert comments yet.</div>
              )}
            </div>
          </div>

          {analysisResult && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">AI Analysis Results</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Summary</div>
                  <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{analysisResult.summary}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Risk Tone</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      analysisResult.risk_tone === "high" 
                        ? "bg-red-100 text-red-700" 
                        : analysisResult.risk_tone === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {analysisResult.risk_tone === "high" && <AlertTriangle className="h-3 w-3" />}
                      {analysisResult.risk_tone === "medium" && <AlertTriangle className="h-3 w-3" />}
                      {analysisResult.risk_tone === "low" && <CheckCircle2 className="h-3 w-3" />}
                      {analysisResult.risk_tone.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Warning Signal</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      analysisResult.warning_signal
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {analysisResult.warning_signal ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          Warning Detected
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          No Critical Warnings
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {analysisResult.ethical_principles.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Ethical Principles Identified</div>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.ethical_principles.map((principle, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium"
                        >
                          {principle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Confidence Level</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    analysisResult.confidence === "high"
                      ? "bg-green-100 text-green-700"
                      : analysisResult.confidence === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {analysisResult.confidence.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Generating Message Overlay */}
      {showGeneratingMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Generating Report</h3>
                <p className="text-sm text-gray-600 mt-1">Your report is being generated. Please wait...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Generated Reports</h1>
            <p className="text-gray-600">Gemini AI ile oluşturulan analiz raporları</p>
          </div>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id || p._id} value={p.id || p._id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Projects List - Generate Reports */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Reports for Projects</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => {
              const projectId = project.id || project._id;
              const isGenerating = generating === projectId;
              const projectReports = reports.filter((r: any) => 
                (r.projectId?._id || r.projectId) === projectId
              );
              const projectProgress = projectProgresses[projectId] ?? project.progress ?? 0;
              const isComplete = projectProgress >= 100;
              const canGenerate = isComplete && !isGenerating;

              return (
                <div
                  key={projectId}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 mb-2 truncate">{project.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {project.shortDescription || project.fullDescription || 'Açıklama yok'}
                  </p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{projectProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          isComplete ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${Math.min(100, projectProgress)}%`, minWidth: projectProgress > 0 ? '8px' : '0' }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {projectReports.length} rapor
                    </span>
                    <button
                      onClick={() => handleGenerateReport(projectId)}
                      disabled={!canGenerate}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        !canGenerate
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title={!isComplete ? 'Project must be 100% complete to generate report' : ''}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Report'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reports List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Created Reports</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-2">No reports created yet</p>
              <p className="text-sm text-gray-400">You can create reports for the projects above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report: any) => {
                const reportId = report._id || report.id;
                const projectTitle = report.projectId?.title || 'Unknown Project';
                const generatedBy = report.generatedBy?.name || 'System';
                const generatedAt = new Date(report.generatedAt || report.createdAt).toLocaleString('en-US');

                return (
                  <div
                    key={reportId}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{report.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{projectTitle}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Created by: {generatedBy}</span>
                          <span>•</span>
                          <span>{generatedAt}</span>
                          {report.metadata && (
                            <>
                              <span>•</span>
                              <span>{report.metadata.totalScores || 0} scores</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDownloadPDF(reportId, report.title, e)}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                        <button
                          onClick={(e) => handleDownloadDOCX(reportId, report.title, e)}
                          className="px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                          title="Download Word"
                        >
                          <FileText className="h-4 w-4" />
                          Word
                        </button>
                        <button
                          onClick={() => handleViewDetails(reportId)}
                          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => handleDeleteReport(reportId, report.title, e)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                          title="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                        {report.status !== 'draft' && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              report.status === 'final'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {report.status === 'final' ? 'Final' : 'Archived'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* No modal: use View Details page instead */}
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
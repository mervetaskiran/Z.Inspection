import React, { useState, useEffect, useRef } from 'react';
import { Plus, LogOut, FolderOpen, Upload, X, FileText, Clock, Eye, Download, Info, Database, Users as UsersIcon, Scale, Trash2, MessageSquare, Bell } from 'lucide-react';
import { User, UseCase, Project } from '../types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChatPanel } from './ChatPanel';
import { ProfileModal } from './ProfileModal';
import { api } from '../api';

interface UseCaseOwnerDashboardProps {
  currentUser: User;
  useCases: UseCase[];
  users: User[];
  projects: Project[];
  onCreateUseCase: (useCase: Partial<UseCase>) => void;
  onViewUseCase: (useCase: UseCase) => void;
  onDeleteUseCase: (useCaseId: string) => void;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
}

const statusColors = {
  'assigned': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'in-review': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'completed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
};

const statusLabels = {
  'assigned': 'Assigned',
  'in-review': 'In Review',
  'completed': 'Completed'
};

export function UseCaseOwnerDashboard({
  currentUser,
  useCases,
  users,
  projects,
  onCreateUseCase,
  onViewUseCase,
  onDeleteUseCase,
  onLogout,
  onUpdateUser
}: UseCaseOwnerDashboardProps) {
  const [showNewUseCaseModal, setShowNewUseCaseModal] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatAdmin, setChatAdmin] = useState<User | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [myUseCases, setMyUseCases] = useState<UseCase[]>([]);
  const [loadingUseCases, setLoadingUseCases] = useState(true);
  const [useCaseProgresses, setUseCaseProgresses] = useState<Record<string, number>>({});

  // Fetch only this owner's use cases directly from backend (much faster)
  const fetchMyUseCases = React.useCallback(async () => {
    setLoadingUseCases(true);
    try {
      const response = await fetch(api(`/api/use-cases?ownerId=${encodeURIComponent(currentUser.id)}`));
      if (response.ok) {
        const data = await response.json();
        const formattedUseCases = data.map((uc: any) => ({ ...uc, id: uc._id }));
        setMyUseCases(formattedUseCases);
      } else {
        // Fallback to filtering from props if API fails
        setMyUseCases(useCases.filter(uc => uc.ownerId === currentUser.id));
      }
    } catch (error) {
      console.error('Error fetching my use cases:', error);
      // Fallback to filtering from props if API fails
      setMyUseCases(useCases.filter(uc => uc.ownerId === currentUser.id));
    } finally {
      setLoadingUseCases(false);
    }
  }, [currentUser.id, useCases]);

  useEffect(() => {
    fetchMyUseCases();
  }, [fetchMyUseCases]);

  // Fetch progress for all use cases that are linked to projects
  useEffect(() => {
    const fetchUseCaseProgresses = async () => {
      if (!myUseCases.length || !projects.length || !users.length) return;

      const progresses: Record<string, number> = {};
      
      await Promise.all(
        myUseCases.map(async (useCase) => {
          const useCaseId = ((useCase as any).id || (useCase as any)._id || '').toString();
          
          // Find project linked to this use case
          const getProjectUseCaseId = (p: any): string | null => {
            const val = p?.useCase;
            if (!val) return null;
            if (typeof val === 'string') return val;
            return (val.url || val._id || val.id || val.useCaseId || null) as string | null;
          };
          
          const linkedProject = projects.find((p) => {
            const pid = getProjectUseCaseId(p as any);
            return pid && pid.toString() === useCaseId;
          });

          if (!linkedProject || !linkedProject.assignedUsers || linkedProject.assignedUsers.length === 0) {
            progresses[useCaseId] = useCase.progress || 0;
            return;
          }

          try {
            const { fetchUserProgress } = await import('../utils/userProgress');
            
            // Calculate average progress from all assigned users
            const progressPromises = linkedProject.assignedUsers.map(async (userId: string) => {
              const user = users.find((u: any) => (u.id || (u as any)._id) === userId);
              if (!user) return 0;
              
              try {
                const progress = await fetchUserProgress(linkedProject, user);
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
              progresses[useCaseId] = Math.round(average);
            } else {
              progresses[useCaseId] = 0;
            }
          } catch (error) {
            console.error(`Error calculating progress for use case ${useCaseId}:`, error);
            progresses[useCaseId] = useCase.progress || 0;
          }
        })
      );
      
      setUseCaseProgresses(progresses);
    };

    if (myUseCases.length > 0 && projects.length > 0 && users.length > 0) {
      fetchUseCaseProgresses();
      // Update progress every 5 seconds
      const interval = setInterval(fetchUseCaseProgresses, 5000);
      return () => clearInterval(interval);
    }
  }, [myUseCases, projects, users]);
  
  // Find admin user
  const adminUser = users.find(u => u.role === 'admin');
  
  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(api(`/api/messages/unread-count?userId=${encodeURIComponent(currentUser.id)}`));
      if (response.ok) {
        const data = await response.json();
        console.log('UseCaseOwner unread count fetched:', data);
        const conversations = data.conversations || [];
        // Calculate actual unread count from conversations to ensure consistency
        // Backend uses 'count' field, not 'unreadCount'
        const actualUnreadCount = conversations.reduce((sum: number, conv: any) => sum + (conv.count || conv.unreadCount || 0), 0);
        // Only show badge if there are actual conversations with unread messages
        setUnreadCount(actualUnreadCount);
        setUnreadConversations(conversations);
      } else {
        console.error('UseCaseOwner failed to fetch unread count:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Poll for unread messages every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    
    const handleMessageSent = () => {
      setTimeout(fetchUnreadCount, 1000);
    };
    window.addEventListener('message-sent', handleMessageSent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('message-sent', handleMessageSent);
    };
  }, [currentUser.id]);

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

  // Handle notification click
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
      
      setChatAdmin(otherUser);
      setChatProject(project);
      setChatPanelOpen(true);
      setShowNotifications(false);
    }
  };
  
  // Find or create a general project for admin communication
  const getAdminProject = async (): Promise<Project> => {
    // Try to find an existing admin communication project
    let adminProject = projects.find(p => p.title === 'Admin Communication' || p.title.includes('Admin'));
    if (!adminProject && projects.length > 0) {
      // Use first project as fallback
      adminProject = projects[0];
    }
    // If still no project, create one via API
    if (!adminProject) {
      try {
        const response = await fetch(api('/api/projects'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Admin Communication',
            shortDescription: 'General communication with admin',
            fullDescription: 'This project is used for direct communication between use case owners and administrators.',
            stage: 'set-up',
            status: 'ongoing',
            targetDate: new Date().toISOString(),
            assignedUsers: [currentUser.id, adminUser?.id || ''],
            progress: 0
          }),
        });
        if (response.ok) {
          const newProject = await response.json();
          adminProject = { ...newProject, id: newProject._id || newProject.id };
        }
      } catch (error) {
        console.error('Error creating admin project:', error);
      }
    }
    // Final fallback - create dummy project (won't work for messaging but won't crash)
    if (!adminProject) {
      adminProject = {
        id: 'temp-admin-chat',
        title: 'Admin Communication',
        shortDescription: 'General communication with admin',
        fullDescription: '',
        stage: 'set-up',
        status: 'ongoing',
        targetDate: new Date().toISOString(),
        assignedUsers: [currentUser.id, adminUser?.id || ''],
        createdAt: new Date().toISOString(),
        progress: 0
      } as Project;
    }
    return adminProject;
  };

  const handleContactAdmin = async () => {
    console.log('Contact Admin clicked', { adminUser, users, usersLength: users.length });
    if (adminUser) {
      const project = await getAdminProject();
      console.log('Opening chat with admin', { adminUser, project });
      setChatAdmin(adminUser);
      setChatProject(project);
      setChatPanelOpen(true);
    } else {
      console.error('Admin user not found. Available users:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
      alert('Admin user not found. Please contact support.');
    }
  };

  // ⭐ TEMPLATE DOWNLOAD FUNCTION
  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/templates/usecase-template.docx"; 
    link.download = "usecase-template.docx";
    link.click();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

        <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />

        <div className="p-6 border-b border-gray-200">
          <div className="text-xl text-gray-900 mb-1">Z-Inspection</div>
          <div className="text-xs text-gray-600">Use-case Owner Portal</div>
        </div>

        <button
          onClick={() => setShowProfile(true)}
          className="w-full px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center">
            {(currentUser as any).profileImage ? (
              <img
                src={(currentUser as any).profileImage}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
            ) : (
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white mr-3">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div className="text-sm">
              <div className="text-gray-900">{currentUser.name}</div>
              <div className="text-gray-500">Use-case Owner</div>
            </div>
          </div>
        </button>

        <nav className="flex-1 px-3 py-4">
          <button className="w-full px-4 py-3 mb-2 flex items-center bg-green-50 text-green-700 rounded-lg">
            <FolderOpen className="h-4 w-4 mr-3" />
            My Projects
          </button>
          {adminUser && (
            <button
              onClick={handleContactAdmin}
              className="w-full px-4 py-3 mb-2 flex items-center text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <MessageSquare className="h-4 w-4 mr-3" />
              Contact Admin
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full px-4 py-3 flex items-center text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-gray-900 mb-2">Use-case Owner Dashboard</h1>
              <p className="text-gray-600">Upload and monitor your AI system use cases</p>
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
                    className="absolute left-auto right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden flex flex-col"
                    style={{
                      // Anchor to the bell button's right edge so it opens leftwards (prevents off-screen overflow)
                      right: 0,
                      width: 'min(320px, calc(100vw - 2rem))',
                      maxWidth: 'calc(100vw - 1rem)',
                      maxHeight: 'calc(100vh - 120px)',
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
              <button
                onClick={() => setShowNewUseCaseModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center shadow-sm"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Use Case
              </button>
            </div>
          </div>
        </div>

        {/* ⭐ TEMPLATE DOWNLOAD BANNER */}
        <div className="mx-8 mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <div className="text-sm text-blue-900">Need help getting started?</div>
              <div className="text-xs text-blue-700">Download our use case template for guidance</div>
            </div>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </button>
        </div>
                {/* Use Cases Grid */}
        <div className="px-8 py-6">
          {loadingUseCases ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading use cases...</div>
            </div>
          ) : myUseCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myUseCases.map((useCase) => {
                const getProjectUseCaseId = (p: any): string | null => {
                  const val = p?.useCase;
                  if (!val) return null;
                  if (typeof val === 'string') return val;
                  return (val.url || val._id || val.id || val.useCaseId || null) as string | null;
                };

                const useCaseId = ((useCase as any).id || (useCase as any)._id || '').toString();
                const isLinkedToAnyProject = Boolean(useCaseId) && projects.some((p) => {
                  const pid = getProjectUseCaseId(p as any);
                  return pid && pid.toString() === useCaseId;
                });

                // Display rule: once a use case is linked to a project, "assigned" should appear as "in-review".
                const displayStatus =
                  useCase.status === 'assigned' && isLinkedToAnyProject ? 'in-review' : useCase.status;

                // Display rule: show status badge always, but if linked to a project show "In Review" instead of "Assigned".
                const showStatusBadge = true;

                // Use calculated progress if available, otherwise fallback to useCase.progress
                const displayProgress = useCaseProgresses[useCaseId] !== undefined 
                  ? useCaseProgresses[useCaseId] 
                  : (useCase.progress || 0);

                return (
                <div
                  key={useCase.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Status Badge */}
                  <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg text-gray-900 flex-1 mr-2">{useCase.title}</h3>
                      <div className="flex items-center space-x-2">
                        {showStatusBadge && (
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${statusColors[displayStatus].bg} ${statusColors[displayStatus].text}`}
                          >
                            {statusLabels[displayStatus]}
                          </span>
                        )}
                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(`Delete use case "${useCase.title}"?`);
                            if (confirmed) {
                              await onDeleteUseCase(useCase.id);
                              // Refresh the list after deletion
                              fetchMyUseCases();
                            }
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{useCase.description}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Progress</span>
                      <span className="text-xs text-gray-900">{displayProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${displayProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Metadata + Experts */}
                  <div className="px-6 py-4 bg-gray-50">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Last updated: {new Date(useCase.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Assigned Experts */}
                    {useCase.assignedExperts && useCase.assignedExperts.length > 0 && (
                      <div className="flex items-center mb-3">
                        <span className="text-xs text-gray-600 mr-2">Assigned Experts:</span>
                        <div className="flex -space-x-2">
                          {useCase.assignedExperts.slice(0, 3).map((expertId, idx) => (
                            <div
                              key={expertId}
                              className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs"
                              title={`Expert ${idx + 1}`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </div>
                          ))}
                          {useCase.assignedExperts.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                              +{useCase.assignedExperts.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => onViewUseCase(useCase)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <FolderOpen className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">No Use Cases Yet</h3>
              <p className="text-gray-600 mb-6">Create your first use case to get started with the evaluation process</p>
              <button
                onClick={() => setShowNewUseCaseModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Use Case
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NEW USE CASE MODAL */}
      {showNewUseCaseModal && (
        <NewUseCaseModal
          onClose={() => setShowNewUseCaseModal(false)}
          onSubmit={async (data) => {
            await onCreateUseCase(data);
            setShowNewUseCaseModal(false);
            // Refresh the list after creating
            fetchMyUseCases();
          }}
          currentUser={currentUser}
        />
      )}
      
      {/* CHAT PANEL - Modal in center */}
      {chatPanelOpen && chatAdmin && chatProject && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => {
              setChatPanelOpen(false);
              setChatAdmin(null);
              setChatProject(null);
            }}
            aria-hidden="true"
          />

          {/* Center modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-2xl bg-white shadow-2xl border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0"
              style={{ height: '70vh', maxHeight: 650 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex-1 min-h-0 h-full overflow-hidden">
                <ChatPanel
                  project={chatProject}
                  currentUser={currentUser}
                  otherUser={chatAdmin}
                  inline={true}
                  onClose={() => {
                    setChatPanelOpen(false);
                    setChatAdmin(null);
                    setChatProject(null);
                  }}
                  onMessageSent={() => {
                    window.dispatchEvent(new Event('message-sent'));
                    fetchUnreadCount();
                  }}
                  onDeleteConversation={() => {
                    setChatPanelOpen(false);
                    setChatAdmin(null);
                    setChatProject(null);
                    fetchUnreadCount();
                  }}
                />
              </div>
            </div>
          </div>
        </>
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

interface NewUseCaseModalProps {
  onClose: () => void;
  onSubmit: (data: Partial<UseCase>) => void;
  currentUser: User;
}

type FileAttachment = {
  name: string;
  data: string; // base64
  contentType?: string;
};

interface UseCaseQuestion {
  id: string;
  questionEn: string;
  questionTr: string;
  type: 'text' | 'multiple-choice';
  options?: string[];
  order?: number;
}

function NewUseCaseModal({ onClose, onSubmit, currentUser }: NewUseCaseModalProps) {
  const [questions, setQuestions] = useState<UseCaseQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  // Basic Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiSystemCategory, setAiSystemCategory] = useState('Healthcare & Medical');
  const [aiSystemLink, setAiSystemLink] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  
  // Questions answers - initialize with empty object
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  // Section I
  const [systemName, setSystemName] = useState('');
  const [systemVersion, setSystemVersion] = useState('');
  const [developer, setDeveloper] = useState('');
  const [applicationDomain, setApplicationDomain] = useState('');
  const [purposeStatement, setPurposeStatement] = useState('');
  const [deploymentEnvironment, setDeploymentEnvironment] = useState('');
  const [deploymentStage, setDeploymentStage] = useState('');
  const [primaryClaims, setPrimaryClaims] = useState('');
  const [solutionCurrency, setSolutionCurrency] = useState('');
  const [legalCompliance, setLegalCompliance] = useState('');

  // Section II
  const [targetUsers, setTargetUsers] = useState('');
  const [userProficiency, setUserProficiency] = useState('');
  const [epistemicAuthority, setEpistemicAuthority] = useState('');
  const [overtrustRisk, setOvertrustRisk] = useState('');
  const [operationalDelay, setOperationalDelay] = useState('');
  const [accessibility, setAccessibility] = useState('');

  // Section III
  const [modelType, setModelType] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [trainingDataCharacteristics, setTrainingDataCharacteristics] = useState('');
  const [trainingSufficiency, setTrainingSufficiency] = useState('');
  const [dataAppropriateness, setDataAppropriateness] = useState('');
  const [federatedLearning, setFederatedLearning] = useState('');
  const [modelGeneralization, setModelGeneralization] = useState('');
  const [dataPrivacy, setDataPrivacy] = useState('');
  const [cybersecurity, setCybersecurity] = useState('');
  const [modelMaintenance, setModelMaintenance] = useState('');

  // Section IV
  const [ethicalRisks, setEthicalRisks] = useState('');
  const [biasMonitoring, setBiasMonitoring] = useState('');
  const [resourceDependency, setResourceDependency] = useState('');
  const [adverseOutcomes, setAdverseOutcomes] = useState('');
  const [environmentalImpact, setEnvironmentalImpact] = useState('');

  // Section V
  const [explainability, setExplainability] = useState('');
  const [uncertaintyCommunication, setUncertaintyCommunication] = useState('');
  const [modelDocumentation, setModelDocumentation] = useState('');
  const [feedbackMechanisms, setFeedbackMechanisms] = useState('');
  const [costBenefit, setCostBenefit] = useState('');
  const [accountability, setAccountability] = useState('');
  const [traceability, setTraceability] = useState('');

  // Fetch questions from API when component mounts - with timeout
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(api('/api/use-case-questions'), {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setQuestions(data);
            // Initialize question answers
            const initialAnswers = data.reduce((acc: Record<string, string>, q: UseCaseQuestion) => {
              acc[q.id] = '';
              return acc;
            }, {});
            setQuestionAnswers(initialAnswers);
          } else {
            console.warn('No questions found. Please seed questions first.');
            setQuestions([]);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch questions:', response.status, errorText);
          setQuestions([]);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('Request timeout - server is slow or not responding');
        } else {
          console.error('Error fetching questions:', error);
        }
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  const categories = [
    'Healthcare & Medical',
    'Finance',
    'Education',
    'Transportation',
    'Energy',
    'Public Sector',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare supporting files
    const finalSupportingFiles = files.map(f => ({
      name: f.name,
      data: f.data,
      contentType: f.contentType,
    }));

    // Prepare answers array - sadece questionId ve answer
    const answers = questions.map(q => ({
      questionId: q.id,
      answer: questionAnswers[q.id] || ''
    }));

    onSubmit({
      title,
      description,
      aiSystemCategory,
      aiSystemLink: aiSystemLink || undefined,
      status: 'assigned',
      progress: 0,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supportingFiles: finalSupportingFiles,
      answers: answers,
      extendedInfo: {
        sectionI: {
          systemName,
          systemVersion,
          developer,
          applicationDomain,
          purposeStatement,
          deploymentEnvironment,
          deploymentStage,
          primaryClaims,
          solutionCurrency,
          legalCompliance
        },
        sectionII: {
          targetUsers,
          userProficiency,
          epistemicAuthority,
          overtrustRisk,
          operationalDelay,
          accessibility
        },
        sectionIII: {
          modelType,
          dataSource,
          trainingDataCharacteristics,
          trainingSufficiency,
          dataAppropriateness,
          federatedLearning,
          modelGeneralization,
          dataPrivacy,
          cybersecurity,
          modelMaintenance
        },
        sectionIV: {
          ethicalRisks,
          biasMonitoring,
          resourceDependency,
          adverseOutcomes,
          environmentalImpact
        },
        sectionV: {
          explainability,
          uncertaintyCommunication,
          modelDocumentation,
          feedbackMechanisms,
          costBenefit,
          accountability,
          traceability
        }
      }
    });
  };

  const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-gray-400 cursor-help inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const fileToAttachment = (file: File): Promise<FileAttachment> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          data: reader.result as string,
          contentType: file.type || 'application/octet-stream',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const attachments = await Promise.all(Array.from(fileList).map(fileToAttachment));
    setFiles(prev => [...prev, ...attachments]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    await handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFiles(e.target.files);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl text-gray-900">Create New Use Case</h2>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="usecase-form"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                Submit Use Case
              </button>
            </div>
          </div>
        </div>

        {/* FORM START */}
        <form id="usecase-form" onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* BASIC INFORMATION */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <h3 className="text-lg text-gray-900 mb-4">🩺 Basic Information</h3>
            </div>

                        {/* Title */}
                        <div>
                          <label className="block text-sm mb-2 text-gray-700">Use Case Title *</label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="e.g., Medical Image Analysis for Cancer Detection"
                            required
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-sm mb-2 text-gray-700">Description *</label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[120px]"
                            placeholder="Provide a detailed description of your use case..."
                            required
                          />
                        </div>

                        {/* AI System Category */}
                        <div>
                          <label className="block text-sm mb-2 text-gray-700">AI System Category *</label>
                          <select
                            value={aiSystemCategory}
                            onChange={(e) => setAiSystemCategory(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                    {/* File Upload */}
                    <div className="mt-4">
                      <label className="block text-sm mb-2 text-gray-700">Attach Files (optional)</label>
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-4 text-center ${dragActive ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                      >
                        <input
                          type="file"
                          multiple
                          onChange={handleFileInput}
                          className="hidden"
                          id="usecase-file-upload"
                        />
                        <label htmlFor="usecase-file-upload" className="cursor-pointer text-sm text-green-700 hover:underline flex items-center justify-center space-x-2">
                          <Upload className="w-4 h-4" />
                          <span>Click to upload or drag files here</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-2">Files will be shared with assigned experts.</p>
                      </div>
                      {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {files.map((file) => (
                            <div key={file.name} className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-800">{file.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFiles(prev => prev.filter(f => f.name !== file.name))}
                                className="text-red-600 text-xs hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
          </div>

          {/* QUESTIONS SECTION */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <h3 className="text-lg text-gray-900 mb-4">📋 Use Case Questions</h3>
              <p className="text-sm text-gray-600 mb-6">Please answer the following questions about your AI system use case.</p>
            </div>

            {/* AI System Link (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI System Link (optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                If available, provide a link to the AI system documentation, website, or repository.
              </p>
              <input
                type="url"
                value={aiSystemLink}
                onChange={(e) => setAiSystemLink(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://example.com/ai-system"
              />
            </div>

            {loadingQuestions ? (
              <div className="text-center py-8 text-gray-500">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No questions available.</p>
                <p className="text-sm text-gray-400">Please seed questions in the database first.</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await fetch(api('/api/use-case-questions/seed'), {
                        method: 'POST'
                      });
                      if (response.ok) {
                        alert('Questions seeded successfully! Please refresh the page.');
                        window.location.reload();
                      } else {
                        alert('Failed to seed questions.');
                      }
                    } catch (error) {
                      alert('Error seeding questions.');
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Seed Questions Now
                </button>
              </div>
            ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {questions.map((question) => (
                <div key={question.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {question.questionEn}
                    <span className="block text-xs text-gray-500 mt-1 font-normal">{question.questionTr}</span>
                  </label>
                  
                  {question.type === 'multiple-choice' && question.options ? (
                    <select
                      value={questionAnswers[question.id] || ''}
                      onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select an option...</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      value={questionAnswers[question.id] || ''}
                      onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
                      placeholder="Enter your answer..."
                    />
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}



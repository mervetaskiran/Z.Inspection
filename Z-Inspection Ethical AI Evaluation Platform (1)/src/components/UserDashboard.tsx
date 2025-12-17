import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Folder,
  MessageSquare,
  Users,
  LogOut,
  Search,
  Download,
  Calendar,
  Target,
  Play,
  Clock,
  X,
} from "lucide-react";
import { Project, User, UseCase } from "../types";
import { ChatPanel } from "./ChatPanel";
import { formatRoleName } from "../utils/helpers";
import { ProfileModal } from "./ProfileModal";
import { api } from "../api";
import { fetchUserProgress } from "../utils/userProgress";

interface UserDashboardProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  onViewProject: (project: Project, chatUserId?: string) => void;
  onStartEvaluation: (project: Project) => void;
  onFinishEvolution?: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigate: (view: string) => void;
  onViewUseCase?: (useCase: UseCase) => void;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
  preferredTab?: "assigned" | "commented" | null;
  onPreferredTabApplied?: () => void;
  assignmentsRefreshToken?: number;
}

const roleColors = {
  admin: "#1F2937",
  "ethical-expert": "#1E40AF",
  "medical-expert": "#9D174D",
  "use-case-owner": "#065F46",
  "education-expert": "#7C3AED",
  "technical-expert": "#0891B2",
  "legal-expert": "#B45309",
};

const statusColors = {
  ongoing: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  proven: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  disproven: {
    bg: "bg-red-100",
    text: "text-red-800",
  },
};

const stageLabels = {
  "set-up": "Set-up",
  assess: "Assess",
  resolve: "Resolve",
};

export function UserDashboard({
  currentUser,
  projects,
  users,
  onViewProject,
  onStartEvaluation,
  onFinishEvolution,
  onDeleteProject,
  onNavigate,
  onLogout,
  onUpdateUser,
  preferredTab,
  onPreferredTabApplied,
  assignmentsRefreshToken,
}: UserDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState<"assigned" | "commented">(
    "assigned"
  );
  const [activeFilter, setActiveFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showChats, setShowChats] = useState(false);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatOtherUser, setChatOtherUser] = useState<User | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [projectProgresses, setProjectProgresses] = useState<Record<string, number>>({});
  const [assignmentByProjectId, setAssignmentByProjectId] = useState<Record<string, any>>({});

  const roleColor = roleColors[currentUser.role as keyof typeof roleColors];

  // Apply preferred tab from parent (used after "Finish Evolution" to jump to Commented)
  useEffect(() => {
    if (preferredTab) {
      setCurrentTab(preferredTab);
      onPreferredTabApplied?.();
    }
  }, [preferredTab, onPreferredTabApplied]);

  // Fetch assignment metadata (evolutionCompletedAt) for the current user
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch(api(`/api/project-assignments?userId=${currentUser.id}`));
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, any> = {};
        (data || []).forEach((a: any) => {
          if (a?.projectId) map[String(a.projectId)] = a;
        });
        setAssignmentByProjectId(map);
      } catch (e) {
        // ignore; UI will fallback to showing assigned projects only
      }
    };

    if (currentUser.id) fetchAssignments();
  }, [currentUser.id, assignmentsRefreshToken]);

  // Fetch progress for all assigned projects
  useEffect(() => {
    const fetchAllProgresses = async () => {
      const progresses: Record<string, number> = {};
      const assignedProjects = projects.filter(p => p.assignedUsers.includes(currentUser.id));
      
      await Promise.all(
        assignedProjects.map(async (project) => {
          try {
            const progress = await fetchUserProgress(project, currentUser);
            progresses[project.id] = progress;
          } catch (error) {
            console.error(`Error fetching progress for project ${project.id}:`, error);
            progresses[project.id] = project.progress || 0;
          }
        })
      );
      
      setProjectProgresses(prev => ({ ...prev, ...progresses }));
    };

    if (projects.length > 0 && currentUser.id) {
      fetchAllProgresses();
      // Progress'i periyodik olarak güncelle (her 3 saniyede bir)
      const interval = setInterval(fetchAllProgresses, 3000);
      return () => clearInterval(interval);
    }
  }, [projects, currentUser]);

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(api(`/api/messages/unread-count?userId=${currentUser.id}`));
      if (response.ok) {
        const data = await response.json();
        console.log('Unread count fetched:', data);
        setUnreadCount(data.totalCount || 0);
        setUnreadConversations(data.conversations || []);
      } else {
        console.error('Failed to fetch unread count:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch all conversations (chats)
  const fetchConversations = async () => {
    try {
      const response = await fetch(api(`/api/messages/conversations?userId=${currentUser.id}`));
      if (response.ok) {
        const data = await response.json();
        setAllConversations(data || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Poll for unread messages every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30 seconds
    
    // Listen for message sent events to refresh immediately
    const handleMessageSent = () => {
      setTimeout(fetchUnreadCount, 1000); // Small delay to ensure backend processed
      if (showChats) {
        setTimeout(fetchConversations, 1000);
      }
    };
    window.addEventListener('message-sent', handleMessageSent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('message-sent', handleMessageSent);
    };
  }, [currentUser.id, showChats]);

  // Fetch conversations when chats tab is shown
  useEffect(() => {
    if (showChats) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [showChats, currentUser.id]);

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
        alert('Cannot start conversation: No project available. Please contact an admin to create a project.');
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
        console.log('handleOpenChat called for:', { otherUser, currentUser, conversation });
        const project = await getCommunicationProject(otherUser);
        console.log('Opening chat with:', { otherUser, project });
        if (!project) {
          throw new Error('No project available for communication');
        }
        setChatOtherUser(otherUser);
        setChatProject(project);
        setChatPanelOpen(true);
      } catch (error) {
        console.error('Error opening chat:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert('Cannot open chat: ' + errorMessage);
      }
    } else {
      console.error('Other user not found for conversation:', conversation);
      alert('Cannot open chat: User not found');
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

  // Handle notification click - open project and mark as read
  const handleNotificationClick = async (conversation: any) => {
    const project = projects.find(p => p.id === conversation.projectId);
    if (project) {
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
        fetchUnreadCount(); // Refresh count
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }

      // Notification-only items should NOT open Chats.
      const lastMessageText = String(conversation.lastMessage || '');
      const isNotificationOnly =
        Boolean(conversation.isNotification) || lastMessageText.startsWith('[NOTIFICATION]');
      if (isNotificationOnly) {
        setShowNotifications(false);
        return;
      }

      // Open project with chat panel for the sender (normal messages)
      onViewProject(project, conversation.fromUserId);
      setShowNotifications(false);
    }
  };

  // Assigned Projects
  const myProjects = projects.filter((p) => p.assignedUsers.includes(currentUser.id));
  const assignedProjects = myProjects.filter((p) => !assignmentByProjectId[p.id]?.evolutionCompletedAt);
  const commentedProjects = myProjects.filter((p) => Boolean(assignmentByProjectId[p.id]?.evolutionCompletedAt));

  const activeProjectList =
    currentTab === "assigned" ? assignedProjects : commentedProjects;

  const filteredProjects = activeProjectList.filter((p) => {
    const matchFilter = activeFilter === "all" || p.status === activeFilter;
    const matchSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchTerm.toLowerCase());

    return matchFilter && matchSearch;
  });

  const canStartEvaluation = (project: Project) => {
    return (
      project.assignedUsers.includes(currentUser.id) &&
      (project.stage === "assess" || project.stage === "set-up")
    );
  };

  // Download use case files and Q&A
  const handleDownloadUseCase = async (project: Project) => {
    if (!project.useCase) {
      alert('No use case linked to this project.');
      return;
    }

    try {
      // Get use case ID (could be string or object with url)
      const useCaseId = typeof project.useCase === 'string' 
        ? project.useCase 
        : (project.useCase as any).url || project.useCase;

      // Fetch use case data
      const response = await fetch(api(`/api/use-cases/${useCaseId}`));
      if (!response.ok) {
        alert('Use case not found.');
        return;
      }

      const useCase: UseCase = await response.json();

      // Fetch questions and merge with answers
      let questionsWithAnswers: any[] = [];
      if (useCase.answers && useCase.answers.length > 0) {
        try {
          const questionsResponse = await fetch(api('/api/use-case-questions'));
          if (questionsResponse.ok) {
            const allQuestions = await questionsResponse.json();
            questionsWithAnswers = allQuestions.map((q: any) => {
              const answer = useCase.answers?.find((a: any) => a.questionId === q.id);
              return {
                ...q,
                answer: answer?.answer || ''
              };
            });
          }
        } catch (error) {
          console.error('Error fetching questions:', error);
        }
      }

      // Create Q&A file first
      if (questionsWithAnswers.length > 0) {
        let qaContent = `USE CASE: ${useCase.title}\n`;
        qaContent += `Category: ${useCase.aiSystemCategory || 'N/A'}\n`;
        qaContent += `Status: ${useCase.status}\n`;
        qaContent += `Created: ${new Date(useCase.createdAt).toLocaleDateString()}\n\n`;
        qaContent += `DESCRIPTION:\n${useCase.description || 'N/A'}\n\n`;
        qaContent += `QUESTIONS & ANSWERS:\n${'='.repeat(50)}\n\n`;
        
        questionsWithAnswers.forEach((q, idx) => {
          qaContent += `${idx + 1}. ${q.questionEn}\n`;
          if (q.questionTr) {
            qaContent += `   (${q.questionTr})\n`;
          }
          qaContent += `   Answer: ${q.answer || 'No answer provided'}\n\n`;
        });
        
        const qaBlob = new Blob([qaContent], { type: 'text/plain' });
        const qaUrl = URL.createObjectURL(qaBlob);
        const qaLink = document.createElement('a');
        qaLink.href = qaUrl;
        qaLink.download = `${useCase.title.replace(/[^a-z0-9]/gi, '_')}_Questions_and_Answers.txt`;
        document.body.appendChild(qaLink);
        qaLink.click();
        document.body.removeChild(qaLink);
        URL.revokeObjectURL(qaUrl);
      }

      // Download supporting files
      if (useCase.supportingFiles && useCase.supportingFiles.length > 0) {
        useCase.supportingFiles.forEach((file: any, idx: number) => {
          setTimeout(() => {
            if (file.data) {
              try {
                // Check if data is already a data URL
                let dataUrl = file.data;
                if (!dataUrl.startsWith('data:')) {
                  // Construct data URL from base64 string
                  const contentType = file.contentType || 'application/octet-stream';
                  dataUrl = `data:${contentType};base64,${file.data}`;
                }
                
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = file.name || `file-${idx}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              } catch (error) {
                console.error('File download error:', error);
              }
            } else if (file.url) {
              window.open(file.url, '_blank');
            }
          }, (questionsWithAnswers.length > 0 ? 500 : 0) + idx * 250);
        });
      } else if (questionsWithAnswers.length === 0) {
        alert('No files or Q&A available to download for this use case.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Unable to download use case files.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ======= TOP BAR ======= */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-semibold text-gray-900">
                Z-Inspection Platform
              </h1>

              {/* FILTER BUTTONS */}
              <div className="hidden md:flex space-x-2">
                {["all", "ongoing", "proven", "disproven"].map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      activeFilter === key
                        ? "bg-gray-900 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: search, bell, user */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                                  <div className="text-xs text-gray-600 font-medium mb-1 truncate">
                                    {conv.projectTitle}
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
        </div>
      </div>

      {/* ======= MAIN LAYOUT ======= */}
      <div className="flex">
        {/* SIDEBAR */}
        <div className="w-64 bg-white shadow-sm h-screen">
          <div className="p-6">
            <button
              onClick={() => setShowProfile(true)}
              className="w-full mb-6 hover:opacity-80 transition-opacity text-left"
            >
              <div className="text-sm text-gray-600">Welcome back,</div>
              <div className="flex items-center mt-2">
                {(currentUser as any).profileImage ? (
                  <img
                    src={(currentUser as any).profileImage}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover mr-3"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-medium mr-3"
                    style={{ backgroundColor: roleColor }}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-lg font-medium text-gray-900">
                    {currentUser.name}
                  </div>
                  <div
                    className="text-xs px-2 py-1 rounded text-white inline-block mt-1 capitalize"
                    style={{ backgroundColor: roleColor }}
                  >
                    {currentUser.role} Expert
                  </div>
                </div>
              </div>
            </button>

            <nav className="space-y-2">
              <button
                onClick={() => {
                  setShowChats(false);
                  onNavigate("dashboard");
                }}
                className={`w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 ${
                  !showChats ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <Folder className="h-4 w-4 mr-3" />
                My Projects
              </button>
              <button
                onClick={() => onNavigate("shared-area")}
                className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <MessageSquare className="h-4 w-4 mr-3" />
                Shared Area
              </button>
              <button
                onClick={() => onNavigate("other-members")}
                className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <Users className="h-4 w-4 mr-3" />
                Other Members
              </button>
            </nav>
          </div>

          <div className="absolute bottom-0 w-64 p-6">
            <button
              onClick={onLogout}
              className="w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </button>
          </div>
        </div>

        {/* ======= MAIN CONTENT ======= */}
        <div className="flex-1 p-6">
          {showChats ? (
            /* ===== CHATS LIST ===== */
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Chats</h2>
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
                              style={{ backgroundColor: roleColors[otherUser.role as keyof typeof roleColors] || '#1F2937' }}
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
          ) : (
            <>
              {/* TABS */}
              <div className="border-b mb-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setCurrentTab("assigned")}
                    className={`py-2 px-1 border-b-2 text-sm ${
                      currentTab === "assigned"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    📂 Assigned ({assignedProjects.length})
                  </button>

                  <button
                    onClick={() => setCurrentTab("commented")}
                    className={`py-2 px-1 border-b-2 text-sm ${
                      currentTab === "commented"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    💬 Commented ({commentedProjects.length})
                  </button>
                </nav>
              </div>

              {/* ===== PROJECT LIST ===== */}
              <div className="space-y-4">
                {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {project.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {project.shortDescription}
                      </p>

                      {/* Status + Stage */}
                      <div className="flex items-center space-x-3 mt-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${statusColors[project.status].bg} ${statusColors[project.status].text}`}
                        >
                          {project.status.toUpperCase()}
                        </span>

                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                          {stageLabels[project.stage]}
                        </span>
                      </div>
                    </div>

                    {/* Assigned / Observer */}
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        project.assignedUsers.includes(currentUser.id)
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {project.assignedUsers.includes(currentUser.id)
                        ? "Assigned"
                        : "Observer"}
                    </span>
                  </div>

                  {/* Progress bar (only if assigned) */}
                  {project.assignedUsers.includes(currentUser.id) && (() => {
                    const progress = projectProgresses[project.id] ?? project.progress ?? 0;
                    const progressDisplay = Math.max(0, Math.min(100, progress));
                    return (
                      <div className="mt-2 mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Your Progress</span>
                          <span>{progressDisplay}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                            style={{
                              width: `${progressDisplay}%`,
                              minWidth: progressDisplay > 0 ? '8px' : '0',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* ACTIONS */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onViewProject(project)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        View Details
                      </button>

                      {(() => {
                        const progress = projectProgresses[project.id] ?? project.progress ?? 0;
                        const evolutionCompleted = Boolean(assignmentByProjectId[project.id]?.evolutionCompletedAt);
                        const canFinish = progress >= 100 && !evolutionCompleted;
                        if (canFinish) {
                          return (
                            <button
                              onClick={() => onFinishEvolution?.(project)}
                              className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 flex items-center"
                              style={{ backgroundColor: roleColor }}
                            >
                              <Target className="h-3 w-3 mr-2" />
                              Finish Evolution
                            </button>
                          );
                        }

                        if (canStartEvaluation(project) && progress < 100 && !evolutionCompleted) {
                          return (
                            <button
                              onClick={() => onStartEvaluation(project)}
                              className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 flex items-center"
                              style={{ backgroundColor: roleColor }}
                            >
                              <Play className="h-3 w-3 mr-2" />
                              Start Evolution
                            </button>
                          );
                        }

                        return null;
                      })()}

                      {project.useCase && (
                        <button 
                          onClick={() => handleDownloadUseCase(project)}
                          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Use Case
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      Created{" "}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Delete action */}
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => {
                        const confirmDelete = window.confirm("Delete this project? This cannot be undone.");
                        if (!confirmDelete) return;
                        onDeleteProject(project.id);
                      }}
                      className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
                ))}

                {/* EMPTY STATES */}
                {filteredProjects.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-3">
                      {currentTab === "assigned" ? "📂" : "💬"}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {currentTab} projects found
                    </h3>
                    <p className="text-gray-600">
                      {searchTerm
                        ? "No projects match your search."
                        : currentTab === "assigned"
                        ? "You have not been assigned to any projects."
                        : "You have not commented on any projects yet."}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {chatPanelOpen && chatOtherUser && chatProject && (
        <ChatPanel
          project={chatProject!}
          currentUser={currentUser}
          otherUser={chatOtherUser!}
          onClose={() => {
            setChatPanelOpen(false);
            setChatOtherUser(null);
            setChatProject(null);
            if (showChats) {
              fetchConversations();
            }
          }}
          onMessageSent={() => {
            window.dispatchEvent(new Event('message-sent'));
            if (showChats) {
              setTimeout(fetchConversations, 1000);
            }
          }}
          onDeleteConversation={() => {
            setChatPanelOpen(false);
            setChatOtherUser(null);
            setChatProject(null);
            if (showChats) {
              fetchConversations();
            }
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
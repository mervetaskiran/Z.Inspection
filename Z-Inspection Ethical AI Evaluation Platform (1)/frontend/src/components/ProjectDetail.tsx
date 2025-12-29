import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Calendar, Users as UsersIcon, Target, BarChart3, Plus,
  FileText, Shield, MessageSquare, User as UserIconLucide, GitBranch, Download
} from 'lucide-react';
import { Project, User, Tension, UseCase } from '../types'; // UseCase import etmeyi unutmayın
import { UseCaseOwners } from './UseCaseOwners';
import { TensionCard } from './TensionCard';
import { AddTensionModal } from './AddTensionModal';
import { ChatPanel } from './ChatPanel';
import { fetchUserProgress } from '../utils/userProgress';
import { api } from '../api';
import { Spinner } from './Spinner';

interface ProjectDetailProps {
  project: Project;
  currentUser: User;
  users: User[];
  projects?: Project[]; // Add projects prop for communication
  onBack: () => void;
  onStartEvaluation: () => void;
  onFinishEvolution?: () => void;
  onViewTension?: (tension: Tension) => void;
  onViewOwner?: (owner: User) => void;
  onCreateTension?: (data: any) => void;
  initialChatUserId?: string; // Optional: open chat with this user on mount
  initialTab?: 'evaluation' | 'tensions' | 'usecase' | 'owners'; // Optional: set initial tab
}

const roleColors = {
  admin: '#1F2937',
  'ethical-expert': '#1E40AF',
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED',
  'technical-expert': '#0891B2',
  'legal-expert': '#B45309'
};

export function ProjectDetail({
  project,
  currentUser,
  users,
  projects = [],
  onBack,
  onStartEvaluation,
  onFinishEvolution,
  onViewTension,
  onViewOwner,
  initialChatUserId,
  initialTab = 'evaluation',
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'tensions' | 'usecase' | 'owners' | 'dashboard'>(initialTab as any);
  const [showAddTension, setShowAddTension] = useState(false);
  const [tensions, setTensions] = useState<Tension[]>([]); 
  // Yeni: Bağlı Use Case verisini tutacak state
  const [linkedUseCase, setLinkedUseCase] = useState<UseCase | null>(null);
  const [useCaseQuestions, setUseCaseQuestions] = useState<any[]>([]);
  // Chat panel state
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatOtherUser, setChatOtherUser] = useState<User | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);
  const [userProgress, setUserProgress] = useState<number>(project.progress || 0);
  const [generating, setGenerating] = useState(false);
  const previousProgressRef = useRef<number>(project.progress || 0);
  const [memberProgresses, setMemberProgresses] = useState<Record<string, number>>({});
  const [evolutionCompletedAt, setEvolutionCompletedAt] = useState<string | null>(null);
  const [latestReport, setLatestReport] = useState<{ id: string; fileUrl: string; title: string } | null>(null);

  // Calculate assignedUserDetails early to avoid "before initialization" error
  const assignedUserDetails = users
    .filter((user) => project.assignedUsers.includes(user.id))
    // View Details ekranında use-case-owner'ın bir değerlendirme aksiyonu yok; burada göstermiyoruz
    .filter((user) => user.role !== 'use-case-owner');

  // Find or create a project for communication with a user (UseCaseOwner-Admin mantığı)
  const getCommunicationProject = async (otherUser: User): Promise<Project> => {
    // Use projects list if available, otherwise use current project
    const allProjects = projects.length > 0 ? projects : [project];
    
    // Try to find an existing project where both users are assigned
    let commProject = allProjects.find(p => 
      p.assignedUsers.includes(currentUser.id) && 
      p.assignedUsers.includes(otherUser.id)
    );
    
    // If not found, try to find a project with similar name
    if (!commProject) {
      const projectName = `Communication: ${currentUser.name} & ${otherUser.name}`;
      commProject = allProjects.find(p => 
        p.title === projectName || 
        p.title.includes('Communication') ||
        (p.assignedUsers.includes(currentUser.id) && p.assignedUsers.includes(otherUser.id))
      );
    }
    
    // If still not found, use current project if both users are assigned
    if (!commProject && project.assignedUsers.includes(currentUser.id) && project.assignedUsers.includes(otherUser.id)) {
      commProject = project;
    }
    
    // If still no project, use first available project as fallback
    if (!commProject && allProjects.length > 0) {
      commProject = allProjects[0];
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
    
    // Final fallback - use current project (even if not ideal)
    if (!commProject) {
      commProject = project;
      console.log('Using current project for communication:', commProject);
    }
    
    return commProject;
  };

  const handleContactUser = async (otherUser: User) => {
    try {
      console.log('handleContactUser called for:', { otherUser, currentUser });
      const commProject = await getCommunicationProject(otherUser);
      console.log('Opening chat with:', { otherUser, project: commProject });
      if (!commProject) {
        throw new Error('No project available for communication');
      }
      setChatOtherUser(otherUser);
      setChatProject(commProject);
      setChatPanelOpen(true);
    } catch (error) {
      console.error('Error opening chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Cannot open chat: ' + errorMessage);
    }
  };

  // Open chat panel if initialChatUserId is provided
  useEffect(() => {
    if (initialChatUserId && !chatPanelOpen) {
      const user = users.find(u => u.id === initialChatUserId);
      if (user && user.id !== currentUser.id) {
        handleContactUser(user);
      }
    }
  }, [initialChatUserId, users, currentUser.id, chatPanelOpen]);

  const closeChat = useCallback(() => {
    setChatPanelOpen(false);
    setChatOtherUser(null);
    setChatProject(null);
  }, []);

  // Lock background scroll when chat drawer is open
  useEffect(() => {
    if (!chatPanelOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [chatPanelOpen]);

  // Close on Escape when chat is open
  useEffect(() => {
    if (!chatPanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chatPanelOpen, closeChat]);

  const hasEditPermission = true; 

  // Tensionları Getir
  const fetchTensions = async () => {
    try {
      const response = await fetch(api(`/api/tensions/${project.id}?userId=${currentUser.id}`));
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((t: any) => ({
            ...t,
            id: t._id || t.id,
            claimStatement: t.claimStatement || t.description, 
            description: t.description,
            consensus: t.consensus || { agree: 0, disagree: 0 },
            userVote: t.userVote || null // userVote'u da ekle
        }));
        setTensions(formattedData);
      }
    } catch (error) {
      console.error("Tensions load error:", error);
    }
  };

  // Use Case Verisini Getir (Eğer projeye bağlıysa)
  const fetchUseCase = async () => {
    if (!project.useCase) return;
    try {
        // Handle both string ID and object with url
        const useCaseId = typeof project.useCase === 'string' 
          ? project.useCase 
          : (project.useCase as any).url || project.useCase;
        
        // Paralel olarak use case ve questions'ı çek
        const [useCaseResponse, questionsResponse] = await Promise.all([
          fetch(api(`/api/use-cases/${useCaseId}`)),
          fetch(api('/api/use-case-questions'))
        ]);
        
        if (useCaseResponse.ok) {
            const data = await useCaseResponse.json();
            setLinkedUseCase(data);
            
            // Fetch questions and merge with answers
            if (data.answers && data.answers.length > 0 && questionsResponse.ok) {
              const allQuestions = await questionsResponse.json();
              const questionsWithAnswers = allQuestions.map((q: any) => {
                const answer = data.answers.find((a: any) => a.questionId === q.id);
                return {
                  ...q,
                  answer: answer?.answer || ''
                };
              });
              setUseCaseQuestions(questionsWithAnswers);
            }
        }
    } catch (error) {
        console.error("Use Case load error:", error);
    }
  };

  useEffect(() => {
    fetchTensions();
    fetchUseCase();
  }, [project.id, currentUser.id, project.useCase]);

  // Load evolution completion flag for this user+project (drives Start/Finish button on tension page)
  useEffect(() => {
    const loadEvolutionCompletion = async () => {
      try {
        const res = await fetch(api(`/api/project-assignments?userId=${currentUser.id}`));
        if (!res.ok) return;
        const data = await res.json();
        const found = (data || []).find((a: any) => String(a.projectId) === String(project.id));
        setEvolutionCompletedAt(found?.evolutionCompletedAt || null);
      } catch {
        // ignore
      }
    };
    if (currentUser.id && project.id) loadEvolutionCompletion();
  }, [currentUser.id, project.id]);

  // Tüm assigned members için progress yükle
  useEffect(() => {
    const loadAllMemberProgresses = async () => {
      const progresses: Record<string, number> = {};
      await Promise.all(
        assignedUserDetails.map(async (user) => {
          try {
            const progress = await fetchUserProgress(project, user);
            progresses[user.id] = progress;
          } catch (error) {
            console.error(`Error fetching progress for user ${user.id}:`, error);
            progresses[user.id] = 0;
          }
        })
      );
      setMemberProgresses(progresses);
    };

    if (assignedUserDetails.length > 0) {
      loadAllMemberProgresses();
      // Progress'i periyodik olarak güncelle (her 5 saniyede bir)
      const interval = setInterval(loadAllMemberProgresses, 5000);
      return () => clearInterval(interval);
    }
  }, [project, assignedUserDetails]);

  // Kullanıcıya özel ilerleme
  useEffect(() => {
    const loadUserProgress = async () => {
      const previousProgress = previousProgressRef.current;
      const computed = await fetchUserProgress(project, currentUser);
      setUserProgress(computed);
      previousProgressRef.current = computed;
      
      // If progress just reached 100%, notification is already sent by backend notificationService
      // No need to send chat message - notifications go to bell icon only
      // Chat messages should only be for actual user-to-user communication
      // Backend notificationService.notifyEvaluationCompleted handles this automatically
    };
    loadUserProgress();
    // Progress'i periyodik olarak güncelle (her 3 saniyede bir)
    const interval = setInterval(loadUserProgress, 3000);
    return () => clearInterval(interval);
  }, [project, currentUser, users]);

  const handleSaveTension = async (data: any) => {
    try {
      const severityString = data.severity === 3 ? 'high' : data.severity === 2 ? 'medium' : 'low';
      
      const payload = {
        projectId: project.id,
        principle1: data.principle1,
        principle2: data.principle2,
        claimStatement: data.claimStatement,
        description: data.description,
        evidenceDescription: data.evidenceDescription,
        evidenceFileName: data.evidenceFileName,
        evidenceFileData: data.evidenceFileData,
        severity: severityString,
        status: 'ongoing',
        createdBy: currentUser.id
      };

      const response = await fetch(api('/api/tensions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchTensions();
        setShowAddTension(false);
      } else {
        const err = await response.json();
        alert("❌ Error: " + (err.error || "Unknown"));
      }
    } catch (error) {
      alert("❌ Cannot connect to server.");
    }
  };

  const handleDeleteTension = async (tensionId: string) => {
    const confirmed = window.confirm("Delete this tension? This cannot be undone.");
    if (!confirmed) return;
    try {
      const response = await fetch(api(`/api/tensions/${tensionId}?userId=${encodeURIComponent(currentUser.id)}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchTensions();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete tension.");
      }
    } catch (error) {
      console.error("Delete tension error:", error);
      alert("Cannot connect to server.");
    }
  };

  const handleVote = async (tensionId: string, voteType: 'agree' | 'disagree') => {
    // Optimistic update: Anında state'i güncelle
    setTensions(prevTensions => 
      prevTensions.map(t => {
        if ((t.id || (t as any)._id) === tensionId) {
          const currentAgree = t.consensus?.agree || 0;
          const currentDisagree = t.consensus?.disagree || 0;
          const oldVote = t.userVote;
          
          // Eski oyu çıkar
          let newAgree = currentAgree;
          let newDisagree = currentDisagree;
          if (oldVote === 'agree') newAgree = Math.max(0, newAgree - 1);
          if (oldVote === 'disagree') newDisagree = Math.max(0, newDisagree - 1);
          
          // Yeni oyu ekle (eğer aynı butona basıldıysa oyu kaldır)
          const newVote = oldVote === voteType ? null : voteType;
          if (newVote === 'agree') newAgree += 1;
          if (newVote === 'disagree') newDisagree += 1;
          
          return {
            ...t,
            userVote: newVote,
            consensus: {
              agree: newAgree,
              disagree: newDisagree
            }
          };
        }
        return t;
      })
    );
    
    try {
      const response = await fetch(api(`/api/tensions/${tensionId}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, voteType }),
      });
      if (response.ok) {
        // Backend'den güncel veriyi al
        fetchTensions();
      } else {
        // Hata durumunda geri al
        fetchTensions();
      }
    } catch (error) {
      console.error("Vote error:", error);
      // Hata durumunda geri al
      fetchTensions();
    }
  };

  // assignedUserDetails is already defined earlier in the component (line ~66)
  const roleColor = roleColors[currentUser.role as keyof typeof roleColors] || '#1F2937';
  const isAssigned = project.assignedUsers.includes(currentUser.id);
  const progressDisplay = Math.max(0, Math.min(100, userProgress));
  
  // Calculate team average progress for display (admin should see team average, not their own 0%)
  const isProgressContributor = (role?: string) => {
    const r = String(role || '').toLowerCase();
    // Exclude non-contributors from "team completion": admin and use-case-owner
    if (r === 'admin') return false;
    if (r === 'use-case-owner') return false;
    if (r === 'usecaseowner') return false;
    if (r.includes('use-case-owner')) return false;
    return true;
  };

  const getContributorProgressValues = () => {
    const contributors = (assignedUserDetails || []).filter((u: any) => isProgressContributor(u?.role));
    return contributors.map((u: any) => memberProgresses[u.id] ?? 0);
  };

  const calculateTeamAverageProgress = () => {
    const progressValues = getContributorProgressValues();
    if (progressValues.length === 0) return 0;
    const sum = progressValues.reduce((acc, val) => acc + val, 0);
    return sum / progressValues.length;
  };
  const teamAverageProgress = calculateTeamAverageProgress();
  const displayProgress = currentUser.role === 'admin' ? teamAverageProgress : progressDisplay;
  
  const canViewOwners = currentUser.role === 'admin';
  const isCommentedProjectForUser = currentUser.role !== 'admin' && Boolean(evolutionCompletedAt);
  // Admins cannot manage tensions (add, vote, comment, add evidence)
  const canManageTensions = !isCommentedProjectForUser && currentUser.role !== 'admin';

  // Use Case Owner ismini bulma
  const useCaseOwnerName = linkedUseCase ? users.find(u => u.id === linkedUseCase.ownerId)?.name : 'Unknown';
  const handleDownload = (file: { name: string; data?: string; url?: string; contentType?: string }) => {
    if (file.data) {
      try {
        // Check if data is already a data URL
        let dataUrl = file.data;
        if (!dataUrl.startsWith('data:')) {
          // Construct data URL from base64 string
          const contentType = file.contentType || 'application/octet-stream';
          dataUrl = `data:${contentType};base64,${file.data}`;
        }
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download error:', error);
        alert('Unable to download file.');
      }
    } else if (file.url) {
      window.open(file.url, '_blank');
    } else {
      alert('File is not available.');
    }
  };

  // Generate report for a project
  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      const projectId = project.id || (project as any)._id;
      const response = await fetch(api('/api/reports/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          userId: currentUser?.id || (currentUser as any)?._id
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('✅ Report generated successfully!');
        // Refresh latest report
        const projectId = project.id || (project as any)._id;
        try {
          const reportResponse = await api.get(`/projects/${projectId}/reports/latest`);
          if (reportResponse.data?.report) {
            setLatestReport({
              id: reportResponse.data.report._id,
              fileUrl: reportResponse.data.report.fileUrl || `/api/reports/${reportResponse.data.report._id}/file`,
              title: reportResponse.data.report.title
            });
          }
        } catch (err) {
          console.warn('Could not fetch latest report after generation');
        }
      } else {
        const error = await response.json();
        alert('❌ Error: ' + (error.error || 'Failed to generate report'));
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      alert('❌ Error: ' + (error.message || 'Failed to generate report'));
    } finally {
      setGenerating(false);
    }
  };

  // Download supporting files and Q&A from use case
  const handleDownloadUseCase = async (forUser?: User) => {
    if (!linkedUseCase) {
      alert('No linked use case to download.');
      return;
    }

    try {
      // Create Q&A file first if questions exist
      if (useCaseQuestions && useCaseQuestions.length > 0) {
        let qaContent = `USE CASE: ${linkedUseCase.title}\n`;
        qaContent += `Category: ${linkedUseCase.aiSystemCategory || 'N/A'}\n`;
        qaContent += `Status: ${linkedUseCase.status}\n`;
        qaContent += `Created: ${new Date(linkedUseCase.createdAt).toLocaleDateString()}\n\n`;
        qaContent += `DESCRIPTION:\n${linkedUseCase.description || 'N/A'}\n\n`;
        qaContent += `QUESTIONS & ANSWERS:\n${'='.repeat(50)}\n\n`;
        
        useCaseQuestions.forEach((q, idx) => {
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
        qaLink.download = `${linkedUseCase.title.replace(/[^a-z0-9]/gi, '_')}_Questions_and_Answers.txt`;
        document.body.appendChild(qaLink);
        qaLink.click();
        document.body.removeChild(qaLink);
        URL.revokeObjectURL(qaUrl);
      }

      // Download supporting files (if any)
      if (linkedUseCase.supportingFiles && linkedUseCase.supportingFiles.length > 0) {
        linkedUseCase.supportingFiles.forEach((file: any, idx: number) => {
          // small timeout to let browser process sequential downloads
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
                console.error('Supporting file download error:', error);
              }
            } else if (file.url) {
              window.open(file.url, '_blank');
            }
          }, (useCaseQuestions && useCaseQuestions.length > 0 ? 500 : 0) + idx * 250);
        });
      } else if (!useCaseQuestions || useCaseQuestions.length === 0) {
        alert('No files or Q&A available to download for this use case.');
      }
    } catch (err) {
      console.error('Download error', err);
      alert('Unable to prepare download.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </button>
            <div>
              <h1 className="text-xl text-gray-900 mr-3 flex items-center">
                {project.title}
                {project.isNew && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">NEW</span>}
              </h1>
              <p className="text-gray-600">{project.shortDescription}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {currentUser.role === 'admin' && (() => {
              // Calculate team average progress for admin
              const calculateTeamAverageProgress = () => {
                const progressValues = getContributorProgressValues();
                if (progressValues.length === 0) return 0;
                const sum = progressValues.reduce((acc, val) => acc + val, 0);
                return sum / progressValues.length;
              };
              const teamAverageProgress = calculateTeamAverageProgress();
              const isComplete = teamAverageProgress >= 100;
              const canGenerate = isComplete && !generating;
              return (
                <button
                  onClick={handleGenerateReport}
                  disabled={!canGenerate}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    !canGenerate
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={!isComplete ? 'Project must be 100% complete to generate report' : ''}
                >
                  {generating ? 'Generating...' : 'Generate Report'}
                </button>
              );
            })()}
            {latestReport && (
              <a
                href={latestReport.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ml-2 inline-block"
              >
                Show Report
              </a>
            )}
            {isAssigned && progressDisplay === 0 && (
              <button onClick={onStartEvaluation} className="px-4 py-2 text-white rounded-lg hover:opacity-90" style={{ backgroundColor: roleColor }}>
                Start Evaluation
              </button>
            )}
            {isAssigned && progressDisplay > 0 && progressDisplay < 100 && (
              <button onClick={onStartEvaluation} className="px-4 py-2 text-white rounded-lg hover:opacity-90" style={{ backgroundColor: roleColor }}>
                Continue Evaluation
              </button>
            )}
            {isAssigned && progressDisplay >= 100 && !evolutionCompletedAt && (
              <button onClick={onFinishEvolution} className="px-4 py-2 text-white rounded-lg hover:opacity-90" style={{ backgroundColor: roleColor }}>
                Finish Evaluation
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Project Details Summary Cards with Blue Theme */}
        {(() => {
          const cardThemes = {
            targetDate: { color: "text-blue-600", Icon: Calendar },
            team: { color: "text-blue-600", Icon: UsersIcon },
            progress: { color: "text-blue-600", Icon: Target },
            tensions: { color: "text-blue-600", Icon: BarChart3 }
          };
          
          const TargetDateIcon = cardThemes.targetDate.Icon;
          const TeamIcon = cardThemes.team.Icon;
          const ProgressIcon = cardThemes.progress.Icon;
          const TensionsIcon = cardThemes.tensions.Icon;
          
          const progressValue = Math.round(displayProgress);
          const isProgressComplete = progressValue >= 100;
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Target Date Card */}
              <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
                <TargetDateIcon className={`h-5 w-5 ${cardThemes.targetDate.color} mr-3`} />
                <div>
                  <div className={`text-sm font-semibold ${cardThemes.targetDate.color}`}>Target Date</div>
                  <div className="text-sm font-medium text-gray-900">{new Date(project.targetDate).toLocaleDateString()}</div>
                </div>
              </div>
              
              {/* Team Card */}
              <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
                <TeamIcon className={`h-5 w-5 ${cardThemes.team.color} mr-3`} />
                <div>
                  <div className={`text-sm font-semibold ${cardThemes.team.color}`}>Team</div>
                  <div className="text-sm font-medium text-gray-900">{assignedUserDetails.length} members</div>
                </div>
              </div>
              
              {/* Progress Card */}
              <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
                <ProgressIcon className={`h-5 w-5 ${cardThemes.progress.color} mr-3`} />
                <div>
                  <div className={`text-sm font-semibold ${cardThemes.progress.color}`}>Progress</div>
                  <div className={`text-sm font-medium ${isProgressComplete ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {progressValue}%
                  </div>
                </div>
              </div>
              
              {/* Tensions Card */}
              <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
                <TensionsIcon className={`h-5 w-5 ${cardThemes.tensions.color} mr-3`} />
                <div>
                  <div className={`text-sm font-semibold ${cardThemes.tensions.color}`}>Tensions</div>
                  <div className="text-sm font-medium text-gray-900">{tensions.length} total</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Assigned Members with Contact button */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Assigned Members</h4>
          <div className="space-y-2">
            {assignedUserDetails.length > 0 ? (
              assignedUserDetails.map((u) => {
                  // All roles can contact assigned members (except themselves)
                  // Only use-case-owner has restriction: can only contact admin
                  const canContact = u.id !== currentUser.id && 
                    !(currentUser.role === 'use-case-owner' && u.role !== 'admin');
                  
                  const memberProgress = memberProgresses[u.id] ?? 0;
                  const memberProgressDisplay = Math.max(0, Math.min(100, memberProgress));
                  
                  return (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3 text-sm font-medium">
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{u.name}</div>
                              <div className="text-xs text-gray-500">{u.role}</div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-xs font-medium text-gray-700">{memberProgressDisplay}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
                            <div
                              className="h-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                              style={{
                                width: `${memberProgressDisplay}%`,
                                minWidth: memberProgressDisplay > 0 ? '4px' : '0',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="ml-3">
                        {canContact && (
                          <button
                            onClick={() => {
                              console.log('Contact button clicked for user:', u);
                              handleContactUser(u);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm rounded text-blue-600 hover:bg-blue-50"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Contact
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-sm text-gray-500">No members assigned.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200 flex">
            {['evaluation', 'tensions', 'usecase', 'owners'].map((tab) => {
              if (tab === 'owners' && !canViewOwners) return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-3 text-sm capitalize flex items-center ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {tab === 'tensions' ? `Tensions (${tensions.length})` : tab === 'dashboard' ? 'Analytics' : tab}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'evaluation' && (() => {
              // Calculate average progress for admin view
              const calculateAverageProgress = () => {
                const progressValues = getContributorProgressValues();
                if (progressValues.length === 0) return 0;
                const sum = progressValues.reduce((acc, val) => acc + val, 0);
                return sum / progressValues.length;
              };

              const averageProgress = currentUser.role === 'admin' ? calculateAverageProgress() : userProgress;
              const averageProgressDisplay = Math.max(0, Math.min(100, averageProgress));

              return (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  {userProgress === 0 && currentUser.role === 'admin' ? (
                    <div>
                      <div className="text-gray-700 mb-2 font-medium">
                        Team Average Progress
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        {Math.round(averageProgressDisplay)}%
                      </div>
                      <div className="max-w-md mx-auto">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={
                              averageProgressDisplay === 0
                                ? 'bg-gray-400 h-1.5 rounded-full transition-all'
                                : 'bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all'
                            }
                            style={{
                              width: `${averageProgressDisplay}%`,
                              minWidth: averageProgressDisplay > 0 ? '8px' : '0',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : userProgress === 0 ? (
                    <div className="text-gray-500">
                      Select 'Start Evaluation' to begin.
                    </div>
                  ) : userProgress < 100 ? (
                  <div>
                    <div className="text-gray-700 mb-2 font-medium">
                      Continue your evaluation
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      Progress: {Math.round(userProgress)}%
                    </div>
                    <button
                      onClick={onStartEvaluation}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Continue Evaluation
                    </button>
                  </div>
                ) : (
                  <div className="text-green-600">
                    <div className="font-medium mb-2">✓ Evaluation Completed</div>
                    <div className="text-sm text-gray-500">
                      All questions have been answered. Admin has been notified.
                    </div>
                  </div>
                )}
                </div>
              );
            })()}

            {activeTab === 'tensions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Tensions Management</h3>
                  {canManageTensions && (
                    <button 
                      onClick={() => setShowAddTension(true)} 
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Tension
                    </button>
                  )}
                </div>

                {tensions.length > 0 ? (
                  <div className="space-y-4">
                    {tensions.map((tension) => (
                      <TensionCard 
                        key={tension.id} 
                        tension={tension}
                        currentUser={currentUser}
                        users={users}
                        onVote={handleVote}
                        onCommentClick={(t) => onViewTension?.(t)}
                        onDelete={canManageTensions ? handleDeleteTension : undefined}
                        disableVoting={!canManageTensions}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                    <GitBranch className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No tensions identified yet.</p>
                  </div>
                )}
              </div>
            )}
            
            {/* USE CASE SEKMESİ (GÜNCELLENDİ) */}
            {activeTab === 'usecase' && (
               <div className="bg-white rounded-lg">
                  {linkedUseCase ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start border-b pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{linkedUseCase.title}</h2>
                                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    {linkedUseCase.aiSystemCategory || 'General AI'}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Status</div>
                                <div className="font-medium text-gray-900 capitalize">{linkedUseCase.status.replace('-', ' ')}</div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                            <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border">
                                {linkedUseCase.description}
                            </p>
                        </div>

                        {/* Questions and Answers */}
                        {useCaseQuestions && useCaseQuestions.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">Questions & Answers</h3>
                              <button
                                onClick={() => {
                                  // Create a text file with Q&A
                                  let content = `USE CASE: ${linkedUseCase.title}\n`;
                                  content += `Category: ${linkedUseCase.aiSystemCategory}\n`;
                                  content += `Status: ${linkedUseCase.status}\n`;
                                  content += `Created: ${new Date(linkedUseCase.createdAt).toLocaleDateString()}\n\n`;
                                  content += `DESCRIPTION:\n${linkedUseCase.description}\n\n`;
                                  content += `QUESTIONS & ANSWERS:\n${'='.repeat(50)}\n\n`;
                                  
                                  useCaseQuestions.forEach((q, idx) => {
                                    content += `${idx + 1}. ${q.questionEn}\n`;
                                    if (q.questionTr) {
                                      content += `   (${q.questionTr})\n`;
                                    }
                                    content += `   Answer: ${q.answer || 'No answer provided'}\n\n`;
                                  });
                                  
                                  const blob = new Blob([content], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `${linkedUseCase.title.replace(/[^a-z0-9]/gi, '_')}_Q&A.txt`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download Q&A as File
                              </button>
                            </div>
                            <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                              {useCaseQuestions.map((q, idx) => (
                                <div key={q.id || idx} className="bg-white p-4 rounded-lg border border-gray-200">
                                  <div className="text-sm font-medium text-gray-900 mb-2">
                                    {idx + 1}. {q.questionEn}
                                    {q.questionTr && (
                                      <span className="block text-xs text-gray-500 mt-1 font-normal">
                                        ({q.questionTr})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mt-2">
                                    {q.answer || <span className="text-gray-400 italic">No answer provided</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {linkedUseCase.supportingFiles && linkedUseCase.supportingFiles.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Supporting Files</h3>
                            <div className="space-y-2">
                              {linkedUseCase.supportingFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center">
                                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                    <span className="text-sm text-gray-900">{file.name}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDownload(file as any)}
                                    className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Owner</h4>
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
                                        {useCaseOwnerName?.charAt(0) || 'U'}
                                    </div>
                                    <span className="text-gray-900 font-medium">{useCaseOwnerName || 'Unknown Owner'}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Internal ID</h4>
                                <code className="text-sm bg-gray-200 px-2 py-1 rounded">{linkedUseCase.id || (linkedUseCase as any)._id}</code>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 border rounded-lg">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p>No linked Use Case found.</p>
                        <p className="text-xs text-gray-400">
                          ID: {typeof project.useCase === 'string' ? project.useCase : project.useCase?.url || 'None'}
                        </p>
                    </div>
                  )}
              </div>
            )}
            
            {activeTab === 'dashboard' && (
              <AnalyticsDashboard 
                projectId={project.id} 
                questionnaireKey="general-v1"
                currentUser={currentUser}
              />
            )}

            {activeTab === 'dashboard' && (
              <AnalyticsDashboard 
                projectId={project.id} 
                questionnaireKey="general-v1"
                currentUser={currentUser}
              />
            )}

            {activeTab === 'owners' && canViewOwners && onViewOwner && (
               <UseCaseOwners currentUser={currentUser} projects={[project]} users={users} onViewOwner={onViewOwner} />
            )}
          </div>
        </div>
      </div>

      {/* Generating Report Overlay */}
      {generating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-2.5" role="status" aria-live="polite">
              <Spinner size={20} strokeWidth={2.5} className="flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Generating Report</h3>
                <p className="text-sm text-gray-600 mt-1">Your report is being generated. Please wait...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddTension && canManageTensions && (
        <AddTensionModal onClose={() => setShowAddTension(false)} onSave={handleSaveTension} />
      )}
      
      {chatPanelOpen && chatOtherUser && chatProject && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeChat}
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
                  otherUser={chatOtherUser}
                  inline={true}
                  onClose={closeChat}
                  onMessageSent={() => {
                    // Trigger window event to refresh notifications in other components
                    window.dispatchEvent(new Event('message-sent'));
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
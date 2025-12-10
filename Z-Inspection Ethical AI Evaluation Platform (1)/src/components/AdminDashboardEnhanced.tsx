import React, { useState } from 'react';
import { Plus, Folder, MessageSquare, Users, LogOut, Search, BarChart3, AlertTriangle, UserPlus, X, Link as LinkIcon, CheckCircle2, Trash2 } from 'lucide-react';
import { Project, User, UseCase } from '../types';
import { api } from '../api';

interface AdminDashboardEnhancedProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  useCases?: UseCase[];
  onViewProject: (project: Project) => void;
  onStartEvaluation: (project: Project) => void;
  onCreateProject: (project: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigate: (view: string) => void;
  onLogout: () => void;
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
  onLogout
}: AdminDashboardEnhancedProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'use-case-assignments' | 'project-creation' | 'reports'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignExpertsModal, setShowAssignExpertsModal] = useState(false);
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-800" />

        <div className="p-6 border-b border-gray-200">
          <div className="text-xl font-bold text-gray-900 mb-1">Z-Inspection</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Admin Portal</div>
        </div>

        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium mr-3">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-sm overflow-hidden">
              <div className="text-gray-900 font-medium truncate">{currentUser.name}</div>
              <div className="text-gray-500 text-xs">Administrator</div>
            </div>
          </div>
        </div>

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
            onClick={() => onNavigate('shared-area')}
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
      <div className="flex-1 overflow-auto bg-gray-50">
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
            onViewProject={onViewProject}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            projects={projects}
            riskLevels={riskLevels}
          />
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
    </div>
  );
}

// --- SUB COMPONENTS ---

function DashboardTab({ projects, searchQuery, setSearchQuery, onViewProject, riskLevels, onCreateNew, onDeleteProject }: any) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
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

      <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-200">
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

function ProjectCreationTab({ users, useCases = [], onCreateProject, onViewProject }: any) {
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (selectedTeam.length === 0) {
      alert("Please assign at least one team member (Expert or Owner) to create a project.");
      return;
    }

    // Project Context and Scope alanlarındaki soruları kontrol et
    if (!requester.trim()) {
      alert("Please fill in 'Who requested the inspection?' field.");
      return;
    }
    if (!inspectionReason.trim()) {
      alert("Please fill in 'Why carry out an inspection?' field.");
      return;
    }
    if (!relevantFor.trim()) {
      alert("Please fill in 'For whom is the inspection relevant?' field.");
      return;
    }
    if (!isMandatory) {
      alert("Please select 'Is it recommended or required (mandatory inspection)?' option.");
      return;
    }
    if (!conditionsToAnalyze.trim()) {
      alert("Please fill in 'What are the sufficient vs. necessary conditions that need to be analyzed?' field.");
      return;
    }
    if (!resultsUsage.trim()) {
      alert("Please fill in 'How are the inspection results to be used?' field.");
      return;
    }
    if (!resultsSharing.trim()) {
      alert("Please fill in 'Will the results be shared (public) or kept private?' field.");
      return;
    }

    // ⚠️ GÜNCELLENMİŞ onCreateProject çağrısı: inspectionContext eklendi
    const newProject = await onCreateProject({
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

    // Proje başarıyla oluşturulduysa, direkt o projenin sayfasına yönlendir
    if (newProject && onViewProject) {
      onViewProject(newProject);
    }

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
        <div className="max-w-2xl mx-auto mb-20">
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
                <label className="block text-sm font-medium mb-2 text-gray-700">1. Who requested the inspection? *</label>
                <input
                  type="text"
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Legal Department, Product Owner, Regulatory Body"
                  required
                />
              </div>

              {/* Soru 2: Why carry out an inspection? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">2. Why carry out an inspection? *</label>
                <input
                  type="text"
                  value={inspectionReason}
                  onChange={(e) => setInspectionReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Compliance check, Risk mitigation, Public trust building"
                  required
                />
              </div>

              {/* Soru 3: For whom is the inspection relevant? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">3. For whom is the inspection relevant? *</label>
                <input
                  type="text"
                  value={relevantFor}
                  onChange={(e) => setRelevantFor(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Internal auditors, Customers, Regulators"
                  required
                />
              </div>

              {/* Soru 4: Is it recommended or required (mandatory inspection)? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">4. Is it recommended or required (mandatory inspection)? *</label>
                <select
                  value={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select one...</option>
                  <option value="recommended">Recommended</option>
                  <option value="mandatory">Required (Mandatory)</option>
                </select>
              </div>

              {/* Soru 5: What are the sufficient vs. necessary conditions that need to be analyzed? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">5. What are the sufficient vs. necessary conditions that need to be analyzed? *</label>
                <textarea
                  value={conditionsToAnalyze}
                  onChange={(e) => setConditionsToAnalyze(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Minimum legal requirements (necessary), Best practice standards (sufficient)"
                  required
                />
              </div>

              {/* Soru 6: How are the inspection results to be used? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">6. How are the inspection results to be used? (e.g. verification, certification, sanctions) *</label>
                <input
                  type="text"
                  value={resultsUsage}
                  onChange={(e) => setResultsUsage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Internal risk report, External certification for compliance"
                  required
                />
              </div>

              {/* Soru 7: Will the results be shared (public) or kept private? */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">7. Will the results be shared (public) or kept private? (If private, why?) *</label>
                <textarea
                  value={resultsSharing}
                  onChange={(e) => setResultsSharing(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Public (for transparency), Private (due to sensitive trade secrets)"
                  required
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
                            user.role === 'expert' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
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

            <div className="flex justify-end pb-8">
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
    <div className="flex items-center justify-center h-full text-gray-500">
      Reports module coming soon...
    </div>
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

  const handleSubmit = (e: any) => {
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
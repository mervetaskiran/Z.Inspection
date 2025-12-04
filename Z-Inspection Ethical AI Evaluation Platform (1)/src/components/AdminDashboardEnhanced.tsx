import React, { useState } from 'react';
import {
  Plus,
  Folder,
  MessageSquare,
  Users,
  LogOut,
  Search,
  BarChart3,
  AlertTriangle,
  UserPlus,
  X,
} from 'lucide-react';
import { Project, User, UseCase } from '../types';
import { mockUseCases } from '../utils/mockData';

interface AdminDashboardEnhancedProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  onViewProject: (project: Project) => void;
  onStartEvaluation: (project: Project) => void;
  onCreateProject: (project: Partial<Project>) => void;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const statusColors = {
  ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  proven: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  disproven: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
};

const stageLabels: Record<string, string> = {
  'set-up': 'Set-up',
  assess: 'Assess',
  resolve: 'Resolve',
};

const useCaseStatusColors: Record<
  UseCase['status'],
  { bg: string; text: string }
> = {
  assigned: { bg: 'bg-blue-100', text: 'text-blue-800' },
  'in-review': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
};

export function AdminDashboardEnhanced({
  currentUser,
  projects,
  users,
  onViewProject,
  onStartEvaluation,
  onCreateProject,
  onNavigate,
  onLogout,
}: AdminDashboardEnhancedProps) {
  const [activeTab, setActiveTab] =
    useState<'dashboard' | 'use-case-assignments' | 'project-creation' | 'reports'>(
      'dashboard',
    );
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignExpertsModal, setShowAssignExpertsModal] = useState(false);
  const [selectedUseCaseForAssignment, setSelectedUseCaseForAssignment] =
    useState<UseCase | null>(null);
  const [useCases, setUseCases] = useState<UseCase[]>(mockUseCases);

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const riskLevels = [
    { level: 'Critical', count: 2, color: 'bg-red-500', percentage: 15 },
    { level: 'High', count: 5, color: 'bg-orange-500', percentage: 35 },
    { level: 'Medium', count: 8, color: 'bg-yellow-500', percentage: 50 },
    { level: 'Low', count: 12, color: 'bg-green-500', percentage: 80 },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Role Color Bar */}
        <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-800" />

        <div className="p-6 border-b border-gray-200">
          <div className="text-xl text-gray-900 mb-1">Z-Inspection</div>
          <div className="text-xs text-gray-600">Admin Portal</div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white mr-3">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-sm">
              <div className="text-gray-900">{currentUser.name}</div>
              <div className="text-gray-500">Admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full px-4 py-3 mb-2 flex items-center rounded-lg ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Folder className="h-4 w-4 mr-3" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('use-case-assignments')}
            className={`w-full px-4 py-3 mb-2 flex items-center rounded-lg ${
              activeTab === 'use-case-assignments'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <UserPlus className="h-4 w-4 mr-3" />
            Use Case Assignments
          </button>
          <button
            onClick={() => setActiveTab('project-creation')}
            className={`w-full px-4 py-3 mb-2 flex items-center rounded-lg ${
              activeTab === 'project-creation'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Plus className="h-4 w-4 mr-3" />
            Project Creation
          </button>
          <button
            onClick={() => onNavigate('other-members')}
            className="w-full px-4 py-3 mb-2 flex items-center text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Users className="h-4 w-4 mr-3" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full px-4 py-3 mb-2 flex items-center rounded-lg ${
              activeTab === 'reports'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-3" />
            Reports
          </button>
          <button
            onClick={() => onNavigate('shared-area')}
            className="w-full px-4 py-3 mb-2 flex items-center text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <MessageSquare className="h-4 w-4 mr-3" />
            Shared Area
          </button>
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
      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && (
          <DashboardTab
            projects={filteredProjects}
            users={users}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onViewProject={onViewProject}
            riskLevels={riskLevels}
          />
        )}

        {activeTab === 'use-case-assignments' && (
          <UseCaseAssignmentsTab
            useCases={useCases}
            users={users}
            onAssignExperts={(useCase) => {
              setSelectedUseCaseForAssignment(useCase);
              setShowAssignExpertsModal(true);
            }}
          />
        )}

        {activeTab === 'project-creation' && (
          <ProjectCreationTab users={users} onCreateProject={onCreateProject} />
        )}

        {activeTab === 'reports' && (
          <ReportsTab projects={projects} riskLevels={riskLevels} />
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
          onAssign={(expertIds, notes) => {
            setUseCases((prev) =>
              prev.map((uc) =>
                uc.id === selectedUseCaseForAssignment.id
                  ? {
                      ...uc,
                      assignedExperts: expertIds,
                      adminNotes: notes,
                      status: 'in-review',
                    }
                  : uc,
              ),
            );
            setShowAssignExpertsModal(false);
            setSelectedUseCaseForAssignment(null);
          }}
        />
      )}
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({
  projects,
  users,
  searchQuery,
  setSearchQuery,
  onViewProject,
  riskLevels,
}: any) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage and oversee all AI evaluation projects</p>
          </div>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* AI Ethics Heatmap */}
      <div className="px-8 py-6 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
        <h2 className="text-lg text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
          AI Ethics Risk Heatmap
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {riskLevels.map((risk: any) => (
            <div
              key={risk.level}
              className="bg-white rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">{risk.level} Risk</span>
                <div className={`w-3 h-3 rounded-full ${risk.color}`} />
              </div>
              <div className="text-2xl text-gray-900 mb-2">{risk.count}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${risk.color} h-2 rounded-full`}
                  style={{ width: `${risk.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <div
              key={project.id}
              onClick={() => onViewProject(project)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg text-gray-900 mb-2">{project.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {project.shortDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    statusColors[project.status].bg
                  } ${statusColors[project.status].text}`}
                >
                  {project.status.toUpperCase()}
                </span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                  {stageLabels[project.stage]}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Last updated: {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Use Case Assignments Tab
function UseCaseAssignmentsTab({ useCases, users, onAssignExperts }: any) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl text-gray-900 mb-2">Use Case Assignments</h1>
        <p className="text-gray-600">Assign experts to evaluate use cases</p>
      </div>

      <div className="px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Assigned Team
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-right text-xs text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {useCases.map((useCase: UseCase) => {
                const owner = users.find((u: User) => u.id === useCase.ownerId);
                const assignedExperts = users.filter((u: User) =>
                  useCase.assignedExperts?.includes(u.id),
                );

                return (
                  <tr key={useCase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{useCase.title}</div>
                      <div className="text-xs text-gray-500">
                        {useCase.aiSystemCategory}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {owner?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          useCaseStatusColors[useCase.status].bg
                        } ${useCaseStatusColors[useCase.status].text}`}
                      >
                        {useCase.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-2">
                        {assignedExperts.slice(0, 3).map((expert: User) => (
                          <div
                            key={expert.id}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs"
                            title={expert.name}
                          >
                            {expert.name.charAt(0)}
                          </div>
                        ))}
                        {assignedExperts.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                            +{assignedExperts.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${useCase.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {useCase.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onAssignExperts(useCase)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Assign Experts
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// Project Creation Tab
function ProjectCreationTab({ users, onCreateProject }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject({
      title,
      shortDescription: description.substring(0, 100),
      fullDescription: description,
      targetDate,
      assignedUsers: selectedOwner ? [selectedOwner] : [],
    });
    setTitle('');
    setDescription('');
    setTags('');
    setTargetDate('');
    setSelectedOwner('');
  };

  // Admin olmayan herkesi (Uzmanları, Use Case sahiplerini vs.) listeye ekle
  const useOwners = users.filter((u: User) => u.role !== 'admin');

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl text-gray-900 mb-2">Create New Project</h1>
        <p className="text-gray-600">Set up a new AI evaluation project</p>
      </div>

      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg border border-gray-200 p-8 space-y-6"
          >
            <div>
              <label className="block text-sm mb-2 text-gray-700">Project Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the AI system and evaluation objectives..."
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="healthcare, medical, diagnostics (comma-separated)"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Target Date *</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Assign Use-case Owner</label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an owner...</option>
                {useOwners.map((user: User) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

// Reports Tab
function ReportsTab({ projects, riskLevels }: any) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Overview of platform metrics and insights</p>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-2">Total Projects</div>
            <div className="text-3xl text-gray-900">{projects.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-2">In Progress</div>
            <div className="text-3xl text-yellow-600">
              {projects.filter((p: Project) => p.status === 'ongoing').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-2">Completed</div>
            <div className="text-3xl text-green-600">
              {projects.filter((p: Project) => p.status === 'proven').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-2">Average Progress</div>
            <div className="text-3xl text-blue-600">
              {projects.length
                ? Math.round(
                    projects.reduce(
                      (acc: number, p: Project) => acc + p.progress,
                      0,
                    ) / projects.length,
                  )
                : 0}
              %
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg text-gray-900 mb-4">Risk Distribution</h2>
          <div className="space-y-4">
            {riskLevels.map((risk: any) => (
              <div key={risk.level}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">{risk.level} Risk</span>
                  <span className="text-sm text-gray-900">
                    {risk.count} projects
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${risk.color} h-3 rounded-full`}
                    style={{ width: `${risk.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
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

function AssignExpertsModal({
  useCase,
  users,
  onClose,
  onAssign,
}: AssignExpertsModalProps) {
  const [selectedExperts, setSelectedExperts] = useState<string[]>(
    useCase.assignedExperts || [],
  );
  const [adminNotes, setAdminNotes] = useState(useCase.adminNotes || '');

  const experts = users.filter(
    (u) => u.role === 'ethical-expert' || u.role === 'medical-expert',
  );

  const toggleExpert = (expertId: string) => {
    if (selectedExperts.includes(expertId)) {
      setSelectedExperts(selectedExperts.filter((id) => id !== expertId));
    } else {
      setSelectedExperts([...selectedExperts, expertId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(selectedExperts, adminNotes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl text-gray-900">Assign Experts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Use Case</div>
            <div className="text-lg text-gray-900">{useCase.title}</div>
          </div>

          <div>
            <label className="block text-sm mb-3 text-gray-700">
              Select Experts *
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {experts.map((expert) => (
                <label
                  key={expert.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedExperts.includes(expert.id)}
                    onChange={() => toggleExpert(expert.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-3"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">{expert.name}</div>
                    <div className="text-xs text-gray-600 capitalize">
                      {expert.role.replace('-', ' ')}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700">
              Admin Notes
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add priority notes or instructions for the experts..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedExperts.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Notify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

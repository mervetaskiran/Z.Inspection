import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Users as UsersIcon,
  Download,
  FileText,
  MessageSquare,
  Shield,
  Target,
  BarChart3,
  Plus,
  MoreVertical,
  User as UserIconLucide
} from 'lucide-react';
import {
  Project,
  User,
  Tension,
  UseCaseOwner,
  TensionSeverity,
  EthicalPrinciple
} from '../types';
import { mockEvidences, mockTensions } from '../utils/mockData';
import { UseCaseOwners } from './UseCaseOwners';
import { formatRoleName } from '../utils/helpers';
import { SeveritySelector } from './SeveritySelector';
import { EthicalTensionSelector } from './EthicalTensionSelector';
import { SeverityBadge } from './SeverityBadge';

interface ProjectDetailProps {
  project: Project;
  currentUser: User;
  users: User[];
  onBack: () => void;
  onStartEvaluation: () => void;
  onViewTension?: (tension: Tension) => void;
  onViewOwner?: (owner: UseCaseOwner) => void;
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

const statusColors = {
  ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  proven: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  disproven: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
};

export function ProjectDetail({
  project,
  currentUser,
  users,
  onBack,
  onStartEvaluation,
  onViewTension,
  onViewOwner
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'tensions' | 'usecase' | 'owners'>(
    'evaluation'
  );
  const [showAddTension, setShowAddTension] = useState(false);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [selectedTensionForEvidence, setSelectedTensionForEvidence] = useState<string | null>(
    null
  );

  const canViewOwners = currentUser.role === 'admin' || currentUser.role === 'ethical-expert';

  const roleColor = roleColors[currentUser.role as keyof typeof roleColors] || '#1F2937';
  const isAssigned = project.assignedUsers.includes(currentUser.id);
  const isAdmin = currentUser.role === 'admin';

  const assignedUserDetails = users.filter((user) => project.assignedUsers.includes(user.id));

  const stages = [
    { key: 'set-up', label: 'Set-up', icon: '🚀' },
    { key: 'assess', label: 'Assess', icon: '🔍' },
    { key: 'resolve', label: 'Resolve', icon: '📊' }
  ] as const;

  const getCurrentStageIndex = () => stages.findIndex((stage) => stage.key === project.stage);

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
                <div className="flex items-center">
                  <h1 className="text-xl text-gray-900 mr-3">{project.title}</h1>
                  {project.isNew && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{project.shortDescription}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {isAssigned && (
                <button
                  onClick={onStartEvaluation}
                  className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: roleColor }}
                >
                  Start Evaluation
                </button>
              )}
              {!isAssigned && (
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Add Comment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg mb-4 text-gray-900">Z-Inspection Timeline</h2>
          <div className="relative">
            <div className="flex items-center justify-between">
              {stages.map((stage, index) => {
                const isActive = index <= getCurrentStageIndex();
                const isCurrent = stage.key === project.stage;

                return (
                  <div key={stage.key} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 ${
                        isActive
                          ? isCurrent
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-green-500 text-white border-green-500'
                          : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}
                    >
                      {stage.icon}
                    </div>
                    <span
                      className={`mt-2 text-sm ${isActive ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                      {stage.label}
                    </span>
                    {index < stages.length - 1 && (
                      <div
                        className={`absolute top-6 h-0.5 ${
                          index < getCurrentStageIndex() ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                        style={{
                          left: `${
                            (index + 1) * (100 / stages.length) - 100 / stages.length / 2
                          }%`,
                          width: `${100 / stages.length}%`,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-600">Target Date</div>
                <div className="text-sm text-gray-900">
                  {new Date(project.targetDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-600">Team Size</div>
                <div className="text-sm text-gray-900">{assignedUserDetails.length} members</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <Target className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-600">Progress</div>
                <div className="text-sm text-gray-900">{project.progress}%</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-600">Tensions</div>
                <div className="text-sm text-gray-900">{mockTensions.length} total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Assessment Checklist */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg mb-4 text-gray-900">Pre-Assessment Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">Purpose clearly defined</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">Data source identified</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">!</span>
              </div>
              <span className="text-sm text-gray-700">Initial ethical risk assessed</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('evaluation')}
                className={`px-6 py-3 text-sm transition-colors ${
                  activeTab === 'evaluation'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Evaluation
              </button>
              <button
                onClick={() => setActiveTab('tensions')}
                className={`px-6 py-3 text-sm transition-colors ${
                  activeTab === 'tensions'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Tensions ({mockTensions.length})
              </button>
              <button
                onClick={() => setActiveTab('usecase')}
                className={`px-6 py-3 text-sm transition-colors ${
                  activeTab === 'usecase'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Use Case
              </button>
              {canViewOwners && (
                <button
                  onClick={() => setActiveTab('owners')}
                  className={`px-6 py-3 text-sm transition-colors ${
                    activeTab === 'owners'
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <UserIconLucide className="h-4 w-4 inline mr-2" />
                  Use Case Owners
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'evaluation' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg text-gray-900">Evaluation Status</h3>
                  {isAssigned && (
                    <button
                      onClick={onStartEvaluation}
                      className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                      style={{ backgroundColor: roleColor }}
                    >
                      Start My Evaluation
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {assignedUserDetails.map((user) => {
                    const userColor =
                      roleColors[user.role as keyof typeof roleColors] || '#1F2937';
                    const randomProgress = Math.floor(Math.random() * 100);
                    const randomBar = Math.floor(Math.random() * 100);
                    const randomStatus = Math.random() > 0.5 ? 'In Progress' : 'Completed';

                    return (
                      <div key={user.id} className="border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm mr-3"
                            style={{ backgroundColor: userColor }}
                          >
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{formatRoleName(user.role)}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Progress</span>
                            <span>{randomProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${randomBar}%`,
                                backgroundColor: userColor
                              }}
                            />
                          </div>
                          <div className="text-xs text-gray-600">Status: {randomStatus}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isAssigned && (
                  <div className="bg-gray-50 border rounded-lg p-4 text-center">
                    <p className="text-gray-600 mb-2">You are not assigned to this project</p>
                    <p className="text-sm text-gray-500">
                      You can view project details and participate in discussions
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tensions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg text-gray-900">Tensions Management</h3>
                  <button
                    onClick={() => setShowAddTension(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tension
                  </button>
                </div>

                <div className="space-y-4">
                  {mockTensions.map((tension) => {
                    const evidenceCount = mockEvidences.filter(
                      (ev) => ev.tensionId === tension.id
                    ).length;
                    const creator = users.find((u) => u.id === tension.createdBy);

                    return (
                      <div
                        key={tension.id}
                        className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => onViewTension?.(tension)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <SeverityBadge severity={tension.severity} size="md" />
                              <span
                                className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                  statusColors[tension.status].bg
                                } ${statusColors[tension.status].text}`}
                              >
                                {tension.status.toUpperCase()}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                by {creator ? creator.name : 'Unknown'} on{' '}
                                {new Date(tension.createdAt).toLocaleDateString()}
                              </span>
                              {evidenceCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {evidenceCount} evidence{evidenceCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <h4 className="text-base text-gray-900 mb-2 flex items-center">
                              {tension.claimStatement}
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                              {tension.supportingArgument}
                            </p>

                            {/* Consensus Indicator */}
                            <div className="flex items-center space-x-4">
                              <div className="text-xs text-gray-600">Consensus:</div>
                              <div className="flex items-center">
                                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${tension.consensus.agree}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600">
                                  {tension.consensus.agree}% agree
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            className="p-1 text-gray-400 hover:text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Agree
                          </button>
                          <button
                            className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Disagree
                          </button>
                          <button
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Comment
                          </button>
                          <button
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTensionForEvidence(tension.id);
                              setShowAddEvidence(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Evidence
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'usecase' && (
              <div>
                <h3 className="text-lg mb-4 text-gray-900">Use Case Documentation</h3>
                {project.useCase ? (
                  <div className="border rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-6 w-6 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm text-gray-900">{project.useCase.filename}</div>
                          <div className="text-xs text-gray-500">
                            Uploaded on {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </button>
                        {isAdmin && (
                          <button className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm">
                            Replace
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No use case document uploaded</p>
                    {isAdmin && (
                      <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Upload Use Case
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'owners' && canViewOwners && onViewOwner && (
              <UseCaseOwners currentUser={currentUser} projects={[project]} onViewOwner={onViewOwner} />
            )}
          </div>
        </div>
      </div>

      {/* Add Evidence Modal */}
      {showAddEvidence && selectedTensionForEvidence && (
        <AddEvidenceModal
          tensionId={selectedTensionForEvidence}
          onClose={() => {
            setShowAddEvidence(false);
            setSelectedTensionForEvidence(null);
          }}
        />
      )}

      {/* Add Tension Modal */}
      {showAddTension && <AddTensionModal onClose={() => setShowAddTension(false)} />}
    </div>
  );
}

interface AddTensionModalProps {
  onClose: () => void;
}

function AddTensionModal({ onClose }: AddTensionModalProps) {
  const [principle1, setPrinciple1] = useState<EthicalPrinciple | undefined>(undefined);
  const [principle2, setPrinciple2] = useState<EthicalPrinciple | undefined>(undefined);
  const [tensionDescription, setTensionDescription] = useState('');
  const [claimStatement, setClaimStatement] = useState('');
  const [supportingArgument, setSupportingArgument] = useState('');
  const [severity, setSeverity] = useState<TensionSeverity>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock add tension functionality
    alert(`Tension added successfully with ${severity} severity!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl text-gray-900">Create New Tension</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <EthicalTensionSelector
            principle1={principle1}
            principle2={principle2}
            onPrinciple1Change={setPrinciple1}
            onPrinciple2Change={setPrinciple2}
          />

          <div>
            <label className="block text-sm mb-2 text-gray-700">Tension Description *</label>
            <textarea
              value={tensionDescription}
              onChange={(e) => setTensionDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Describe the ethical conflict between these two principles..."
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700">Claim Statement *</label>
            <textarea
              value={claimStatement}
              onChange={(e) => setClaimStatement(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Enter your claim about the AI system..."
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700">Supporting Argument</label>
            <textarea
              value={supportingArgument}
              onChange={(e) => setSupportingArgument(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Provide evidence or reasoning to support your claim..."
            />
          </div>

          <SeveritySelector value={severity} onChange={setSeverity} />

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Tension
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddEvidenceModalProps {
  tensionId: string;
  onClose: () => void;
}

function AddEvidenceModal({ tensionId, onClose }: AddEvidenceModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock add evidence functionality
    console.log('Evidence for tension:', tensionId, { title, description, file });
    alert('Evidence added successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl text-gray-900">Add Evidence</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm mb-2 text-gray-700">Evidence Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter evidence title..."
              required
            />
          </div>

          <div>
            <label className="block text.sm mb-2 text-gray-700">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the evidence and how it supports the claim..."
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700">Upload Document</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
            />
            <p className="text-xs text-gray-500 mt-1">
              Accepted formats: PDF, DOC, DOCX, XLS, XLSX, CSV
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

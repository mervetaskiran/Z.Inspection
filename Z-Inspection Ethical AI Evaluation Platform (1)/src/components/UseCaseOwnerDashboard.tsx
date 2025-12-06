import React, { useState } from 'react';
import { Plus, LogOut, FolderOpen, Upload, X, FileText, Clock, Eye, Download, Info, Database, Users as UsersIcon, Scale } from 'lucide-react';
import { User, UseCase } from '../types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface UseCaseOwnerDashboardProps {
  currentUser: User;
  useCases: UseCase[];
  onCreateUseCase: (useCase: Partial<UseCase>) => void;
  onViewUseCase: (useCase: UseCase) => void;
  onLogout: () => void;
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
  onCreateUseCase,
  onViewUseCase,
  onLogout
}: UseCaseOwnerDashboardProps) {
  const [showNewUseCaseModal, setShowNewUseCaseModal] = useState(false);

  const myUseCases = useCases.filter(uc => uc.ownerId === currentUser.id);

  // ⭐ TEMPLATE DOWNLOAD FUNCTION
  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/templates/usecase-template.docx"; 
    link.download = "usecase-template.docx";
    link.click();
  };

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">

        <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />

        <div className="p-6 border-b border-gray-200">
          <div className="text-xl text-gray-900 mb-1">Z-Inspection</div>
          <div className="text-xs text-gray-600">Use-case Owner Portal</div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white mr-3">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-sm">
              <div className="text-gray-900">{currentUser.name}</div>
              <div className="text-gray-500">Use-case Owner</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <button className="w-full px-4 py-3 mb-2 flex items-center bg-green-50 text-green-700 rounded-lg">
            <FolderOpen className="h-4 w-4 mr-3" />
            My Projects
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

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-gray-900 mb-2">Use-case Owner Dashboard</h1>
              <p className="text-gray-600">Upload and monitor your AI system use cases</p>
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
          {myUseCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myUseCases.map(useCase => (
                <div
                  key={useCase.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Status Badge */}
                  <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg text-gray-900 flex-1 mr-2">{useCase.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${statusColors[useCase.status].bg} ${statusColors[useCase.status].text}`}
                      >
                        {statusLabels[useCase.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{useCase.description}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Progress</span>
                      <span className="text-xs text-gray-900">{useCase.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${useCase.progress}%` }}
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
              ))}
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
          onSubmit={(data) => {
            onCreateUseCase(data);
            setShowNewUseCaseModal(false);
          }}
          currentUser={currentUser}
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

function NewUseCaseModal({ onClose, onSubmit, currentUser }: NewUseCaseModalProps) {
  // Basic Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiSystemCategory, setAiSystemCategory] = useState('Healthcare & Medical');
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

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
    onSubmit({
      title,
      description,
      aiSystemCategory,
      status: 'assigned',
      progress: 0,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supportingFiles: files.map(f => ({ name: f, url: '#' })),
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files).map(f => f.name);
      setFiles([...files, ...newFiles]);
    }
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
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                Submit Use Case
              </button>
            </div>
          </div>
        </div>

        {/* FORM START */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

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
                      </div>
                    </form>
                  </div>
                </div>
              );
            }



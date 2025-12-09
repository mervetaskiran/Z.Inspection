import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, Users as UsersIcon, Target, BarChart3, Plus,
  FileText, Shield, MessageSquare, User as UserIconLucide, GitBranch, Download
} from 'lucide-react';
import { Project, User, Tension, UseCaseOwner, UseCase } from '../types'; // UseCase import etmeyi unutmayın
import { UseCaseOwners } from './UseCaseOwners';
import { TensionCard } from './TensionCard';
import { AddTensionModal } from './AddTensionModal';

interface ProjectDetailProps {
  project: Project;
  currentUser: User;
  users: User[];
  onBack: () => void;
  onStartEvaluation: () => void;
  onViewTension?: (tension: Tension) => void;
  onViewOwner?: (owner: UseCaseOwner) => void;
  onCreateTension?: (data: any) => void; 
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
  onBack,
  onStartEvaluation,
  onViewTension,
  onViewOwner,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'tensions' | 'usecase' | 'owners'>('evaluation');
  const [showAddTension, setShowAddTension] = useState(false);
  const [tensions, setTensions] = useState<Tension[]>([]); 
  // Yeni: Bağlı Use Case verisini tutacak state
  const [linkedUseCase, setLinkedUseCase] = useState<UseCase | null>(null);

  const hasEditPermission = true; 

  // Tensionları Getir
  const fetchTensions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/tensions/${project.id}?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((t: any) => ({
            ...t,
            id: t._id || t.id,
            claimStatement: t.claimStatement || t.description, 
            description: t.description,
            consensus: t.consensus || { agree: 0, disagree: 0 }
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
        const response = await fetch(`http://localhost:5000/api/use-cases/${project.useCase}`);
        if (response.ok) {
            const data = await response.json();
            setLinkedUseCase(data);
        }
    } catch (error) {
        console.error("Use Case load error:", error);
    }
  };

  useEffect(() => {
    fetchTensions();
    fetchUseCase();
  }, [project.id, currentUser.id, project.useCase]);

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

      const response = await fetch('http://localhost:5000/api/tensions', {
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
      const response = await fetch(`http://localhost:5000/api/tensions/${tensionId}`, {
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
    try {
      const response = await fetch(`http://localhost:5000/api/tensions/${tensionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, voteType }),
      });
      if (response.ok) {
        fetchTensions();
      }
    } catch (error) {
      console.error("Vote error:", error);
    }
  };

  const assignedUserDetails = users.filter((user) => project.assignedUsers.includes(user.id));
  const roleColor = roleColors[currentUser.role as keyof typeof roleColors] || '#1F2937';
  const isAssigned = project.assignedUsers.includes(currentUser.id);
  const canViewOwners = currentUser.role === 'admin' || currentUser.role === 'ethical-expert';

  // Use Case Owner ismini bulma
  const useCaseOwnerName = linkedUseCase ? users.find(u => u.id === linkedUseCase.ownerId)?.name : 'Unknown';
  const handleDownload = (file: { name: string; data?: string; url?: string; contentType?: string }) => {
    if (file.data) {
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name;
      link.click();
    } else if (file.url) {
      window.open(file.url, '_blank');
    } else {
      alert('File is not available.');
    }
  };

  // Download full use case details (JSON) and then any supporting files
  const handleDownloadUseCase = (forUser?: User) => {
    if (!linkedUseCase) {
      alert('No linked use case to download.');
      return;
    }

    try {
      const details = {
        id: linkedUseCase.id || (linkedUseCase as any)._id,
        title: linkedUseCase.title,
        description: linkedUseCase.description,
        aiSystemCategory: linkedUseCase.aiSystemCategory,
        status: linkedUseCase.status,
        ownerId: linkedUseCase.ownerId,
        assignedExperts: linkedUseCase.assignedExperts,
        createdAt: linkedUseCase.createdAt,
        extendedInfo: linkedUseCase.extendedInfo,
      };

      const blob = new Blob([JSON.stringify(details, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (linkedUseCase.title || 'usecase').replace(/[^a-z0-9-_]/gi, '_');
      link.download = `${safeTitle}-details.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      // Then download supporting files (if any)
      if (linkedUseCase.supportingFiles && linkedUseCase.supportingFiles.length > 0) {
        linkedUseCase.supportingFiles.forEach((file: any, idx: number) => {
          // small timeout to let browser process sequential downloads
          setTimeout(() => {
            if (file.data) {
              const a = document.createElement('a');
              a.href = file.data;
              a.download = file.name || `file-${idx}`;
              document.body.appendChild(a);
              a.click();
              a.remove();
            } else if (file.url) {
              window.open(file.url, '_blank');
            }
          }, idx * 250);
        });
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
          {isAssigned && (
            <button onClick={onStartEvaluation} className="px-4 py-2 text-white rounded-lg hover:opacity-90" style={{ backgroundColor: roleColor }}>
              Start Evaluation
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
           <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-3" />
            <div><div className="text-xs text-gray-600">Target Date</div><div className="text-sm font-medium">{new Date(project.targetDate).toLocaleDateString()}</div></div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
            <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div><div className="text-xs text-gray-600">Team</div><div className="text-sm font-medium">{assignedUserDetails.length} members</div></div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
            <Target className="h-5 w-5 text-gray-400 mr-3" />
            <div><div className="text-xs text-gray-600">Progress</div><div className="text-sm font-medium">{project.progress}%</div></div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
            <BarChart3 className="h-5 w-5 text-gray-400 mr-3" />
            <div><div className="text-xs text-gray-600">Tensions</div><div className="text-sm font-medium">{tensions.length} total</div></div>
          </div>
        </div>

        {/* Assigned Members with download button */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Assigned Members</h4>
          <div className="space-y-2">
            {assignedUserDetails.length > 0 ? (
              assignedUserDetails.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">{u.name?.charAt(0) || 'U'}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.role}</div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDownloadUseCase(u)}
                      disabled={!linkedUseCase}
                      className={`inline-flex items-center px-3 py-1.5 text-sm rounded ${linkedUseCase ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Use Case
                    </button>
                  </div>
                </div>
              ))
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
                  {tab === 'tensions' ? `Tensions (${tensions.length})` : tab}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'evaluation' && (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                Select 'Start Evaluation' to begin.
              </div>
            )}

            {activeTab === 'tensions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Tensions Management</h3>
                  <button 
                    onClick={() => setShowAddTension(true)} 
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Tension
                  </button>
                </div>

                {tensions.length > 0 ? (
                  <div className="space-y-4">
                    {tensions.map((tension) => (
                      <TensionCard 
                        key={tension.id} 
                        tension={tension}
                        currentUser={currentUser}
                        onVote={handleVote}
                        onCommentClick={(t) => onViewTension?.(t)}
                        onDelete={handleDeleteTension}
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
            
            {activeTab === 'owners' && canViewOwners && onViewOwner && (
               <UseCaseOwners currentUser={currentUser} projects={[project]} onViewOwner={onViewOwner} />
            )}
          </div>
        </div>
      </div>

      {showAddTension && <AddTensionModal onClose={() => setShowAddTension(false)} onSave={handleSaveTension} />}
    </div>
  );
}
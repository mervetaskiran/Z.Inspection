import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, TrendingUp, Users, FileText, MessageCircle, AlertCircle, CheckCircle, Download, Upload, Trash2 } from 'lucide-react';
import { UseCase, User } from '../types';
import { api } from '../api';

interface UseCaseDetailProps {
  useCase: UseCase;
  currentUser: User;
  users: User[];
  onBack: () => void;
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

export function UseCaseDetail({ useCase, currentUser, users, onBack }: UseCaseDetailProps) {
  const [uc, setUc] = useState<UseCase>(useCase);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isLinkedToProject, setIsLinkedToProject] = useState(false);
  const [calculatedProgress, setCalculatedProgress] = useState<number>(useCase.progress || 0);
  
  useEffect(() => {
    setUc(useCase);
    setCalculatedProgress(useCase.progress || 0);
  }, [useCase]);

  // When opening details, fetch the full use case doc (list endpoint may omit answers).
  useEffect(() => {
    const id = (uc as any)?.id || (uc as any)?._id;
    if (!id) return;

    const controller = new AbortController();
    (async () => {
      setLoadingDetails(true);
      try {
        const res = await fetch(api(`/api/use-cases/${id}`), { signal: controller.signal });
        if (res.ok) {
          const full = await res.json();
          setUc((prev) => ({ ...prev, ...full, id: full._id || full.id }));
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error fetching use case detail:', err);
        }
      } finally {
        setLoadingDetails(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(uc as any)?.id, (uc as any)?._id]);

  // Determine whether this use case is linked to any project (for Status Information text).
  useEffect(() => {
    const useCaseId = ((uc as any)?.id || (uc as any)?._id || '').toString();
    if (!useCaseId) return;

    const getProjectUseCaseId = (p: any): string | null => {
      const val = p?.useCase;
      if (!val) return null;
      if (typeof val === 'string') return val;
      return (val.url || val._id || val.id || val.useCaseId || null) as string | null;
    };

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(api('/api/projects'), { signal: controller.signal });
        if (!res.ok) return;
        const allProjects = await res.json();
        const linked = Array.isArray(allProjects) && allProjects.some((p: any) => {
          const pid = getProjectUseCaseId(p);
          return pid && pid.toString() === useCaseId;
        });
        setIsLinkedToProject(Boolean(linked));
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error checking use case project linkage:', err);
        }
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(uc as any)?.id, (uc as any)?._id]);
  
  // Display rule: once a use case is linked to a project, "assigned" should appear as "in-review".
  const displayStatus =
    uc.status === 'assigned' && isLinkedToProject ? 'in-review' : uc.status;

  // Calculate progress from linked project
  useEffect(() => {
    const useCaseId = ((uc as any)?.id || (uc as any)?._id || '').toString();
    if (!useCaseId) return;

    const getProjectUseCaseId = (p: any): string | null => {
      const val = p?.useCase;
      if (!val) return null;
      if (typeof val === 'string') return val;
      return (val.url || val._id || val.id || val.useCaseId || null) as string | null;
    };

    const calculateProgress = async () => {
      try {
        const res = await fetch(api('/api/projects'));
        if (!res.ok) {
          setCalculatedProgress(uc.progress || 0);
          return;
        }
        
        const allProjects = await res.json();
        const linkedProject = Array.isArray(allProjects) 
          ? allProjects.find((p: any) => {
              const pid = getProjectUseCaseId(p);
              return pid && pid.toString() === useCaseId;
            })
          : null;

        if (!linkedProject || !linkedProject.assignedUsers || linkedProject.assignedUsers.length === 0) {
          setCalculatedProgress(uc.progress || 0);
          return;
        }

        // Calculate average progress from all assigned users
        const { fetchUserProgress } = await import('../utils/userProgress');
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
          setCalculatedProgress(Math.round(average));
        } else {
          setCalculatedProgress(uc.progress || 0);
        }
      } catch (err: any) {
        console.error('Error calculating progress:', err);
        setCalculatedProgress(uc.progress || 0);
      }
    };

    // Initial calculation
    calculateProgress();

    // Update progress every 5 seconds
    const interval = setInterval(calculateProgress, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(uc as any)?.id, (uc as any)?._id, uc.progress, users]);

  // Fetch questions and merge with answers
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(api('/api/use-case-questions'));
        if (response.ok) {
          const allQuestions = await response.json();
          // Merge questions with answers
          const questionsWithAnswers = allQuestions.map((q: any) => {
            const answer = uc.answers?.find((a: any) => a.questionId === q.id);
            return {
              ...q,
              answer: answer?.answer || ''
            };
          });
          setQuestions(questionsWithAnswers);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };
    if (uc.answers) {
      fetchQuestions();
    }
  }, [uc.answers]);

  const isOwner = uc.ownerId === currentUser.id;
  const assignedExperts = users.filter(u => uc.assignedExperts?.includes(u.id));

  const [uploading, setUploading] = useState(false);
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null);

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

  const handleDeleteSupportingFile = async (file: any) => {
    const confirmDelete = window.confirm(`Delete file "${file?.name}"?`);
    if (!confirmDelete) return;

    const useCaseId = (uc as any)?.id || (uc as any)?._id;
    const requesterUserId = (currentUser as any)?.id || (currentUser as any)?._id;
    if (!useCaseId || !requesterUserId) {
      alert('Use case or user info not ready yet. Please try again in a moment.');
      return;
    }

    // Optimistic-only file (local object URL) -> remove locally
    if (file?._optimistic) {
      if (file?.url) {
        try { URL.revokeObjectURL(file.url); } catch {}
      }
      setUc((prev) => ({
        ...prev,
        supportingFiles: ((prev.supportingFiles as any[]) || []).filter((f: any) => f !== file),
      }) as UseCase);
      return;
    }

    try {
      setDeletingFileName(file?.name || '');
      const q = new URLSearchParams({
        userId: requesterUserId,
        name: file?.name || '',
      });
      // If backend stored a URL, include it for more specific matching
      if (file?.url) q.set('url', file.url);

      const res = await fetch(api(`/api/use-cases/${useCaseId}/supporting-files?${q.toString()}`), {
        method: 'DELETE',
      });

      if (res.ok) {
        const updatedFiles = await res.json();
        setUc((prev) => ({ ...prev, supportingFiles: updatedFiles } as UseCase));
      } else {
        const text = await res.text().catch(() => '');
        let msg = 'Failed to delete file.';
        try {
          const parsed = JSON.parse(text || '{}');
          msg = parsed?.error || parsed?.message || msg;
        } catch {
          if (text) msg = text;
        }
        alert(msg);
      }
    } catch (err) {
      console.error('Delete supporting file error', err);
      alert('Failed to delete file.');
    } finally {
      setDeletingFileName(null);
    }
  };

  // Owner file upload handler
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!uc || !uc.id) return alert('Use case not ready');

    const toUpload: Array<{ name: string; data?: string; contentType?: string }> = [];
    setUploading(true);

    // Optimistic UI: show selected files immediately under Supporting Files
    const selectedFiles = Array.from(files);
    const optimistic = selectedFiles.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      contentType: f.type,
      _optimistic: true,
    })) as any[];
    const optimisticUrls = optimistic.map((x) => x.url).filter(Boolean) as string[];
    setUc((prev) => ({
      ...prev,
      supportingFiles: [...((prev.supportingFiles as any[]) || []), ...optimistic],
    }) as UseCase);

    const readFileAsDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(f);
    });

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i];
        const dataUrl = await readFileAsDataUrl(f);
        toUpload.push({ name: f.name, data: dataUrl, contentType: f.type });
      }

      const res = await fetch(api(`/api/use-cases/${uc.id}/supporting-files`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: toUpload })
      });

      if (res.ok) {
        const updatedFiles = await res.json();
        setUc(prev => ({ ...prev, supportingFiles: updatedFiles } as UseCase));
        alert('Files uploaded successfully.');
        // Revoke any temporary object URLs
        optimisticUrls.forEach((u) => {
          try { URL.revokeObjectURL(u); } catch {}
        });
      } else {
        const err = await res.json();
        console.error('Upload failed', err);
        alert('Upload failed.');
        // Roll back optimistic entries
        setUc((prev) => ({
          ...prev,
          supportingFiles: ((prev.supportingFiles as any[]) || []).filter((f: any) => !f?._optimistic),
        }) as UseCase);
        optimisticUrls.forEach((u) => {
          try { URL.revokeObjectURL(u); } catch {}
        });
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Upload failed.');
      // Roll back optimistic entries
      setUc((prev) => ({
        ...prev,
        supportingFiles: ((prev.supportingFiles as any[]) || []).filter((f: any) => !f?._optimistic),
      }) as UseCase);
      optimisticUrls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch {}
      });
    } finally {
      setUploading(false);
      // reset input value if present
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl text-gray-900 mb-2">{uc.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Last updated: {new Date(uc.updatedAt).toLocaleDateString()}
                </span>
                <span
                  className={`px-3 py-1 text-xs rounded-full ${statusColors[displayStatus].bg} ${statusColors[displayStatus].text}`}
                >
                  {statusLabels[displayStatus]}
                </span>
                {loadingDetails && <span className="text-xs text-gray-500">(Loading details...)</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Progress</div>
              <div className="text-3xl text-gray-900">{calculatedProgress}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg text-gray-900 mb-4">Evaluation Progress</h3>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                  style={{ width: `${calculatedProgress}%` }}
                >
                  {calculatedProgress > 10 && (
                    <span className="text-xs text-white">{calculatedProgress}%</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>Start</span>
                <span>In Progress</span>
                <span>Complete</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg text-gray-900 mb-4">Description</h3>
              <p className="text-gray-700 leading-relaxed">{uc.description}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Category</div>
                    <div className="text-gray-900">{uc.aiSystemCategory}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Created</div>
                    <div className="text-gray-900">{new Date(uc.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions and Answers */}
            {questions && questions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4">Questions & Answers</h3>
                <div className="space-y-6">
                  {questions.map((q) => (
                    <div key={q.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {q.questionEn}
                        {q.questionTr && (
                          <span className="block text-xs text-gray-500 mt-1 font-normal">{q.questionTr}</span>
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

            {/* Supporting Files */}
            {uc.supportingFiles && uc.supportingFiles.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4">Supporting Files</h3>
                <div className="space-y-2">
                  {uc.supportingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-900">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors"
                          title="Download"
                          aria-label="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteSupportingFile(file)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                            aria-label="Delete"
                            disabled={uploading || (deletingFileName && deletingFileName === file?.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload area for owner */}
            {isOwner && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4">Upload Supporting Files</h3>
                <div className="space-y-2">
                  <input
                    id="usecase-supporting-files-input"
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="usecase-supporting-files-input"
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      uploading
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                    }`}
                    aria-disabled={uploading}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Files
                  </label>
                  <div className="text-xs text-gray-500">Accepted: PDFs, images, docs. Max size configured server-side.</div>
                </div>
              </div>
            )}

            {/* Expert Feedback */}
            {useCase.feedback && useCase.feedback.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4 flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
                  Expert Feedback
                </h3>
                <div className="space-y-4">
                  {useCase.feedback.map((fb, idx) => (
                    <div key={idx} className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-blue-900">{fb.from}</span>
                        <span className="text-xs text-blue-700">{new Date(fb.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-700">{fb.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Reflections (visible to experts) */}
            {useCase.adminReflections && useCase.adminReflections.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Admin Notes
                </h3>
                <div className="space-y-4">
                  {useCase.adminReflections
                    .filter(ref => isOwner || ref.visibleToExperts)
                    .map((reflection) => (
                      <div key={reflection.id} className="p-4 bg-green-50 border border-green-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-green-900">Admin</span>
                          <span className="text-xs text-green-700">
                            {new Date(reflection.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{reflection.text}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned Experts */}
            {assignedExperts.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Assigned Experts
                </h3>
                <div className="space-y-3">
                  {assignedExperts.map(expert => (
                    <div key={expert.id} className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white mr-3">
                        {expert.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm text-gray-900">{expert.name}</div>
                        <div className="text-xs text-gray-600 capitalize">{expert.role.replace('-', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg text-gray-900 mb-4">Status Information</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className={`w-2 h-2 rounded-full mt-1.5 mr-3 ${
                    displayStatus === 'completed' ? 'bg-green-500' :
                    displayStatus === 'in-review' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <div className="text-sm text-gray-900">
                      {displayStatus === 'completed' ? 'Evaluation Complete' :
                       displayStatus === 'in-review' ? 'Under Expert Review' :
                       'Awaiting Assignment'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {displayStatus === 'completed' ? 'Your use case has been approved' :
                       displayStatus === 'in-review' ? 'Experts are currently reviewing your submission' :
                       'Your use case will be assigned to experts soon'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            {useCase.adminNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                  <div>
                    <div className="text-sm text-amber-900 mb-1">Admin Notes</div>
                    <div className="text-sm text-amber-800">{useCase.adminNotes}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

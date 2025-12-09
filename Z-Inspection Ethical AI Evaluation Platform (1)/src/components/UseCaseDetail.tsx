import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, TrendingUp, Users, FileText, MessageCircle, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { UseCase, User } from '../types';

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
  useEffect(() => setUc(useCase), [useCase]);

  const isOwner = uc.ownerId === currentUser.id;
  const assignedExperts = users.filter(u => uc.assignedExperts?.includes(u.id));

  const [uploading, setUploading] = useState(false);

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

  // Owner file upload handler
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!uc || !uc.id) return alert('Use case not ready');

    const toUpload: Array<{ name: string; data?: string; contentType?: string }> = [];
    setUploading(true);

    const readFileAsDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(f);
    });

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const dataUrl = await readFileAsDataUrl(f);
        toUpload.push({ name: f.name, data: dataUrl, contentType: f.type });
      }

      const res = await fetch(`http://127.0.0.1:5000/api/use-cases/${uc.id}/supporting-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: toUpload })
      });

      if (res.ok) {
        const updatedFiles = await res.json();
        setUc(prev => ({ ...prev, supportingFiles: updatedFiles } as UseCase));
        alert('Files uploaded successfully.');
      } else {
        const err = await res.json();
        console.error('Upload failed', err);
        alert('Upload failed.');
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
      // reset input value if present
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
              <h1 className="text-2xl text-gray-900 mb-2">{useCase.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Last updated: {new Date(useCase.updatedAt).toLocaleDateString()}
                </span>
                <span
                  className={`px-3 py-1 text-xs rounded-full ${statusColors[useCase.status].bg} ${statusColors[useCase.status].text}`}
                >
                  {statusLabels[useCase.status]}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Progress</div>
              <div className="text-3xl text-gray-900">{useCase.progress}%</div>
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
                  style={{ width: `${useCase.progress}%` }}
                >
                  {useCase.progress > 10 && (
                    <span className="text-xs text-white">{useCase.progress}%</span>
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
                      <button
                        onClick={() => handleDownload(file)}
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

            {/* Upload area for owner */}
            {isOwner && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg text-gray-900 mb-4">Upload Supporting Files</h3>
                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    className="text-sm text-gray-700"
                    disabled={uploading}
                  />
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
                    useCase.status === 'completed' ? 'bg-green-500' :
                    useCase.status === 'in-review' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <div className="text-sm text-gray-900">
                      {useCase.status === 'completed' ? 'Evaluation Complete' :
                       useCase.status === 'in-review' ? 'Under Expert Review' :
                       'Awaiting Assignment'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {useCase.status === 'completed' ? 'Your use case has been approved' :
                       useCase.status === 'in-review' ? 'Experts are currently reviewing your submission' :
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

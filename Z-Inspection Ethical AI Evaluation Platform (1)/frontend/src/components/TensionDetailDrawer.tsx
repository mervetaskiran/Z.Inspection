import React, { useState, useEffect, useRef } from 'react';
import { Download, Plus, FileText, Send, X, Check, Upload } from 'lucide-react';
import { Tension, User } from '../types';
import { api } from '../api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

interface TensionDetailDrawerProps {
  tension: Tension;
  currentUser: User;
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'evidence' | 'discussion';
  onTensionUpdate?: (updatedTension: Tension) => void;
}

export function TensionDetailDrawer({
  tension: initialTension,
  currentUser,
  users,
  open,
  onOpenChange,
  defaultTab = 'evidence',
  onTensionUpdate
}: TensionDetailDrawerProps) {
  const [tension, setTension] = useState(initialTension);
  const [activeTab, setActiveTab] = useState<'evidence' | 'discussion'>(defaultTab);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [expandedEvidenceComments, setExpandedEvidenceComments] = useState<Record<number, boolean>>({});
  const [evidenceCommentTexts, setEvidenceCommentTexts] = useState<Record<number, string>>({});
  
  const creator = users.find(u => u.id === tension.createdBy || u.id === (tension as any).uploadedBy);
  const evidenceCount = (tension as any).evidences ? (tension as any).evidences.length : 0;
  const discussionCount = tension.comments ? tension.comments.length : 0;

  // Fetch latest tension when drawer opens
  useEffect(() => {
    if (open) {
      const fetchTension = async () => {
        try {
          const id = tension.id || (tension as any)._id;
          const response = await fetch(api(`/api/tensions/id/${id}`));
          if (response.ok) {
            const fresh = await response.json();
            setTension((prev) => ({ ...prev, ...fresh }));
            if (onTensionUpdate) {
              onTensionUpdate({ ...tension, ...fresh });
            }
          }
        } catch (error) {
          console.error("Tension reload failed:", error);
        }
      };
      fetchTension();
    }
  }, [open, tension.id, (tension as any)._id]);

  // Reset tab when defaultTab changes
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // Update tension when initialTension changes
  useEffect(() => {
    setTension(initialTension);
  }, [initialTension]);

  // Post comment
  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(api(`/api/tensions/${tension.id || (tension as any)._id}/comment`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText,
          authorId: currentUser.id,
          authorName: currentUser.name
        })
      });

      if (response.ok) {
        const updatedComments = await response.json();
        const updated = { ...tension, comments: updatedComments };
        setTension(updated);
        if (onTensionUpdate) {
          onTensionUpdate(updated);
        }
        setCommentText('');
      } else {
        alert("Error posting comment.");
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to server.");
    }
  };

  // Add evidence
  const handleAddEvidence = async (newEvidence: any) => {
    try {
      const response = await fetch(api(`/api/tensions/${tension.id || (tension as any)._id}/evidence`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvidence,
          uploadedBy: currentUser.id
        })
      });

      if (response.ok) {
        const updatedEvidences = await response.json();
        const updated = { ...tension, evidences: updatedEvidences };
        setTension(updated);
        if (onTensionUpdate) {
          onTensionUpdate(updated);
        }
        setShowAddEvidence(false);
      } else {
        const errData = await response.json();
        alert("Error uploading evidence: " + (errData.error || "File too large or server error."));
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to server. Check your connection.");
    }
  };

  // Add evidence comment
  const handleAddEvidenceComment = async (evidenceIndex: number, evidenceId: string) => {
    const text = evidenceCommentTexts[evidenceIndex];
    if (!text || !text.trim()) return;

    try {
      const response = await fetch(api(`/api/tensions/${tension.id || (tension as any)._id}/evidence/${evidenceIndex}/comments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          userId: currentUser.id
        })
      });

      if (response.ok) {
        const updatedEvidence = await response.json();
        // Update tension evidences array
        const updatedEvidences = [...(tension as any).evidences || []];
        updatedEvidences[evidenceIndex] = updatedEvidence;
        const updated = { ...tension, evidences: updatedEvidences };
        setTension(updated);
        if (onTensionUpdate) {
          onTensionUpdate(updated);
        }
        // Clear comment text
        setEvidenceCommentTexts(prev => ({ ...prev, [evidenceIndex]: '' }));
      } else {
        const errData = await response.json();
        alert("Error posting comment: " + (errData.error || "Server error."));
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to server.");
    }
  };

  // Evidence type badge colors
  const getEvidenceTypeBadge = (type?: string) => {
    if (!type) return null;
    const typeColors: Record<string, { bg: string; text: string }> = {
      'Policy': { bg: 'bg-purple-100', text: 'text-purple-700' },
      'Test': { bg: 'bg-blue-100', text: 'text-blue-700' },
      'User feedback': { bg: 'bg-green-100', text: 'text-green-700' },
      'Log': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      'Incident': { bg: 'bg-red-100', text: 'text-red-700' },
      'Other': { bg: 'bg-gray-100', text: 'text-gray-700' }
    };
    const colors = typeColors[type] || typeColors['Other'];
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors.bg} ${colors.text}`}>
        {type}
      </span>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-gray-900">
              {tension.claimStatement || "Tension Details"}
            </SheetTitle>
            <div className="text-xs text-gray-500 mt-1">
              Created by {creator?.name || 'Unknown'} on {new Date(tension.createdAt).toLocaleDateString()}
            </div>
          </SheetHeader>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mt-4">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'evidence'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Evidence ({evidenceCount})
            </button>
            <button
              onClick={() => setActiveTab('discussion')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'discussion'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Discussion ({discussionCount})
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* Evidence Tab */}
            {activeTab === 'evidence' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Evidence Library</h3>
                  <button
                    onClick={() => setShowAddEvidence(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Evidence
                  </button>
                </div>

                <div className="space-y-4">
                  {(tension as any).evidences && (tension as any).evidences.length > 0 ? (
                    (tension as any).evidences.map((ev: any, index: number) => {
                      const uploader = users.find(u => u.id === ev.uploadedBy);
                      const evidenceComments = ev.comments || [];
                      const isCommentsExpanded = expandedEvidenceComments[index] || false;
                      
                      return (
                        <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-blue-500" />
                                <h4 className="text-gray-900 font-medium">{ev.title}</h4>
                                {getEvidenceTypeBadge(ev.type)}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{ev.description}</p>
                              <div className="text-xs text-gray-400">
                                Uploaded by {uploader?.name || 'Unknown'} on {new Date(ev.uploadedAt).toLocaleDateString()}
                              </div>
                              {ev.usedInReports && (
                                <div className="text-xs text-blue-600 mt-2 italic">
                                  Used in reports
                                </div>
                              )}

                              {/* Comments Section */}
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => setExpandedEvidenceComments(prev => ({ ...prev, [index]: !prev[index] }))}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-2"
                                >
                                  Comments ({evidenceComments.length})
                                </button>
                                
                                {isCommentsExpanded && (
                                  <div className="mt-2 space-y-3">
                                    {/* Comment List (sorted by createdAt, newest at bottom) */}
                                    {evidenceComments.length > 0 ? (
                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {[...evidenceComments].sort((a: any, b: any) => {
                                          const dateA = new Date(a.createdAt || 0).getTime();
                                          const dateB = new Date(b.createdAt || 0).getTime();
                                          return dateA - dateB; // Oldest first, newest at bottom
                                        }).map((comment: any, commentIdx: number) => {
                                          const commentUser = users.find(u => u.id === comment.userId);
                                          return (
                                            <div key={commentIdx} className="flex space-x-2 bg-gray-50 p-2 rounded">
                                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                                                {commentUser?.name?.charAt(0) || '?'}
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-xs font-semibold text-gray-900">
                                                    {commentUser?.name || 'Unknown'}
                                                  </span>
                                                  <span className="text-xs text-gray-400">
                                                    {new Date(comment.createdAt).toLocaleDateString()}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-gray-700">{comment.text}</p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500 italic">No comments yet.</div>
                                    )}

                                    {/* Comment Input */}
                                    <div className="flex items-start space-x-2 pt-2">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                                        {currentUser.name.charAt(0)}
                                      </div>
                                      <div className="flex-1">
                                        <textarea
                                          value={evidenceCommentTexts[index] || ''}
                                          onChange={(e) => setEvidenceCommentTexts(prev => ({ ...prev, [index]: e.target.value }))}
                                          placeholder="Comment on this evidence… (e.g., source reliability, relevance, date, gaps)"
                                          rows={2}
                                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1"
                                        />
                                        <button
                                          onClick={() => handleAddEvidenceComment(index, ev._id)}
                                          disabled={!evidenceCommentTexts[index] || !evidenceCommentTexts[index].trim()}
                                          className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed float-right"
                                        >
                                          Post
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (ev.fileData) {
                                  try {
                                    const dataUrl = ev.fileData as string;
                                    const hasPrefix = dataUrl.startsWith('data:');
                                    const [mimePart, base64Part] = hasPrefix
                                      ? dataUrl.split(',')
                                      : ['data:application/octet-stream;base64', dataUrl];
                                    const mime = hasPrefix ? mimePart.split(';')[0].replace('data:', '') : 'application/octet-stream';
                                    const byteString = atob(base64Part || '');
                                    const bytes = new Uint8Array(byteString.length);
                                    for (let i = 0; i < byteString.length; i++) {
                                      bytes[i] = byteString.charCodeAt(i);
                                    }
                                    const blob = new Blob([bytes], { type: mime });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = ev.fileName || 'evidence';
                                    link.click();
                                    URL.revokeObjectURL(url);
                                  } catch (err) {
                                    console.error('Download error:', err);
                                    alert('Unable to download this file.');
                                  }
                                } else if (ev.fileUrl) {
                                  window.open(ev.fileUrl, '_blank');
                                }
                              }}
                              className={`px-3 py-2 text-sm font-medium rounded-lg border flex items-center space-x-2 ml-4 ${
                                ev.fileData || ev.fileUrl
                                  ? 'text-blue-600 border-blue-200 hover:bg-blue-50'
                                  : 'text-gray-400 border-gray-200 cursor-not-allowed'
                              }`}
                              title={ev.fileData || ev.fileUrl ? "Download file" : "File not available"}
                              disabled={!ev.fileData && !ev.fileUrl}
                            >
                              <Download className="h-4 w-4" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      No evidence added yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Discussion Tab */}
            {activeTab === 'discussion' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Discussion</h3>
                
                <div className="space-y-6 mb-8">
                  {tension.comments && tension.comments.length > 0 ? (
                    tension.comments.map((comment: any, index: number) => (
                      <div key={index} className="flex space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {comment.authorName ? comment.authorName.charAt(0) : '?'}
                        </div>
                        <div className="flex-1 bg-gray-50 p-3 rounded-lg rounded-tl-none border border-gray-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold text-gray-900">{comment.authorName || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{new Date(comment.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">No comments yet.</div>
                  )}
                </div>

                <div className="flex items-start space-x-3 pt-4 border-t">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Explain your reasoning; reference evidence if possible."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                    />
                    <button 
                      onClick={handlePostComment}
                      disabled={!commentText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 float-right flex items-center"
                    >
                      <Send className="h-3 w-3 mr-2" />
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Evidence Modal */}
      {showAddEvidence && (
        <AddEvidenceModal
          onClose={() => setShowAddEvidence(false)}
          onAdd={handleAddEvidence}
        />
      )}
    </>
  );
}

// Add Evidence Modal Component
function AddEvidenceModal({ onClose, onAdd }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const convertBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result as string);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let base64File: string | null = null;
    if (file) {
      base64File = await convertBase64(file);
    }

    const evidence = {
      title,
      description,
      fileName: file?.name,
      fileData: base64File,
      type: evidenceType || undefined
    };
    
    onAdd(evidence);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add Evidence</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Evidence Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g., Audit Report v1"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Description *</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Briefly describe this evidence..."
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Evidence Type</label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select type...</option>
              <option value="Policy">Policy</option>
              <option value="Test">Test</option>
              <option value="User feedback">User feedback</option>
              <option value="Log">Log</option>
              <option value="Incident">Incident</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Upload File</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
                file ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {file ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  {file.name}
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Click to Upload File
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-1">Supported formats: PDF, DOC, Images (Max 100MB)</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Save Evidence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


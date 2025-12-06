import React, { useState, useRef } from 'react'; // useRef eklendi
import { ArrowLeft, Download, Trash2, Plus, FileText, Calendar, User as UserIcon, Send, Upload, Check } from 'lucide-react';
import { Tension, User, Evidence } from '../types';

interface TensionDetailProps {
  tension: Tension;
  currentUser: User;
  users: User[];
  onBack: () => void;
}

const statusColors = {
  ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  proven: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  disproven: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
};

export function TensionDetail({ tension: initialTension, currentUser, users, onBack }: TensionDetailProps) {
  const [tension, setTension] = useState(initialTension);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const creator = users.find(u => u.id === tension.createdBy || u.id === (tension as any).uploadedBy);

  // --- YORUM GÖNDERME ---
  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/tensions/${tension.id || (tension as any)._id}/comment`, {
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
        setTension(prev => ({ ...prev, comments: updatedComments }));
        setCommentText('');
      } else {
        alert("Error posting comment.");
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to server.");
    }
  };

  // --- EVIDENCE EKLEME ---
  const handleAddEvidence = async (newEvidence: any) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tensions/${tension.id || (tension as any)._id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvidence,
          uploadedBy: currentUser.id
        })
      });

      if (response.ok) {
        const updatedEvidences = await response.json();
        setTension(prev => ({ ...prev, evidences: updatedEvidences }));
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tensions
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        {/* Tension Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center mb-3">
            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[tension.status as keyof typeof statusColors]?.bg || 'bg-gray-100'} mr-2`}>
              {(tension.status || 'ongoing').toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              Created by {creator?.name || 'Unknown'} on {new Date(tension.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-2xl text-gray-900 mb-3">{tension.claimStatement || "No claim statement"}</h1>
          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 mb-1">Argument:</div>
              <p className="text-gray-900">{tension.description}</p>
          </div>
          {tension.principle1 && (
            <div className="mt-2 text-sm text-blue-800 bg-blue-50 p-3 rounded border border-blue-100">
                <strong>Conflict:</strong> {tension.principle1} ↔ {tension.principle2}
            </div>
          )}
        </div>

        {/* EVIDENCE LIBRARY */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-900">Evidence Library</h2>
            <button onClick={() => setShowAddEvidence(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
              <Plus className="h-4 w-4 mr-2" /> Add Evidence
            </button>
          </div>

          <div className="space-y-4">
            {(tension as any).evidences && (tension as any).evidences.length > 0 ? (
              (tension as any).evidences.map((ev: any, index: number) => {
                 const uploader = users.find(u => u.id === ev.uploadedBy);
                 return (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <FileText className="h-5 w-5 text-blue-500 mr-2" />
                          <h3 className="text-gray-900 font-medium">{ev.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{ev.description}</p>
                        <div className="text-xs text-gray-400">
                           Uploaded by {uploader?.name || 'Unknown'} on {new Date(ev.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {ev.fileData && (
                        <a 
                          href={ev.fileData} 
                          download={ev.fileName || "download"}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded flex items-center justify-center border border-transparent hover:border-blue-100"
                          title="Download File"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                      )}
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

        {/* COMMENTS SECTION */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl text-gray-900 mb-6">Discussion</h2>
          
          <div className="space-y-6 mb-8">
            {tension.comments && tension.comments.length > 0 ? (
              tension.comments.map((comment: any, index: number) => (
                <div key={index} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
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
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
              />
              <button 
                onClick={handlePostComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 float-right flex items-center"
              >
                <Send className="h-3 w-3 mr-2" /> Post Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddEvidence && (
        <AddEvidenceModal
          onClose={() => setShowAddEvidence(false)}
          onAdd={handleAddEvidence}
        />
      )}
    </div>
  );
}

// --- ADD EVIDENCE MODAL (İNGİLİZCE VE ÖZEL TASARIM) ---
function AddEvidenceModal({ onClose, onAdd }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Dosya yönetimi için state ve ref
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const convertBase64 = (file: File) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let base64File = null;
    if (file) {
      base64File = await convertBase64(file);
    }

    const evidence = {
      title,
      description,
      fileName: file?.name,
      fileData: base64File
    };
    
    onAdd(evidence);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add Evidence</h2>
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
          
          {/* ÖZEL DOSYA YÜKLEME ALANI (İNGİLİZCE) */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Upload File</label>
            
            {/* Orijinal input'u gizliyoruz */}
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Save Evidence</button>
          </div>
        </form>
      </div>
    </div>
  );
}
import React from 'react';
import { ThumbsUp, ThumbsDown, BookOpen, MoreVertical } from 'lucide-react';
import { Tension, User } from '../types';

interface TensionCardProps {
  tension: Tension;
  currentUser: User;
  onVote: (tensionId: string, voteType: 'agree' | 'disagree') => void;
  onCommentClick: (tension: Tension) => void;
}

export function TensionCard({ tension, currentUser, onVote, onCommentClick }: TensionCardProps) {
  const userVote = tension.userVote; 
  const agreeCount = tension.consensus?.agree || 0;
  const disagreeCount = tension.consensus?.disagree || 0;
  const totalVotes = agreeCount + disagreeCount;
  
  // Yüzdelik Hesaplama
  const agreePercentage = totalVotes > 0 
    ? Math.round((agreeCount / totalVotes) * 100) 
    : 0;

  // Evidence sayısını hesapla (Initial evidence dahil)
  const evidenceCount = (tension as any).evidences ? (tension as any).evidences.length : 0;

  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-all mb-4">
      {/* Üst Kısım: Risk Badge ve Tarih */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            tension.severity === 'high' ? 'bg-red-100 text-red-800' :
            tension.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            Risk: {(tension.severity || 'medium').toUpperCase()}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(tension.createdAt).toLocaleDateString()}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Başlık ve Açıklama */}
      <h4 className="text-md font-semibold text-gray-900 mb-1">
        {tension.claimStatement || "No claim statement"}
      </h4>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {tension.description}
      </p>

      {/* İlkeler Arasındaki Gerilim */}
      <div className="text-xs font-medium text-blue-600 mb-4 bg-blue-50 inline-block px-2 py-1 rounded border border-blue-100">
        {tension.principle1} ↔ {tension.principle2}
      </div>

      {/* Consensus Bar */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-xs text-gray-500 font-medium">Consensus:</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500 ease-out"
            style={{ width: `${agreePercentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-24 text-right">
          {agreePercentage}% agree ({totalVotes})
        </span>
      </div>

      {/* --- BUTONLAR (GÜNCELLENDİ) --- */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex space-x-3">
          {/* AGREE */}
          <button
            onClick={(e) => { e.stopPropagation(); onVote(tension.id || (tension as any)._id, 'agree'); }}
            className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              userVote === 'agree' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 mr-1.5 ${userVote === 'agree' ? 'fill-current' : ''}`} />
            Agree ({agreeCount})
          </button>

          {/* DISAGREE */}
          <button
            onClick={(e) => { e.stopPropagation(); onVote(tension.id || (tension as any)._id, 'disagree'); }}
            className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              userVote === 'disagree' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50'
            }`}
          >
            <ThumbsDown className={`w-4 h-4 mr-1.5 ${userVote === 'disagree' ? 'fill-current' : ''}`} />
            Disagree ({disagreeCount})
          </button>
        </div>

        {/* EVIDENCE LIBRARY BUTONU (Comment yerine geldi) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick(tension); // Detay sayfasına gider
          }}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
        >
          <BookOpen className="w-4 h-4 mr-1.5" />
          Evidence Library ({evidenceCount})
        </button>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, BookOpen, MoreVertical, Info } from 'lucide-react';
import { Tension, User } from '../types';
import { TensionDetailDrawer } from './TensionDetailDrawer';

interface TensionCardProps {
  tension: Tension;
  currentUser: User;
  users?: User[];
  onVote: (tensionId: string, voteType: 'agree' | 'disagree') => void;
  onCommentClick: (tension: Tension) => void;
  onDelete?: (tensionId: string) => void;
  disableVoting?: boolean;
}

export function TensionCard({ tension, currentUser, users = [], onVote, onCommentClick, onDelete, disableVoting }: TensionCardProps) {
  const [showReviewTooltip, setShowReviewTooltip] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerDefaultTab, setDrawerDefaultTab] = useState<'evidence' | 'discussion'>('evidence');
  
  // userVote'u normalize et - string, null, undefined kontrolü
  const userVote = tension.userVote === 'agree' || tension.userVote === 'disagree' 
    ? tension.userVote 
    : null; 
  const agreeCount = tension.consensus?.agree || 0;
  const disagreeCount = tension.consensus?.disagree || 0;
  const totalVotes = agreeCount + disagreeCount;

  // Review state calculation
  const getReviewState = (): { state: 'Proposed' | 'Single review' | 'Under review' | 'Accepted' | 'Disputed'; color: string } => {
    // Proposed: total == 0
    if (totalVotes === 0) {
      return { state: 'Proposed', color: 'gray' };
    }
    
    // Single review: total == 1
    if (totalVotes === 1) {
      return { state: 'Single review', color: 'light-blue' };
    }
    
    // Accepted: total >= 2 AND disagreeCount == 0
    if (totalVotes >= 2 && disagreeCount === 0) {
      return { state: 'Accepted', color: 'green' };
    }
    
    // Disputed: total >= 2 AND agreeCount == 0
    if (totalVotes >= 2 && agreeCount === 0) {
      return { state: 'Disputed', color: 'red' };
    }
    
    // Under review: total >= 2 AND agreeCount > 0 AND disagreeCount > 0
    if (totalVotes >= 2 && agreeCount > 0 && disagreeCount > 0) {
      return { state: 'Under review', color: 'blue' };
    }
    
    // Fallback (should not happen with the above rules)
    return { state: 'Under review', color: 'blue' };
  };

  const reviewState = getReviewState();
  const isUnderReview = reviewState.state === 'Under review';

  const canDelete = currentUser.role === 'admin' || tension.createdBy === currentUser.id;
  // Tension sahibi vote butonlarını kullanamaz
  const isOwner = tension.createdBy === currentUser.id;
  const canVote = !disableVoting && !isOwner;
  
  // Yüzdelik Hesaplama
  // Eğer tüm oylar agree ise, kesinlikle %100 olmalı (yuvarlama hatasını önlemek için)
  const agreePercentage = totalVotes > 0 
    ? (agreeCount === totalVotes ? 100 : Math.round((agreeCount / totalVotes) * 100))
    : 0;

  // Evidence ve comment sayılarını hesapla
  const evidenceCount = (tension as any).evidences ? (tension as any).evidences.length : 0;
  const commentCount = tension.comments ? tension.comments.length : 0;

  // Yüzdeye göre yeşil renk hesaplama - direkt hex renk kullanarak
  const getGreenColor = (percentage: number): string => {
    if (percentage === 0) return '#d1fae5'; // green-100
    if (percentage <= 25) return '#86efac'; // green-300
    if (percentage <= 50) return '#4ade80'; // green-400
    if (percentage <= 75) return '#22c55e'; // green-500
    return '#16a34a'; // green-600
  };

  // Card border rengini userVote'a göre belirle - GeneralQuestions'taki gibi
  const getCardBorderClass = () => {
    if (userVote === 'agree') {
      return 'border-2 border-green-500 bg-green-50 shadow-md';
    } else if (userVote === 'disagree') {
      return 'border-2 border-red-500 bg-red-50 shadow-md';
    }
    return 'border-2 border-gray-200 bg-white';
  };

  return (
    <div className={`rounded-lg p-4 hover:shadow-md transition-all duration-200 mb-4 ${getCardBorderClass()}`}>
      {/* Üst Kısım: Risk Badge, Review Badge ve Tarih */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2 flex-wrap">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            tension.severity === 'high' ? 'bg-red-100 text-red-800' :
            tension.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            Risk: {(tension.severity || 'medium').toUpperCase()}
          </span>
          <div className="relative inline-flex items-center">
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              reviewState.color === 'gray' ? 'bg-gray-100 text-gray-800' :
              reviewState.color === 'light-blue' ? 'bg-blue-50 text-blue-700' :
              reviewState.color === 'blue' ? 'bg-blue-100 text-blue-800' :
              reviewState.color === 'green' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              Review: {reviewState.state}
            </span>
            <button
              type="button"
              onMouseEnter={() => setShowReviewTooltip(true)}
              onMouseLeave={() => setShowReviewTooltip(false)}
              onClick={() => setShowReviewTooltip(!showReviewTooltip)}
              className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <Info className="h-3 w-3" />
            </button>
            {showReviewTooltip && (
              <div className="absolute z-10 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg left-0 bottom-full mb-1">
                Review is computed from expert votes (no admin approval).
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {new Date(tension.createdAt).toLocaleDateString()}
          </span>
        </div>
        {onDelete && canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tension.id || (tension as any)._id);
            }}
            className="text-red-500 hover:text-red-700 text-xs font-medium"
          >
            Delete
          </button>
        )}
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
        <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden" style={{ position: 'relative' }}>
          <div 
            style={{ 
              position: 'absolute',
              top: '0',
              left: '0',
              width: `${agreePercentage}%`,
              height: '100%',
              backgroundColor: agreePercentage > 0 ? getGreenColor(agreePercentage) : 'transparent',
              borderRadius: '9999px',
              transition: 'width 0.5s ease-out, background-color 0.5s ease-out',
              minWidth: agreePercentage > 0 ? '4px' : '0px',
              zIndex: 1,
              display: 'block'
            }}
          />
        </div>
        <span className="text-xs text-gray-500 w-24 text-right">
          {agreePercentage}% agree ({totalVotes})
        </span>
      </div>

      {/* Discussion Recommended Callout (Under review only) */}
      {isUnderReview && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-900">Discussion recommended</div>
              <div className="text-xs text-blue-700 mt-0.5">
                Experts disagree —{' '}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerDefaultTab('discussion');
                    setShowDrawer(true);
                  }}
                  className="text-blue-700 underline hover:text-blue-900 font-medium"
                >
                  add evidence or comments
                </button>
                {' '}to resolve.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BUTONLAR (GÜNCELLENDİ) --- */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex space-x-3">
          {/* AGREE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!canVote) return;
              onVote(tension.id || (tension as any)._id, 'agree');
            }}
            disabled={!canVote}
            className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              userVote === 'agree'
                ? 'bg-green-100 text-green-700 border-green-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'
            } ${!canVote ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''}`}
          >
            <ThumbsUp className={`w-4 h-4 mr-1.5 ${userVote === 'agree' ? 'fill-current' : ''}`} />
            Agree ({agreeCount})
          </button>

          {/* DISAGREE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!canVote) return;
              onVote(tension.id || (tension as any)._id, 'disagree');
            }}
            disabled={!canVote}
            className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              userVote === 'disagree'
                ? 'bg-red-100 text-red-700 border-red-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50'
            } ${!canVote ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''}`}
          >
            <ThumbsDown className={`w-4 h-4 mr-1.5 ${userVote === 'disagree' ? 'fill-current' : ''}`} />
            Disagree ({disagreeCount})
          </button>
        </div>

        {/* VIEW DETAILS BUTONU */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDrawerDefaultTab('evidence');
            setShowDrawer(true);
          }}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
        >
          <BookOpen className="w-4 h-4 mr-1.5" />
          View Details ({evidenceCount} evidence{evidenceCount !== 1 ? 's' : ''}, {commentCount} comment{commentCount !== 1 ? 's' : ''})
        </button>
      </div>

      {/* Tension Detail Drawer */}
      <TensionDetailDrawer
        tension={tension}
        currentUser={currentUser}
        users={users}
        open={showDrawer}
        onOpenChange={setShowDrawer}
        defaultTab={drawerDefaultTab}
        onTensionUpdate={(updated) => {
          // Update tension in parent if needed
          if (onCommentClick) {
            onCommentClick(updated);
          }
        }}
      />
    </div>
  );
}
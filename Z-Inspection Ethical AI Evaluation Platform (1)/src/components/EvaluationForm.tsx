import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Save, Send, Plus, AlertTriangle, CheckCircle, XCircle, 
  Info, ChevronRight, ChevronLeft, Loader2, Trash2, Upload 
} from 'lucide-react';

import { Project, User, Question, StageKey, QuestionType, UseCase, EthicalPrinciple, Tension } from '../types';
import { getQuestionsByRole } from '../data/questions'; 
import { api } from '../api';
<<<<<<< Updated upstream
import { EthicalTensionSelector } from './EthicalTensionSelector';
=======
>>>>>>> Stashed changes

interface EvaluationFormProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onSubmit: () => void;
}

type RiskLevel = 'low' | 'medium' | 'high';

const roleColors: Record<string, string> = {
  'admin': '#1F2937',
  'ethical-expert': '#1E40AF',
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED',
  'technical-expert': '#0891B2',
  'legal-expert': '#B45309'
};

<<<<<<< Updated upstream
const riskSeverityOptions = [
  { value: 'low', label: 'Low', className: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'high', label: 'High', className: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'critical', label: 'Critical', className: 'bg-purple-50 text-purple-700 border-purple-200' },
];

=======
>>>>>>> Stashed changes
export function EvaluationForm({ project, currentUser, onBack, onSubmit }: EvaluationFormProps) {
  // Projenin mevcut stage'ini başlangıç değeri olarak alabiliriz veya 'set-up' ile başlatabiliriz.
  // Ancak kullanıcının kaldığı yerden devam etmesi için 'set-up' ile başlatıp veriyi çekmek daha güvenli.
  const [currentStage, setCurrentStage] = useState<StageKey>('set-up');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questionPriorities, setQuestionPriorities] = useState<Record<string, RiskLevel>>({}); // Her soru için önem derecesi
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [loading, setLoading] = useState(false); // Yükleniyor durumu
  const [saving, setSaving] = useState(false);   // Kaydediliyor durumu
  const [linkedUseCase, setLinkedUseCase] = useState<UseCase | null>(null);
  const [generalRisks, setGeneralRisks] = useState<Array<{ id: string; title: string; description: string; severity?: 'low' | 'medium' | 'high' | 'critical'; relatedQuestions?: string[] }>>([]);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [editingRiskIdReview, setEditingRiskIdReview] = useState<string | null>(null);
  const [tensions, setTensions] = useState<Tension[]>([]);
  const [editingTensionId, setEditingTensionId] = useState<string | null>(null);
  const [votingTensionId, setVotingTensionId] = useState<string | null>(null);
  
  // Tension form state
  const [principle1, setPrinciple1] = useState<EthicalPrinciple | undefined>();
  const [principle2, setPrinciple2] = useState<EthicalPrinciple | undefined>();
  const [claim, setClaim] = useState('');
  const [argument, setArgument] = useState('');
  const [evidence, setEvidence] = useState('');
  const [severity, setSeverity] = useState<number>(2);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Edit tension state
  const [editPrinciple1, setEditPrinciple1] = useState<EthicalPrinciple | undefined>();
  const [editPrinciple2, setEditPrinciple2] = useState<EthicalPrinciple | undefined>();
  const [editClaim, setEditClaim] = useState('');
  const [editArgument, setEditArgument] = useState('');
  const [editSeverity, setEditSeverity] = useState<number>(2);

  const roleKey = currentUser.role.toLowerCase().replace(' ', '-') || 'admin';
  const roleColor = roleColors[roleKey] || '#3B82F6';

  const currentQuestions = useMemo(() => {
    const roleQuestions = getQuestionsByRole(roleKey);
    const allQuestions = [...roleQuestions, ...customQuestions];
    return allQuestions.filter(q => q.stage === currentStage);
  }, [roleKey, currentStage, customQuestions]);

  // Assess stage'indeki tüm soruları almak için
  const assessQuestions = useMemo(() => {
    const roleQuestions = getQuestionsByRole(roleKey);
    const allQuestions = [...roleQuestions, ...customQuestions];
    return allQuestions.filter(q => q.stage === 'assess');
  }, [roleKey, customQuestions]);

  // --- 1. VERİ ÇEKME (FETCH DATA) ---
  useEffect(() => {
    const fetchEvaluation = async () => {
      setLoading(true);
      try {
<<<<<<< Updated upstream
        const response = await fetch(api(`/api/evaluations?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}&stage=${currentStage}`));
=======
        const response = await fetch(api(`/api/evaluations?projectId=${project._id}&userId=${currentUser._id}&stage=${currentStage}`));
>>>>>>> Stashed changes
        if (response.ok) {
          const data = await response.json();
          // Eğer veritabanında cevaplar varsa state'e yükle
          if (data.answers) setAnswers(data.answers);
          if (data.questionPriorities) setQuestionPriorities(data.questionPriorities); // Soru önem derecelerini yükle
          if (data.riskLevel) setRiskLevel(data.riskLevel as RiskLevel);
          // Genel riskleri yükle - eğer veritabanında varsa yükle
          if (data.generalRisks && Array.isArray(data.generalRisks)) {
            setGeneralRisks(data.generalRisks.map((r: any) => ({
              ...r,
              severity: r.severity || 'medium',
              relatedQuestions: r.relatedQuestions || []
            })));
          } else if (currentStage === 'set-up') {
            // Set-up stage'inde eğer veritabanında risk yoksa, state'i boş bırak
            // (kullanıcı daha önce risk eklemediyse)
            setGeneralRisks([]);
          }
          // Status completed ise draft olmadığını belirt
          if (data.status === 'completed') setIsDraft(false);
        }
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    // Review screen açıldığında veya assess stage'inde set-up risklerini de yükle
    const fetchSetUpRisks = async () => {
      if (showReviewScreen || (currentStage === 'assess' && !showReviewScreen)) {
        try {
          const response = await fetch(api(`/api/evaluations?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}&stage=set-up`));
          if (response.ok) {
            const data = await response.json();
            if (data.generalRisks && Array.isArray(data.generalRisks)) {
              // Riskler varsa yükle, yoksa mevcut state'i koru (review screen'de önemli)
              if (data.generalRisks.length > 0) {
                setGeneralRisks(data.generalRisks.map((r: any) => ({
                  ...r,
                  severity: r.severity || 'medium',
                  relatedQuestions: r.relatedQuestions || []
                })));
              }
            }
          }
        } catch (error) {
          console.error("Set-up risks fetch error:", error);
        }
      }
    };

    const fetchUseCase = async () => {
      // Project.useCase bir string ID olabilir veya object olabilir
      const useCaseId = typeof project.useCase === 'string' ? project.useCase : (project.useCase as any)?.id;
      if (useCaseId) {
        try {
          const response = await fetch(api(`/api/use-cases/${useCaseId}`));
          if (response.ok) {
            const data = await response.json();
            setLinkedUseCase(data);
          }
        } catch (error) {
          console.error("Use Case çekme hatası:", error);
        }
      }
    };

    fetchEvaluation();
    fetchUseCase();
    fetchSetUpRisks();
    // Her stage değişiminde soru indexini sıfırla
    setCurrentQuestionIndex(0);
  }, [currentStage, project.id, currentUser.id, project.useCase, showReviewScreen]);

  // Review screen açıldığında tensionları yükle
  useEffect(() => {
    if (showReviewScreen) {
      const fetchTensions = async () => {
        try {
          const response = await fetch(api(`/api/tensions/${project.id || (project as any)._id}?userId=${currentUser.id || (currentUser as any)._id}`));
          if (response.ok) {
            const data = await response.json();
            setTensions(data.map((t: any) => ({
              ...t,
              id: t._id || t.id,
              userVote: t.userVote || null // userVote'u açıkça set et
            })));
          }
        } catch (error) {
          console.error("Tensions fetch error:", error);
        }
      };
      fetchTensions();
    }
  }, [showReviewScreen, project.id, currentUser.id]);

  const activeQuestion = currentQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestions.length > 0 && currentQuestionIndex === currentQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // --- 2. VERİ KAYDETME (SAVE DATA) ---
  const saveEvaluation = async (status: 'draft' | 'completed' = 'draft') => {
    setSaving(true);
    try {
      const response = await fetch(api('/api/evaluations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id || (project as any)._id,
          userId: currentUser.id || (currentUser as any)._id,
          stage: currentStage,
          answers: answers,
          questionPriorities: questionPriorities, // Her soru için önem derecelerini kaydet
          riskLevel: riskLevel,
          generalRisks: generalRisks, // Genel riskleri kaydet
          status: status
        })
      });

      if (!response.ok) throw new Error('Kaydetme başarısız');
      
      const savedData = await response.json();
      console.log('Saved:', savedData);
      
      if (status === 'draft') {
        alert('✅ Draft saved successfully to Database!');
      }
      return true;
    } catch (error) {
      console.error(error);
      alert('❌ Error saving data. Please check your connection.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // --- NAVIGATION LOGIC ---

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentStage !== 'set-up') {
      handleStageChange('prev');
    }
  };

  const handleForward = async () => {
    // Set-up stage'inde en az 3 risk kontrolü
    if (currentStage === 'set-up') {
      if (generalRisks.length < 3) {
        alert("Please add at least 3 general risks before proceeding to the next stage.");
        return;
      }
      // Tüm risklerin başlığı olmalı
      const hasEmptyTitle = generalRisks.some(risk => !risk.title.trim());
      if (hasEmptyTitle) {
        alert("Please ensure all risks have a title.");
        return;
      }
      // Set-up stage'ini kaydet ve sonra assess stage'ine geç
      const success = await saveEvaluation('completed');
      if (success) {
        handleStageChange('next');
      }
      return;
    }

    // Zorunluluk Kontrolü
    if (activeQuestion && activeQuestion.required && !answers[activeQuestion.id]) {
      alert("Please answer this required question before proceeding.");
      return;
    }

    // Assess stage'inde Importance Level zorunlu kontrolü
    if (currentStage === 'assess' && activeQuestion && !questionPriorities[activeQuestion.id]) {
      alert("Please select an importance level for this question before proceeding.");
      return;
    }

    // 1. Sonraki Soru
    if (currentQuestions.length > 0 && !isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
    // 2. Assess stage'inde son soruysa review screen'i göster
    else if (currentStage === 'assess' && isLastQuestion) {
      // Review screen açılmadan önce set-up risklerini yükle
      const fetchSetUpRisksForReview = async () => {
        try {
          const response = await fetch(api(`/api/evaluations?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}&stage=set-up`));
          if (response.ok) {
            const data = await response.json();
            if (data.generalRisks && Array.isArray(data.generalRisks) && data.generalRisks.length > 0) {
              setGeneralRisks(data.generalRisks);
            }
          }
        } catch (error) {
          console.error("Set-up risks fetch error:", error);
        }
      };
      await fetchSetUpRisksForReview();
      setShowReviewScreen(true);
    }
    // 3. Submit (Resolve aşaması)
    else if (currentStage === 'resolve') {
      handleSubmitForm();
    }
    // 4. Sonraki Stage
    else {
      // Stage değiştirmeden önce kaydet
      const success = await saveEvaluation('completed'); // O anki stage'i tamamlandı olarak işaretle
      if (success) {
        handleStageChange('next');
      }
    }
  };

  const handleStageChange = (direction: 'next' | 'prev') => {
    const stageOrder: StageKey[] = ['set-up', 'assess', 'resolve'];
    const currentIndex = stageOrder.indexOf(currentStage);

    if (direction === 'next' && currentIndex < stageOrder.length - 1) {
      setCurrentStage(stageOrder[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentStage(stageOrder[currentIndex - 1]);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setIsDraft(true);
  };

<<<<<<< Updated upstream
  // Tension ekleme fonksiyonu
  const handleCreateTension = async (tensionData: any) => {
    try {
      const response = await fetch(api('/api/tensions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tensionData,
          projectId: project.id || (project as any)._id,
          createdBy: currentUser.id || (currentUser as any)._id,
          status: 'ongoing'
        })
      });

      if (response.ok) {
        alert('Tension created successfully!');
        // Tensionları yeniden yükle
        const tensionsResponse = await fetch(api(`/api/tensions/${project.id || (project as any)._id}?userId=${currentUser.id || (currentUser as any)._id}`));
        if (tensionsResponse.ok) {
          const data = await tensionsResponse.json();
          setTensions(data.map((t: any) => ({
            ...t,
            id: t._id || t.id
          })));
        }
        // Form'u temizle
        setPrinciple1(undefined);
        setPrinciple2(undefined);
        setClaim('');
        setArgument('');
        setEvidence('');
        setSeverity(2);
        setSelectedFile(null);
      } else {
        alert('Failed to create tension.');
      }
    } catch (error) {
      console.error('Tension create error:', error);
      alert('Error creating tension.');
    }
  };

  const handleVoteTension = async (tensionId: string, voteType: 'agree' | 'disagree') => {
    setVotingTensionId(tensionId);
    const userId = currentUser.id || (currentUser as any)._id;
    
    // Mevcut tension'ı bul ve state'i kaydet (hata durumunda geri almak için)
    const currentTension = tensions.find(t => t.id === tensionId);
    if (!currentTension) {
      setVotingTensionId(null);
      return;
    }

    const currentVote = currentTension.userVote;
    let newAgree = currentTension.consensus?.agree || 0;
    let newDisagree = currentTension.consensus?.disagree || 0;
    let newUserVote: 'agree' | 'disagree' | null = voteType;

    // Eğer aynı oya tekrar tıklanırsa, oyu kaldır
    if (currentVote === voteType) {
      newUserVote = null;
      if (voteType === 'agree') {
        newAgree = Math.max(0, newAgree - 1);
      } else {
        newDisagree = Math.max(0, newDisagree - 1);
      }
    } else {
      // Yeni oy veriliyor veya oy değiştiriliyor
      if (currentVote === 'agree') {
        newAgree = Math.max(0, newAgree - 1);
      } else if (currentVote === 'disagree') {
        newDisagree = Math.max(0, newDisagree - 1);
      }
      
      if (voteType === 'agree') {
        newAgree += 1;
      } else {
        newDisagree += 1;
      }
    }

    // Optimistic update - önce state'i güncelle
    setTensions(prevTensions => {
      return prevTensions.map(tension => {
        if (tension.id === tensionId) {
          return {
            ...tension,
            userVote: newUserVote,
            consensus: {
              agree: newAgree,
              disagree: newDisagree
            }
          };
        }
        return tension;
      });
    });

    try {
      const response = await fetch(api(`/api/tensions/${tensionId}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          voteType
        })
      });

      if (!response.ok) {
        // Hata durumunda state'i geri al - sadece bu tension'ı güncelle
        setTensions(prevTensions => {
          return prevTensions.map(tension => {
            if (tension.id === tensionId) {
              return currentTension; // Orijinal state'e geri dön
            }
            return tension;
          });
        });
        alert('Failed to vote. Please try again.');
      } else {
        // Başarılı olduğunda backend'den güncel veriyi al ve sadece bu tension'ı güncelle
        const tensionsResponse = await fetch(api(`/api/tensions/${project.id || (project as any)._id}?userId=${userId}`));
        if (tensionsResponse.ok) {
          const data = await tensionsResponse.json();
          const updatedTension = data.find((t: any) => (t._id || t.id) === tensionId);
          if (updatedTension) {
            // Sadece bu tension'ı güncelle, diğerlerini koru
            setTensions(prevTensions => {
              return prevTensions.map(tension => {
                if (tension.id === tensionId) {
                  return {
                    ...tension,
                    userVote: updatedTension.userVote || null,
                    consensus: updatedTension.consensus || tension.consensus
                  };
                }
                return tension;
              });
            });
          }
        }
      }
    } catch (error) {
      console.error('Vote error:', error);
      // Hata durumunda state'i geri al - sadece bu tension'ı güncelle
      setTensions(prevTensions => {
        return prevTensions.map(tension => {
          if (tension.id === tensionId) {
            return currentTension; // Orijinal state'e geri dön
          }
          return tension;
        });
      });
      alert('Error voting. Please try again.');
    } finally {
      setVotingTensionId(null);
    }
  };

  const handleDeleteTension = async (tensionId: string) => {
    if (!confirm('Are you sure you want to delete this tension?')) return;
    
    try {
      const response = await fetch(api(`/api/tensions/${tensionId}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        setTensions(tensions.filter(t => t.id !== tensionId));
        alert('Tension deleted successfully!');
      } else {
        alert('Failed to delete tension.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting tension.');
    }
  };

  const handleEditTension = (tension: Tension) => {
    setEditingTensionId(tension.id);
    setEditPrinciple1(tension.principle1);
    setEditPrinciple2(tension.principle2);
    setEditClaim(tension.claimStatement);
    setEditArgument(tension.description || '');
    setEditSeverity(tension.severity === 'high' ? 3 : tension.severity === 'medium' ? 2 : 1);
  };

  const handleUpdateTension = async (tensionId: string) => {
    try {
      const response = await fetch(api(`/api/tensions/${tensionId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principle1: editPrinciple1,
          principle2: editPrinciple2,
          claimStatement: editClaim,
          description: editArgument,
          severity: editSeverity === 1 ? 'low' : editSeverity === 2 ? 'medium' : 'high'
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setTensions(tensions.map(t => t.id === tensionId ? { ...updated, id: updated._id || updated.id } : t));
        setEditingTensionId(null);
        alert('Tension updated successfully!');
      } else {
        alert('Failed to update tension.');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Error updating tension.');
    }
  };

  const handleCancelEdit = () => {
    setEditingTensionId(null);
    setEditPrinciple1(undefined);
    setEditPrinciple2(undefined);
    setEditClaim('');
    setEditArgument('');
    setEditSeverity(2);
  };

  // Dosyayı Base64'e çeviren yardımcı fonksiyon
  const convertBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result as string);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleTensionSubmit = async (e: any) => {
    e.preventDefault();
    
    if (principle1 && principle2 && claim && argument) {
      let fileData: string | null = null;
      
      if (selectedFile) {
        try {
          fileData = await convertBase64(selectedFile);
        } catch (error) {
          console.error("File conversion error", error);
        }
      }

      await handleCreateTension({
        principle1,
        principle2,
        claimStatement: claim,
        description: argument,
        evidenceDescription: evidence,
        evidenceFileName: selectedFile ? selectedFile.name : undefined,
        evidenceFileData: fileData,
        severity: severity === 1 ? 'low' : severity === 2 ? 'medium' : 'high'
      });
    }
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Review screen'den resolve stage'ine geçiş
  const handleFinishAssess = async () => {
    const success = await saveEvaluation('completed');
    if (success) {
      setShowReviewScreen(false);
      handleStageChange('next');
    }
  };

=======
>>>>>>> Stashed changes
  const handlePriorityChange = (questionId: string, priority: RiskLevel) => {
    setQuestionPriorities((prev) => ({ ...prev, [questionId]: priority }));
    setIsDraft(true);
  };

  const handleSubmitForm = async () => {
    const requiredQuestions = currentQuestions.filter((q) => q.required);
    const missingAnswers = requiredQuestions.filter((q) => !answers[q.id]);

    if (missingAnswers.length > 0) {
      alert(`Please answer all required questions (${missingAnswers.length} missing).`);
      return;
    }

    // Son kez kaydet ve status'u completed yap
    const success = await saveEvaluation('completed');
    if (success) {
        alert('Evaluation submitted successfully and Project Status updated!');
        onSubmit();
    }
  };

  const addCustomQuestion = (question: Question) => {
    setCustomQuestions((prev) => [
      ...prev,
      { ...question, stage: currentStage }
    ]);
  };

  const getCompletionPercentage = () => {
    if (currentQuestions.length === 0) return 0;
    return Math.round(((currentQuestionIndex + 1) / currentQuestions.length) * 100);
  };

  const stages: { key: StageKey; label: string; icon: string }[] = [
    { key: 'set-up', label: 'Set-up', icon: '🚀' },
    { key: 'assess', label: 'Assess', icon: '🔍' },
    { key: 'resolve', label: 'Resolve', icon: '📊' }
  ];

  const getNextButtonText = () => {
    if (currentStage === 'set-up') return "Continue to Assess Stage";
    if (currentQuestions.length === 0) return "Next Stage";
    if (!isLastQuestion) return "Next Question";
    if (currentStage === 'resolve') return "Submit Evaluation";
    if (currentStage === 'assess') return "Next";
    return "Finish Stage";
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">Loading evaluation data...</p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </button>
              <div>
                <h1 className="text-xl text-gray-900 font-bold tracking-tight">
                  {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Evaluation
                </h1>
                {/* PROJE DURUMUNU GÖSTERME DÜZELTMESİ */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
                    <span>Project: {project.title}</span>
                    <span className="text-gray-300">|</span>
                    <span className={`px-2 py-0.5 rounded ${
                        project.stage === 'set-up' ? 'bg-blue-100 text-blue-700' :
                        project.stage === 'assess' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                        Global Stage: {project.stage}
                    </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium">Progress</p>
                <p className="text-sm font-bold text-gray-900">{getCompletionPercentage()}%</p>
              </div>
              <div className="w-32 bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${getCompletionPercentage()}%`, backgroundColor: roleColor }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full flex flex-col">
        {/* Stage Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-8 flex justify-between items-center sticky top-24 z-10 backdrop-blur-sm bg-white/90">
          <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl">
             {stages.map((stage) => (
             <button
                 key={stage.key}
                 onClick={() => setCurrentStage(stage.key)}
                 className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center ${
                 currentStage === stage.key
                     ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5 transform scale-100'
                     : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                 }`}
             >
                 <span className="mr-2 text-lg">{stage.icon}</span> {stage.label}
             </button>
             ))}
         </div>
         
         {currentStage !== 'resolve' && currentStage !== 'set-up' && (
            <button
              onClick={() => setShowAddQuestion(true)}
              className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all flex items-center shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </button>
         )}
       </div>

        <div className="flex-1 flex flex-col min-h-[500px]">
            {showReviewScreen ? (
                // Review Screen: Cevaplar, Riskler ve Tension Ekleme
                <div className="flex-1 flex flex-col gap-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Add Tensions</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sol Taraf: Cevaplar ve Riskler */}
                            <div className="space-y-6">
                                {/* Assess Cevapları */}
                                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Info className="w-5 h-5 mr-2 text-blue-600" />
                                        Assessment Answers
                                    </h3>
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {assessQuestions.map((question) => (
                                            <div key={question.id} className="bg-white rounded-lg p-4 border border-gray-200">
                                                <div className="text-sm font-medium text-gray-700 mb-2">{question.text}</div>
                                                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                                                    {answers[question.id] || 'No answer provided'}
                                                </div>
                                                {questionPriorities[question.id] && (
                                                    <div className="mt-2">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                            questionPriorities[question.id] === 'low' ? 'bg-green-100 text-green-700' :
                                                            questionPriorities[question.id] === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            Priority: {questionPriorities[question.id]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Set-up Riskleri */}
                                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-5">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                                        General Risks
                                    </h3>
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {generalRisks.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No risks added</p>
                                        ) : (
                                            generalRisks.map((risk, index) => {
                                                const severity = risk.severity || 'medium';
                                                const relatedQuestions = risk.relatedQuestions || [];
                                                const isEditing = editingRiskIdReview === risk.id;
                                                return (
                                                    <div
                                                        key={risk.id}
                                                        className="bg-white rounded-lg border border-gray-200 p-4 transition-colors"
                                                        onClick={() => setEditingRiskIdReview(risk.id)}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-1 space-y-3" onClick={(e) => isEditing && e.stopPropagation()}>
                                                                {!isEditing && (
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="text-sm font-semibold text-gray-900">
                                                                            Risk {index + 1}: {risk.title || 'Untitled risk'}
                                                                        </div>
                                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                                                                            severity === 'critical' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                            severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                            severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                            'bg-green-50 text-green-700 border-green-200'
                                                                        }`}>
                                                                            {severity}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {isEditing && (
                                                                    <>
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs text-gray-500">Editing Risk {index + 1}</span>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingRiskIdReview(null);
                                                                                }}
                                                                                className="text-xs text-gray-500 hover:text-gray-800"
                                                                            >
                                                                                Done
                                                                            </button>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                                                            <input
                                                                                type="text"
                                                                                value={risk.title}
                                                                                onChange={(e) => {
                                                                                    const updated = [...generalRisks];
                                                                                    updated[index].title = e.target.value;
                                                                                    setGeneralRisks(updated);
                                                                                    setIsDraft(true);
                                                                                }}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                                                placeholder="Enter risk title..."
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                                                                            <textarea
                                                                                value={risk.description}
                                                                                onChange={(e) => {
                                                                                    const updated = [...generalRisks];
                                                                                    updated[index].description = e.target.value;
                                                                                    setGeneralRisks(updated);
                                                                                    setIsDraft(true);
                                                                                }}
                                                                                rows={2}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                                                                placeholder="Add description..."
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                                                                            <select
                                                                                value={severity}
                                                                                onChange={(e) => {
                                                                                    const updated = [...generalRisks];
                                                                                    updated[index].severity = e.target.value as any;
                                                                                    setGeneralRisks(updated);
                                                                                    setIsDraft(true);
                                                                                }}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                                            >
                                                                                {riskSeverityOptions.map(opt => (
                                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Related Assess Questions (optional)</label>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                                                                                {assessQuestions.map(q => {
                                                                                    const checked = relatedQuestions.includes(q.id);
                                                                                    return (
                                                                                        <label key={q.id} className="flex items-start gap-2 text-sm text-gray-700">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={checked}
                                                                                                onChange={(e) => {
                                                                                                    const updated = [...generalRisks];
                                                                                                    const current = new Set(updated[index].relatedQuestions || []);
                                                                                                    if (e.target.checked) current.add(q.id); else current.delete(q.id);
                                                                                                    updated[index].relatedQuestions = Array.from(current);
                                                                                                    setGeneralRisks(updated);
                                                                                                    setIsDraft(true);
                                                                                                }}
                                                                                                className="mt-1"
                                                                                            />
                                                                                            <span>{q.text}</span>
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {!isEditing && (
                                                                    <>
                                                                        {risk.description && (
                                                                            <div className="text-xs text-gray-600 mt-1">{risk.description}</div>
                                                                        )}
                                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                            <span className="px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                                                                                {relatedQuestions.length} related question(s)
                                                                            </span>
                                                                            <span className="text-gray-400">Click to edit</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setGeneralRisks(generalRisks.filter((_, i) => i !== index));
                                                                    setIsDraft(true);
                                                                }}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remove risk"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Tensions List */}
                                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-5">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2 text-purple-600" />
                                        Ethical Tensions
                                    </h3>
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {tensions.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No tensions added yet</p>
                                        ) : (
                                            tensions.map((tension) => (
                                                <div key={tension.id} className="bg-white rounded-lg p-4 border border-gray-200">
                                                    {editingTensionId === tension.id ? (
                                                        // Edit Form
                                                        <div className="space-y-3">
                                                            <EthicalTensionSelector
                                                                principle1={editPrinciple1}
                                                                principle2={editPrinciple2}
                                                                onPrinciple1Change={setEditPrinciple1}
                                                                onPrinciple2Change={setEditPrinciple2}
                                                            />
                                                            <div>
                                                                <label className="block text-xs font-semibold mb-1 text-gray-700">Claim *</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={editClaim} 
                                                                    onChange={(e) => setEditClaim(e.target.value)} 
                                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                                                                    required 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold mb-1 text-gray-700">Argument *</label>
                                                                <textarea 
                                                                    value={editArgument} 
                                                                    onChange={(e) => setEditArgument(e.target.value)} 
                                                                    rows={2} 
                                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none" 
                                                                    required 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold mb-1 text-gray-700">Severity</label>
                                                                <select 
                                                                    value={editSeverity} 
                                                                    onChange={(e) => setEditSeverity(Number(e.target.value))}
                                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                                >
                                                                    <option value={1}>Low</option>
                                                                    <option value={2}>Medium</option>
                                                                    <option value={3}>High</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleUpdateTension(tension.id)}
                                                                    className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelEdit}
                                                                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Display Mode
                                                        <div>
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-semibold text-purple-700 mb-1">
                                                                        {tension.principle1} vs {tension.principle2}
                                                                    </div>
                                                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                                                        {tension.claimStatement}
                                                                    </div>
                                                                    {tension.description && (
                                                                        <div className="text-xs text-gray-600 mt-1">{tension.description}</div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                            tension.severity === 'high' ? 'bg-red-100 text-red-700' :
                                                                            tension.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-green-100 text-green-700'
                                                                        }`}>
                                                                            {tension.severity}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {tension.consensus?.agree || 0} agree, {tension.consensus?.disagree || 0} disagree
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1 ml-2">
                                                                    <button
                                                                        onClick={() => handleEditTension(tension)}
                                                                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteTension(tension.id)}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 mt-3">
                                                                <button
                                                                    onClick={() => handleVoteTension(tension.id, 'agree')}
                                                                    disabled={votingTensionId === tension.id}
                                                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center border-2 ${
                                                                        tension.userVote === 'agree' 
                                                                            ? 'bg-green-600 text-white border-green-700 shadow-md' 
                                                                            : 'bg-white text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400'
                                                                    } ${votingTensionId === tension.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    {votingTensionId === tension.id ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                    ) : (
                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                    )}
                                                                    Agree ({tension.consensus?.agree || 0})
                                                                </button>
                                                                <button
                                                                    onClick={() => handleVoteTension(tension.id, 'disagree')}
                                                                    disabled={votingTensionId === tension.id}
                                                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center border-2 ${
                                                                        tension.userVote === 'disagree' 
                                                                            ? 'bg-red-600 text-white border-red-700 shadow-md' 
                                                                            : 'bg-white text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400'
                                                                    } ${votingTensionId === tension.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    {votingTensionId === tension.id ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                    ) : (
                                                                        <XCircle className="w-3 h-3 mr-1" />
                                                                    )}
                                                                    Disagree ({tension.consensus?.disagree || 0})
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sağ Taraf: Tension Ekleme Formu */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                                    Add Ethical Tension
                                </h3>
                                <form onSubmit={handleTensionSubmit} className="space-y-4">
                                    <EthicalTensionSelector
                                        principle1={principle1}
                                        principle2={principle2}
                                        onPrinciple1Change={setPrinciple1}
                                        onPrinciple2Change={setPrinciple2}
                                    />

                                    <div>
                                        <label className="block text-sm font-semibold mb-1 text-gray-700">Claim *</label>
                                        <input 
                                            type="text" 
                                            value={claim} 
                                            onChange={(e) => setClaim(e.target.value)} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                            placeholder="State the core conflict briefly..." 
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-1 text-gray-700">Argument *</label>
                                        <textarea 
                                            value={argument} 
                                            onChange={(e) => setArgument(e.target.value)} 
                                            rows={3} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" 
                                            placeholder="Explain your reasoning..." 
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-1 text-gray-700">Evidence (Optional)</label>
                                        <textarea 
                                            value={evidence} 
                                            onChange={(e) => setEvidence(e.target.value)} 
                                            rows={2} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none mb-2" 
                                            placeholder="Describe supporting evidence..." 
                                        />
                                        <input 
                                            type="file" 
                                            onChange={handleFileChange} 
                                            className="hidden" 
                                            id="tension-file-input"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => document.getElementById('tension-file-input')?.click()} 
                                            className={`flex items-center text-sm px-3 py-1.5 rounded-md border transition-colors ${
                                                selectedFile ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-600 hover:text-blue-600 bg-gray-50 border-gray-300'
                                            }`}
                                        >
                                            {selectedFile ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    {selectedFile.name}
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Upload File
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-3 text-gray-700">Severity Level</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[1, 2, 3].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => setSeverity(level)}
                                                    className={`py-2.5 px-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                                        severity === level 
                                                            ? (level === 1 ? 'border-green-500 bg-green-50 text-green-700' : level === 2 ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-red-500 bg-red-50 text-red-700') + ' font-bold'
                                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className={`w-2.5 h-2.5 rounded-full mb-1 ${severity === level ? (level === 1 ? 'bg-green-500' : level === 2 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-gray-300'}`} />
                                                    {level === 1 ? 'Low' : level === 2 ? 'Medium' : 'High'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={!principle1 || !principle2 || !claim || !argument} 
                                        className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                    >
                                        Save Tension
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            ) : currentStage === 'set-up' ? (
                // Set-up Stage: Admin'in girdiği Project Context bilgilerini göster
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-8 border-b border-gray-100 bg-white">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full">
                                Project Context and Scope
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                            Project Information
                        </h2>
                        <p className="text-gray-600 mt-2">Review the project context and scope information provided by the administrator.</p>
                    </div>

                    <div className="p-8 flex-1 bg-gray-50/30 space-y-6 overflow-y-auto">
                        {/* Project Context and Scope - Admin'in girdiği bilgiler */}
                        {project.inspectionContext ? (
                            <div className="space-y-6">
                                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Info className="w-5 h-5 mr-2 text-blue-600" />
                                        Project Context and Scope
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">1. Who requested the inspection?</label>
                                            <p className="text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200">{project.inspectionContext.requester || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">2. Why carry out an inspection?</label>
                                            <p className="text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200">{project.inspectionContext.inspectionReason || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">3. For whom is the inspection relevant?</label>
                                            <p className="text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200">{project.inspectionContext.relevantFor || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">4. Is it recommended or required (mandatory inspection)?</label>
                                            <p className="text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200 capitalize">{project.inspectionContext.isMandatory || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">5. What are the sufficient vs. necessary conditions that need to be analyzed?</label>
                                            <p className="text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200 whitespace-pre-wrap">{project.inspectionContext.conditionsToAnalyze || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">6. How are the inspection results to be used?</label>
                                            <p className="text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200">{project.inspectionContext.resultsUsage || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">7. Will the results be shared (public) or kept private?</label>
                                            <p className="text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200 whitespace-pre-wrap">{project.inspectionContext.resultsSharing || 'Not provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                                <p className="text-yellow-800">Project context information has not been provided yet.</p>
                            </div>
                        )}

                        {/* Use Case Owner Information - Sadece başlık olarak */}
                        {linkedUseCase && (
                            <div className="bg-green-50/50 border border-green-100 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                                    <Info className="w-5 h-5 mr-2 text-green-600" />
                                    Use Case Owner Information
                                </h3>
                                <p className="text-sm text-gray-600 italic">This section will be available soon.</p>
                            </div>
                        )}

                        {/* General Risks Section */}
                        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">General Risks</h3>
                                    <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">
                                        Minimum 3 required
                                    </span>
                                </div>
                                {generalRisks.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setGeneralRisks([
                                              ...generalRisks,
                                              { id: Date.now().toString(), title: '', description: '' }
                                            ]);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Risk
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                {generalRisks.length === 0 ? (
                                    <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-sm text-gray-500 italic mb-6">No risks added yet. Click "Add Risk" to start.</p>
                                        <button
                                            onClick={() => {
                                                setGeneralRisks([
                                                  ...generalRisks,
                                                  { id: Date.now().toString(), title: '', description: '' }
                                                ]);
                                            }}
                                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Risk
                                        </button>
                                    </div>
                                ) : (
                                            generalRisks.map((risk, index) => {
                                                const severity = risk.severity || 'medium';
                                                const relatedQuestions = risk.relatedQuestions || [];
                                                return (
                                                    <div key={risk.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-1 space-y-3">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Risk {index + 1} Title *
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={risk.title}
                                                                        onChange={(e) => {
                                                                            const updated = [...generalRisks];
                                                                            updated[index].title = e.target.value;
                                                                            setGeneralRisks(updated);
                                                                            setIsDraft(true);
                                                                        }}
                                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                                        placeholder="Enter risk title..."
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Description (Optional)
                                                                    </label>
                                                                    <textarea
                                                                        value={risk.description}
                                                                        onChange={(e) => {
                                                                            const updated = [...generalRisks];
                                                                            updated[index].description = e.target.value;
                                                                            setGeneralRisks(updated);
                                                                            setIsDraft(true);
                                                                        }}
                                                                        rows={2}
                                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                                                        placeholder="Enter risk description (optional)..."
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setGeneralRisks(generalRisks.filter((_, i) => i !== index));
                                                                    setIsDraft(true);
                                                                }}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remove risk"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                            </div>
                            
                            {generalRisks.length > 0 && generalRisks.length < 3 && (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm text-yellow-800">
                                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                                        Please add at least {3 - generalRisks.length} more risk{3 - generalRisks.length > 1 ? 's' : ''} to continue.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : activeQuestion ? (
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    <div className="p-8 border-b border-gray-100 bg-white">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                                Question {currentQuestionIndex + 1} of {currentQuestions.length}
                            </span>
                            {activeQuestion.required && (
                                <span className="px-3 py-1 bg-red-50 text-red-600 text-sm font-medium rounded-full border border-red-100">
                                    Required
                                </span>
                            )}
                        </div>
                        
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                            {activeQuestion.text}
                        </h2>

                        {activeQuestion.description && (
                            <div className="flex items-start gap-3 mt-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-blue-900 text-base leading-relaxed">
                                    {activeQuestion.description}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 flex-1 bg-gray-50/30">
                        {/* INPUT TYPES (Same as before) */}
                         {(activeQuestion.type === 'select' || activeQuestion.type === 'multiple-choice' || activeQuestion.type === 'radio') && (
                            <div className="space-y-3 max-w-2xl">
                                {activeQuestion.options?.map((option) => (
                                <label key={option} className={`group flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                    answers[activeQuestion.id] === option 
                                    ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                                }`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                                         answers[activeQuestion.id] === option ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                                    }`}>
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                    <input
                                    type="radio"
                                    name={activeQuestion.id}
                                    value={option}
                                    checked={answers[activeQuestion.id] === option}
                                    onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                                    className="hidden"
                                    />
                                    <span className={`text-lg font-medium transition-colors ${
                                        answers[activeQuestion.id] === option ? 'text-blue-900' : 'text-gray-700'
                                    }`}>{option}</span>
                                </label>
                                ))}
                            </div>
                        )}

                        {activeQuestion.type === 'text' && (
                            <div className="relative max-w-3xl">
                                <textarea
                                    value={answers[activeQuestion.id] || ''}
                                    onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                                    rows={6}
                                    className="w-full px-5 py-4 text-lg text-gray-800 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none placeholder-gray-400 bg-white"
                                    placeholder="Type your assessment here..."
                                />
                            </div>
                        )}

                        {(activeQuestion.type === 'likert' || activeQuestion.type === 'rating') && (
                             <div className="py-4 max-w-2xl">
                                <div className="flex justify-between text-sm font-semibold text-gray-500 mb-4 px-2 uppercase tracking-wide">
                                    <span>{activeQuestion.min || 'Low'}</span>
                                    <span>{activeQuestion.max || 'High'}</span>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                    {(activeQuestion.options && activeQuestion.options.length > 0 ? activeQuestion.options : ['1', '2', '3', '4', '5']).map((option, idx) => {
                                        const val = idx + 1;
                                        const isSelected = answers[activeQuestion.id] === val || answers[activeQuestion.id] === option;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleAnswerChange(activeQuestion.id, option)}
                                                className={`aspect-square rounded-2xl text-xl font-bold transition-all duration-200 flex items-center justify-center ${
                                                    isSelected
                                                    ? 'bg-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-200'
                                                    : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        
                         {activeQuestion.type === 'checkbox' && (
                            <div className="space-y-3 max-w-2xl">
                                {activeQuestion.options?.map((option) => (
                                <label key={option} className={`group flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                    (answers[activeQuestion.id] || []).includes(option)
                                    ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                                }`}>
                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-4 transition-colors ${
                                         (answers[activeQuestion.id] || []).includes(option) ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                                    }`}>
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    </div>
                                    <input
                                    type="checkbox"
                                    checked={(answers[activeQuestion.id] || []).includes(option)}
                                    onChange={(e) => {
                                        const currentAnswers: string[] = answers[activeQuestion.id] || [];
                                        const newAnswers = e.target.checked
                                        ? [...currentAnswers, option]
                                        : currentAnswers.filter((a) => a !== option);
                                        handleAnswerChange(activeQuestion.id, newAnswers);
                                    }}
                                    className="hidden"
                                    />
                                    <span className={`text-lg font-medium transition-colors ${
                                        (answers[activeQuestion.id] || []).includes(option) ? 'text-blue-900' : 'text-gray-700'
                                    }`}>{option}</span>
                                </label>
                                ))}
                            </div>
                        )}

                        {/* Önem Derecesi Belirleme - Her Soru İçin */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <h3 className="text-lg font-semibold text-gray-900">Importance Level for This Question</h3>
<<<<<<< Updated upstream
                                {currentStage === 'assess' && (
                                    <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">
                                        Required
                                    </span>
                                )}
=======
>>>>>>> Stashed changes
                            </div>
                            <div className="grid grid-cols-3 gap-4 max-w-2xl">
                                {(['low', 'medium', 'high'] as RiskLevel[]).map((level) => {
                                    const isSelected = questionPriorities[activeQuestion.id] === level;
                                    return (
                                        <label
                                            key={level}
                                            className={`relative flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                isSelected
                                                    ? level === 'low'
                                                        ? 'border-green-500 bg-green-50 shadow-md'
                                                        : level === 'medium'
                                                        ? 'border-yellow-500 bg-yellow-50 shadow-md'
                                                        : 'border-red-500 bg-red-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`priority-${activeQuestion.id}`}
                                                value={level}
                                                checked={isSelected}
                                                onChange={() => handlePriorityChange(activeQuestion.id, level)}
                                                className="hidden"
                                            />
                                            <div
                                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                                                    isSelected
                                                        ? level === 'low'
                                                            ? 'bg-green-100 text-green-600'
                                                            : level === 'medium'
                                                            ? 'bg-yellow-100 text-yellow-600'
                                                            : 'bg-red-100 text-red-600'
                                                        : 'bg-gray-100 text-gray-400'
                                                }`}
                                            >
                                                {level === 'low' && <CheckCircle className="w-6 h-6" />}
                                                {level === 'medium' && <AlertTriangle className="w-6 h-6" />}
                                                {level === 'high' && <XCircle className="w-6 h-6" />}
                                            </div>
                                            <span
                                                className={`text-sm font-bold capitalize ${
                                                    isSelected ? 'text-gray-900' : 'text-gray-500'
                                                }`}
                                            >
                                                {level}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                 <div className="text-center py-32 bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50/50">
                        <Info className="w-12 h-12 text-gray-300" />
                    </div>
                    
                    {currentStage === 'resolve' ? (
                        <>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Assessment Complete</h3>
                            <p className="text-gray-500 max-w-md mx-auto mb-10 text-lg">
                                You have reached the final stage. Please review the risk assessment below and submit your evaluation.
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Questions in this Stage</h3>
                            <p className="text-gray-500 max-w-md mx-auto mb-10 text-lg">
                                There are no questions defined for the <strong>{currentStage}</strong> stage for your role (<strong>{currentUser.role}</strong>).
                            </p>
                        </>
                    )}
                    
                    {currentStage !== 'resolve' && (
                        <button
                            onClick={() => setShowAddQuestion(true)}
                            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors mb-8"
                        >
                            <Plus className="w-4 h-4" /> Add a custom question to this stage
                        </button>
                    )}
                </div>
            )}

             {currentStage === 'resolve' && (
                <div className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-200 p-8 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="w-7 h-7 text-yellow-500" />
                        <h3 className="text-2xl font-bold text-gray-900">Final Risk Assessment</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                         {['low', 'medium', 'high'].map((level) => (
                            <label key={level} className={`relative flex flex-col items-center p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                                riskLevel === level 
                                ? level === 'low' ? 'border-green-500 bg-green-50/50 shadow-sm' : level === 'medium' ? 'border-yellow-500 bg-yellow-50/50 shadow-sm' : 'border-red-500 bg-red-50/50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}>
                                <input
                                    type="radio"
                                    name="riskLevel"
                                    value={level}
                                    checked={riskLevel === level}
                                    onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                                    className="hidden"
                                />
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                                     riskLevel === level 
                                     ? level === 'low' ? 'bg-green-100 text-green-600' : level === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                                     : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {level === 'low' && <CheckCircle className="w-8 h-8" />}
                                    {level === 'medium' && <AlertTriangle className="w-8 h-8" />}
                                    {level === 'high' && <XCircle className="w-8 h-8" />}
                                </div>
                                <span className={`text-xl font-bold capitalize ${
                                     riskLevel === level ? 'text-gray-900' : 'text-gray-500'
                                }`}>{level} Risk</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 mt-8 flex justify-between items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {showReviewScreen ? (
                <>
                    <button
                        onClick={() => setShowReviewScreen(false)}
                        className="flex items-center px-6 py-3 rounded-xl font-semibold transition-all border-2 text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5 mr-2" /> Back to Questions
                    </button>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => saveEvaluation('draft')} 
                            disabled={saving}
                            className="px-6 py-3 bg-indigo-50 border-2 border-indigo-100 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-100 hover:border-indigo-200 transition-all flex items-center"
                        >
                            {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <Save className="w-5 h-5 mr-2" />}
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>

                        <button
                            onClick={handleFinishAssess}
                            disabled={saving}
                            className="flex items-center px-8 py-3 text-white rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700"
                        >
                            Finish Assess Stage <ChevronRight className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                </>
            ) : (
                <>
            <button
                onClick={handleBack}
                        disabled={currentStage === 'set-up'}
                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all border-2 ${
                            currentStage === 'set-up'
                    ? 'text-gray-300 border-gray-100 cursor-not-allowed bg-gray-50' 
                    : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                }`}
            >
                <ChevronLeft className="w-5 h-5 mr-2" /> Previous
            </button>

            <div className="flex items-center gap-4">
                <button 
                    onClick={() => saveEvaluation('draft')} 
                    disabled={saving}
                    className="px-6 py-3 bg-indigo-50 border-2 border-indigo-100 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-100 hover:border-indigo-200 transition-all flex items-center"
                >
                    {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <Save className="w-5 h-5 mr-2" />}
                    {saving ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                    onClick={handleForward}
                    disabled={saving}
                    className={`flex items-center px-8 py-3 text-white rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 ${
                        currentStage === 'resolve' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {getNextButtonText()} <ChevronRight className="w-5 h-5 ml-2" />
                </button>
            </div>
                </>
            )}
        </div>

      </div>

      {showAddQuestion && (
        <AddQuestionModal
          currentStage={currentStage}
          onClose={() => setShowAddQuestion(false)}
          onAdd={addCustomQuestion}
        />
      )}
    </div>
  );
}

// ... AddQuestionModal kodunu aynen buraya yapıştır ...
// Not: AddQuestionModal kodunda değişiklik yapmadık, önceki dosyadaki gibi kalabilir.
// Sadece EvaluationForm içindeki AddQuestionModal componentini çağırmak için gerekli.
interface AddQuestionModalProps {
  currentStage: StageKey;
  onClose: () => void;
  onAdd: (question: Question) => void;
}

function AddQuestionModal({ currentStage, onClose, onAdd }: AddQuestionModalProps) {
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<QuestionType>('text');
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [required, setRequired] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newQuestion: Question = {
      id: `custom_${Date.now()}`,
      stage: currentStage,
      text,
      description: description || undefined,
      type,
      required,
      options: (type === 'multiple-choice' || type === 'select' || type === 'radio' || type === 'checkbox') 
        ? options.filter(o => o.trim() !== '') 
        : undefined,
      min: type === 'likert' ? 1 : undefined,
      max: type === 'likert' ? 5 : undefined,
    };
    onAdd(newQuestion);
    onClose();
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, `Option ${options.length + 1}`]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Custom Question</h2>
            <p className="text-sm text-gray-500 mt-1">
              Adding to <span className="font-semibold text-blue-600 uppercase">{currentStage}</span> stage
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full hover:bg-gray-100">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-gray-50/30">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Question Text <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white"
              placeholder="e.g., Does the system have a rollback mechanism?"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description / Rationale <span className="text-gray-400 font-normal">(Optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none bg-white"
              placeholder="Explain why this question is important..."
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Answer Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white"
              >
                <option value="text">Open Text</option>
                <option value="multiple-choice">Multiple Choice (Radio)</option>
                <option value="checkbox">Multiple Select (Checkbox)</option>
                <option value="likert">Rating Scale (1-5)</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-xl bg-white">
              <span className="text-sm font-medium text-gray-900">Is this required?</span>
              <button
                type="button"
                onClick={() => setRequired(!required)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  required ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  required ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
          {(type === 'multiple-choice' || type === 'checkbox' || type === 'select' || type === 'radio') && (
            <div className="bg-white p-6 rounded-xl border-2 border-gray-200 animate-in slide-in-from-top-2">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Answer Options</label>
              <div className="space-y-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-3">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 outline-none text-sm"
                      placeholder={`Option ${idx + 1}`}
                      required
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Another Option
              </button>
            </div>
          )}
          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700 transition-all transform active:scale-95 hover:-translate-y-0.5"
            >
              Add Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
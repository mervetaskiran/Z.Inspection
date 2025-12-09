import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Save, Send, Plus, AlertTriangle, CheckCircle, XCircle, 
  Info, ChevronRight, ChevronLeft, Loader2 
} from 'lucide-react';

import { Project, User, Question, StageKey, QuestionType } from '../types';
import { getQuestionsByRole } from '../data/questions'; 
import { api } from '../api';

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

  const roleKey = currentUser.role.toLowerCase().replace(' ', '-') || 'admin';
  const roleColor = roleColors[roleKey] || '#3B82F6';

  const currentQuestions = useMemo(() => {
    const roleQuestions = getQuestionsByRole(roleKey);
    const allQuestions = [...roleQuestions, ...customQuestions];
    return allQuestions.filter(q => q.stage === currentStage);
  }, [roleKey, currentStage, customQuestions]);

  // --- 1. VERİ ÇEKME (FETCH DATA) ---
  useEffect(() => {
    const fetchEvaluation = async () => {
      setLoading(true);
      try {
        const response = await fetch(api(`/api/evaluations?projectId=${project._id}&userId=${currentUser._id}&stage=${currentStage}`));
        if (response.ok) {
          const data = await response.json();
          // Eğer veritabanında cevaplar varsa state'e yükle
          if (data.answers) setAnswers(data.answers);
          if (data.questionPriorities) setQuestionPriorities(data.questionPriorities); // Soru önem derecelerini yükle
          if (data.riskLevel) setRiskLevel(data.riskLevel as RiskLevel);
          // Status completed ise draft olmadığını belirt
          if (data.status === 'completed') setIsDraft(false);
        }
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
    // Her stage değişiminde soru indexini sıfırla
    setCurrentQuestionIndex(0);
  }, [currentStage, project._id, currentUser._id]);

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
          projectId: project._id,
          userId: currentUser._id,
          stage: currentStage,
          answers: answers,
          questionPriorities: questionPriorities, // Her soru için önem derecelerini kaydet
          riskLevel: riskLevel,
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
    // Zorunluluk Kontrolü
    if (activeQuestion && activeQuestion.required && !answers[activeQuestion.id]) {
      alert("Please answer this required question before proceeding.");
      return;
    }

    // 1. Sonraki Soru
    if (currentQuestions.length > 0 && !isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
    // 2. Submit (Resolve aşaması)
    else if (currentStage === 'resolve') {
      handleSubmitForm();
    }
    // 3. Sonraki Stage
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
    if (currentQuestions.length === 0) return "Next Stage";
    if (!isLastQuestion) return "Next Question";
    if (currentStage === 'resolve') return "Submit Evaluation";
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
         
         {currentStage !== 'resolve' && (
            <button
              onClick={() => setShowAddQuestion(true)}
              className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all flex items-center shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </button>
         )}
       </div>

        <div className="flex-1 flex flex-col min-h-[500px]">
            {activeQuestion ? (
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
            
            <button
                onClick={handleBack}
                disabled={currentStage === 'set-up' && isFirstQuestion}
                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all border-2 ${
                    currentStage === 'set-up' && isFirstQuestion
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
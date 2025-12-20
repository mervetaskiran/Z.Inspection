import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Save, Loader2, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { Project, User } from '../types';
import { api } from '../api';

interface GeneralQuestionsProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onComplete: () => void;
}

interface GeneralQuestion {
  id: string;
  _id?: string;
  code: string;
  principle: string; // Ethical principle name
  principleTr: string; // Turkish translation
  questionEn: string;
  questionTr: string;
  type: 'multiple-choice' | 'text';
  options?: string[];
  required?: boolean;
}

// Principle Turkish translations
const principleTranslations: Record<string, string> = {
  'TRANSPARENCY': 'Şeffaflık',
  'TRANSPARENCY & EXPLAINABILITY': 'Şeffaflık ve Açıklanabilirlik',
  'HUMAN AGENCY & OVERSIGHT': 'İnsan Özerkliği ve Gözetimi',
  'HUMAN OVERSIGHT & CONTROL': 'İnsan Gözetimi ve Kontrolü',
  'TECHNICAL ROBUSTNESS & SAFETY': 'Teknik Sağlamlık ve Güvenlik',
  'PRIVACY & DATA GOVERNANCE': 'Gizlilik ve Veri Yönetişimi',
  'PRIVACY & DATA PROTECTION': 'Gizlilik ve Veri Koruma',
  'DIVERSITY, NON-DISCRIMINATION & FAIRNESS': 'Çeşitlilik, Ayrımcılık Yapmama ve Adalet',
  'SOCIETAL & INTERPERSONAL WELL-BEING': 'Toplumsal ve Çevresel İyi Oluş',
  'ACCOUNTABILITY': 'Hesap Verebilirlik',
  'ACCOUNTABILITY & RESPONSIBILITY': 'Hesap Verebilirlik ve Sorumluluk',
  'LAWFULNESS & COMPLIANCE': 'Hukukilik ve Uyumluluk',
  'RISK MANAGEMENT & HARM PREVENTION': 'Risk Yönetimi ve Zarar Önleme',
  'PURPOSE LIMITATION & DATA MINIMIZATION': 'Amaç Sınırlaması ve Veri Minimizasyonu',
  'USER RIGHTS & AUTONOMY': 'Kullanıcı Hakları ve Özerklik'
};

export function GeneralQuestions({ project, currentUser, onBack, onComplete }: GeneralQuestionsProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [risks, setRisks] = useState<Record<string, 0 | 1 | 2 | 3 | 4>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generalQuestions, setGeneralQuestions] = useState<GeneralQuestion[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Convert backend question format to frontend format
  const convertQuestion = (q: any): GeneralQuestion => {
    const questionId = q._id?.toString() || q.code;
    let options: string[] | undefined = undefined;
    
    if (q.answerType === 'single_choice' && q.options && Array.isArray(q.options)) {
      options = q.options.map((opt: any) => {
        // Backend format: { key, label: { en, tr }, score }
        if (typeof opt === 'string') {
          return opt;
        }
        // Prefer English label, fallback to Turkish, then key
        return opt.label?.en || opt.label?.tr || opt.label || opt.key || String(opt);
      });
    }

    return {
      id: questionId,
      _id: q._id?.toString(),
      code: q.code,
      principle: q.principle,
      principleTr: principleTranslations[q.principle] || q.principle,
      questionEn: q.text?.en || q.text,
      questionTr: q.text?.tr || q.text,
      type: q.answerType === 'open_text' ? 'text' : 'multiple-choice',
      options: options,
      required: q.required !== false
    };
  };

  // Load questions from MongoDB
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        
        // Determine questionnaire key based on role
        const role = currentUser.role || 'any';
        let questionnaireKey = 'general-v1'; // Default for all roles
        
        // Role-specific questionnaires
        if (role === 'ethical-expert') {
          questionnaireKey = 'ethical-expert-v1';
        } else if (role === 'medical-expert') {
          questionnaireKey = 'medical-expert-v1';
        } else if (role === 'technical-expert') {
          questionnaireKey = 'technical-expert-v1';
        } else if (role === 'legal-expert') {
          questionnaireKey = 'legal-expert-v1';
        } else if (role === 'education-expert') {
          questionnaireKey = 'education-expert-v1';
        }
        
        // Fetch both role-specific and general questions in parallel for better performance
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const [roleResponse, generalResponse] = await Promise.all([
          fetch(api(`/api/evaluations/questions?questionnaireKey=${questionnaireKey}&role=${role}`), {
            signal: controller.signal
          }),
          fetch(api(`/api/evaluations/questions?questionnaireKey=general-v1&role=any`), {
            signal: controller.signal
          })
        ]);
        
        clearTimeout(timeoutId);
        
        let allQuestions: any[] = [];
        
        // FIRST: Add general questions (order 1-12)
        if (generalResponse.ok) {
          const generalQuestions = await generalResponse.json();
          allQuestions = [...generalQuestions];
        }
        
        // THEN: Add role-specific questions (order 13+), avoiding duplicates by code
        if (roleResponse.ok) {
          const roleQuestions = await roleResponse.json();
          const existingCodes = new Set(allQuestions.map((q: any) => q.code));
          roleQuestions.forEach((q: any) => {
            if (!existingCodes.has(q.code)) {
              allQuestions.push(q);
            }
          });
        }
        
        // Convert and sort questions
        if (allQuestions.length > 0) {
          const convertedQuestions = allQuestions.map(convertQuestion).sort((a: GeneralQuestion, b: GeneralQuestion) => {
            // Sort by order if available
            const aOrder = allQuestions.find((q: any) => (q._id?.toString() || q.code) === (a.code || a.id))?.order || 0;
            const bOrder = allQuestions.find((q: any) => (q._id?.toString() || q.code) === (b.code || b.id))?.order || 0;
            return aOrder - bOrder;
          });
          setGeneralQuestions(convertedQuestions);
          setLoading(false);
        } else {
          console.error('No questions found');
          setLoading(false);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('Request timeout - server is slow or not responding');
          alert('Sorular yüklenirken zaman aşımı oluştu. Lütfen sayfayı yenileyin.');
        } else {
          console.error('Error loading questions:', error);
          alert('Sorular yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        }
        setLoading(false);
      }
    };

    loadQuestions();
  }, [currentUser.role]);

  // Load existing answers
  useEffect(() => {
    if (generalQuestions.length === 0) return;

    const loadAnswers = async () => {
      try {
        const response = await fetch(
          api(`/api/general-questions?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}`)
        );
        if (response.ok) {
          const data = await response.json();
          // Load from principles structure if available, otherwise from flat structure
          if (data.principles) {
            const loadedAnswers: Record<string, string> = {};
            const loadedRisks: Record<string, 0 | 1 | 2 | 3 | 4> = {};
            Object.keys(data.principles).forEach(principle => {
              if (data.principles[principle].answers) {
                Object.assign(loadedAnswers, data.principles[principle].answers);
              }
              if (data.principles[principle].risks) {
                Object.keys(data.principles[principle].risks).forEach(key => {
                  const riskValue = data.principles[principle].risks[key];
                  if (riskValue >= 0 && riskValue <= 4) {
                    loadedRisks[key] = riskValue as 0 | 1 | 2 | 3 | 4;
                  }
                });
              }
            });
            
            // Map answers and risks to all possible question key formats for easier lookup
            const mappedAnswers: Record<string, string> = {};
            const mappedRisks: Record<string, 0 | 1 | 2 | 3 | 4> = {};
            
            generalQuestions.forEach(q => {
              const questionKey = getQuestionKey(q);
              // Find answer/risk by matching code, id, or _id
              const answerValue = loadedAnswers[q.code] || loadedAnswers[q.id] || loadedAnswers[q._id || ''] || loadedAnswers[questionKey];
              const riskValue = loadedRisks[q.code] !== undefined ? loadedRisks[q.code] : 
                              (loadedRisks[q.id] !== undefined ? loadedRisks[q.id] : 
                              (loadedRisks[q._id || ''] !== undefined ? loadedRisks[q._id || ''] : 
                              loadedRisks[questionKey]));
              
              if (answerValue) {
                // Store under all possible keys for reliable lookup
                mappedAnswers[q.id] = answerValue;
                mappedAnswers[questionKey] = answerValue;
                if (q.code) mappedAnswers[q.code] = answerValue;
                if (q._id) mappedAnswers[q._id] = answerValue;
              }
              
              if (riskValue !== undefined) {
                // Store under all possible keys for reliable lookup
                mappedRisks[q.id] = riskValue;
                mappedRisks[questionKey] = riskValue;
                if (q.code) mappedRisks[q.code] = riskValue;
                if (q._id) mappedRisks[q._id] = riskValue;
              }
            });
            
            // Merge with loaded answers/risks to preserve any that don't match questions
            setAnswers({ ...loadedAnswers, ...mappedAnswers });
            setRisks({ ...loadedRisks, ...mappedRisks });
          } else {
            // Fallback to flat structure
            const mappedAnswers: Record<string, string> = {};
            const mappedRisks: Record<string, 0 | 1 | 2 | 3 | 4> = {};
            
            if (data.answers) {
              generalQuestions.forEach(q => {
                const questionKey = getQuestionKey(q);
                const answerValue = data.answers[q.code] || data.answers[q.id] || data.answers[q._id || ''] || data.answers[questionKey];
                if (answerValue) {
                  mappedAnswers[q.id] = answerValue;
                  mappedAnswers[questionKey] = answerValue;
                  if (q.code) mappedAnswers[q.code] = answerValue;
                  if (q._id) mappedAnswers[q._id] = answerValue;
                }
              });
              setAnswers({ ...data.answers, ...mappedAnswers });
            }
            if (data.risks) {
              generalQuestions.forEach(q => {
                const questionKey = getQuestionKey(q);
                const riskValue = data.risks[q.code] !== undefined ? data.risks[q.code] : 
                                (data.risks[q.id] !== undefined ? data.risks[q.id] : 
                                (data.risks[q._id || ''] !== undefined ? data.risks[q._id || ''] : 
                                data.risks[questionKey]));
                if (riskValue !== undefined) {
                  mappedRisks[q.id] = riskValue;
                  mappedRisks[questionKey] = riskValue;
                  if (q.code) mappedRisks[q.code] = riskValue;
                  if (q._id) mappedRisks[q._id] = riskValue;
                }
              });
              setRisks({ ...data.risks, ...mappedRisks });
            }
          }
        }
      } catch (error) {
        console.error('Error loading general questions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnswers();
  }, [project.id, currentUser.id, generalQuestions.length]);

  const currentQuestion = generalQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === generalQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleRiskChange = (questionId: string, risk: 0 | 1 | 2 | 3 | 4) => {
    setRisks((prev) => ({ ...prev, [questionId]: risk }));
  };

  // Get question key (prefer code over id for consistency with backend)
  const getQuestionKey = (q: GeneralQuestion): string => {
    return q.code || q.id;
  };

  const isQuestionAnswered = (q: GeneralQuestion) => {
    const key = getQuestionKey(q);
    const answerValue = answers[q.id] || answers[key] || (q.code ? answers[q.code] : undefined) || (q._id ? answers[q._id] : undefined);
    const hasAnswer = Boolean(answerValue && String(answerValue).trim().length > 0);

    const riskValue =
      (risks[q.id] === 0 || risks[q.id] === 1 || risks[q.id] === 2 || risks[q.id] === 3 || risks[q.id] === 4)
        ? risks[q.id]
        : ((risks[key] === 0 || risks[key] === 1 || risks[key] === 2 || risks[key] === 3 || risks[key] === 4)
            ? risks[key]
            : ((q.code && (risks[q.code] === 0 || risks[q.code] === 1 || risks[q.code] === 2 || risks[q.code] === 3 || risks[q.code] === 4))
                ? risks[q.code]
                : (q._id && (risks[q._id] === 0 || risks[q._id] === 1 || risks[q._id] === 2 || risks[q._id] === 3 || risks[q._id] === 4)
                    ? risks[q._id]
                    : undefined)));

    const hasRisk = riskValue === 0 || riskValue === 1 || riskValue === 2 || riskValue === 3 || riskValue === 4;
    return hasAnswer && hasRisk;
  };

  const saveAnswers = async () => {
    setSaving(true);
    try {
      const projectId = project.id || (project as any)._id;
      const userId = currentUser.id || (currentUser as any)._id;

      if (!projectId || !userId) {
        throw new Error('Project ID or User ID is missing');
      }

      // Organize answers and risks by principle
      const principles: Record<string, { answers: Record<string, string>, risks: Record<string, number> }> = {};
      
      generalQuestions.forEach(q => {
        if (!principles[q.principle]) {
          principles[q.principle] = { answers: {}, risks: {} };
        }
        // Use code as key for consistency with backend
        const questionKey = getQuestionKey(q);
        // Check both id and code in answers/risks (for backward compatibility)
        const answerValue = answers[q.id] || answers[questionKey] || answers[q.code || ''];
        const riskValue = risks[q.id] !== undefined ? risks[q.id] : (risks[questionKey] !== undefined ? risks[questionKey] : risks[q.code || '']);
        
        if (answerValue) {
          principles[q.principle].answers[questionKey] = answerValue;
        }
        if (riskValue !== undefined) {
          principles[q.principle].risks[questionKey] = riskValue;
        }
      });

      const response = await fetch(api('/api/general-questions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          userId: userId,
          userRole: currentUser.role,
          principles: principles,
          answers: answers || {}, // Keep for backward compatibility
          risks: risks || {}       // Keep for backward compatibility
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save answers' }));
        throw new Error(errorData.error || 'Failed to save answers');
      }
      
      const result = await response.json();
      console.log('Successfully saved:', result);
      return true;
    } catch (error: any) {
      console.error('Error saving general questions:', error);
      alert(`Error saving answers: ${error.message || 'Please try again.'}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const questionKey = getQuestionKey(currentQuestion);
    const answerValue = answers[currentQuestion.id] || answers[questionKey] || answers[currentQuestion.code || ''];
    const riskValue = risks[currentQuestion.id] !== undefined ? risks[currentQuestion.id] : (risks[questionKey] !== undefined ? risks[questionKey] : risks[currentQuestion.code || '']);
    
    // Validate required question
    if (currentQuestion.required && !answerValue) {
      alert('Please answer this required question before proceeding.');
      return;
    }

    // Validate risk score is selected (required for all questions, must be 0-4)
    if (riskValue === undefined || riskValue === null) {
      alert('Please select a risk score (0-4) for this question before proceeding.');
      return;
    }

    // Save draft before moving forward
    await saveAnswers();

    if (isLastQuestion) {
      // Final save and complete
      const success = await saveAnswers();
      if (success) {
        onComplete();
      }
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const getCompletionPercentage = () => {
    if (generalQuestions.length === 0) return 0;
    
    const completed = generalQuestions.filter(q => {
      const questionKey = getQuestionKey(q);
      // Check all possible key formats for answer
      const hasAnswer = !!(
        answers[q.id] || 
        answers[questionKey] || 
        answers[q.code || ''] ||
        answers[q._id || '']
      );
      // Check all possible key formats for risk
      const hasRisk = (
        risks[q.id] !== undefined || 
        risks[questionKey] !== undefined || 
        risks[q.code || ''] !== undefined ||
        risks[q._id || ''] !== undefined
      );
      // Both answer and risk score are required for completion
      return hasAnswer && hasRisk;
    }).length;
    
    return Math.round((completed / generalQuestions.length) * 100);
  };

  // Check if a question is completed
  const isQuestionCompleted = (q: GeneralQuestion): boolean => {
    const questionKey = getQuestionKey(q);
    const hasAnswer = !!(
      answers[q.id] || 
      answers[questionKey] || 
      answers[q.code || ''] ||
      answers[q._id || '']
    );
    const hasRisk = (
      risks[q.id] !== undefined || 
      risks[questionKey] !== undefined || 
      risks[q.code || ''] !== undefined ||
      risks[q._id || ''] !== undefined
    );
    return hasAnswer && hasRisk;
  };

  // Navigate to a specific question
  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < generalQuestions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Update completion percentage whenever answers, risks, or questions change
  useEffect(() => {
    if (generalQuestions.length > 0) {
      const percentage = getCompletionPercentage();
      setCompletionPercentage(percentage);
    } else {
      setCompletionPercentage(0);
    }
  }, [answers, risks, generalQuestions]);

  if (loading || generalQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-500">Loading general questions...</p>
        </div>
      </div>
    );
  }

  if (generalQuestions.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <AlertTriangle className="w-10 h-10 text-yellow-600 mb-4" />
          <p className="text-gray-600">No questions found for your role.</p>
          <button
            onClick={() => {
              try {
                onBack();
              } catch (error) {
                console.error('Error in onBack:', error);
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    if (onBack && typeof onBack === 'function') {
                      onBack();
                    } else {
                      console.warn('onBack is not a function or is undefined');
                    }
                  } catch (error) {
                    console.error('Error in onBack:', error);
                    // Error is logged, parent component should handle navigation
                  }
                }} 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </button>
              <div>
                <h1 className="text-xl text-gray-900 font-bold tracking-tight">
                  Questions
                </h1>
                <p className="text-sm text-gray-600">{project.title}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium">Progress</p>
                <p className="text-sm font-bold text-gray-900">{completionPercentage}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Questions Sidebar */}
        {sidebarOpen && (
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-80px)] sticky top-[80px]">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Questions</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <div className="p-2 space-y-1">
                {generalQuestions.map((q, index) => {
                  const isCompleted = isQuestionCompleted(q);
                  const isCurrent = index === currentQuestionIndex;
                  const questionKey = getQuestionKey(q);
                  const questionNumber = index + 1;
                  
                  return (
                    <button
                      key={q.id || index}
                      onClick={() => navigateToQuestion(index)}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                        isCurrent
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-900'
                          : 'hover:bg-gray-50 border-2 border-transparent text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${
                            isCurrent ? 'border-blue-500 bg-blue-100' : 'border-gray-300'
                          }`}>
                            <span className={`text-xs font-medium flex items-center justify-center h-full ${
                              isCurrent ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              {questionNumber}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">
                          Q{questionNumber}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 truncate ${
                        isCurrent ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {q.questionEn.substring(0, 40)}...
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Show sidebar toggle button when closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-30 bg-blue-600 text-white p-3 rounded-r-lg shadow-lg hover:bg-blue-700 transition-colors"
            aria-label="Open sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full flex flex-col overflow-y-auto">
          {/* Question Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col flex-1">
            <div className="p-8 border-b border-gray-100 bg-white">
              <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full">
                Question {currentQuestionIndex + 1} of {generalQuestions.length}
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100 hover:bg-blue-100"
              >
                Q list
              </button>
              <span className="px-3 py-1 bg-purple-100 text-purple-600 text-sm font-medium rounded-full">
                {currentQuestion.principle}
              </span>
              {currentQuestion.required && (
                <span className="px-3 py-1 bg-red-50 text-red-600 text-sm font-medium rounded-full border border-red-100">
                  Required
                </span>
              )}
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-3">
              {currentQuestion.questionEn}
            </h2>
            <p className="text-lg text-gray-600 italic mb-2">
              {currentQuestion.questionTr}
            </p>
            <p className="text-sm text-gray-500">
              Principle: {currentQuestion.principleTr}
            </p>
          </div>

          <div className="p-8 flex-1 bg-gray-50/30">
            {currentQuestion.type === 'multiple-choice' && (
              <div className="space-y-3 max-w-2xl">
                {currentQuestion.options?.map((option, idx) => {
                  const questionKey = getQuestionKey(currentQuestion);
                  const optionValue = typeof option === 'string' ? option : option;
                  const optionLabel = typeof option === 'string' ? option : option;
                  const answerValue = answers[currentQuestion.id] || answers[questionKey] || answers[currentQuestion.code || ''];
                  const isSelected = answerValue === optionValue || answerValue === optionLabel;
                  return (
                    <label
                      key={idx}
                      className={`group flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300 group-hover:border-blue-400'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <input
                        type="radio"
                        name={getQuestionKey(currentQuestion)}
                        value={optionValue}
                        checked={isSelected}
                        onChange={(e) => {
                          const questionKey = getQuestionKey(currentQuestion);
                          handleAnswerChange(questionKey, e.target.value);
                          // Also update by id for backward compatibility
                          if (currentQuestion.id !== questionKey) {
                            handleAnswerChange(currentQuestion.id, e.target.value);
                          }
                        }}
                        className="hidden"
                      />
                      <span
                        className={`text-lg font-medium transition-colors ${
                          isSelected ? 'text-blue-900' : 'text-gray-700'
                        }`}
                      >
                        {optionLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <div className="relative max-w-3xl">
                <textarea
                  value={(() => {
                    const questionKey = getQuestionKey(currentQuestion);
                    return answers[currentQuestion.id] || answers[questionKey] || answers[currentQuestion.code || ''] || '';
                  })()}
                  onChange={(e) => {
                    const questionKey = getQuestionKey(currentQuestion);
                    handleAnswerChange(questionKey, e.target.value);
                    // Also update by id for backward compatibility
                    if (currentQuestion.id !== questionKey) {
                      handleAnswerChange(currentQuestion.id, e.target.value);
                    }
                  }}
                  rows={8}
                  className="w-full px-5 py-4 text-lg text-gray-800 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none placeholder-gray-400 bg-white"
                  placeholder="Type your answer here..."
                />
              </div>
            )}

            {/* Risk Score Selection (0-4) */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Risk Score for This Question</h3>
                <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">
                  Required
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3 max-w-4xl">
                {([
                  { value: 4, label: 'Excellent', labelTr: 'Mükemmel', desc: 'Clear understanding, high confidence', color: 'green' },
                  { value: 3, label: 'Good', labelTr: 'İyi', desc: 'Minor gaps but generally appropriate', color: 'blue' },
                  { value: 2, label: 'Moderate', labelTr: 'Orta', desc: 'Basic awareness, notable gaps', color: 'yellow' },
                  { value: 1, label: 'Poor', labelTr: 'Zayıf', desc: 'Significant misunderstanding, low confidence', color: 'orange' },
                  { value: 0, label: 'Unacceptable', labelTr: 'Kabul Edilemez', desc: 'No awareness, serious risk', color: 'red' }
                ] as const).map(({ value, label, labelTr, desc, color }) => {
                  const questionKey = getQuestionKey(currentQuestion);
                  // Get risk value - check all possible keys (same logic as working buttons 4, 3, 2)
                  let riskValue: number | undefined = undefined;
                  
                  // Check all possible keys - handle 0 and 1 correctly
                  if (currentQuestion.id !== undefined) {
                    const idVal = risks[currentQuestion.id];
                    if (idVal !== undefined && idVal !== null && typeof idVal === 'number' && idVal >= 0 && idVal <= 4) {
                      riskValue = idVal;
                    }
                  }
                  
                  if (riskValue === undefined) {
                    const keyVal = risks[questionKey];
                    if (keyVal !== undefined && keyVal !== null && typeof keyVal === 'number' && keyVal >= 0 && keyVal <= 4) {
                      riskValue = keyVal;
                    }
                  }
                  
                  if (riskValue === undefined && currentQuestion.code !== undefined) {
                    const codeVal = risks[currentQuestion.code];
                    if (codeVal !== undefined && codeVal !== null && typeof codeVal === 'number' && codeVal >= 0 && codeVal <= 4) {
                      riskValue = codeVal;
                    }
                  }
                  
                  // Use explicit type check and equality (same as working buttons 4, 3, 2)
                  const isSelected = typeof riskValue === 'number' && riskValue === value;
                  
                  const colorClasses = {
                    green: isSelected ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30',
                    blue: isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30',
                    yellow: isSelected ? 'border-yellow-500 bg-yellow-50 shadow-md' : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50/30',
                    orange: isSelected ? 'border-orange-500 bg-orange-200 shadow-md' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50',
                    red: isSelected ? 'border-red-500 bg-red-200 shadow-md' : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                  };
                  const bgColorClasses = {
                    green: isSelected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400',
                    blue: isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400',
                    yellow: isSelected ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400',
                    orange: isSelected ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-400',
                    red: isSelected ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                  };
                  return (
                    <label
                      key={value}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${colorClasses[color]}`}
                    >
                      <input
                        type="radio"
                        name={`risk-${getQuestionKey(currentQuestion)}`}
                        value={value}
                        checked={isSelected}
                        onChange={() => {
                          const questionKey = getQuestionKey(currentQuestion);
                          const riskValue = value as 0 | 1 | 2 | 3 | 4;
                          console.log(`🔵 Setting risk for question ${questionKey} to ${riskValue}`, {
                            questionKey,
                            questionId: currentQuestion.id,
                            questionCode: currentQuestion.code,
                            riskValue,
                            value,
                            currentRisks: risks
                          });
                          // Update state directly (same as working buttons 4, 3, 2)
                          setRisks((prev) => {
                            const updated = { ...prev };
                            updated[questionKey] = riskValue;
                            if (currentQuestion.id) {
                              updated[currentQuestion.id] = riskValue;
                            }
                            if (currentQuestion.code && currentQuestion.code !== questionKey) {
                              updated[currentQuestion.code] = riskValue;
                            }
                            console.log('✅ Updated risks state:', updated);
                            return updated;
                          });
                        }}
                        className="hidden"
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${bgColorClasses[color]}`}>
                        <span className="text-lg font-bold">{value}</span>
                      </div>
                      <span className={`text-xs font-bold text-center ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                        {label}
                      </span>
                      <span className={`text-xs text-center mt-1 ${isSelected ? 'text-gray-700' : 'text-gray-500'}`}>{labelTr}</span>
                      <span className={`text-xs text-center mt-1 leading-tight ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>{desc}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 mt-8 flex justify-between items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={handleBack}
            className="flex items-center px-6 py-3 rounded-xl font-semibold transition-all border-2 text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> {isFirstQuestion ? 'Back' : 'Previous'}
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={saveAnswers}
              disabled={saving}
              className="px-6 py-3 bg-indigo-50 border-2 border-indigo-100 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-100 hover:border-indigo-200 transition-all flex items-center"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center px-8 py-3 text-white rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700"
            >
              {isLastQuestion ? 'Complete' : 'Next Question'}{' '}
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}


import React, { useState, useMemo, useEffect, useCallback, useRef, FormEvent } from 'react';
import { 
  ArrowLeft, Save, Send, Plus, AlertTriangle, CheckCircle, XCircle, 
  Info, ChevronRight, ChevronLeft, Loader2, Trash2, Upload, X
} from 'lucide-react';

import { Project, User, Question, StageKey, QuestionType, UseCase, EthicalPrinciple, Tension, QuestionOption } from '../types';
import { getQuestionsByRole } from '../data/questions'; 
import { api } from '../api';
import { EthicalTensionSelector } from './EthicalTensionSelector';
import { fetchUserProgress } from '../utils/userProgress';

interface EvaluationFormProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onSubmit: () => void;
}

type RiskLevel = 'low' | 'medium' | 'high';

const QUESTION_PRINCIPLES: Array<{ value: string; label: string }> = [
  { value: 'TRANSPARENCY', label: 'Transparency (Şeffaflık)' },
  { value: 'HUMAN AGENCY & OVERSIGHT', label: 'Human Agency & Oversight (İnsan Özerkliği ve Gözetimi)' },
  { value: 'TECHNICAL ROBUSTNESS & SAFETY', label: 'Technical Robustness & Safety (Teknik Sağlamlık ve Güvenlik)' },
  { value: 'PRIVACY & DATA GOVERNANCE', label: 'Privacy & Data Governance (Gizlilik ve Veri Yönetişimi)' },
  { value: 'DIVERSITY, NON-DISCRIMINATION & FAIRNESS', label: 'Diversity, Non-Discrimination & Fairness (Adalet)' },
  { value: 'SOCIETAL & INTERPERSONAL WELL-BEING', label: 'Societal & Interpersonal Well-Being (Toplumsal İyi Oluş)' },
  { value: 'ACCOUNTABILITY', label: 'Accountability (Hesap Verebilirlik)' },
];

const roleColors: Record<string, string> = {
  'admin': '#1F2937',
  'ethical-expert': '#1E40AF',
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED',
  'technical-expert': '#0891B2',
  'legal-expert': '#B45309'
};

const riskSeverityOptions = [
  { value: 'low', label: 'Low', className: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'high', label: 'High', className: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'critical', label: 'Critical', className: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const getScoreClasses = (value: number, selected: number | null | undefined) => {
  // Explicitly check if selected is a number (including 0) and equals value
  // This handles 0 and 1 correctly - use same logic as GeneralQuestions
  const isSelected = selected !== null && selected !== undefined && typeof selected === 'number' && selected === value;

  if (!isSelected) {
    return 'border-gray-200 bg-white hover:bg-gray-50';
  }

  // Use same color scheme as GeneralQuestions for consistency
  switch (value) {
    case 4:
      return 'border-green-500 bg-green-50 shadow-md';
    case 3:
      return 'border-blue-500 bg-blue-50 shadow-md';
    case 2:
      return 'border-yellow-500 bg-yellow-50 shadow-md';
    case 1:
      return 'border-orange-500 bg-orange-200 shadow-md';
    case 0:
      return 'border-red-500 bg-red-200 shadow-md';
    default:
      return '';
  }
};

export function EvaluationForm({ project, currentUser, onBack, onSubmit }: EvaluationFormProps) {
  // Projenin mevcut stage'ini başlangıç değeri olarak alabiliriz veya 'set-up' ile başlatabiliriz.
  // Ancak kullanıcının kaldığı yerden devam etmesi için 'set-up' ile başlatıp veriyi çekmek daha güvenli.
  const [currentStage, setCurrentStage] = useState<StageKey>('set-up');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questionPriorities, setQuestionPriorities] = useState<Record<string, RiskLevel>>({}); // Her soru için önem derecesi
  const [riskScores, setRiskScores] = useState<Record<string, 0 | 1 | 2 | 3 | 4>>({}); // Her soru için risk skoru (0-4)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [loadedQuestions, setLoadedQuestions] = useState<Question[]>([]); // Questions loaded from MongoDB
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [loading, setLoading] = useState(false); // Yükleniyor durumu
  const [saving, setSaving] = useState(false);   // Kaydediliyor durumu
  const [pendingFocusQuestionId, setPendingFocusQuestionId] = useState<string | null>(null);
  const [linkedUseCase, setLinkedUseCase] = useState<UseCase | null>(null);
  const [generalRisks, setGeneralRisks] = useState<Array<{ id: string; title: string; description: string; severity?: 'low' | 'medium' | 'high' | 'critical'; relatedQuestions?: string[] }>>([]);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [editingRiskIdReview, setEditingRiskIdReview] = useState<string | null>(null);
  const [tensions, setTensions] = useState<Tension[]>([]);
  const [editingTensionId, setEditingTensionId] = useState<string | null>(null);
  const [votingTensionId, setVotingTensionId] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<number>(0); // Backend'den gelen progress
  const [hasFetchedProgress, setHasFetchedProgress] = useState<boolean>(false); // Backend'den progress fetch edildi mi?
  const [hasLoadedResponses, setHasLoadedResponses] = useState<boolean>(false); // MongoDB responses loaded flag
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true); // Track initial load to prevent state reset
  const resumeInitializedRef = useRef<boolean>(false); // Prevent resume logic from running multiple times
  const [resumeQuestionCode, setResumeQuestionCode] = useState<string | null>(null); // Question code to resume at
  const [resumeComplete, setResumeComplete] = useState<boolean>(false); // Track if resume logic has completed
  
  // Reset resume state when project or user changes (component remounts)
  useEffect(() => {
    console.log('🔄 EvaluationForm mounted/updated:', { 
      projectId: project.id || (project as any)._id, 
      userId: currentUser.id || (currentUser as any)._id,
      project: project,
      currentUser: currentUser
    });
    // Reset resume state when project/user changes
    resumeInitializedRef.current = false;
    setIsInitialLoad(true);
    setResumeComplete(false);
    setHasLoadedResponses(false);
    setResumeQuestionCode(null);
    setLoadedQuestions([]);
    console.log('🔄 Reset resume state - isInitialLoad set to true');
  }, [project.id, currentUser.id]);
  
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

  const getOptionValue = (option: QuestionOption) => typeof option === 'string' ? option : option.value;
  const getOptionLabel = (option: QuestionOption) => typeof option === 'string' ? option : option.label;

  const isQuestionAnswered = (questionId: string) => {
    const v = answers[questionId];
    if (v === undefined || v === null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    // numbers/objects count as answered (risk/likert/etc.)
    return true;
  };

  const currentQuestions = useMemo(() => {
    // Use loaded questions from MongoDB if available, otherwise fall back to hardcoded
    const roleQuestions = loadedQuestions.length > 0 ? loadedQuestions : getQuestionsByRole(roleKey);
    const allQuestions = [...roleQuestions, ...customQuestions];
    return allQuestions.filter(q => q.stage === currentStage);
  }, [roleKey, currentStage, customQuestions, loadedQuestions]);

  // Assess stage'indeki tüm soruları almak için
  const assessQuestions = useMemo(() => {
    const roleQuestions = getQuestionsByRole(roleKey);
    const allQuestions = [...roleQuestions, ...customQuestions];
    return allQuestions.filter(q => q.stage === 'assess');
  }, [roleKey, customQuestions]);

  // Helper function to determine questionnaireKey from role
  const getQuestionnaireKeyForRole = (role: string): string => {
    const roleLower = role.toLowerCase();
    if (roleLower === 'ethical-expert') return 'ethical-expert-v1';
    if (roleLower === 'medical-expert') return 'medical-expert-v1';
    if (roleLower === 'technical-expert') return 'technical-expert-v1';
    if (roleLower === 'legal-expert') return 'legal-expert-v1';
    return 'general-v1';
  };

  // Helper function to map Response answer to local state format
  const mapResponseAnswerToLocalState = (responseAnswer: any): { answer: any; priority?: RiskLevel; riskScore?: 0 | 1 | 2 | 3 | 4 } => {
    const result: { answer: any; priority?: RiskLevel; riskScore?: 0 | 1 | 2 | 3 | 4 } = { answer: null };
    
    // Check if answer exists and is not null/empty
    if (!responseAnswer) {
      return result;
    }

    const answerData = responseAnswer.answer;
    
    // Check if answer is null, undefined, or empty object
    if (!answerData || (typeof answerData === 'object' && Object.keys(answerData).length === 0)) {
      return result;
    }
    
    // Map answer based on type
    if (answerData.choiceKey !== undefined && answerData.choiceKey !== null && answerData.choiceKey !== '') {
      result.answer = answerData.choiceKey;
    } else if (answerData.text !== undefined && answerData.text !== null && answerData.text !== '') {
      result.answer = answerData.text;
    } else if (answerData.numeric !== undefined && answerData.numeric !== null) {
      result.answer = answerData.numeric;
    } else if (answerData.multiChoiceKeys && Array.isArray(answerData.multiChoiceKeys) && answerData.multiChoiceKeys.length > 0) {
      result.answer = answerData.multiChoiceKeys;
    }

    // Map risk score (score in Response is 0-4, which maps to riskScores)
    // Only map if it's a valid score (not the default 2 for unanswered)
    if (responseAnswer.score !== undefined && responseAnswer.score !== null) {
      result.riskScore = responseAnswer.score as 0 | 1 | 2 | 3 | 4;
    }

    return result;
  };

  // Helper function to check if an answer is unanswered
  const isAnswerUnanswered = (answer: any): boolean => {
    if (!answer || typeof answer !== 'object') return true;
    
    // Check for choiceKey
    if (answer.choiceKey !== undefined && answer.choiceKey !== null && answer.choiceKey !== '') {
      return false;
    }
    
    // Check for text
    if (answer.text !== undefined && answer.text !== null && typeof answer.text === 'string' && answer.text.trim().length > 0) {
      return false;
    }
    
    // Check for numeric
    if (answer.numeric !== undefined && answer.numeric !== null && typeof answer.numeric === 'number') {
      return false;
    }
    
    // Check for multiChoiceKeys
    if (answer.multiChoiceKeys && Array.isArray(answer.multiChoiceKeys) && answer.multiChoiceKeys.length > 0) {
      return false;
    }
    
    return true;
  };

  // Helper function to map questionnaireKey to stage
  const getStageForQuestionnaire = (questionnaireKey: string): StageKey => {
    // general-v1 is set-up stage, role-specific questionnaires are assess stage
    if (questionnaireKey === 'general-v1') {
      return 'set-up';
    }
    return 'assess';
  };

  // Resume logic: Load responses and determine where to resume
  useEffect(() => {
    // Always log to see if useEffect is triggered
    console.log('🔍 Resume logic useEffect triggered:', { 
      resumeInitialized: resumeInitializedRef.current, 
      isInitialLoad,
      projectId: project?.id || (project as any)?._id,
      userId: currentUser?.id || (currentUser as any)?._id,
      hasProject: !!project,
      hasUser: !!currentUser
    });
    
    // Check conditions
    if (resumeInitializedRef.current) {
      console.log('⏭️ Resume logic skipped: already initialized');
      return;
    }
    
    if (!isInitialLoad) {
      console.log('⏭️ Resume logic skipped: isInitialLoad is false');
      return;
    }
    
    if (!project || (!project.id && !(project as any)._id)) {
      console.log('⏭️ Resume logic skipped: project is missing or has no id');
      return;
    }
    
    if (!currentUser || (!currentUser.id && !(currentUser as any)._id)) {
      console.log('⏭️ Resume logic skipped: currentUser is missing or has no id');
      return;
    }
    
    console.log('🚀 Starting resume logic...');
    const resumeEvaluation = async () => {
      try {
        setLoading(true);
        resumeInitializedRef.current = true;
        console.log('📡 Resume logic: Fetching data...');
        
        const projectId = project.id || (project as any)._id;
        const userId = currentUser.id || (currentUser as any)._id;
        const role = currentUser.role || 'any';
        
        // Step 1: Fetch projectassignments to get assigned questionnaires
        let assignedQuestionnaires: string[] = [];
        try {
          const assignmentResponse = await fetch(
            api(`/api/project-assignments?userId=${userId}`)
          );
          if (assignmentResponse.ok) {
            const assignments = await assignmentResponse.json();
            const assignment = assignments.find((a: any) => 
              String(a.projectId) === String(projectId)
            );
            if (assignment && assignment.questionnaires && Array.isArray(assignment.questionnaires)) {
              assignedQuestionnaires = assignment.questionnaires;
              // Ensure general-v1 is included if not already present
              if (!assignedQuestionnaires.includes('general-v1')) {
                assignedQuestionnaires.unshift('general-v1');
              }
            }
          }
        } catch (error) {
          console.error('Error fetching project assignments:', error);
        }
        
        // Fallback: if no assignments found, use role-based logic
        if (assignedQuestionnaires.length === 0) {
          const roleQuestionnaireKey = getQuestionnaireKeyForRole(role);
          assignedQuestionnaires = roleQuestionnaireKey !== 'general-v1' 
            ? ['general-v1', roleQuestionnaireKey]
            : ['general-v1'];
        }
        
        console.log('📋 Assigned questionnaires:', assignedQuestionnaires);
        
        // Step 2: Fetch responses for all assigned questionnaires
        const responsePromises = assignedQuestionnaires.map(async (questionnaireKey) => {
          try {
            const response = await fetch(
              api(`/api/evaluations/responses?projectId=${projectId}&userId=${userId}&questionnaireKey=${questionnaireKey}`)
            );
            if (response.ok) {
              const data = await response.json();
              return { questionnaireKey, response: data };
            }
            return { questionnaireKey, response: null };
          } catch (error) {
            console.error(`Error fetching response for ${questionnaireKey}:`, error);
            return { questionnaireKey, response: null };
          }
        });
        
        const responses = await Promise.all(responsePromises);
        
        // Step 3: Fetch questions for each questionnaire to understand order
        const questionsByQuestionnaire: Record<string, any[]> = {};
        const allLoadedQuestions: Question[] = [];
        const questionsPromises = assignedQuestionnaires.map(async (questionnaireKey) => {
          try {
            const questionsResponse = await fetch(
              api(`/api/evaluations/questions?questionnaireKey=${questionnaireKey}&role=${role}`)
            );
            if (questionsResponse.ok) {
              const questions = await questionsResponse.json();
              // Sort by order field
              questions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              questionsByQuestionnaire[questionnaireKey] = questions;
              
              // Convert backend questions to frontend Question format
              const stage = getStageForQuestionnaire(questionnaireKey);
              questions.forEach((q: any) => {
                const frontendQuestion: Question = {
                  id: q._id ? String(q._id) : q.code,
                  _id: q._id,
                  code: q.code,
                  text: typeof q.text === 'object' ? (q.text.en || q.text.tr || '') : q.text || '',
                  stage: stage,
                  type: q.answerType === 'single_choice' ? 'radio' : 
                        q.answerType === 'multi_choice' ? 'checkbox' :
                        q.answerType === 'open_text' ? 'text' :
                        q.answerType === 'numeric' ? 'text' : 'text', // numeric maps to text for now
                  required: q.required !== false,
                  options: q.options ? q.options.map((opt: any) => ({
                    value: opt.key,
                    label: typeof opt.label === 'object' ? (opt.label.en || opt.label.tr || '') : opt.label || ''
                  })) : undefined,
                  description: q.description ? (typeof q.description === 'object' ? (q.description.en || q.description.tr || '') : q.description) : undefined
                };
                allLoadedQuestions.push(frontendQuestion);
              });
            }
          } catch (error) {
            console.error(`Error fetching questions for ${questionnaireKey}:`, error);
            questionsByQuestionnaire[questionnaireKey] = [];
          }
        });
        await Promise.all(questionsPromises);
        
        // Set loaded questions for frontend use
        setLoadedQuestions(allLoadedQuestions);
        
        // Step 4: Determine which questionnaire to open (first unfinished)
        let resumeQuestionnaireKey: string | null = null;
        let resumeQuestionIndex: number = 0;
        let resumeStage: StageKey = 'set-up';
        
        for (const questionnaireKey of assignedQuestionnaires) {
          const response = responses.find(r => r.questionnaireKey === questionnaireKey);
          const questions = questionsByQuestionnaire[questionnaireKey] || [];
          
          // Check if questionnaire is unfinished
          const stage = getStageForQuestionnaire(questionnaireKey);
          const isUnfinished = !response || 
            !response.response || 
            response.response.status !== 'submitted' ||
            (response.response.answers && response.response.answers.some((ans: any) => {
              const answerUnanswered = isAnswerUnanswered(ans.answer);
              // For assess stage, also check if risk score is missing (score === 0 is valid, so check for undefined/null)
              if (stage === 'assess' && !answerUnanswered) {
                // Answer exists, but check if score is missing (undefined or null, but 0 is valid)
                const scoreMissing = ans.score === undefined || ans.score === null;
                return scoreMissing;
              }
              return answerUnanswered;
            }));
          
          if (isUnfinished) {
            resumeQuestionnaireKey = questionnaireKey;
            resumeStage = getStageForQuestionnaire(questionnaireKey);
            
            // Step 5: Find first unanswered question index and questionCode
            // Use MongoDB response.answers array directly to check which questions are answered
            let resumeCode: string | null = null;
            const responseAnswers = response && response.response && response.response.answers ? response.response.answers : [];
            console.log(`📊 Questionnaire ${questionnaireKey}: Found ${responseAnswers.length} answers in MongoDB response`);
            
            if (responseAnswers.length > 0) {
              // Create a map of questionCode to answer for quick lookup
              const answerMap = new Map<string, any>();
              responseAnswers.forEach((ans: any) => {
                if (ans.questionCode) {
                  answerMap.set(ans.questionCode, ans);
                }
              });
              
              console.log(`📊 Answer map has ${answerMap.size} entries for ${questions.length} questions`);
              
              // Find first unanswered question by iterating through questions in order
              for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                const answer = answerMap.get(question.code);
                
                const answerUnanswered = !answer || isAnswerUnanswered(answer.answer);
                // For assess stage, also check if risk score is missing
                let needsResume = answerUnanswered;
                if (!answerUnanswered && resumeStage === 'assess') {
                  // Answer exists, but check if score is missing (undefined or null, but 0 is valid)
                  needsResume = answer.score === undefined || answer.score === null;
                }
                
                if (needsResume) {
                  resumeQuestionIndex = i;
                  resumeCode = question.code;
                  console.log(`📍 Found first unanswered question at index ${i}: ${question.code}`);
                  break;
                }
              }
              
              // If all questions are answered, go to last question
              if (resumeCode === null && questions.length > 0) {
                console.log(`✅ All questions appear to be answered, going to last question`);
                resumeQuestionIndex = questions.length - 1;
                resumeCode = questions[questions.length - 1].code;
              }
            } else {
              // No responses yet, start at first question
              console.log(`📝 No answers found, starting at first question`);
              resumeQuestionIndex = 0;
              if (questions.length > 0) {
                resumeCode = questions[0].code;
              }
            }
            
            console.log(`🎯 Resume position: index=${resumeQuestionIndex}, code=${resumeCode}`);
            setResumeQuestionCode(resumeCode);
            
            break; // Found first unfinished questionnaire, stop searching
          }
        }
        
        // If all questionnaires are finished, use the last one
        if (!resumeQuestionnaireKey && assignedQuestionnaires.length > 0) {
          resumeQuestionnaireKey = assignedQuestionnaires[assignedQuestionnaires.length - 1];
          resumeStage = getStageForQuestionnaire(resumeQuestionnaireKey);
          const questions = questionsByQuestionnaire[resumeQuestionnaireKey] || [];
          resumeQuestionIndex = questions.length > 0 ? questions.length - 1 : 0;
          if (questions.length > 0) {
            setResumeQuestionCode(questions[questions.length - 1].code);
          }
        }
        
        // Step 6: Load all answers into state using loadedQuestions
        const loadedAnswers: Record<string, any> = {};
        const loadedPriorities: Record<string, RiskLevel> = {};
        const loadedRiskScores: Record<string, 0 | 1 | 2 | 3 | 4> = {};
        
        responses.forEach(({ response }) => {
          if (response && response.answers && Array.isArray(response.answers)) {
            console.log(`📝 Loading ${response.answers.length} answers from response`);
            response.answers.forEach((responseAnswer: any) => {
              if (!responseAnswer.questionCode) return;
              
              // Find question by code in loadedQuestions (MongoDB questions)
              const question = allLoadedQuestions.find(q => 
                q.code === responseAnswer.questionCode || 
                q.id === responseAnswer.questionCode ||
                (q._id && String(q._id) === String(responseAnswer.questionId))
              );
              
              if (!question) {
                console.warn(`⚠️ Question not found for code: ${responseAnswer.questionCode}`);
                return;
              }
              
              const questionKey = question.id;
              const mapped = mapResponseAnswerToLocalState(responseAnswer);
              
              if (mapped.answer !== null && mapped.answer !== undefined && mapped.answer !== '') {
                loadedAnswers[questionKey] = mapped.answer;
              }
              
              if (mapped.riskScore !== undefined) {
                loadedRiskScores[questionKey] = mapped.riskScore;
              }
            });
          }
        });
        
        console.log(`📊 Loaded ${Object.keys(loadedAnswers).length} answers, ${Object.keys(loadedRiskScores).length} risk scores`);
        
        // Update state
        if (Object.keys(loadedAnswers).length > 0 || Object.keys(loadedRiskScores).length > 0) {
          setAnswers(prev => ({ ...prev, ...loadedAnswers }));
          setQuestionPriorities(prev => ({ ...prev, ...loadedPriorities }));
          setRiskScores(prev => ({ ...prev, ...loadedRiskScores }));
        }
        
        // Step 7: Calculate resume position BEFORE setting state
        let finalResumeIndex = 0;
        if (resumeQuestionnaireKey && resumeQuestionCode && allLoadedQuestions.length > 0) {
          // Filter questions by stage to get the correct index
          const stageQuestions = allLoadedQuestions.filter(q => q.stage === resumeStage);
          const resumeIndexInStage = stageQuestions.findIndex(q => 
            q.code === resumeQuestionCode || 
            q.id === resumeQuestionCode ||
            (q._id && String(q._id) === resumeQuestionCode)
          );
          
          if (resumeIndexInStage !== -1) {
            finalResumeIndex = resumeIndexInStage;
            console.log(`✅ Resuming at questionnaire: ${resumeQuestionnaireKey}, stage: ${resumeStage}, question code: ${resumeQuestionCode}`);
            console.log(`📊 Total loaded questions: ${allLoadedQuestions.length}, stage questions: ${stageQuestions.length}, resume index: ${finalResumeIndex}`);
            console.log(`📊 Answers loaded: ${Object.keys(loadedAnswers).length}, risk scores: ${Object.keys(loadedRiskScores).length}`);
          } else {
            console.warn(`⚠️ Resume question not found in stage questions, using backend index: ${resumeQuestionIndex}`);
            finalResumeIndex = resumeQuestionIndex;
          }
        } else if (resumeQuestionnaireKey && resumeQuestionCode) {
          console.log(`⚠️ Questions not loaded yet, using backend index: ${resumeQuestionIndex}`);
          finalResumeIndex = resumeQuestionIndex;
        }
        
        // Set all state updates together
        setLoadedQuestions(allLoadedQuestions);
        if (resumeQuestionnaireKey && resumeQuestionCode) {
          setCurrentStage(resumeStage);
          // Keep resumeQuestionCode so useEffect can find the index
          // useEffect will clear it after using
        }
        
        setHasLoadedResponses(true);
        setIsInitialLoad(false);
        setResumeComplete(true);
        
      } catch (error) {
        console.error("Error in resume logic:", error);
        setIsInitialLoad(false);
        setResumeComplete(true); // Mark as complete even on error to allow fallback
      } finally {
        setLoading(false);
      }
    };
    
    resumeEvaluation();
  }, [project, currentUser]); // Use full objects to ensure useEffect runs when component mounts

  // --- 1. VERİ ÇEKME (FETCH DATA) ---
  useEffect(() => {
    // Skip if we've already loaded from MongoDB responses
    if (hasLoadedResponses) {
      // Still fetch legacy evaluation data for generalRisks and other metadata
      const fetchLegacyData = async () => {
        try {
          const response = await fetch(api(`/api/evaluations?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}&stage=${currentStage}`));
          if (response.ok) {
            const data = await response.json();
            // Only load generalRisks and riskLevel from legacy endpoint
            if (data.riskLevel) setRiskLevel(data.riskLevel as RiskLevel);
            if (data.generalRisks && Array.isArray(data.generalRisks)) {
              setGeneralRisks(data.generalRisks.map((r: any) => ({
                ...r,
                severity: r.severity || 'medium',
                relatedQuestions: r.relatedQuestions || []
              })));
            } else if (currentStage === 'set-up') {
              setGeneralRisks([]);
            }
            if (data.status === 'completed') setIsDraft(false);
          }
        } catch (error) {
          console.error("Legacy data fetch error:", error);
        }
      };
      fetchLegacyData();
      return;
    }

    const fetchEvaluation = async () => {
      setLoading(true);
      try {
        const response = await fetch(api(`/api/evaluations?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}&stage=${currentStage}`));
        if (response.ok) {
          const data = await response.json();
          // Only load if we haven't loaded from MongoDB responses yet
          if (!hasLoadedResponses) {
            if (data.answers) setAnswers(data.answers);
            if (data.questionPriorities) setQuestionPriorities(data.questionPriorities);
            if (data.riskScores) setRiskScores(data.riskScores);
          }
          if (data.riskLevel) setRiskLevel(data.riskLevel as RiskLevel);
          // Custom questions (persisted)
          if (Array.isArray(data.customQuestions)) {
            setCustomQuestions((prev) => {
              const others = prev.filter((q) => q.stage !== currentStage);
              const merged = new Map<string, any>();
              for (const q of others) merged.set(q.id, q);
              for (const q of data.customQuestions) {
                if (q && q.id) merged.set(q.id, q);
              }
              return Array.from(merged.values());
            });
          }
          // Genel riskleri yükle - eğer veritabanında varsa yükle
          if (data.generalRisks && Array.isArray(data.generalRisks)) {
            setGeneralRisks(data.generalRisks.map((r: any) => ({
              ...r,
              severity: r.severity || 'medium',
              relatedQuestions: r.relatedQuestions || []
            })));
          } else if (currentStage === 'set-up') {
            setGeneralRisks([]);
          }
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
              setGeneralRisks(data.generalRisks.map((r: any) => ({
                ...r,
                severity: r.severity || 'medium',
                relatedQuestions: r.relatedQuestions || []
              })));
            } else {
              setGeneralRisks([]);
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

    if (!hasLoadedResponses) {
      fetchEvaluation();
    }
    fetchUseCase();
    fetchSetUpRisks();
  }, [currentStage, project.id, currentUser.id, project.useCase, showReviewScreen, hasLoadedResponses]);

  // If a new question is added while on Review, jump user back to that question.
  useEffect(() => {
    if (!pendingFocusQuestionId) return;
    const idx = currentQuestions.findIndex((q) => q.id === pendingFocusQuestionId);
    if (idx >= 0) {
      setShowReviewScreen(false);
      setCurrentQuestionIndex(idx);
      setPendingFocusQuestionId(null);
    }
  }, [pendingFocusQuestionId, currentQuestions]);

  const addCustomQuestion = async (question: Question) => {
    try {
      const projectId = project.id || (project as any)._id;
      const userId = currentUser.id || (currentUser as any)._id;
      const res = await fetch(api('/api/evaluations/custom-questions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          stage: question.stage,
          question,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to save custom question');
      }
      const data = await res.json();
      const saved: Question = data?.question || question;

      setCustomQuestions((prev) => {
        const map = new Map(prev.map((q) => [q.id, q] as const));
        map.set(saved.id, saved);
        return Array.from(map.values());
      });
      setPendingFocusQuestionId(saved.id);
      setIsDraft(true);
    } catch (e) {
      console.error('Custom question save error:', e);
      // Fallback: still add locally so user doesn't lose work
      setCustomQuestions((prev) => {
        const map = new Map(prev.map((q) => [q.id, q] as const));
        map.set(question.id, question);
        return Array.from(map.values());
      });
      setPendingFocusQuestionId(question.id);
      setIsDraft(true);
    }
  };

  // Cevaplar ve sorular yüklendikten sonra cevaplanmamış ilk soruyu bul
  useEffect(() => {
    if (!resumeComplete || !hasLoadedResponses || loadedQuestions.length === 0 || !resumeQuestionCode) {
      if (!resumeComplete) console.log('⏳ Waiting for resume to complete...');
      if (!hasLoadedResponses) console.log('⏳ Waiting for responses to load...');
      if (loadedQuestions.length === 0) console.log('⏳ Waiting for questions to load...');
      if (!resumeQuestionCode) console.log('⏳ Waiting for resume question code...');
      return;
    }
    
    // Wait for currentQuestions to be updated with loadedQuestions
    if (currentQuestions.length === 0) {
      console.log('⏳ Waiting for currentQuestions to be populated...');
      return;
    }
    
    console.log(`🔍 Looking for resume question code: ${resumeQuestionCode}`);
    console.log(`🔍 Current questions (${currentQuestions.length}):`, currentQuestions.map(q => ({ code: q.code, id: q.id, stage: q.stage })));
    console.log(`🔍 Current stage: ${currentStage}`);
    
    // Find resume question in currentQuestions
    const resumeIndex = currentQuestions.findIndex(q => 
      q.code === resumeQuestionCode || 
      q.id === resumeQuestionCode ||
      (q._id && String(q._id) === resumeQuestionCode)
    );
    
    if (resumeIndex !== -1) {
      console.log(`✅ Resuming at question code: ${resumeQuestionCode}, index: ${resumeIndex} (out of ${currentQuestions.length} questions in ${currentStage} stage)`);
      setCurrentQuestionIndex(resumeIndex);
      setResumeQuestionCode(null); // Clear after using
      return;
    } else {
      console.warn(`⚠️ Resume question code ${resumeQuestionCode} not found in currentQuestions`);
      console.warn(`⚠️ Current questions:`, currentQuestions.map(q => ({ code: q.code, id: q.id, stage: q.stage })));
      setResumeQuestionCode(null); // Clear invalid code
    }
  }, [resumeComplete, hasLoadedResponses, loadedQuestions, currentQuestions, currentStage, resumeQuestionCode]);

  // Cevaplar ve sorular yüklendikten sonra cevaplanmamış ilk soruyu bul
  // NOTE: This is fallback logic only. Resume logic sets the index directly.
  useEffect(() => {
    // Wait for initial load and resume to complete, and questions to be loaded
    if (isInitialLoad || loading || currentQuestions.length === 0 || !resumeComplete) {
      return;
    }
    
    // Skip if resume logic already set the position (hasLoadedResponses = true means resume logic ran)
    if (hasLoadedResponses) {
      console.log('⏭️ Skipping fallback logic - resume logic already set the position');
      return;
    }
    
    // Eğer hiç cevap yoksa ilk sorudan başla (fallback only)
    if (Object.keys(answers).length === 0) {
      console.log('📝 No answers found, starting at first question (fallback)');
      setCurrentQuestionIndex(0);
      return;
    }
    
    // Debug: Soru ID'lerini ve cevapları kontrol et
    console.log('Current Questions:', currentQuestions.map(q => ({ id: q.id, code: q.code || undefined, _id: q._id || undefined })));
    console.log('Answers keys:', Object.keys(answers));
    console.log('Question Priorities keys:', Object.keys(questionPriorities));
    
    // Cevaplanmamış ilk soruyu bul
    let firstUnansweredIndex = -1;
    for (let i = 0; i < currentQuestions.length; i++) {
      const question = currentQuestions[i];
      // Tüm olası ID formatlarını kontrol et
      const possibleIds = [
        question.id,
        question.code,
        question._id,
        question._id?.toString(),
        String(question.id),
        question.code ? String(question.code) : undefined,
        question._id ? String(question._id) : undefined
      ].filter((id): id is string => id !== undefined && id !== null);
      
      let hasAnswer = false;
      let hasPriority = false;
      let hasRiskScore = false;
      
      // Her olası ID formatını kontrol et
      for (const id of possibleIds) {
        const answerKey = String(id);
        // Answers objesindeki tüm key'leri kontrol et (case-insensitive)
        const matchingKey = Object.keys(answers).find(key => 
          String(key).toLowerCase() === answerKey.toLowerCase() ||
          String(key) === answerKey
        );
        
        if (matchingKey && answers[matchingKey] !== undefined && answers[matchingKey] !== null && answers[matchingKey] !== '') {
          hasAnswer = true;
        }
        
        const priorityKey = Object.keys(questionPriorities).find(key => 
          String(key).toLowerCase() === answerKey.toLowerCase() ||
          String(key) === answerKey
        );
        
        if (priorityKey && questionPriorities[priorityKey] !== undefined) {
          hasPriority = true;
        }

        const riskScoreKey = Object.keys(riskScores).find(key => 
          String(key).toLowerCase() === answerKey.toLowerCase() ||
          String(key) === answerKey
        );
        
        if (riskScoreKey && riskScores[riskScoreKey] !== undefined && riskScores[riskScoreKey] !== null) {
          hasRiskScore = true;
        }
      }
      
      console.log(`Question ${i} (${question.id || question.code || question._id}): hasAnswer=${hasAnswer}, hasPriority=${hasPriority}, hasRiskScore=${hasRiskScore}`);
      
      // Set-up stage'inde sadece answer yeterli, assess'te hem answer, hem priority, hem risk score gerekli
      if (currentStage === 'set-up') {
        if (!hasAnswer) {
          firstUnansweredIndex = i;
          console.log(`Found first unanswered question at index ${i}`);
          break;
        }
      } else {
        if (!hasAnswer || !hasPriority || !hasRiskScore) {
          firstUnansweredIndex = i;
          console.log(`Found first unanswered question at index ${i}`);
          break;
        }
      }
    }
    
    // Eğer cevaplanmamış soru bulunamadıysa (tüm sorular cevaplanmış) son soruya git
    if (firstUnansweredIndex === -1) {
      firstUnansweredIndex = currentQuestions.length > 0 ? currentQuestions.length - 1 : 0;
      console.log('All questions answered, going to last question');
    }
    
    console.log(`Setting currentQuestionIndex to ${firstUnansweredIndex}`);
    setCurrentQuestionIndex(firstUnansweredIndex);
  }, [isInitialLoad, loading, answers, questionPriorities, riskScores, currentQuestions, currentStage, resumeQuestionCode, resumeComplete, hasLoadedResponses, loadedQuestions]);


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

  // Backend'den progress çek
  useEffect(() => {
    let mounted = true;
    
    const fetchProgress = async () => {
      try {
        const progress = await fetchUserProgress(project, currentUser);
        if (mounted) {
          setUserProgress(progress);
          setHasFetchedProgress(true); // İlk fetch tamamlandı
        }
      } catch (error) {
        console.error('Error fetching user progress:', error);
        if (mounted) {
          setHasFetchedProgress(true); // Hata olsa bile fetch denendi olarak işaretle
        }
      }
    };
    
    // Initial fetch
    fetchProgress();
    
    // Cevaplar değiştiğinde veya kaydetme işlemi sonrasında progress'i güncelle
    const interval = setInterval(fetchProgress, 2000); // Her 2 saniyede bir güncelle
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [project, currentUser, answers, saving]);

  const activeQuestion = currentQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestions.length > 0 && currentQuestionIndex === currentQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // --- 2. VERİ KAYDETME (SAVE DATA) ---
  const saveEvaluation = useCallback(async (status: 'draft' | 'completed' = 'draft', silent: boolean = false) => {
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
          riskScores: riskScores, // Risk skorlarını kaydet
          riskLevel: riskLevel,
          generalRisks: generalRisks, // Genel riskleri kaydet
          status: status
        })
      });

      if (!response.ok) throw new Error('Kaydetme başarısız');
      
      const savedData = await response.json();
      console.log('Saved:', savedData);
      
      if (status === 'draft' && !silent) {
        alert('✅ Draft saved successfully to Database!');
      }
      return true;
    } catch (error) {
      console.error(error);
      if (!silent) {
        alert('❌ Error saving data. Please check your connection.');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [project.id, currentUser.id, currentStage, answers, questionPriorities, riskScores, riskLevel, generalRisks]);

  // Debounced auto-save to MongoDB
  useEffect(() => {
    // Don't auto-save during initial load
    if (isInitialLoad || !hasLoadedResponses) return;

    const timeoutId = setTimeout(async () => {
      // Only auto-save if there are actual changes
      if (Object.keys(answers).length > 0 || Object.keys(riskScores).length > 0) {
        try {
          await saveEvaluation('draft', true); // Silent auto-save
        } catch (error) {
          console.error('Auto-save error:', error);
        }
      }
    }, 2000); // Debounce: save 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [answers, riskScores, questionPriorities, isInitialLoad, hasLoadedResponses, saveEvaluation]);

  // --- NAVIGATION LOGIC ---

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentStage !== 'set-up') {
      handleStageChange('prev');
    }
  };

  const handleForward = async () => {
    // If there are no questions in current stage, go to project detail
    if (currentQuestions.length === 0) {
      const success = await saveEvaluation('draft');
      if (success) {
        onSubmit(); // This will navigate to project detail
      }
      return;
    }

    // Set-up stage: risks are optional, but existing ones must have titles
    if (currentStage === 'set-up') {
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
            if (data.generalRisks && Array.isArray(data.generalRisks)) {
              setGeneralRisks(data.generalRisks);
            } else {
              setGeneralRisks([]);
            }
          }
        } catch (error) {
          console.error("Set-up risks fetch error:", error);
        }
      };
      await fetchSetUpRisksForReview();
      setShowReviewScreen(true);
    }
  };

  const handleStageChange = (direction: 'next' | 'prev') => {
    const stageOrder: StageKey[] = ['set-up', 'assess'];
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
    // Enforce same validation as normal flow: all required answers + importance must be set
    const missingRequired = assessQuestions.filter((q) => q.required && !hasProvidedAnswer(answers[q.id]));
    const missingImportance = assessQuestions.filter((q) => !questionPriorities[q.id]);

    if (missingRequired.length > 0 || missingImportance.length > 0) {
      const first = (missingRequired[0] || missingImportance[0]) as Question | undefined;
      const idx = first ? assessQuestions.findIndex((q) => q.id === first.id) : 0;
      alert(
        `Please complete all Assess questions before finishing.\n` +
          `Missing answers: ${missingRequired.length}\n` +
          `Missing importance: ${missingImportance.length}`
      );
      setShowReviewScreen(false);
      setCurrentStage('assess');
      setCurrentQuestionIndex(Math.max(0, idx));
      return;
    }

    const success = await saveEvaluation('completed');
    if (success) {
      setShowReviewScreen(false);
      onSubmit(); // Completed assessment; parent handles navigation
    }
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

  const getCompletionPercentage = () => {
    // Calculate local progress for immediate feedback
    // This provides instant visual feedback while user is answering
    const roleQuestions = getQuestionsByRole(roleKey);
    const allRoleQuestions = [...roleQuestions, ...customQuestions]; // Tüm stage'lerdeki sorular
    
    let localProgress = 0;
    if (allRoleQuestions.length > 0) {
      // Count answered questions across ALL stages (set-up, assess, resolve)
      let answeredCount = 0;
      allRoleQuestions.forEach(question => {
        const questionId = question.id;
        const hasAnswer = answers[questionId] !== undefined && answers[questionId] !== null && answers[questionId] !== '';
        
        // For assess stage, also check if priority/risk score is set
        if (question.stage === 'assess') {
          const hasPriority = questionPriorities[questionId] !== undefined;
          const hasRiskScore = riskScores[questionId] !== undefined;
          if (hasAnswer && (hasPriority || hasRiskScore)) {
            answeredCount++;
          }
        } else {
          // For set-up and resolve stages, only answer is required
          if (hasAnswer) {
            answeredCount++;
          }
        }
      });
      
      localProgress = Math.round((answeredCount / allRoleQuestions.length) * 100);
    }
    
    // If backend progress hasn't been fetched yet, use local progress for immediate feedback
    // This prevents showing 0% while waiting for the first backend response (up to 2 seconds delay)
    if (!hasFetchedProgress) {
      return localProgress;
    }
    
    // Once backend progress is available, use the maximum of backend and local progress
    // Backend progress is more accurate as it covers all questions (general + role-specific)
    // Local progress provides immediate feedback for the current session
    return Math.max(userProgress, localProgress);
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
                <div className="flex-1 flex flex-col gap-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Review</h2>
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
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">General Risks</h3>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setGeneralRisks([
                                              ...generalRisks,
                                              { id: Date.now().toString(), title: '', description: '' }
                                            ]);
                                            setIsDraft(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Risk
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {generalRisks.length === 0 ? (
                                        <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                            <AlertTriangle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 italic">No risks added yet.</p>
                                        </div>
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
                        </div>
                    </div>
                </div>
            ) : activeQuestion ? (
                <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
                    {/* Mobile: open question list */}
                    {showQuestionNav && (
                        <div className="fixed inset-0 z-50 md:hidden">
                            <div className="absolute inset-0 bg-black/30" onClick={() => setShowQuestionNav(false)} />
                            <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-2xl border-r border-gray-200 flex flex-col">
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <div className="font-semibold text-gray-900">Questions</div>
                                    <button
                                        type="button"
                                        className="p-2 rounded-lg hover:bg-gray-100"
                                        onClick={() => setShowQuestionNav(false)}
                                        aria-label="Close questions"
                                    >
                                        <X className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                                <div className="p-3 overflow-y-auto">
                                    <div className="space-y-1">
                                        {currentQuestions.map((q, idx) => {
                                            const active = idx === currentQuestionIndex;
                                            const done = isQuestionAnswered(q.id);
                                            return (
                                                <button
                                                    key={q.id || idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setCurrentQuestionIndex(idx);
                                                        setShowQuestionNav(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                                        active
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <span className="font-medium">Q{idx + 1}</span>
                                                    {done && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Desktop: left question list */}
                    <div className="hidden md:block md:w-56 lg:w-64 shrink-0">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:sticky md:top-40 max-h-[70vh] overflow-y-auto">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pb-2">
                                Questions
                            </div>
                            <div className="space-y-1">
                                {currentQuestions.map((q, idx) => {
                                    const active = idx === currentQuestionIndex;
                                    const done = isQuestionAnswered(q.id);
                                    return (
                                        <button
                                            key={q.id || idx}
                                            type="button"
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                                active
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="font-medium">Q{idx + 1}</span>
                                            {done && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Active question card */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-0">
                    <div className="p-8 border-b border-gray-100 bg-white">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                                Question {currentQuestionIndex + 1} of {currentQuestions.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowQuestionNav(true)}
                                className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100 hover:bg-blue-100"
                            >
                                Q list
                            </button>
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
                                {activeQuestion.options?.map((option) => {
                                    const optionValue = getOptionValue(option);
                                    const optionLabel = getOptionLabel(option);
                                    const isSelected = answers[activeQuestion.id] === optionValue;
                                    return (
                                        <label key={optionValue} className={`group flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                            isSelected 
                                            ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                                        }`}>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                                                 isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                                            }`}>
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                            <input
                                            type="radio"
                                            name={activeQuestion.id}
                                            value={optionValue}
                                            checked={isSelected}
                                            onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                                            className="hidden"
                                            />
                                            <span className={`text-lg font-medium transition-colors ${
                                                isSelected ? 'text-blue-900' : 'text-gray-700'
                                            }`}>{optionLabel}</span>
                                        </label>
                                    );
                                })}
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
                                    {(activeQuestion.options && activeQuestion.options.length > 0 ? activeQuestion.options : ['1', '2', '3', '4', '5']).map((option) => {
                                        const optionValue = getOptionValue(option);
                                        const optionLabel = getOptionLabel(option);
                                        const isSelected = answers[activeQuestion.id] === optionValue;
                                        return (
                                            <button
                                                key={optionValue}
                                                type="button"
                                                onClick={() => handleAnswerChange(activeQuestion.id, optionValue)}
                                                className={`aspect-square rounded-2xl text-xl font-bold transition-all duration-200 flex items-center justify-center ${
                                                    isSelected
                                                    ? 'bg-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-200'
                                                    : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                                                }`}
                                            >
                                                {optionLabel}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        
                         {activeQuestion.type === 'checkbox' && (
                            <div className="space-y-3 max-w-2xl">
                                {activeQuestion.options?.map((option) => {
                                    const optionValue = getOptionValue(option);
                                    const optionLabel = getOptionLabel(option);
                                    const currentAnswers: string[] = answers[activeQuestion.id] || [];
                                    const isChecked = currentAnswers.includes(optionValue);
                                    return (
                                        <label key={optionValue} className={`group flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                            isChecked
                                            ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                                        }`}>
                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-4 transition-colors ${
                                                 isChecked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                                            }`}>
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                            <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const newAnswers = e.target.checked
                                                ? [...currentAnswers, optionValue]
                                                : currentAnswers.filter((a) => a !== optionValue);
                                                handleAnswerChange(activeQuestion.id, newAnswers);
                                            }}
                                            className="hidden"
                                            />
                                            <span className={`text-lg font-medium transition-colors ${
                                                isChecked ? 'text-blue-900' : 'text-gray-700'
                                            }`}>{optionLabel}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* Önem Derecesi Belirleme - Her Soru İçin */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <h3 className="text-lg font-semibold text-gray-900">Importance Level for This Question</h3>
                                {currentStage === 'assess' && (
                                    <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">
                                        Required
                                    </span>
                                )}
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

                        {/* Risk Score Selection (0-4) */}
                        <div className="mt-8 pt-6 border-t border-gray-200" key={`risk-scores-${activeQuestion.id}-${riskScores[activeQuestion.id] || riskScores[activeQuestion.code || ''] || 'none'}`}>
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
                                    // Get question key (prefer code over id, same as GeneralQuestions)
                                    const questionKey = activeQuestion.code || activeQuestion.id;
                                    
                                    // Get risk value - check all possible keys (EXACT same logic as GeneralQuestions)
                                    let riskValue: number | undefined = undefined;
                                    
                                    // Check all possible keys - handle 0 and 1 correctly (EXACT same order as GeneralQuestions)
                                    if (activeQuestion.id !== undefined) {
                                        const idVal = riskScores[activeQuestion.id];
                                        if (idVal !== undefined && idVal !== null && typeof idVal === 'number' && idVal >= 0 && idVal <= 4) {
                                            riskValue = idVal;
                                        }
                                    }
                                    
                                    if (riskValue === undefined) {
                                        const keyVal = riskScores[questionKey];
                                        if (keyVal !== undefined && keyVal !== null && typeof keyVal === 'number' && keyVal >= 0 && keyVal <= 4) {
                                            riskValue = keyVal;
                                        }
                                    }
                                    
                                    if (riskValue === undefined && activeQuestion.code !== undefined) {
                                        const codeVal = riskScores[activeQuestion.code];
                                        if (codeVal !== undefined && codeVal !== null && typeof codeVal === 'number' && codeVal >= 0 && codeVal <= 4) {
                                            riskValue = codeVal;
                                        }
                                    }
                                    
                                    // Use explicit type check and equality (EXACT same as GeneralQuestions)
                                    // Force strict comparison to handle 0 and 1 correctly
                                    const isSelected = riskValue !== undefined && riskValue !== null && typeof riskValue === 'number' && riskValue === value;
                                    
                                    // Debug log for selected state
                                    if ((value === 0 || value === 1) && isSelected) {
                                        console.log(`✅ EvaluationForm: Button ${value} is selected`, {
                                            riskValue,
                                            value,
                                            isSelected,
                                            questionKey,
                                            questionId: activeQuestion.id,
                                            riskScoresCheck: {
                                                [questionKey]: riskScores[questionKey],
                                                [activeQuestion.id || '']: riskScores[activeQuestion.id || ''],
                                                [activeQuestion.code || '']: riskScores[activeQuestion.code || '']
                                            }
                                        });
                                    }
                                    
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
                                                name={`risk-${activeQuestion.id}`}
                                                value={value}
                                                checked={isSelected}
                                                onChange={() => {
                                                    const questionKey = activeQuestion.code || activeQuestion.id;
                                                    const riskValueToSet = value as 0 | 1 | 2 | 3 | 4;
                                                    console.log(`🔵 Setting risk for question ${questionKey} to ${riskValueToSet}`, {
                                                        questionKey,
                                                        questionId: activeQuestion.id,
                                                        questionCode: activeQuestion.code,
                                                        riskValueToSet,
                                                        value,
                                                        currentRiskScores: riskScores
                                                    });
                                                    // Update state directly (EXACT same as GeneralQuestions)
                                                    // Use functional update to ensure state is properly updated
                                                    setRiskScores((prev) => {
                                                        const updated = { ...prev };
                                                        // Update all possible keys to ensure consistency
                                                        updated[questionKey] = riskValueToSet;
                                                        if (activeQuestion.id) {
                                                            updated[activeQuestion.id] = riskValueToSet;
                                                        }
                                                        if (activeQuestion.code) {
                                                            updated[activeQuestion.code] = riskValueToSet;
                                                        }
                                                        if ((activeQuestion as any)._id) {
                                                            updated[(activeQuestion as any)._id] = riskValueToSet;
                                                        }
                                                        console.log('✅ Updated riskScores state:', updated);
                                                        // Return new object to force re-render
                                                        return { ...updated };
                                                    });
                                                    setIsDraft(true);
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
            </div>
            ) : (
                 <div className="text-center py-32 bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50/50">
                        <Info className="w-12 h-12 text-gray-300" />
                    </div>
                    
                    <>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">No Questions in this Stage</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-10 text-lg">
                            There are no questions defined for the <strong>{currentStage}</strong> stage for your role (<strong>{currentUser.role}</strong>).
                        </p>
                    </>
                    
                    <button
                        onClick={() => setShowAddQuestion(true)}
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors mb-8"
                    >
                        <Plus className="w-4 h-4" /> Add a custom question to this stage
                    </button>
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
                    className="flex items-center px-8 py-3 text-white rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700"
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
  const [principle, setPrinciple] = useState<string>(QUESTION_PRINCIPLES[0]?.value || 'TRANSPARENCY');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newQuestion: Question = {
      id: `custom_${Date.now()}`,
      stage: currentStage,
      text,
      description: description || undefined,
      type,
      principle: principle || undefined,
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
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Principle (İlke) <span className="text-red-500">*</span>
            </label>
            <select
              value={principle}
              onChange={(e) => setPrinciple(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white"
              required
            >
              {QUESTION_PRINCIPLES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
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
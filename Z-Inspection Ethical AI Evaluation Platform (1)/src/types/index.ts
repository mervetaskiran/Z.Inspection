export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'ethical-expert' | 'medical-expert' | 'use-case-owner' | 'education-expert' | 'technical-expert' | 'legal-expert';
}

export type StageKey = 'set-up' | 'assess' | 'resolve';
export type QuestionType = 'multiple-choice' | 'checkbox' | 'text' | 'likert' | 'select' | 'radio' | 'rating';

export type QuestionOption = string | { value: string; label: string };

export interface Question {
  id: string;
  _id?: string; // MongoDB _id for backend compatibility
  code?: string; // Question code (e.g., "T1", "H2") for backend compatibility
  text: string;
  stage: StageKey;
  type: QuestionType;
  required?: boolean;
  options?: QuestionOption[];
  description?: string;
  min?: number;
  max?: number;
}

export interface Project {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  stage: 'set-up' | 'assess' | 'resolve';
  status: 'ongoing' | 'proven' | 'disproven';
  useCase?: {
    filename: string;
    url: string;
  };
  targetDate: string;
  assignedUsers: string[];
  createdAt: string;
  isNew?: boolean;
  progress: number;

  inspectionContext?: { // Yeni alan
        requester: string;
        inspectionReason: string;
        relevantFor: string;
        isMandatory: string;
        conditionsToAnalyze: string;
        resultsUsage: string;
        resultsSharing: string;
    }
}

export type TensionSeverity = 'high' | 'medium' | 'low';
export type EthicalPrinciple = 'Fairness' | 'Privacy' | 'Accountability' | 'Transparency' | 'Safety' | 'Human Oversight' | 'Sustainability';

export interface Tension {
  id: string;
  projectId: string;
  tensionDescription?: string;
  claimStatement: string;
  supportingArgument?: string;
  description?: string;
  status: 'ongoing' | 'proven' | 'disproven';
  consensus: {
    agree: number;
    disagree: number;
  };
  createdBy: string;
  createdAt: string;
  severity: TensionSeverity;
  weight: number; // 3 = high, 2 = medium, 1 = low
  principle1?: EthicalPrinciple;
  principle2?: EthicalPrinciple;
  evidences?: Array<{
    title: string;
    description?: string;
    fileName?: string;
    fileData?: string;
    fileUrl?: string;
    uploadedBy?: string;
    uploadedAt?: string | Date;
  }>;
  comments?: Array<{
    text: string;
    authorId?: string;
    authorName?: string;
    date?: string;
  }>;
  userVote?: 'agree' | 'disagree' | null;
}

export interface Evaluation {
  id: string;
  projectId: string;
  userId: string;
  stage: string;
  questions: Array<{
    id: string;
    text: string;
    type: 'multiple-choice' | 'checkbox' | 'text' | 'likert';
    answer?: any;
  }>;
  status: 'draft' | 'submitted';
  riskLevel: 'low' | 'medium' | 'high';
  generalRisks?: Array<{
    id: string;
    title: string;
    description?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    relatedQuestions?: string[];
  }>;
}

export interface MessageUserRef {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface Message {
  id: string;          // backend _id
  projectId: string;   // backend projectId

  fromUserId: string | MessageUserRef;
  toUserId: string | MessageUserRef;

  text: string;
  createdAt: string;   // backend createdAt (ISO)
  readAt?: string | null;
}

export interface Evidence {
  id: string;
  tensionId: string;
  title: string;
  description: string;
  documentName?: string;
  documentUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface UseCaseOwner {
  id: string;
  name: string;
  expertiseArea: string;
  associatedUseCase: string;
  projectId: string;
  responsibilities: string;
  assignedTensions: string[];
  email: string;
  avatar?: string;
}

export interface UseCaseQuestion {
  id: string;
  questionEn: string;
  questionTr: string;
  type: 'text' | 'multiple-choice';
  answer?: string;
  options?: string[]; // For multiple-choice questions
}

export interface UseCase {
  id: string;
  title: string;
  description: string;
  aiSystemCategory: string;
  status: 'assigned' | 'in-review' | 'completed';
  progress: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  supportingFiles?: {
    name: string;
    url?: string;
    data?: string; // Base64 string for inline download
    contentType?: string;
  }[];
  assignedExperts?: string[];
  adminNotes?: string;
  adminReflections?: {
    id: string;
    text: string;
    createdBy: string;
    createdAt: string;
    visibleToExperts: boolean;
  }[];
  feedback?: {
    from: string;
    text: string;
    timestamp: string;
  }[];
  extendedInfo?: Record<string, any>;
  answers?: Array<{ // Sadece cevaplar - questionId ve answer
    questionId: string;
    answer: string;
  }>;
  questions?: UseCaseQuestion[]; // Deprecated - use answers instead
}
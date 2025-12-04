import { User, Project, Tension, Evidence, UseCaseOwner, UseCase } from '../types';

export const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Healthcare AI Diagnostic System',
    shortDescription: 'AI system for medical image analysis and diagnosis',
    fullDescription: 'A comprehensive AI system designed to analyze medical images and provide diagnostic recommendations for healthcare professionals.',
    stage: 'assess',
    status: 'ongoing',
    useCase: {
      filename: 'healthcare-ai-use-case.pdf',
      url: '#'
    },
    targetDate: '2024-03-15',
    assignedUsers: ['user1', 'user2', 'user3'],
    createdAt: '2024-01-15',
    isNew: true,
    progress: 65
  },
  {
    id: '2',
    title: 'Financial Risk Assessment AI',
    shortDescription: 'Machine learning model for credit risk evaluation',
    fullDescription: 'An AI model that evaluates credit risk for loan applications using various financial and personal data points.',
    stage: 'resolve',
    status: 'proven',
    targetDate: '2024-02-28',
    assignedUsers: ['user1', 'user4'],
    createdAt: '2024-01-10',
    progress: 90
  },
  {
    id: '3',
    title: 'Autonomous Vehicle Navigation',
    shortDescription: 'AI system for self-driving car decision making',
    fullDescription: 'Advanced AI system responsible for real-time decision making in autonomous vehicles.',
    stage: 'set-up',
    status: 'disproven',
    targetDate: '2024-04-01',
    assignedUsers: ['user2', 'user3'],
    createdAt: '2024-01-20',
    progress: 30
  }
];

export const mockUsers: User[] = [
  { id: 'admin1', email: 'admin@zinspection.com', name: 'Admin User', role: 'admin' },
  { id: 'user1', email: 'ethical@zinspection.com', name: 'Sarah Johnson', role: 'ethical-expert' },
  { id: 'user2', email: 'medical@zinspection.com', name: 'Dr. Emily Smith', role: 'medical-expert' },
  { id: 'user3', email: 'usecase@zinspection.com', name: 'John Davis', role: 'use-case-owner' },
  { id: 'user4', email: 'ethical2@zinspection.com', name: 'David Brown', role: 'ethical-expert' },
  { id: 'user5', email: 'education@zinspection.com', name: 'Prof. Maria Garcia', role: 'education-expert' }
];

export const mockTensions: Tension[] = [
  {
    id: '1',
    projectId: '1',
    tensionDescription: 'Tension between ensuring equal treatment and protecting individual privacy',
    claimStatement: 'The AI system ensures fair treatment across different demographic groups',
    supportingArgument: 'Based on statistical parity analysis and demographic parity metrics',
    status: 'ongoing',
    consensus: { agree: 67, disagree: 33 },
    createdBy: 'user1',
    createdAt: '2024-01-16',
    severity: 'high',
    weight: 3,
    principle1: 'Fairness',
    principle2: 'Privacy'
  },
  {
    id: '2',
    projectId: '1',
    tensionDescription: 'Balancing data protection with system transparency requirements',
    claimStatement: 'Data privacy measures are adequately implemented',
    supportingArgument: 'GDPR compliance verified through technical documentation review',
    status: 'proven',
    consensus: { agree: 85, disagree: 15 },
    createdBy: 'user2',
    createdAt: '2024-01-18',
    severity: 'low',
    weight: 1,
    principle1: 'Privacy',
    principle2: 'Transparency'
  },
  {
    id: '3',
    projectId: '1',
    tensionDescription: 'Conflict between transparency demands and accountability requirements',
    claimStatement: 'System provides adequate transparency for medical decisions',
    supportingArgument: 'XAI techniques provide sufficient explanation for healthcare professionals',
    status: 'disproven',
    consensus: { agree: 25, disagree: 75 },
    createdBy: 'user3',
    createdAt: '2024-01-20',
    severity: 'medium',
    weight: 2,
    principle1: 'Transparency',
    principle2: 'Accountability'
  }
];

export const mockEvidences: Evidence[] = [
  {
    id: 'ev1',
    tensionId: '1',
    title: 'Demographic Parity Analysis Report',
    description: 'Statistical analysis showing fairness metrics across different demographic groups including gender, age, and ethnicity.',
    documentName: 'demographic-parity-report.pdf',
    documentUrl: '#',
    uploadedBy: 'user1',
    uploadedAt: '2024-01-17'
  },
  {
    id: 'ev2',
    tensionId: '1',
    title: 'Bias Testing Results',
    description: 'Comprehensive bias testing results from third-party audit showing system performance across various demographic segments.',
    documentName: 'bias-testing-results.xlsx',
    documentUrl: '#',
    uploadedBy: 'user2',
    uploadedAt: '2024-01-18'
  },
  {
    id: 'ev3',
    tensionId: '2',
    title: 'GDPR Compliance Certificate',
    description: 'Official GDPR compliance certificate from regulatory authority confirming adherence to data privacy standards.',
    documentName: 'gdpr-certificate.pdf',
    documentUrl: '#',
    uploadedBy: 'user1',
    uploadedAt: '2024-01-19'
  },
  {
    id: 'ev4',
    tensionId: '2',
    title: 'Data Protection Impact Assessment',
    description: 'Detailed DPIA document outlining data protection measures, risk assessments, and mitigation strategies.',
    documentName: 'dpia-document.pdf',
    documentUrl: '#',
    uploadedBy: 'user2',
    uploadedAt: '2024-01-19'
  }
];

export const mockUseCaseOwners: UseCaseOwner[] = [
  {
    id: 'owner1',
    name: 'Dr. Rachel Martinez',
    expertiseArea: 'Medical Imaging & Radiology',
    associatedUseCase: 'Healthcare AI Diagnostic System',
    projectId: '1',
    responsibilities: 'Oversee medical accuracy of AI diagnoses, validate clinical workflows, ensure patient safety standards',
    assignedTensions: ['1', '3'],
    email: 'r.martinez@hospital.org'
  },
  {
    id: 'owner2',
    name: 'Michael Thompson',
    expertiseArea: 'Financial Compliance & Risk',
    associatedUseCase: 'Financial Risk Assessment AI',
    projectId: '2',
    responsibilities: 'Ensure regulatory compliance, validate risk assessment models, monitor fairness in lending decisions',
    assignedTensions: [],
    email: 'm.thompson@fintech.com'
  },
  {
    id: 'owner3',
    name: 'Dr. Lisa Chen',
    expertiseArea: 'Clinical Psychology',
    associatedUseCase: 'Healthcare AI Diagnostic System',
    projectId: '1',
    responsibilities: 'Evaluate psychological impact on patients, assess explainability from patient perspective',
    assignedTensions: ['2'],
    email: 'l.chen@medcenter.org'
  },
  {
    id: 'owner4',
    name: 'James Wilson',
    expertiseArea: 'Automotive Safety Engineering',
    associatedUseCase: 'Autonomous Vehicle Navigation',
    projectId: '3',
    responsibilities: 'Validate safety protocols, oversee testing scenarios, ensure compliance with transportation regulations',
    assignedTensions: [],
    email: 'j.wilson@autotech.com'
  }
];

export let mockUseCases: UseCase[] = [
  {
    id: 'uc1',
    title: 'Healthcare AI Diagnostic System',
    description: 'AI system for analyzing medical images and providing diagnostic recommendations for radiology departments',
    aiSystemCategory: 'Healthcare & Medical',
    status: 'in-review',
    progress: 65,
    ownerId: 'user3',
    createdAt: '2024-01-15',
    updatedAt: '2024-10-12',
    assignedExperts: ['user1', 'user2'],
    adminNotes: 'High priority project. Focus on patient safety and clinical validation.',
    adminReflections: [
      {
        id: 'ref1',
        text: 'Initial review shows strong technical foundation but needs more clinical validation data',
        createdBy: 'admin1',
        createdAt: '2024-01-20',
        visibleToExperts: true
      }
    ],
    feedback: [
      {
        from: 'Sarah Johnson',
        text: 'The ethical framework looks comprehensive. Recommend additional focus on informed consent protocols.',
        timestamp: '2024-01-25'
      }
    ]
  },
  {
    id: 'uc2',
    title: 'Financial Risk Assessment AI',
    description: 'Machine learning model for evaluating credit risk in loan applications',
    aiSystemCategory: 'Finance & Banking',
    status: 'completed',
    progress: 100,
    ownerId: 'user3',
    createdAt: '2024-01-10',
    updatedAt: '2024-10-10',
    assignedExperts: ['user1'],
    adminNotes: 'Completed evaluation. Approved for deployment.',
    feedback: []
  }
];
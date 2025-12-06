import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Send, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Project, User } from '../types';

interface EvaluationFormProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onSubmit: () => void;
}

type QuestionType = 'multiple-choice' | 'checkbox' | 'text' | 'likert';
type StageKey = 'set-up' | 'assess' | 'resolve';
type RiskLevel = 'low' | 'medium' | 'high';

interface Question {
  id: string;
  stage: StageKey;
  text: string;
  type: QuestionType;
  options?: string[];
  answer?: any;
  required?: boolean;
}

type RoleKey =
  | 'admin'
  | 'ethical-expert'
  | 'medical-expert'
  | 'use-case-owner'
  | 'education-expert'
  | 'technical-expert'
  | 'legal-expert';

const roleColors: Record<RoleKey, string> = {
  admin: '#1F2937',
  'ethical-expert': '#1E40AF',
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED',
  'technical-expert': '#0891B2',
  'legal-expert': '#B45309'
};

type QuestionBank = Record<StageKey, Question[]>;

// Role-specific question banks (Sabit Sorular)
const questionBanks: Partial<Record<RoleKey, QuestionBank>> = {
  'ethical-expert': {
    'set-up': [
      {
        id: 'legal_1',
        stage: 'set-up',
        text: 'Does the AI system comply with relevant data protection regulations (GDPR, CCPA)?',
        type: 'multiple-choice',
        options: ['Fully compliant', 'Partially compliant', 'Non-compliant', 'Unclear'],
        required: true
      },
      {
        id: 'legal_2',
        stage: 'set-up',
        text: 'Are there clear terms of service and privacy policies for users?',
        type: 'multiple-choice',
        options: ['Yes, comprehensive', 'Yes, but incomplete', 'No', 'Not applicable'],
        required: true
      },
      {
        id: 'legal_3',
        stage: 'set-up',
        text: 'Identify potential legal risks and liabilities.',
        type: 'text',
        required: true
      }
    ],
    assess: [
      {
        id: 'legal_4',
        stage: 'assess',
        text: "How would you rate the system's compliance with anti-discrimination laws?",
        type: 'likert',
        options: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'],
        required: true
      },
      {
        id: 'legal_5',
        stage: 'assess',
        text: 'Are consent mechanisms appropriately implemented?',
        type: 'multiple-choice',
        options: ['Yes, fully', 'Yes, partially', 'No', 'Not required'],
        required: true
      }
    ],
    resolve: [
      {
        id: 'legal_6',
        stage: 'resolve',
        text: 'What is your overall legal risk assessment?',
        type: 'multiple-choice',
        options: ['Acceptable risk', 'Manageable with mitigation', 'High risk - requires changes', 'Unacceptable risk'],
        required: true
      },
      {
        id: 'legal_7',
        stage: 'resolve',
        text: 'Provide final legal recommendations and required actions.',
        type: 'text',
        required: true
      }
    ]
  },
  'use-case-owner': {
    'set-up': [
      {
        id: 'tech_1',
        stage: 'set-up',
        text: 'What type of machine learning model is being used?',
        type: 'multiple-choice',
        options: ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning', 'Deep Learning', 'Other'],
        required: true
      },
      {
        id: 'tech_2',
        stage: 'set-up',
        text: 'Are there adequate security measures in place?',
        type: 'checkbox',
        options: ['Data encryption', 'Access controls', 'Audit logging', 'Vulnerability testing', 'None implemented'],
        required: true
      },
      {
        id: 'tech_3',
        stage: 'set-up',
        text: 'Describe the system architecture and data flow.',
        type: 'text',
        required: true
      }
    ],
    assess: [
      {
        id: 'tech_4',
        stage: 'assess',
        text: 'How would you rate the algorithmic transparency?',
        type: 'likert',
        options: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'],
        required: true
      },
      {
        id: 'tech_5',
        stage: 'assess',
        text: 'Are bias detection and mitigation techniques implemented?',
        type: 'multiple-choice',
        options: ['Yes, comprehensive', 'Yes, basic', 'No', 'In development'],
        required: true
      }
    ],
    resolve: [
      {
        id: 'tech_6',
        stage: 'resolve',
        text: 'What is your overall technical risk assessment?',
        type: 'multiple-choice',
        options: [
          'Low technical risk',
          'Moderate risk with recommendations',
          'High risk - significant changes needed',
          'Critical issues found'
        ],
        required: true
      },
      {
        id: 'tech_7',
        stage: 'resolve',
        text: 'Provide final technical recommendations and implementation requirements.',
        type: 'text',
        required: true
      }
    ]
  },
  'medical-expert': {
    'set-up': [
      {
        id: 'med_1',
        stage: 'set-up',
        text: 'Does the AI system meet medical device regulatory requirements?',
        type: 'multiple-choice',
        options: ['FDA approved', 'CE marked', 'In approval process', 'Not required', 'Non-compliant'],
        required: true
      },
      {
        id: 'med_2',
        stage: 'set-up',
        text: 'Are clinical validation studies available?',
        type: 'multiple-choice',
        options: ['Yes, comprehensive', 'Yes, limited', 'In progress', 'No'],
        required: true
      },
      {
        id: 'med_3',
        stage: 'set-up',
        text: 'Describe potential patient safety risks.',
        type: 'text',
        required: true
      }
    ],
    assess: [
      {
        id: 'med_4',
        stage: 'assess',
        text: 'How would you rate the clinical utility of the AI system?',
        type: 'likert',
        options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
        required: true
      },
      {
        id: 'med_5',
        stage: 'assess',
        text: 'Are there adequate safeguards for patient data?',
        type: 'checkbox',
        options: ['De-identification', 'Encryption', 'Access controls', 'Audit trails', 'None'],
        required: true
      }
    ],
    resolve: [
      {
        id: 'med_6',
        stage: 'resolve',
        text: 'What is your overall clinical risk assessment?',
        type: 'multiple-choice',
        options: [
          'Safe for clinical use',
          'Safe with monitoring',
          'Requires additional safeguards',
          'Not recommended for clinical use'
        ],
        required: true
      },
      {
        id: 'med_7',
        stage: 'resolve',
        text: 'Provide final medical recommendations and clinical implementation guidelines.',
        type: 'text',
        required: true
      }
    ]
  },
  'education-expert': {
    'set-up': [
      {
        id: 'edu_1',
        stage: 'set-up',
        text: 'Does the AI system support inclusive learning for diverse student populations?',
        type: 'multiple-choice',
        options: ['Fully inclusive', 'Partially inclusive', 'Limited support', 'Not inclusive'],
        required: true
      },
      {
        id: 'edu_2',
        stage: 'set-up',
        text: 'Are there adequate safeguards for student data privacy?',
        type: 'checkbox',
        options: ['FERPA compliance', 'Age-appropriate consent', 'Data anonymization', 'Parental controls', 'None implemented'],
        required: true
      },
      {
        id: 'edu_3',
        stage: 'set-up',
        text: 'Describe the pedagogical framework and learning outcomes.',
        type: 'text',
        required: true
      }
    ],
    assess: [
      {
        id: 'edu_4',
        stage: 'assess',
        text: 'How would you rate the educational effectiveness of the AI system?',
        type: 'likert',
        options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
        required: true
      },
      {
        id: 'edu_5',
        stage: 'assess',
        text: 'Does the system promote critical thinking and avoid bias in educational content?',
        type: 'multiple-choice',
        options: ['Yes, effectively', 'Somewhat', 'No', 'Needs improvement'],
        required: true
      }
    ],
    resolve: [
      {
        id: 'edu_6',
        stage: 'resolve',
        text: 'What is your overall educational suitability assessment?',
        type: 'multiple-choice',
        options: [
          'Highly suitable for educational use',
          'Suitable with modifications',
          'Limited educational value',
          'Not recommended for educational settings'
        ],
        required: true
      },
      {
        id: 'edu_7',
        stage: 'resolve',
        text: 'Provide final educational recommendations and implementation guidelines.',
        type: 'text',
        required: true
      }
    ]
  },
  'technical-expert': {
    'set-up': [
      {
        id: 'tech_sys_1',
        stage: 'set-up',
        text: 'What is the architecture of the AI system?',
        type: 'multiple-choice',
        options: ['Centralized', 'Distributed', 'Cloud-based', 'Hybrid', 'Edge computing'],
        required: true
      },
      {
        id: 'tech_sys_2',
        stage: 'set-up',
        text: 'What security measures are implemented?',
        type: 'checkbox',
        options: [
          'End-to-end encryption',
          'Multi-factor authentication',
          'Intrusion detection',
          'Regular security audits',
          'Penetration testing',
          'None'
        ],
        required: true
      },
      {
        id: 'tech_sys_3',
        stage: 'set-up',
        text: 'Describe the data pipeline, model architecture, and infrastructure.',
        type: 'text',
        required: true
      }
    ],
    assess: [
      {
        id: 'tech_sys_4',
        stage: 'assess',
        text: "How would you rate the system's robustness and reliability?",
        type: 'likert',
        options: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'],
        required: true
      },
      {
        id: 'tech_sys_5',
        stage: 'assess',
        text: 'Are there adequate monitoring and logging mechanisms?',
        type: 'multiple-choice',
        options: ['Comprehensive monitoring', 'Basic monitoring', 'Minimal monitoring', 'No monitoring'],
        required: true
      },
      {
        id: 'tech_sys_6',
        stage: 'assess',
        text: "What is the model's performance and accuracy level?",
        type: 'multiple-choice',
        options: [
          'Excellent (>95%)',
          'Good (85-95%)',
          'Acceptable (75-85%)',
          'Poor (<75%)',
          'Not measured'
        ],
        required: true
      }
    ],
    resolve: [
      {
        id: 'tech_sys_7',
        stage: 'resolve',
        text: 'What is your overall technical assessment?',
        type: 'multiple-choice',
        options: ['Production ready', 'Ready with minor fixes', 'Needs significant improvements', 'Not technically viable'],
        required: true
      },
      {
        id: 'tech_sys_8',
        stage: 'resolve',
        text: 'Provide final technical recommendations, scalability considerations, and deployment requirements.',
        type: 'text',
        required: true
      }
    ]
  },
  'legal-expert': {
    'set-up': [
      {
        id: 'legal_sys_1',
        stage: 'set-up',
        text: 'Does the AI system comply with relevant regulatory frameworks?',
        type: 'checkbox',
        options: ['GDPR', 'CCPA', 'AI Act (EU)', 'HIPAA', 'Industry-specific regulations', 'None applicable'],
        required: true
      },
      {
        id: 'legal_sys_2',
        stage: 'set-up',
        text: 'Are there clear liability and accountability frameworks in place?',
        type: 'multiple-choice',
        options: ['Comprehensive framework', 'Partial framework', 'Under development', 'No framework'],
        required: true
      },
      {
        id: 'legal_sys_3',
        stage: 'set-up',
        text: 'Identify potential legal risks, regulatory compliance gaps, and liability concerns.',
        type: 'text',
        required: true
      }
    ],
    assess: [
      {
        id: 'legal_sys_4',
        stage: 'assess',
        text: 'How would you rate the data protection and privacy compliance?',
        type: 'likert',
        options: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'],
        required: true
      },
      {
        id: 'legal_sys_5',
        stage: 'assess',
        text: 'Are intellectual property rights clearly defined and protected?',
        type: 'multiple-choice',
        options: ['Fully protected', 'Partially protected', 'Unclear', 'Not protected'],
        required: true
      },
      {
        id: 'legal_sys_6',
        stage: 'assess',
        text: 'Does the system meet anti-discrimination and fairness requirements?',
        type: 'multiple-choice',
        options: ['Fully compliant', 'Mostly compliant', 'Partially compliant', 'Non-compliant'],
        required: true
      }
    ],
    resolve: [
      {
        id: 'legal_sys_7',
        stage: 'resolve',
        text: 'What is your overall legal risk assessment?',
        type: 'multiple-choice',
        options: ['Low legal risk', 'Acceptable risk with safeguards', 'High risk - requires legal review', 'Unacceptable legal risk'],
        required: true
      },
      {
        id: 'legal_sys_8',
        stage: 'resolve',
        text: 'Provide final legal recommendations, compliance requirements, and risk mitigation strategies.',
        type: 'text',
        required: true
      }
    ]
  }
};

const emptyQuestionsByStage: QuestionBank = {
  'set-up': [],
  assess: [],
  resolve: []
};

export function EvaluationForm({ project, currentUser, onBack, onSubmit }: EvaluationFormProps) {
  const [currentStage, setCurrentStage] = useState<StageKey>('set-up');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isDraft, setIsDraft] = useState(true);

  const roleKey = (currentUser.role as RoleKey) || 'admin';
  const roleColor = roleColors[roleKey];

  const userQuestions: QuestionBank =
    questionBanks[roleKey] ?? emptyQuestionsByStage;

  const currentQuestions: Question[] = [
    ...(userQuestions[currentStage] ?? []),
    ...customQuestions.filter((q) => q.stage === currentStage)
  ];

  const stages: { key: StageKey; label: string; icon: string }[] = [
    { key: 'set-up', label: 'Set-up', icon: '📋' },
    { key: 'assess', label: 'Assess', icon: '🔍' },
    { key: 'resolve', label: 'Resolve', icon: '✅' }
  ];

  // --- MONGODB'DEN VERİLERİ ÇEKME (FETCH) ---
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const url = `http://localhost:5000/api/evaluations?projectId=${project.id}&userId=${currentUser.id}&stage=${currentStage}`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data = await res.json();
          // Eğer veritabanında daha önce kaydedilmiş bir draft varsa state'e yükle
          if (data && data.answers) {
            setAnswers(data.answers);
            if (data.riskLevel) setRiskLevel(data.riskLevel as RiskLevel);
            setIsDraft(true); // Veritabanından geldiyse kaydedilmiştir
            console.log("Draft loaded from MongoDB:", data);
          } else {
            // Kayıt yoksa form boş kalsın ama hata vermesin
            console.log("No existing draft found, starting fresh.");
          }
        }
      } catch (error) {
        console.error("Failed to load draft from MongoDB:", error);
      }
    };

    loadDraft();
  }, [project.id, currentUser.id, currentStage]);

  // --- MONGODB'YE DRAFT KAYDETME ---
  const handleSaveDraft = async () => {
    try {
      const payload = {
        projectId: project.id,
        userId: currentUser.id,
        stage: currentStage,
        answers: answers,
        riskLevel: riskLevel,
        status: 'draft'
      };

      const response = await fetch('http://localhost:5000/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsDraft(true);
        alert('✅ Draft saved successfully to MongoDB!');
      } else {
        const errData = await response.json();
        alert('❌ Error saving draft: ' + (errData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ Cannot connect to server. Check if backend is running.');
    }
  };

  // --- MONGODB'YE FİNAL GÖNDERİMİ ---
  const handleSubmitForm = async () => {
    const requiredQuestions = currentQuestions.filter((q) => q.required);
    const missingAnswers = requiredQuestions.filter((q) => !answers[q.id]);

    if (missingAnswers.length > 0) {
      alert('Please answer all required questions before submitting.');
      return;
    }

    try {
      const payload = {
        projectId: project.id,
        userId: currentUser.id,
        stage: currentStage,
        answers: answers,
        riskLevel: riskLevel,
        status: 'submitted'
      };

      const response = await fetch('http://localhost:5000/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsDraft(false);
        alert('🎉 Evaluation submitted successfully!');
        onSubmit();
      } else {
        alert('Error submitting evaluation.');
      }
    } catch (error) {
      alert('Connection failed during submission.');
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setIsDraft(false); // Değişiklik yapıldı, henüz kaydedilmedi
  };

  const addCustomQuestion = (question: Question) => {
    setCustomQuestions((prev) => [
      ...prev,
      { ...question, stage: currentStage }
    ]);
  };

  const getCompletionPercentage = () => {
    const totalQuestions = currentQuestions.length;
    const answeredQuestions = currentQuestions.filter((q) => !!answers[q.id])
      .length;
    return totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <div>
                <h1 className="text-xl text-gray-900">
                  {currentUser.role.charAt(0).toUpperCase() +
                    currentUser.role.slice(1)}{' '}
                  Evaluation
                </h1>
                <p className="text-gray-600">{project.title}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                Progress: {getCompletionPercentage()}%
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${getCompletionPercentage()}%`,
                    backgroundColor: roleColor
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Stage Navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg mb-4 text-gray-900">Evaluation Stages</h2>
          <div className="flex space-x-4">
            {stages.map((stage) => (
              <button
                key={stage.key}
                onClick={() => setCurrentStage(stage.key)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center ${
                  currentStage === stage.key
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor:
                    currentStage === stage.key ? roleColor : undefined
                }}
              >
                <span className="mr-2">{stage.icon}</span>
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Stage Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-gray-900">
              {stages.find((s) => s.key === currentStage)?.label} Stage
            </h3>
            <button
              onClick={() => setShowAddQuestion(true)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Question
            </button>
          </div>

          <div className="text-sm text-gray-600">
            {currentStage === 'set-up' &&
              'Initial assessment of the AI system, its purpose, and potential risks.'}
            {currentStage === 'assess' &&
              'Detailed evaluation of ethical considerations and technical implementation.'}
            {currentStage === 'resolve' &&
              'Final analysis, recommendations, and risk assessment summary.'}
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg text-gray-900">
              {currentUser.role.charAt(0).toUpperCase() +
                currentUser.role.slice(1)}{' '}
              Questions
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Answer questions from your professional expertise perspective
            </p>
          </div>

          <div className="p-6 space-y-8">
            {currentQuestions.map((question, index) => (
              <div
                key={question.id}
                className="border-l-4 border-gray-200 pl-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-sm text-gray-500 mr-2">
                        Q{index + 1}
                      </span>
                      {question.required && (
                        <span className="text-red-500 text-xs">*</span>
                      )}
                    </div>
                    <h4 className="text-base text-gray-900 mb-3">
                      {question.text}
                    </h4>
                  </div>
                </div>

                {/* Question Input */}
                {question.type === 'multiple-choice' && (
                  <div className="space-y-2">
                    {question.options?.map((option) => (
                      <label key={option} className="flex items-center">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) =>
                            handleAnswerChange(question.id, e.target.value)
                          }
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'checkbox' && (
                  <div className="space-y-2">
                    {question.options?.map((option) => (
                      <label key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            (answers[question.id] || []).includes(option)
                          }
                          onChange={(e) => {
                            const currentAnswers: string[] =
                              answers[question.id] || [];
                            const newAnswers = e.target.checked
                              ? [...currentAnswers, option]
                              : currentAnswers.filter((a) => a !== option);
                            handleAnswerChange(question.id, newAnswers);
                          }}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'text' && (
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) =>
                      handleAnswerChange(question.id, e.target.value)
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your detailed response..."
                  />
                )}

                {question.type === 'likert' && (
                  <div className="flex space-x-4">
                    {question.options?.map((option, optionIndex) => (
                      <label
                        key={option}
                        className="flex flex-col items-center"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={optionIndex + 1}
                          checked={
                            answers[question.id] === optionIndex + 1
                          }
                          onChange={(e) =>
                            handleAnswerChange(
                              question.id,
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="mb-2"
                        />
                        <span className="text-xs text-gray-600 text-center">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {currentQuestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No questions available for this stage.</p>
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Add First Question
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
          <h3 className="text-lg mb-4 text-gray-900">
            Ethical Risk Level Assessment
          </h3>
          <div className="flex space-x-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="riskLevel"
                value="low"
                checked={riskLevel === 'low'}
                onChange={(e) =>
                  setRiskLevel(e.target.value as RiskLevel)
                }
                className="mr-2"
              />
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-green-800">Low Risk</span>
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="riskLevel"
                value="medium"
                checked={riskLevel === 'medium'}
                onChange={(e) =>
                  setRiskLevel(e.target.value as RiskLevel)
                }
                className="mr-2"
              />
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-yellow-800">Medium Risk</span>
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="riskLevel"
                value="high"
                checked={riskLevel === 'high'}
                onChange={(e) =>
                  setRiskLevel(e.target.value as RiskLevel)
                }
                className="mr-2"
              />
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-800">High Risk</span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">
            {isDraft ? 'Draft saved' : 'Unsaved changes'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </button>
            <button
              onClick={handleSubmitForm}
              className="px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90 flex items-center"
              style={{ backgroundColor: roleColor }}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Evaluation
            </button>
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
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

interface AddQuestionModalProps {
  currentStage: StageKey;
  onClose: () => void;
  onAdd: (question: Question) => void;
}

function AddQuestionModal({
  currentStage,
  onClose,
  onAdd
}: AddQuestionModalProps) {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] =
    useState<QuestionType>('text');
  const [options, setOptions] = useState<string[]>(['']);
  const [required, setRequired] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const question: Question = {
      id: `custom_${Date.now()}`,
      stage: currentStage,
      text: questionText,
      type: questionType,
      options:
        questionType !== 'text'
          ? options.filter((o) => o.trim())
          : undefined,
      required
    };

    onAdd(question);
    onClose();
  };

  const addOption = () => {
    setOptions((prev) => [...prev, '']);
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => {
      const newOptions = [...prev];
      newOptions[index] = value;
      return newOptions;
    });
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl text-gray-900">Add Custom Question</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm mb-2 text-gray-700">
              Question Text *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your question..."
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) =>
                setQuestionType(e.target.value as QuestionType)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Open Text</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="checkbox">Checkbox</option>
              <option value="likert">Likert Scale</option>
            </select>
          </div>

          {(questionType === 'multiple-choice' ||
            questionType === 'checkbox' ||
            questionType === 'likert') && (
            <div>
              <label className="block text-sm mb-2 text-gray-700">
                Options
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) =>
                        updateOption(index, e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${index + 1}`}
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Option
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Required question
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Add Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
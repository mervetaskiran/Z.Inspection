import React from 'react';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

interface PreconditionApprovalProps {
  userRole: string;
  onApproval: () => void;
  onBack: () => void;
}

const roleColors = {
  admin: '#1F2937',
  'ethical-expert': '#1E40AF',
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED',
  'technical-expert': '#0891B2',
  'legal-expert': '#B45309'
} as const;

const roleContent = {
  'ethical-expert': {
    title: 'Ethical Expert Guidelines',
    disclaimer:
      'As an ethical expert on the Z-Inspection platform, you will be evaluating AI systems from an ethical, legal, and societal perspective.',
    responsibilities: [
      'Review ethical compliance of AI systems',
      'Assess fairness and bias in algorithms',
      'Evaluate transparency and explainability',
      'Analyze social impact and accountability frameworks'
    ]
  },
  'medical-expert': {
    title: 'Medical Expert Guidelines',
    disclaimer:
      'As a medical expert on the Z-Inspection platform, you will be evaluating AI systems from a healthcare and medical ethics perspective.',
    responsibilities: [
      'Review medical ethics compliance',
      'Assess patient safety implications',
      'Evaluate clinical validity and utility',
      'Analyze healthcare regulatory compliance'
    ]
  },
  'use-case-owner': {
    title: 'Use Case Owner Guidelines',
    disclaimer:
      'As a use case owner on the Z-Inspection platform, you will be providing domain expertise and stakeholder perspective for your assigned use cases.',
    responsibilities: [
      'Provide domain-specific insights and expertise',
      'Review claims relevant to your use case',
      'Assess practical applicability and real-world impact',
      'Contribute evidence from your area of expertise'
    ]
  },
  'education-expert': {
    title: 'Education Expert Guidelines',
    disclaimer:
      'As an education expert on the Z-Inspection platform, you will be evaluating AI systems from an educational and pedagogical perspective.',
    responsibilities: [
      'Review educational impact and learning outcomes',
      'Assess accessibility and inclusive learning design',
      'Evaluate pedagogical validity and effectiveness',
      'Analyze student privacy and educational ethics compliance'
    ]
  },
  'technical-expert': {
    title: 'Technical Expert Guidelines',
    disclaimer:
      'As a technical expert on the Z-Inspection platform, you will be evaluating AI systems from a technical architecture and implementation perspective.',
    responsibilities: [
      'Review technical architecture and system design',
      'Assess data security and privacy implementations',
      'Evaluate AI model robustness and performance',
      'Analyze technical compliance and best practices'
    ]
  },
  'legal-expert': {
    title: 'Legal Expert Guidelines',
    disclaimer:
      'As a legal expert on the Z-Inspection platform, you will be evaluating AI systems from a legal compliance and regulatory perspective.',
    responsibilities: [
      'Review legal and regulatory compliance',
      'Assess data protection and privacy law adherence',
      'Evaluate liability and accountability frameworks',
      'Analyze intellectual property and contractual issues'
    ]
  }
} as const;

// RoleContent bulunamazsa kullanılacak generic fallback
const defaultContent = {
  title: 'Z-Inspection Platform Guidelines',
  disclaimer:
    'You will be contributing to the evaluation of AI systems on the Z-Inspection platform. Please review the responsibilities below before continuing.',
  responsibilities: [
    'Provide objective and well-argued assessments',
    'Respect data protection, privacy, and confidentiality rules',
    'Collaborate constructively with other experts',
    'Support the responsible and trustworthy development of AI systems'
  ]
};

export function PreconditionApproval({
  userRole,
  onApproval,
  onBack
}: PreconditionApprovalProps) {
  const content =
    roleContent[userRole as keyof typeof roleContent] ?? defaultContent;

  const roleColor =
    roleColors[userRole as keyof typeof roleColors] ?? '#1F2937';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          <h1 className="text-xl text-gray-900">Z-Inspection Platform</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Colored Header */}
          <div className="px-8 py-6" style={{ backgroundColor: roleColor }}>
            <div className="flex items-center text-white">
              <AlertCircle className="h-6 w-6 mr-3" />
              <h2 className="text-2xl">{content.title}</h2>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            <div className="mb-6">
              <h3 className="text-lg mb-3 text-gray-900">
                Platform Disclaimer
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {content.disclaimer}
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-lg mb-4 text-gray-900">
                Your Responsibilities
              </h3>
              <ul className="space-y-3">
                {content.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle
                      className="h-5 w-5 mr-3 mt-0.5"
                      style={{ color: roleColor }}
                    />
                    <span className="text-gray-700">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-yellow-800 mb-1">Important Notice</h4>
                  <p className="text-yellow-700 text-sm">
                    This platform is designed for ethical evaluation and
                    research purposes. All evaluations should be conducted with
                    professional integrity and objectivity. Your assessments
                    will contribute to the responsible development of AI
                    systems.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                By continuing, you agree to follow the Z-Inspection methodology
                guidelines.
              </div>
              <button
                onClick={onApproval}
                className="px-6 py-3 rounded-lg text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: roleColor }}
              >
                Continue to Platform
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { GitBranch, Info } from 'lucide-react';
import { EthicalPrinciple } from '../types';

interface EthicalTensionSelectorProps {
  principle1: EthicalPrinciple | undefined;
  principle2: EthicalPrinciple | undefined;
  onPrinciple1Change: (principle: EthicalPrinciple | undefined) => void;
  onPrinciple2Change: (principle: EthicalPrinciple | undefined) => void;
}

const principleColors: Record<EthicalPrinciple, string> = {
  'Fairness': 'bg-purple-100 text-purple-800 border-purple-300',
  'Privacy': 'bg-blue-100 text-blue-800 border-blue-300',
  'Accountability': 'bg-orange-100 text-orange-800 border-orange-300',
  'Transparency': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Safety': 'bg-red-100 text-red-800 border-red-300',
  'Human Oversight': 'bg-green-100 text-green-800 border-green-300',
  'Sustainability': 'bg-emerald-100 text-emerald-800 border-emerald-300'
};

export function EthicalTensionSelector({ 
  principle1, 
  principle2, 
  onPrinciple1Change, 
  onPrinciple2Change 
}: EthicalTensionSelectorProps) {
  const principles: EthicalPrinciple[] = [
    'Transparency',
    'Fairness',
    'Privacy',
    'Accountability',
    'Human Oversight',
    'Safety',
    'Sustainability'
  ];

  return (
    <div>
      <label className="block text-sm mb-2 text-gray-700 flex items-center">
        <GitBranch className="h-4 w-4 mr-2" />
        Ethical Tension
      </label>
      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
        <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          Select two ethical principles that are in conflict. This helps identify the core ethical dilemma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Principle 1 Dropdown */}
        <div>
          <label className="block text-sm mb-2 text-gray-700">
            Select Ethical Principle 1 *
          </label>
          <select
            value={principle1 || ''}
            onChange={(e) => onPrinciple1Change(e.target.value as EthicalPrinciple || undefined)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          >
            <option value="">Select a principle...</option>
            {principles.map((principle) => (
              <option 
                key={principle} 
                value={principle}
                disabled={principle2 === principle}
              >
                {principle}
              </option>
            ))}
          </select>
        </div>

        {/* Principle 2 Dropdown */}
        <div>
          <label className="block text-sm mb-2 text-gray-700">
            Select Ethical Principle 2 *
          </label>
          <select
            value={principle2 || ''}
            onChange={(e) => onPrinciple2Change(e.target.value as EthicalPrinciple || undefined)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          >
            <option value="">Select a principle...</option>
            {principles.map((principle) => (
              <option 
                key={principle} 
                value={principle}
                disabled={principle1 === principle}
              >
                {principle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {principle1 && principle2 && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center text-sm text-amber-900">
            <GitBranch className="h-4 w-4 mr-2" />
            <span>
              Tension identified: <span className="font-medium">{principle1}</span> ↔ <span className="font-medium">{principle2}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, FormEvent } from 'react';
import { ChevronRight, XCircle, Plus } from 'lucide-react';
import { Project, User, Question, QuestionType } from '../types';
import { api } from '../api';

interface AddGeneralQuestionProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onComplete: () => void;
}

const QUESTION_PRINCIPLES: Array<{ value: string; label: string }> = [
  { value: 'TRANSPARENCY', label: 'Transparency (Şeffaflık)' },
  { value: 'HUMAN AGENCY & OVERSIGHT', label: 'Human Agency & Oversight (İnsan Özerkliği ve Gözetimi)' },
  { value: 'TECHNICAL ROBUSTNESS & SAFETY', label: 'Technical Robustness & Safety (Teknik Sağlamlık ve Güvenlik)' },
  { value: 'PRIVACY & DATA GOVERNANCE', label: 'Privacy & Data Governance (Gizlilik ve Veri Yönetişimi)' },
  { value: 'DIVERSITY, NON-DISCRIMINATION & FAIRNESS', label: 'Diversity, Non-Discrimination & Fairness (Adalet)' },
  { value: 'SOCIETAL & INTERPERSONAL WELL-BEING', label: 'Societal & Interpersonal Well-Being (Toplumsal İyi Oluş)' },
  { value: 'ACCOUNTABILITY', label: 'Accountability (Hesap Verebilirlik)' },
];

export function AddGeneralQuestion({ project, currentUser, onBack, onComplete }: AddGeneralQuestionProps) {
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [text, setText] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<QuestionType>('text');
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [required, setRequired] = useState(true);
  const [principle, setPrinciple] = useState<string>(QUESTION_PRINCIPLES[0]?.value || 'TRANSPARENCY');

  const handleAddQuestion = () => {
    setShowAddQuestion(true);
  };

  const handleSubmitQuestion = async (e: FormEvent) => {
    e.preventDefault();
    const newQuestion: Question = {
      id: `custom_gen_${Date.now()}`,
      stage: 'assess', // General questions are part of assess stage
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

    // Persist to Mongo (best-effort). If it fails, keep it locally to avoid data loss.
    setCreating(true);
    try {
      const projectId = project.id || (project as any)._id;
      const userId = currentUser.id || (currentUser as any)._id;
      const res = await fetch(api('/api/evaluations/custom-questions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId, stage: 'assess', question: newQuestion }),
      });
      if (res.ok) {
        const data = await res.json();
        const saved: Question = data?.question || newQuestion;
        setCustomQuestions(prev => [...prev, saved]);
      } else {
        setCustomQuestions(prev => [...prev, newQuestion]);
      }
    } catch (err) {
      console.error('Failed to persist custom question:', err);
      setCustomQuestions(prev => [...prev, newQuestion]);
    } finally {
      setCreating(false);
    }

    // Reset form
    setText('');
    setDescription('');
    setType('text');
    setOptions(['Option 1', 'Option 2']);
    setRequired(true);
    setPrinciple(QUESTION_PRINCIPLES[0]?.value || 'TRANSPARENCY');
    setShowAddQuestion(false);
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

  const handleRemoveQuestion = (questionId: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleNext = async () => {
    // Save custom questions to backend (optional - can be saved later in evaluation)
    setSaving(true);
    try {
      // Questions will be saved when user proceeds to evaluation
      // For now, just proceed
      onComplete();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                Back
              </button>
              <div>
                <h1 className="text-xl text-gray-900 font-bold tracking-tight">
                  Add Additional Questions (Optional)
                </h1>
                <p className="text-sm text-gray-600">Project: {project.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full flex flex-col">
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col flex-1">
          <div className="p-8 border-b border-gray-100 bg-white">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-3">
              Add Custom Questions
            </h2>
            <p className="text-lg text-gray-600">
              You can add additional questions if needed. This step is optional - you can skip it and proceed to tensions.
            </p>
          </div>

          <div className="p-8 flex-1 bg-gray-50/30 overflow-y-auto">
            {customQuestions.length > 0 && (
              <div className="mb-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Added Questions</h3>
                {customQuestions.map((question) => (
                  <div key={question.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{question.text}</p>
                      {question.description && (
                        <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                      )}
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        {question.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(question.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showAddQuestion && (
              <div className="text-center py-12">
                <button
                  onClick={handleAddQuestion}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Add Question
                </button>
              </div>
            )}

            {showAddQuestion && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">New Question</h3>
                  <button
                    onClick={() => setShowAddQuestion(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmitQuestion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Question Text <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      placeholder="Enter your question..."
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
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
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                      placeholder="Add description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Answer Type</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as QuestionType)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      >
                        <option value="text">Open Text</option>
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="checkbox">Multiple Select</option>
                        <option value="likert">Rating Scale (1-5)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-xl">
                      <span className="text-sm font-medium text-gray-900">Required?</span>
                      <button
                        type="button"
                        onClick={() => setRequired(!required)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          required ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            required ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {(type === 'multiple-choice' || type === 'checkbox' || type === 'select' || type === 'radio') && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Answer Options</label>
                      <div className="space-y-2">
                        {options.map((opt, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(idx, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm"
                              placeholder={`Option ${idx + 1}`}
                              required
                            />
                            {options.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOption(idx)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addOption}
                        className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add Option
                      </button>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddQuestion(false)}
                      className="px-6 py-2 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                    >
                      {creating ? 'Saving...' : 'Add Question'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 mt-8 flex justify-between items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={onBack}
            className="flex items-center px-6 py-3 rounded-xl font-semibold transition-all border-2 text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center px-8 py-3 text-white rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700"
          >
            Next Stage <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { api } from '../api';
import { AlertCircle, TrendingUp, Users, AlertTriangle, FileText, Eye } from 'lucide-react';

interface AnalyticsDashboardProps {
  projectId: string;
  questionnaireKey?: string;
  currentUser: any;
}

interface AnalyticsData {
  projectId: string;
  questionnaireKey: string;
  updatedAt: string;
  scale: { min: number; max: number };
  thresholds: Array<{ label: string; range: number[] }>;
  participation: {
    assignedCount: number;
    submittedCount: number;
    byRole: Array<{ role: string; assigned: number; submitted: number }>;
  };
  principleBar: Array<{
    principleKey: string;
    avgScore: number;
    n: number;
    statusBucket: string;
  }>;
  rolePrincipleHeatmap: {
    roles: string[];
    principles: string[];
    matrix: number[][];
    nMatrix: number[][];
  };
  topRiskyQuestions: Array<{
    questionId: string;
    principleKey: string;
    avgRiskScore: number;
    n: number;
    rolesInvolved: string[];
    weight?: number;
  }>;
  topRiskyQuestionContext: Array<{
    questionId: string;
    role: string;
    userId: string;
    answerSnippet: string;
    score: number;
  }>;
  tensionsSummary: {
    total: number;
    accepted: number;
    underReview: number;
    disputed: number;
    proposedOrSingleReview: number;
    bySeverity: { low: number; medium: number; high: number; critical: number };
  };
  tensionsTable: Array<{
    tensionId: string;
    createdAt: string;
    createdByRole: string;
    conflict: { principle1: string; principle2: string };
    severityLevel: string;
    reviewState: string;
    agreeCount: number;
    disagreeCount: number;
    agreePct: number;
    evidenceCount: number;
    evidenceTypes: Record<string, number>;
    commentCount: number;
  }>;
  evidenceMetrics: {
    coveragePct: number;
    totalEvidenceCount: number;
    typeDistribution: Array<{ type: string; count: number }>;
  };
}

const COLORS = {
  low: '#10b981',      // emerald-500
  moderate: '#f59e0b', // amber-500
  high: '#ef4444',     // red-500
  critical: '#dc2626'  // red-600
};

const getRiskColor = (score: number) => {
  if (score <= 1) return COLORS.low;
  if (score <= 2) return COLORS.moderate;
  if (score <= 3) return COLORS.high;
  return COLORS.critical;
};

const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('low')) return COLORS.low;
  if (s.includes('moderate')) return COLORS.moderate;
  if (s.includes('high')) return COLORS.high;
  if (s.includes('critical')) return COLORS.critical;
  return '#6b7280';
};

export function AnalyticsDashboard({ projectId, questionnaireKey = 'general-v1', currentUser }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchAnalytics();
    fetchQuestions();
  }, [projectId, questionnaireKey]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/projects/${projectId}/analytics`, {
        params: { questionnaireKey }
      });
      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/questions', {
        params: { questionnaireKey }
      });
      const questionMap: Record<string, any> = {};
      response.data.forEach((q: any) => {
        questionMap[q._id || q.id] = q;
      });
      setQuestions(questionMap);
    } catch (err) {
      console.warn('Could not fetch questions:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center text-red-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-gray-500">No analytics data available.</div>
    );
  }

  // Prepare chart data
  const principleBarData = analytics.principleBar.map(p => ({
    ...p,
    principle: p.principleKey.length > 25 ? p.principleKey.substring(0, 25) + '...' : p.principleKey,
    color: getRiskColor(p.avgScore)
  }));

  const evidenceTypeData = analytics.evidenceMetrics.typeDistribution.map(d => ({
    name: d.type,
    value: d.count
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Risk</p>
              <p className="text-2xl font-bold" style={{ color: getRiskColor(analytics.principleBar.reduce((sum, p) => sum + p.avgScore, 0) / analytics.principleBar.length) }}>
                {(analytics.principleBar.reduce((sum, p) => sum + p.avgScore, 0) / analytics.principleBar.length).toFixed(2)}/4.0
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Completion</p>
              <p className="text-2xl font-bold text-blue-600">
                {analytics.participation.submittedCount}/{analytics.participation.assignedCount}
              </p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Evidence Coverage</p>
              <p className="text-2xl font-bold text-emerald-600">
                {analytics.evidenceMetrics.coveragePct.toFixed(1)}%
              </p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disputed Tensions</p>
              <p className="text-2xl font-bold text-red-600">
                {analytics.tensionsSummary.disputed}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Principle Bar Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Ethical Principles Score Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={principleBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="principle" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  fontSize={11}
                />
                <YAxis domain={[0, 4]} label={{ value: 'Score (0-4)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}/4.0`, 'Average Score']}
                  labelFormatter={(label) => `Principle: ${label}`}
                />
                <Bar dataKey="avgScore" name="Average Score">
                  {principleBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-2">Averages exclude N/A responses.</p>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-3">Scale: 0–4</h4>
              <p className="text-xs text-gray-600 mb-3">Higher score = Higher risk</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: COLORS.low }}></div>
                  <span>0-1: Low risk</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: COLORS.moderate }}></div>
                  <span>1-2: Moderate</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: COLORS.high }}></div>
                  <span>2-3: High</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: COLORS.critical }}></div>
                  <span>3-4: Critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role × Principle Heatmap */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Role × Principle Score Matrix</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left border-b">Role</th>
                {analytics.rolePrincipleHeatmap.principles.map(p => (
                  <th key={p} className="px-3 py-2 text-center border-b" title={p}>
                    {p.length > 15 ? p.substring(0, 15) + '...' : p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analytics.rolePrincipleHeatmap.roles.map((role, roleIdx) => (
                <tr key={role}>
                  <td className="px-3 py-2 font-medium border-b">{role}</td>
                  {analytics.rolePrincipleHeatmap.principles.map((principle, princIdx) => {
                    const score = analytics.rolePrincipleHeatmap.matrix[roleIdx]?.[princIdx];
                    const n = analytics.rolePrincipleHeatmap.nMatrix[roleIdx]?.[princIdx] || 0;
                    return (
                      <td 
                        key={principle}
                        className="px-3 py-2 text-center border-b"
                        style={{
                          backgroundColor: score !== null ? `rgba(${score <= 1 ? '16, 185, 129' : score <= 2 ? '245, 158, 11' : score <= 3 ? '239, 68, 68' : '220, 38, 38'}, ${0.2 + (score / 4) * 0.3})` : '#f9fafb',
                          color: score !== null ? (score > 2 ? '#fff' : '#1f2937') : '#9ca3af'
                        }}
                        title={`${role} - ${principle}: ${score !== null ? score.toFixed(2) : 'N/A'} (n=${n})`}
                      >
                        {score !== null ? score.toFixed(2) : 'N/A'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">Cells show evaluator's average risk score per principle (0-4). N/A = not submitted.</p>
      </div>

      {/* Top Risky Questions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Top Risky Questions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left border-b">Rank</th>
                <th className="px-4 py-2 text-left border-b">Principle</th>
                <th className="px-4 py-2 text-left border-b">Question</th>
                <th className="px-4 py-2 text-center border-b">Avg Risk</th>
                <th className="px-4 py-2 text-center border-b">Roles</th>
                <th className="px-4 py-2 text-center border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topRiskyQuestions.map((q, idx) => {
                const question = questions[q.questionId];
                const questionText = question?.questionEn || question?.text || question?.title || `Question ${q.questionId}`;
                return (
                  <tr key={q.questionId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{idx + 1}</td>
                    <td className="px-4 py-2 border-b">{q.principleKey}</td>
                    <td className="px-4 py-2 border-b max-w-md">
                      <span className="truncate block" title={questionText}>
                        {questionText.length > 60 ? questionText.substring(0, 60) + '...' : questionText}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center border-b">
                      <span 
                        className="px-2 py-1 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: getRiskColor(q.avgRiskScore) }}
                      >
                        {q.avgRiskScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center border-b">{q.rolesInvolved.length}</td>
                    <td className="px-4 py-2 text-center border-b">
                      <button
                        onClick={() => setSelectedQuestion(q.questionId)}
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tensions Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Ethical Tensions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left border-b">Conflict</th>
                <th className="px-4 py-2 text-center border-b">Severity</th>
                <th className="px-4 py-2 text-center border-b">Review State</th>
                <th className="px-4 py-2 text-center border-b">Consensus</th>
                <th className="px-4 py-2 text-center border-b">Evidence</th>
                <th className="px-4 py-2 text-center border-b">Types</th>
                <th className="px-4 py-2 text-center border-b">Comments</th>
              </tr>
            </thead>
            <tbody>
              {analytics.tensionsTable.map(t => (
                <tr key={t.tensionId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">
                    {t.conflict.principle1} ↔ {t.conflict.principle2}
                  </td>
                  <td className="px-4 py-2 text-center border-b">
                    <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-amber-500">
                      {t.severityLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center border-b">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      t.reviewState === 'Accepted' ? 'bg-green-100 text-green-800' :
                      t.reviewState === 'Disputed' ? 'bg-red-100 text-red-800' :
                      t.reviewState === 'Under review' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {t.reviewState}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center border-b text-xs">
                    {t.agreeCount} agree / {t.disagreeCount} disagree<br />
                    <span className="text-gray-500">({t.agreePct.toFixed(1)}% agree)</span>
                  </td>
                  <td className="px-4 py-2 text-center border-b">
                    {t.evidenceCount > 0 ? (
                      <span className="text-green-600 font-semibold">{t.evidenceCount}</span>
                    ) : (
                      <span className="text-red-600 font-semibold">No evidence</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center border-b">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {Object.entries(t.evidenceTypes).slice(0, 3).map(([type, count]) => (
                        <span key={type} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                          {type} ({count})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center border-b">{t.commentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Coverage Donut */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Evidence Coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={evidenceTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {evidenceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'][index % 6]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="md:col-span-1">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Coverage</p>
                <p className="text-2xl font-bold text-emerald-600">{analytics.evidenceMetrics.coveragePct.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Tensions with evidence</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Evidence</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.evidenceMetrics.totalEvidenceCount}</p>
                <p className="text-xs text-gray-500">Evidence items</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Question Details</h3>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {(() => {
                const question = questions[selectedQuestion];
                const questionData = analytics.topRiskyQuestions.find(q => q.questionId === selectedQuestion);
                const contexts = analytics.topRiskyQuestionContext.filter(c => c.questionId === selectedQuestion);
                
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Question</p>
                      <p className="font-medium">{question?.questionEn || question?.text || 'Question not found'}</p>
                    </div>
                    
                    {questionData && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Average Risk Score</p>
                          <p className="text-lg font-semibold" style={{ color: getRiskColor(questionData.avgRiskScore) }}>
                            {questionData.avgRiskScore.toFixed(2)}/4.0
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Principle</p>
                          <p className="font-medium">{questionData.principleKey}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Responses</p>
                          <p className="font-medium">{questionData.n}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Roles Involved</p>
                          <p className="font-medium">{questionData.rolesInvolved.join(', ')}</p>
                        </div>
                      </div>
                    )}
                    
                    {contexts.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Answer Excerpts by Role</p>
                        <div className="space-y-3">
                          {contexts.map((ctx, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-blue-600">{ctx.role}</span>
                                <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: getRiskColor(ctx.score) }}>
                                  Score: {ctx.score.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{ctx.answerSnippet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const mongoose = require('mongoose');
const Score = require('../models/score');
const Response = require('../models/response');
const Tension = mongoose.model('Tension');
const ProjectAssignment = require('../models/projectAssignment');
const Question = require('../models/question');
const User = mongoose.model('User');
const { getProjectEvaluators } = require('./reportMetricsService');

const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Compute reviewState deterministically from votes
 */
function computeReviewState(votes, createdBy) {
  if (!votes || !Array.isArray(votes)) {
    return 'Proposed';
  }
  
  // Filter out creator's votes (owner cannot vote)
  const validVotes = votes.filter(v => v.userId && v.userId.toString() !== createdBy?.toString());
  
  const totalVotes = validVotes.length;
  if (totalVotes < 2) {
    return totalVotes === 0 ? 'Proposed' : 'Single review';
  }
  
  const agreeCount = validVotes.filter(v => v.voteType === 'agree').length;
  const agreePct = agreeCount / totalVotes;
  
  if (agreePct >= 0.67) return 'Accepted';
  if (agreePct <= 0.33) return 'Disputed';
  return 'Under review';
}

/**
 * Get analytics data for a project
 * GET /api/projects/:projectId/analytics?questionnaireKey=general-v1
 */
async function getProjectAnalytics(projectId, questionnaireKey = 'general-v1') {
  const projectIdObj = isValidObjectId(projectId)
    ? new mongoose.Types.ObjectId(projectId)
    : projectId;

  const Project = mongoose.model('Project');
  const project = await Project.findById(projectIdObj).lean();
  if (!project) {
    throw new Error('Project not found');
  }

  // CRITICAL: Get evaluators ONLY from scores collection (no hardcoded Expert 1/2)
  // This ensures we only show evaluators who actually submitted and have scores
  const scores = await Score.find({
    projectId: projectIdObj,
    questionnaireKey: questionnaireKey || { $exists: true }
  }).lean();
  
  // Get unique evaluators from scores (canonical source)
  const evaluatorUserIds = [...new Set(scores.map(s => s.userId.toString()))];
  const evaluatorUsers = await User.find({ _id: { $in: evaluatorUserIds } })
    .select('_id name email role')
    .lean();
  
  const userMap = new Map(evaluatorUsers.map(u => [u._id.toString(), u]));
  
  // Build evaluator list from scores (only submitted evaluators)
  const evaluatorsFromScores = scores.map(score => {
    const user = userMap.get(score.userId.toString());
    return {
      userId: score.userId.toString(),
      name: user?.name || 'Unknown',
      email: user?.email || '',
      role: score.role || user?.role || 'unknown'
    };
  });
  
  // Get unique evaluators (by userId)
  const uniqueEvaluators = [];
  const seenUserIds = new Set();
  evaluatorsFromScores.forEach(e => {
    if (!seenUserIds.has(e.userId)) {
      seenUserIds.add(e.userId);
      uniqueEvaluators.push(e);
    }
  });
  
  // Also get assigned evaluators for participation metrics
  const evaluators = await getProjectEvaluators(projectId);

  // Get responses for answer snippets
  const responses = await Response.find({
    projectId: projectIdObj,
    questionnaireKey: questionnaireKey || { $exists: true },
    status: 'submitted'
  }).lean();

  // Get tensions
  const tensions = await Tension.find({
    projectId: projectIdObj
  }).lean();

  // Get questions for question text lookup
  const questions = await Question.find({
    questionnaireKey: questionnaireKey || { $exists: true }
  }).lean();
  const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

  // ============================================================
  // PARTICIPATION METRICS
  // ============================================================
  const assignedCount = evaluators.assigned.length;
  const submittedCount = evaluators.submitted.length;
  
  const byRole = {};
  evaluators.assigned.forEach(e => {
    const role = e.role || 'unknown';
    if (!byRole[role]) {
      byRole[role] = { role, assigned: 0, submitted: 0 };
    }
    byRole[role].assigned++;
    if (evaluators.submitted.some(s => s.userId === e.userId)) {
      byRole[role].submitted++;
    }
  });

  // ============================================================
  // PRINCIPLE BAR CHART DATA
  // ============================================================
  const principleBar = [];
  const principleScores = {};
  
  scores.forEach(score => {
    if (score.byPrinciple) {
      Object.entries(score.byPrinciple).forEach(([principleKey, data]) => {
        if (data && typeof data.avg === 'number') {
          if (!principleScores[principleKey]) {
            principleScores[principleKey] = [];
          }
          principleScores[principleKey].push(data.avg);
        }
      });
    }
  });

  const thresholds = [
    { label: 'Low risk', range: [0, 1] },
    { label: 'Moderate', range: [1, 2] },
    { label: 'High', range: [2, 3] },
    { label: 'Critical', range: [3, 4] }
  ];

  Object.entries(principleScores).forEach(([principleKey, values]) => {
    const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
    let statusBucket = 'Low risk';
    if (avgScore > 3) statusBucket = 'Critical';
    else if (avgScore > 2) statusBucket = 'High';
    else if (avgScore > 1) statusBucket = 'Moderate';
    
    principleBar.push({
      principleKey,
      avgScore: parseFloat(avgScore.toFixed(2)),
      n: values.length,
      statusBucket
    });
  });

  // Sort by principle order
  const principleOrder = [
    'TRANSPARENCY',
    'HUMAN AGENCY & OVERSIGHT',
    'TECHNICAL ROBUSTNESS & SAFETY',
    'PRIVACY & DATA GOVERNANCE',
    'DIVERSITY, NON-DISCRIMINATION & FAIRNESS',
    'SOCIETAL & INTERPERSONAL WELL-BEING',
    'ACCOUNTABILITY'
  ];
  principleBar.sort((a, b) => {
    const idxA = principleOrder.indexOf(a.principleKey);
    const idxB = principleOrder.indexOf(b.principleKey);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  // ============================================================
  // ROLE × PRINCIPLE HEATMAP
  // ============================================================
  // Use actual evaluators from scores (not hardcoded)
  // Group by role, but show individual evaluators if needed
  const roleSet = new Set();
  scores.forEach(s => {
    if (s.role) roleSet.add(s.role);
  });
  const roles = Array.from(roleSet).sort();
  const principles = principleOrder;
  
  // Build evaluator-to-role mapping for heatmap labels
  const evaluatorRoleMap = new Map();
  uniqueEvaluators.forEach(e => {
    evaluatorRoleMap.set(e.userId, { name: e.name, role: e.role });
  });

  const matrix = [];
  const nMatrix = [];
  
  roles.forEach(role => {
    const roleRow = [];
    const roleNRow = [];
    
    principles.forEach(principle => {
      const roleScores = scores
        .filter(s => s.role === role && s.byPrinciple && s.byPrinciple[principle])
        .map(s => s.byPrinciple[principle].avg)
        .filter(v => typeof v === 'number');
      
      if (roleScores.length > 0) {
        const avg = roleScores.reduce((a, b) => a + b, 0) / roleScores.length;
        roleRow.push(parseFloat(avg.toFixed(2)));
        roleNRow.push(roleScores.length);
      } else {
        roleRow.push(null); // N/A
        roleNRow.push(0);
      }
    });
    
    matrix.push(roleRow);
    nMatrix.push(roleNRow);
  });

  // ============================================================
  // TOP RISKY QUESTIONS
  // ============================================================
  const questionScores = {};
  
  scores.forEach(score => {
    if (score.byQuestion && Array.isArray(score.byQuestion)) {
      score.byQuestion.forEach(qScore => {
        if (qScore.isNA) return;
        
        const qId = qScore.questionId.toString();
        if (!questionScores[qId]) {
          questionScores[qId] = {
            questionId: qId,
            principleKey: qScore.principleKey,
            scores: [],
            roles: new Set(),
            userIds: new Set()
          };
        }
        questionScores[qId].scores.push(qScore.score);
        if (score.role) questionScores[qId].roles.add(score.role);
        if (score.userId) questionScores[qId].userIds.add(score.userId.toString());
      });
    }
  });

  // If byQuestion doesn't exist, compute from responses
  if (Object.keys(questionScores).length === 0) {
    responses.forEach(response => {
      if (response.answers && Array.isArray(response.answers)) {
        response.answers.forEach(answer => {
          if (answer.questionId && typeof answer.score === 'number') {
            const qId = answer.questionId.toString();
            const question = questionMap.get(qId);
            if (!question) return;
            
            if (!questionScores[qId]) {
              questionScores[qId] = {
                questionId: qId,
                principleKey: question.principle || 'Unknown',
                scores: [],
                roles: new Set(),
                userIds: new Set()
              };
            }
            questionScores[qId].scores.push(answer.score);
            if (response.role) questionScores[qId].roles.add(response.role);
            if (response.userId) questionScores[qId].userIds.add(response.userId.toString());
          }
        });
      }
    });
  }

  const topRiskyQuestions = Object.values(questionScores)
    .map(q => ({
      questionId: q.questionId,
      principleKey: q.principleKey,
      avgRiskScore: q.scores.reduce((a, b) => a + b, 0) / q.scores.length,
      n: q.scores.length,
      rolesInvolved: Array.from(q.roles),
      weight: 1 // Default weight
    }))
    .sort((a, b) => b.avgRiskScore - a.avgRiskScore) // Higher score = higher risk
    .slice(0, 10);

  // ============================================================
  // TOP RISKY QUESTION CONTEXT (Answer Snippets)
  // ============================================================
  const topQuestionIds = new Set(topRiskyQuestions.map(q => q.questionId));
  const topRiskyQuestionContext = [];
  
  responses.forEach(response => {
    if (response.answers && Array.isArray(response.answers)) {
      response.answers.forEach(answer => {
        const qId = answer.questionId?.toString();
        if (qId && topQuestionIds.has(qId)) {
          const answerText = answer.answerText || answer.answer?.text || '';
          if (answerText && answerText.trim().length > 20) {
            topRiskyQuestionContext.push({
              questionId: qId,
              role: response.role || 'unknown',
              userId: response.userId?.toString() || '',
              answerSnippet: answerText.trim().substring(0, 160),
              score: answer.score
            });
          }
        }
      });
    }
  });

  // ============================================================
  // TENSIONS SUMMARY
  // ============================================================
  const tensionsSummary = {
    total: tensions.length,
    accepted: 0,
    underReview: 0,
    disputed: 0,
    proposedOrSingleReview: 0,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
  };

  const tensionsTable = [];
  
  tensions.forEach(tension => {
    const reviewState = computeReviewState(tension.votes, tension.createdBy);
    
    if (reviewState === 'Accepted') tensionsSummary.accepted++;
    else if (reviewState === 'Under review') tensionsSummary.underReview++;
    else if (reviewState === 'Disputed') tensionsSummary.disputed++;
    else tensionsSummary.proposedOrSingleReview++;

    // Severity
    const severity = (tension.severityLevel || tension.severity || 'medium').toLowerCase();
    if (severity === 'low') tensionsSummary.bySeverity.low++;
    else if (severity === 'high' || severity === 'critical') tensionsSummary.bySeverity.high++;
    else tensionsSummary.bySeverity.medium++;

    // Votes
    const validVotes = (tension.votes || []).filter(v => 
      v.userId && v.userId.toString() !== tension.createdBy?.toString()
    );
    const agreeCount = validVotes.filter(v => v.voteType === 'agree').length;
    const disagreeCount = validVotes.filter(v => v.voteType === 'disagree').length;
    const agreePct = validVotes.length > 0 ? (agreeCount / validVotes.length) * 100 : 0;

    // Evidence
    const evidence = tension.evidences || tension.evidence || [];
    const evidenceCount = Array.isArray(evidence) ? evidence.length : (evidence ? 1 : 0);
    const attachmentsCount = Array.isArray(tension.attachments) ? tension.attachments.length : 0;
    const totalEvidenceCount = evidenceCount + attachmentsCount;

    // Evidence types
    const evidenceTypes = {};
    if (Array.isArray(evidence)) {
      evidence.forEach(e => {
        const type = e.type || e.evidenceType || 'Other';
        evidenceTypes[type] = (evidenceTypes[type] || 0) + 1;
      });
    }

    // Comments (from shareddiscussions or embedded)
    let commentCount = 0;
    if (tension.comments && Array.isArray(tension.comments)) {
      commentCount = tension.comments.length;
    }
    // TODO: If comments are in shareddiscussions collection, query by tensionId

    tensionsTable.push({
      tensionId: tension._id.toString(),
      createdAt: tension.createdAt,
      createdByRole: tension.createdByRole || 'unknown',
      conflict: {
        principle1: tension.principle1 || '',
        principle2: tension.principle2 || ''
      },
      severityLevel: tension.severityLevel || tension.severity || 'Unknown',
      reviewState,
      agreeCount,
      disagreeCount,
      agreePct: parseFloat(agreePct.toFixed(1)),
      evidenceCount: totalEvidenceCount,
      evidenceTypes,
      commentCount
    });
  });

  // ============================================================
  // EVIDENCE METRICS
  // ============================================================
  const tensionsWithEvidence = tensions.filter(t => {
    const evidence = t.evidences || t.evidence || [];
    const evidenceCount = Array.isArray(evidence) ? evidence.length : (evidence ? 1 : 0);
    const attachmentsCount = Array.isArray(t.attachments) ? t.attachments.length : 0;
    return evidenceCount > 0 || attachmentsCount > 0;
  }).length;

  const evidenceMetrics = {
    coveragePct: tensions.length > 0 ? (tensionsWithEvidence / tensions.length) * 100 : 0,
    totalEvidenceCount: 0,
    typeDistribution: []
  };

  const typeCounts = {};
  tensions.forEach(t => {
    const evidence = t.evidences || t.evidence || [];
    if (Array.isArray(evidence)) {
      evidence.forEach(e => {
        const type = e.type || e.evidenceType || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        evidenceMetrics.totalEvidenceCount++;
      });
    }
  });

  evidenceMetrics.typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    count
  }));

  // ============================================================
  // BUILD FINAL RESPONSE
  // ============================================================
  return {
    projectId: projectIdObj.toString(),
    questionnaireKey: questionnaireKey || 'general-v1',
    updatedAt: new Date().toISOString(),
    scale: { min: 0, max: 4 },
    thresholds,
    participation: {
      assignedCount,
      submittedCount,
      byRole: Object.values(byRole)
    },
    evaluators: uniqueEvaluators, // Actual evaluators from scores collection
    principleBar,
    rolePrincipleHeatmap: {
      roles,
      principles,
      matrix,
      nMatrix,
      evaluators: uniqueEvaluators // Include for heatmap labels
    },
    topRiskyQuestions: topRiskyQuestions.map(q => ({
      questionId: q.questionId,
      principleKey: q.principleKey,
      avgRiskScore: parseFloat(q.avgRiskScore.toFixed(2)),
      n: q.n,
      rolesInvolved: q.rolesInvolved,
      weight: q.weight
    })),
    topRiskyQuestionContext: topRiskyQuestionContext.slice(0, 20), // Limit to 20 snippets
    tensionsSummary,
    tensionsTable,
    evidenceMetrics: {
      coveragePct: parseFloat(evidenceMetrics.coveragePct.toFixed(1)),
      totalEvidenceCount: evidenceMetrics.totalEvidenceCount,
      typeDistribution: evidenceMetrics.typeDistribution
    }
  };
}

module.exports = {
  getProjectAnalytics
};


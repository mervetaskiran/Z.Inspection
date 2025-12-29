const mongoose = require('mongoose');
const Score = require('../models/score');
const Response = require('../models/response');
const Tension = mongoose.model('Tension');
const ProjectAssignment = require('../models/projectAssignment');
const Question = require('../models/question');
const User = mongoose.model('User');

const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * CRITICAL: Single source of truth for project evaluators
 * Returns both assigned and submitted evaluators with their details
 */
async function getProjectEvaluators(projectId) {
  const projectIdObj = isValidObjectId(projectId)
    ? new mongoose.Types.ObjectId(projectId)
    : projectId;

  const Project = mongoose.model('Project');
  const UseCase = mongoose.model('UseCase');
  
  // Step 1: Load assignments (prefer projectassignments collection)
  let assignedEvaluators = [];
  try {
    const assignments = await ProjectAssignment.find({
      projectId: projectIdObj
    }).lean();
    
    if (assignments.length > 0) {
      // Get user details for assigned users
      const userIds = assignments.map(a => a.userId);
      const users = await User.find({ _id: { $in: userIds } })
        .select('_id name email role')
        .lean();
      
      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      
      assignedEvaluators = assignments.map(a => {
        const user = userMap.get(a.userId.toString());
        return {
          userId: a.userId.toString(),
          name: user?.name || 'Unknown',
          email: user?.email || '',
          role: a.role || user?.role || 'unknown',
          assignmentStatus: a.status || 'assigned',
          assignedAt: a.assignedAt,
          questionnaires: a.questionnaires || []
        };
      });
    }
  } catch (e) {
    console.warn('Could not load projectassignments, trying fallback:', e.message);
  }

  // Step 2: Fallback to usecases.assignedExperts or project.assignedUsers
  if (assignedEvaluators.length === 0) {
    try {
      const project = await Project.findById(projectIdObj).lean();
      if (project && project.useCase) {
        // Try to get from UseCase
        const useCaseId = typeof project.useCase === 'string' 
          ? project.useCase 
          : (project.useCase && project.useCase.url) || project.useCase;
        
        const useCase = await UseCase.findById(useCaseId).lean();
        if (useCase && useCase.assignedExperts && useCase.assignedExperts.length > 0) {
          const userIds = useCase.assignedExperts;
          const users = await User.find({ _id: { $in: userIds } })
            .select('_id name email role')
            .lean();
          
          assignedEvaluators = users.map(u => ({
            userId: u._id.toString(),
            name: u.name || 'Unknown',
            email: u.email || '',
            role: u.role || 'unknown',
            assignmentStatus: 'assigned',
            assignedAt: null,
            questionnaires: []
          }));
        }
      }
      
      // Final fallback: project.assignedUsers
      if (assignedEvaluators.length === 0 && project && project.assignedUsers) {
        const userIds = project.assignedUsers;
        const users = await User.find({ _id: { $in: userIds } })
          .select('_id name email role')
          .lean();
        
        assignedEvaluators = users.map(u => ({
          userId: u._id.toString(),
          name: u.name || 'Unknown',
          email: u.email || '',
          role: u.role || 'unknown',
          assignmentStatus: 'assigned',
          assignedAt: null,
          questionnaires: []
        }));
      }
    } catch (e) {
      console.warn('Could not load fallback assignments:', e.message);
    }
  }

  // Step 3: Determine actual participants from responses
  const responses = await Response.find({
    projectId: projectIdObj,
    status: { $in: ['in-progress', 'submitted'] }
  })
    .sort({ submittedAt: -1, updatedAt: -1 })
    .lean();

  // Group by userId+role+questionnaireKey, keep latest
  const responseMap = new Map();
  responses.forEach(r => {
    const key = `${r.userId}_${r.role}_${r.questionnaireKey || 'general-v1'}`;
    const existing = responseMap.get(key);
    if (!existing || 
        (r.submittedAt && (!existing.submittedAt || r.submittedAt > existing.submittedAt)) ||
        (!r.submittedAt && r.updatedAt && (!existing.updatedAt || r.updatedAt > existing.updatedAt))) {
      responseMap.set(key, r);
    }
  });

  const submittedEvaluators = [];
  const submittedUserIds = new Set();
  
  // Get all unique user IDs from responses
  const responseUserIds = [...new Set(Array.from(responseMap.values()).map(r => r.userId.toString()))];
  
  // Load user details for any missing evaluators
  const missingUserIds = responseUserIds.filter(id => !assignedEvaluators.some(e => e.userId === id));
  if (missingUserIds.length > 0) {
    const missingUsers = await User.find({ _id: { $in: missingUserIds } })
      .select('_id name email role')
      .lean();
    
    missingUsers.forEach(user => {
      assignedEvaluators.push({
        userId: user._id.toString(),
        name: user.name || 'Unknown',
        email: user.email || '',
        role: user.role || 'unknown',
        assignmentStatus: 'submitted',
        assignedAt: null,
        questionnaires: []
      });
    });
  }
  
  // Build submitted evaluators list
  responseMap.forEach((response, key) => {
    const userId = response.userId.toString();
    if (!submittedUserIds.has(userId)) {
      submittedUserIds.add(userId);
      
      const evaluator = assignedEvaluators.find(e => e.userId === userId);
      if (evaluator) {
        submittedEvaluators.push({
          ...evaluator,
          responseStatus: response.status,
          submittedAt: response.submittedAt,
          questionnaireKey: response.questionnaireKey || 'general-v1'
        });
      }
    }
  });

  // Helper function to get evaluators with scores
  const getEvaluatorsWithScores = async (questionnaireKey) => {
    const scores = await Score.find({
      projectId: projectIdObj,
      questionnaireKey: questionnaireKey || { $exists: true }
    }).lean();
    
    const scoreUserIds = new Set(scores.map(s => s.userId.toString()));
    return submittedEvaluators.filter(e => scoreUserIds.has(e.userId));
  };

  return {
    assigned: assignedEvaluators,
    submitted: submittedEvaluators,
    withScores: getEvaluatorsWithScores
  };
}

/**
 * Build deterministic reportMetrics JSON from MongoDB data
 * NO LLM computation - all metrics come from stored data
 */
async function buildReportMetrics(projectId, questionnaireKey) {
  const projectIdObj = isValidObjectId(projectId)
    ? new mongoose.Types.ObjectId(projectId)
    : projectId;

  // Fetch all required data
  const Project = mongoose.model('Project');
  const project = await Project.findById(projectIdObj).lean();
  if (!project) {
    throw new Error('Project not found');
  }

  // CRITICAL: Get actual evaluators (not hardcoded)
  const evaluators = await getProjectEvaluators(projectId);
  const evaluatorsWithScores = await evaluators.withScores(questionnaireKey);

  // Get scores for this project and questionnaire
  const scores = await Score.find({
    projectId: projectIdObj,
    questionnaireKey: questionnaireKey || { $exists: true }
  }).lean();

  // Get responses
  const responses = await Response.find({
    projectId: projectIdObj,
    questionnaireKey: questionnaireKey || { $exists: true },
    status: { $in: ['draft', 'submitted', 'in-progress'] }
  }).lean();

  // Get tensions (all tensions for the project)
  const tensions = await Tension.find({
    projectId: projectIdObj
  }).lean();

  // Get questions for answer excerpts
  const questions = await Question.find({
    questionnaireKey: questionnaireKey || { $exists: true }
  }).lean();
  const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

  // Build coverage metrics using actual evaluators
  const assignedUserIds = new Set(evaluators.assigned.map(e => e.userId));
  const startedUserIds = new Set(responses.map(r => r.userId.toString()));
  const submittedUserIds = new Set(evaluators.submitted.map(e => e.userId));

  const roleStats = {};
  evaluators.assigned.forEach(e => {
    const role = e.role || 'unknown';
    if (!roleStats[role]) {
      roleStats[role] = { assigned: 0, started: 0, submitted: 0 };
    }
    roleStats[role].assigned++;
    if (startedUserIds.has(e.userId)) {
      roleStats[role].started++;
    }
    if (submittedUserIds.has(e.userId)) {
      roleStats[role].submitted++;
    }
  });

  // Core 12 questions completion (first 12 questions are common)
  const core12QuestionIds = questions
    .filter(q => q.order <= 12)
    .map(q => q._id.toString());
  const core12Responses = responses.filter(r => {
    if (!r.answers || !Array.isArray(r.answers)) return false;
    return r.answers.some(a => core12QuestionIds.includes(a.questionId.toString()));
  });
  const core12Started = new Set(core12Responses.map(r => r.userId.toString())).size;
  const core12Submitted = new Set(
    core12Responses.filter(r => r.status === 'submitted').map(r => r.userId.toString())
  ).size;

  const coverage = {
    assignedExpertsCount: assignedUserIds.size,
    expertsStartedCount: startedUserIds.size,
    expertsSubmittedCount: submittedUserIds.size,
    roles: roleStats,
    core12Completion: {
      startedPct: assignedUserIds.size > 0 ? (core12Started / assignedUserIds.size) * 100 : 0,
      submittedPct: assignedUserIds.size > 0 ? (core12Submitted / assignedUserIds.size) * 100 : 0
    }
  };

  // Build scoring metrics
  const scoring = {
    totalsOverall: {},
    byPrincipleOverall: {},
    byRole: {}
  };

  if (scores.length > 0) {
    // Aggregate totals
    const totalAvgs = scores.map(s => s.totals?.avg || 0).filter(v => v > 0);
    if (totalAvgs.length > 0) {
      scoring.totalsOverall = {
        avg: totalAvgs.reduce((a, b) => a + b, 0) / totalAvgs.length,
        min: Math.min(...totalAvgs),
        max: Math.max(...totalAvgs),
        count: totalAvgs.length
      };
    }

    // Aggregate by principle
    const principleScores = {};
    scores.forEach(score => {
      if (score.byPrinciple) {
        Object.entries(score.byPrinciple).forEach(([principle, data]) => {
          if (data && typeof data.avg === 'number') {
            if (!principleScores[principle]) {
              principleScores[principle] = [];
            }
            principleScores[principle].push(data.avg);
          }
        });
      }
    });

    Object.entries(principleScores).forEach(([principle, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const safeCount = values.filter(v => v >= 3).length;
      const notSafeCount = values.length - safeCount;
      scoring.byPrincipleOverall[principle] = {
        avgScore: avg,
        riskPct: ((values.length - safeCount) / values.length) * 100,
        safePct: (safeCount / values.length) * 100,
        safeCount,
        notSafeCount,
        count: values.length
      };
    });

    // Aggregate by role
    const roleGroups = {};
    scores.forEach(score => {
      const role = score.role || 'unknown';
      if (!roleGroups[role]) {
        roleGroups[role] = {
          totals: { scores: [] },
          byPrinciple: {}
        };
      }
      if (score.totals?.avg) {
        roleGroups[role].totals.scores.push(score.totals.avg);
      }
      if (score.byPrinciple) {
        Object.entries(score.byPrinciple).forEach(([principle, data]) => {
          if (data && typeof data.avg === 'number') {
            if (!roleGroups[role].byPrinciple[principle]) {
              roleGroups[role].byPrinciple[principle] = [];
            }
            roleGroups[role].byPrinciple[principle].push(data.avg);
          }
        });
      }
    });

    Object.entries(roleGroups).forEach(([role, data]) => {
      if (data.totals.scores.length > 0) {
        roleGroups[role].totals = {
          avg: data.totals.scores.reduce((a, b) => a + b, 0) / data.totals.scores.length,
          count: data.totals.scores.length
        };
      }
      Object.entries(data.byPrinciple).forEach(([principle, values]) => {
        roleGroups[role].byPrinciple[principle] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length
        };
      });
    });
    scoring.byRole = roleGroups;

    // Build dynamic principle-by-principle table with actual evaluators
    // This replaces hardcoded "Expert 1/2" columns with real evaluator names
    scoring.byPrincipleTable = {};
    
    // Get all unique principles from scores
    const allPrinciples = new Set();
    scores.forEach(score => {
      if (score.byPrinciple) {
        Object.keys(score.byPrinciple).forEach(p => allPrinciples.add(p));
      }
    });

    // Build table: principle -> evaluator columns
    allPrinciples.forEach(principle => {
      const principleData = {
        principle,
        evaluators: [],
        range: { min: 4, max: 0 },
        average: 0,
        count: 0
      };

      // For each evaluator with scores, get their score for this principle
      evaluatorsWithScores.forEach(evaluator => {
        const evaluatorScore = scores.find(s => 
          s.userId.toString() === evaluator.userId && 
          s.byPrinciple && 
          s.byPrinciple[principle]
        );
        
        if (evaluatorScore && evaluatorScore.byPrinciple[principle]) {
          const scoreValue = evaluatorScore.byPrinciple[principle].avg || 0;
          principleData.evaluators.push({
            userId: evaluator.userId,
            name: evaluator.name,
            role: evaluator.role,
            score: scoreValue
          });
          
          if (scoreValue < principleData.range.min) principleData.range.min = scoreValue;
          if (scoreValue > principleData.range.max) principleData.range.max = scoreValue;
        }
      });

      // Calculate average (excluding N/A = 0)
      const validScores = principleData.evaluators
        .map(e => e.score)
        .filter(s => s > 0);
      
      if (validScores.length > 0) {
        principleData.average = validScores.reduce((a, b) => a + b, 0) / validScores.length;
        principleData.count = validScores.length;
      }

      scoring.byPrincipleTable[principle] = principleData;
    });
  }

  // Build top risk drivers (questions with lowest average scores)
  const questionScores = {};
  responses.forEach(response => {
    if (response.answers && Array.isArray(response.answers)) {
      response.answers.forEach(answer => {
        if (answer.questionId && typeof answer.score === 'number') {
          const qId = answer.questionId.toString();
          if (!questionScores[qId]) {
            questionScores[qId] = [];
          }
          questionScores[qId].push({
            score: answer.score,
            role: response.role,
            answerText: answer.answer?.text || answer.answerText || '',
            questionCode: answer.questionCode || ''
          });
        }
      });
    }
  });

  const topRiskDrivers = [];
  Object.entries(questionScores).forEach(([questionId, scoreData]) => {
    const avgScore = scoreData.reduce((sum, d) => sum + d.score, 0) / scoreData.length;
    const question = questionMap.get(questionId);
    if (question && scoreData.length > 0) {
      // Get roles most at risk (lowest scores)
      const roleScores = {};
      scoreData.forEach(d => {
        if (!roleScores[d.role]) {
          roleScores[d.role] = [];
        }
        roleScores[d.role].push(d.score);
      });
      const roleAvgs = Object.entries(roleScores).map(([role, scores]) => ({
        role,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length
      }));
      roleAvgs.sort((a, b) => a.avg - b.avg);
      const rolesMostAtRisk = roleAvgs.slice(0, 2).map(r => r.role);

      // Get answer excerpts (short snippets from text answers)
      const answerExcerpts = scoreData
        .filter(d => d.answerText && d.answerText.trim().length > 20)
        .slice(0, 3)
        .map(d => d.answerText.trim().substring(0, 150));

      let severityLabel = 'Low';
      if (avgScore < 1.5) severityLabel = 'Critical';
      else if (avgScore < 2.0) severityLabel = 'High';
      else if (avgScore < 2.5) severityLabel = 'Medium';

      topRiskDrivers.push({
        questionId,
        questionCode: question.code || questionId,
        principle: question.principle || 'Unknown',
        avgRiskScore: avgScore,
        severityLabel,
        rolesMostAtRisk,
        answerExcerpts: answerExcerpts.slice(0, 2) // Limit to 2 excerpts
      });
    }
  });

  // Sort by avgRiskScore (ascending = highest risk first) and limit to top 10
  topRiskDrivers.sort((a, b) => a.avgRiskScore - b.avgRiskScore);
  topRiskDrivers.splice(10);

  // Build tensions summary
  const tensionsSummary = {
    total: tensions.length,
    accepted: 0,
    underReview: 0,
    disputed: 0,
    resolved: 0,
    avgParticipationPct: 0,
    evidenceCoveragePct: 0,
    evidenceTypeDistribution: {},
    mitigationFilledPct: 0
  };

  const tensionsList = [];
  let totalParticipation = 0;
  let tensionsWithEvidence = 0;
  let tensionsWithMitigation = 0;

  tensions.forEach(tension => {
    // Map status to reviewState if needed
    let reviewState = tension.reviewState;
    if (!reviewState) {
      // Map legacy status values to reviewState
      const status = tension.status || 'ongoing';
      if (status === 'ongoing' || status === 'proposed') reviewState = 'Proposed';
      else if (status === 'under_review' || status === 'under review') reviewState = 'Under Review';
      else if (status === 'accepted') reviewState = 'Accepted';
      else if (status === 'disputed') reviewState = 'Disputed';
      else if (status === 'resolved') reviewState = 'Resolved';
      else reviewState = 'Proposed';
    }
    if (reviewState === 'Accepted') tensionsSummary.accepted++;
    else if (reviewState === 'Under Review' || reviewState === 'under_review') tensionsSummary.underReview++;
    else if (reviewState === 'Disputed' || reviewState === 'disputed') tensionsSummary.disputed++;
    else if (reviewState === 'Resolved' || reviewState === 'resolved') tensionsSummary.resolved++;

    const evidence = tension.evidences || tension.evidence || [];
    const evidenceCount = Array.isArray(evidence) ? evidence.length : 0;
    if (evidenceCount > 0) {
      tensionsWithEvidence++;
      evidence.forEach(e => {
        const type = e.type || e.evidenceType || 'Other';
        tensionsSummary.evidenceTypeDistribution[type] = (tensionsSummary.evidenceTypeDistribution[type] || 0) + 1;
      });
    }

    const votes = tension.votes || [];
    const assignedCount = assignedUserIds.size;
    const participationPct = assignedCount > 0 ? (votes.length / assignedCount) * 100 : 0;
    totalParticipation += participationPct;

    const agreeCount = votes.filter(v => v.voteType === 'agree').length;
    const disagreeCount = votes.filter(v => v.voteType === 'disagree').length;
    const agreePct = votes.length > 0 ? (agreeCount / votes.length) * 100 : 0;

    const hasMitigation = !!(tension.mitigation?.proposed || tension.mitigation?.tradeoff?.decision);
    if (hasMitigation) tensionsWithMitigation++;

    const evidenceItems = Array.isArray(evidence) ? evidence.map(e => ({
      evidenceType: e.type || e.evidenceType || 'Other',
      text: (e.description || e.title || '').substring(0, 200),
      attachmentsCount: e.fileName ? 1 : 0,
      createdAt: e.uploadedAt || e.createdAt,
      createdBy: e.uploadedBy || e.createdBy || ''
    })) : [];

    tensionsList.push({
      tensionId: tension._id.toString(),
      createdAt: tension.createdAt,
      createdBy: tension.createdBy || '',
      conflict: {
        principle1: tension.principle1 || '',
        principle2: tension.principle2 || ''
      },
      severityLevel: tension.severityLevel || tension.severity || 'Unknown',
      claim: tension.claim || tension.claimStatement || tension.description || '',
      argument: tension.argument || tension.description || '',
      impactArea: tension.impact?.areas || [],
      affectedGroups: tension.impact?.affectedGroups || [],
      impactDescription: tension.impact?.description || '',
      mitigation: {
        proposedMitigations: tension.mitigation?.proposed || '',
        tradeOffDecision: tension.mitigation?.tradeoff?.decision || '',
        tradeOffRationale: tension.mitigation?.tradeoff?.rationale || ''
      },
      evidence: {
        count: evidenceCount,
        types: [...new Set(evidenceItems.map(e => e.evidenceType))],
        items: evidenceItems
      },
      consensus: {
        assignedExpertsCount: assignedCount,
        votesTotal: votes.length,
        participationPct,
        agreeCount,
        disagreeCount,
        agreePct,
        reviewState
      }
    });
  });

  if (tensions.length > 0) {
    tensionsSummary.avgParticipationPct = totalParticipation / tensions.length;
    tensionsSummary.evidenceCoveragePct = (tensionsWithEvidence / tensions.length) * 100;
    tensionsSummary.mitigationFilledPct = (tensionsWithMitigation / tensions.length) * 100;
  }

  // Generate charts (deterministic, backend-only)
  const chartGenerationService = require('./chartGenerationService');
  const charts = {
    principleBarChart: null,
    principleEvaluatorHeatmap: null,
    teamCompletionDonut: null,
    tensionReviewStateChart: null,
    evidenceTypeChart: null,
    severityChart: null
  };

  try {
    // Generate principle bar chart
    if (Object.keys(scoring.byPrincipleOverall).length > 0) {
      charts.principleBarChart = await chartGenerationService.generatePrincipleBarChart(
        scoring.byPrincipleOverall
      );
    }

    // Generate principle-evaluator heatmap
    if (scoring.byPrincipleTable && Object.keys(scoring.byPrincipleTable).length > 0 && evaluatorsWithScores.length > 0) {
      charts.principleEvaluatorHeatmap = await chartGenerationService.generatePrincipleEvaluatorHeatmap(
        scoring.byPrincipleTable,
        evaluatorsWithScores
      );
    }

    // Generate team completion donut
    charts.teamCompletionDonut = await chartGenerationService.generateTeamCompletionDonut(coverage);

    // Generate tension charts
    if (tensionsSummary.total > 0) {
      charts.tensionReviewStateChart = await chartGenerationService.generateTensionReviewStateChart(tensionsSummary);
      
      if (Object.keys(tensionsSummary.evidenceTypeDistribution).length > 0) {
        charts.evidenceTypeChart = await chartGenerationService.generateEvidenceTypeChart(
          tensionsSummary.evidenceTypeDistribution
        );
      }
      
      if (tensionsList.length > 0) {
        charts.severityChart = await chartGenerationService.generateSeverityChart(tensionsList);
      }
    }
  } catch (chartError) {
    console.warn('⚠️ Chart generation failed (non-critical):', chartError.message);
    // Continue without charts - report can still be generated
  }

  // Build final reportMetrics structure
  const reportMetrics = {
    project: {
      projectId: project._id.toString(),
      title: project.title || 'Untitled Project',
      category: project.category || '',
      ownerId: project.ownerId ? project.ownerId.toString() : '',
      createdAt: project.createdAt,
      questionnaireKey: questionnaireKey || 'general-v1',
      questionnaireVersion: responses.length > 0 ? responses[0].questionnaireVersion : 1
    },
    evaluators: {
      assigned: evaluators.assigned.map(e => ({
        userId: e.userId,
        name: e.name,
        role: e.role,
        email: e.email
      })),
      submitted: evaluators.submitted.map(e => ({
        userId: e.userId,
        name: e.name,
        role: e.role,
        email: e.email,
        questionnaireKey: e.questionnaireKey
      })),
      withScores: evaluatorsWithScores.map(e => ({
        userId: e.userId,
        name: e.name,
        role: e.role,
        email: e.email
      }))
    },
    coverage,
    scoring,
    topRiskDrivers: {
      questions: topRiskDrivers,
      method: 'derived from scores + joined answer snippets from responses'
    },
    tensions: {
      summary: tensionsSummary,
      list: tensionsList
    },
    charts: {
      // Chart buffers will be stored separately, but metadata is included here
      available: {
        principleBarChart: charts.principleBarChart !== null,
        principleEvaluatorHeatmap: charts.principleEvaluatorHeatmap !== null,
        teamCompletionDonut: charts.teamCompletionDonut !== null,
        tensionReviewStateChart: charts.tensionReviewStateChart !== null,
        evidenceTypeChart: charts.evidenceTypeChart !== null,
        severityChart: charts.severityChart !== null
      }
    }
  };

  // Store chart buffers separately (they're too large for JSON)
  reportMetrics._chartBuffers = charts;

  return reportMetrics;
}

module.exports = {
  buildReportMetrics,
  getProjectEvaluators
};


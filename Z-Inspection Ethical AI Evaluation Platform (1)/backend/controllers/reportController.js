const mongoose = require('mongoose');
const { generateReport, generateDashboardNarrative } = require('../services/geminiService');
const { generatePDFFromMarkdown } = require('../services/pdfService');
const { generateDOCXFromMarkdown } = require('../services/docxService');

// Helper function for ObjectId validation (compatible with Mongoose v9+)
const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

// Get models from mongoose (they are defined in server.js)
const Report = mongoose.model('Report');
const Project = mongoose.model('Project');
const GeneralQuestionsAnswers = mongoose.model('GeneralQuestionsAnswers');
const Evaluation = mongoose.model('Evaluation');
const Tension = mongoose.model('Tension');
const User = mongoose.model('User');
const Score = require('../models/score'); // Score model (separate file)

/**
 * ============================================================
 * AUTH HELPERS (MINIMAL-REFACTOR)
 * ============================================================
 * This codebase does not use JWT/sessions; requests typically include `userId`.
 * We enforce role-based permissions by looking up the user by that id.
 */

const toObjectIdOrValue = (id) => {
  if (!id) return null;
  return isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
};

const getRoleCategory = (role) => {
  const r = String(role || '').toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r.includes('viewer')) return 'viewer';
  // Treat anything else as expert for backward compatibility (e.g., medical-expert)
  return 'expert';
};

const getUserIdFromReq = (req) => {
  return (
    req?.body?.userId ||
    req?.query?.userId ||
    req?.headers?.['x-user-id'] ||
    req?.headers?.['x-userid'] ||
    null
  );
};

const loadRequestUser = async (req) => {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    const err = new Error('User ID is required for this operation');
    err.statusCode = 400;
    throw err;
  }

  const userIdObj = toObjectIdOrValue(userId);
  const user = await User.findById(userIdObj).select('_id name email role').lean();
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    user,
    userIdObj: user._id,
    roleCategory: getRoleCategory(user.role)
  };
};

const isUserAssignedToProject = async ({ userIdObj, projectIdObj }) => {
  try {
    const ProjectAssignment = require('../models/projectAssignment');
    const assignment = await ProjectAssignment.findOne({
      projectId: projectIdObj,
      userId: userIdObj
    }).select('_id').lean();

    if (assignment) return true;
  } catch (e) {
    // ignore; fall back to Project.assignedUsers check
  }

  const project = await Project.findOne({
    _id: projectIdObj,
    assignedUsers: userIdObj
  }).select('_id').lean();

  return Boolean(project);
};

const buildExportMarkdownFromReport = (report) => {
  const title = report?.title || 'Report';
  const content = String(report?.content || '').trim();

  // Prefer exporting the Gemini-generated report body (legacy `content` field).
  // Export should NOT include expert comments (requested).
  let md = '';

  if (content) {
    // If the content already looks like markdown with a top-level heading, keep it as-is.
    // Otherwise prepend the report title for a consistent export.
    const startsWithHeading = /^#\s+\S/.test(content);
    md = startsWithHeading ? `${content}\n\n` : `# ${title}\n\n${content}\n\n`;
  } else {
    // Fallback when content is missing (older drafts or partial saves)
    md = `# ${title}\n\n`;
  }

  return md;
};

/**
 * Helper function to collect all analysis data for a project
 */
async function collectAnalysisData(projectId) {
  try {
    const projectIdObj = isValidObjectId(projectId) 
      ? new mongoose.Types.ObjectId(projectId) 
      : projectId;

    // Get project
    const project = await Project.findById(projectIdObj).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    // Ensure all scores are computed before generating report
    // This ensures medical and education scores are included
    const Response = require('../models/response');
    const { computeScores } = require('../services/evaluationService');
    
    // Get all unique userId/questionnaireKey combinations for this project
    const responses = await Response.find({ 
      projectId: projectIdObj,
      status: { $in: ['draft', 'submitted'] }
    }).select('userId questionnaireKey').lean();
    
    const uniqueCombinations = new Set();
    responses.forEach(r => {
      uniqueCombinations.add(`${r.userId}_${r.questionnaireKey}`);
    });
    
    // Compute scores for all combinations (if not already computed or outdated)
    for (const combo of uniqueCombinations) {
      const [userId, questionnaireKey] = combo.split('_');
      try {
        await computeScores(projectIdObj, userId, questionnaireKey);
      } catch (error) {
        console.warn(`⚠️ Could not compute scores for ${userId}/${questionnaireKey}:`, error.message);
      }
    }

    // Get all scores (now including newly computed ones)
    const scores = await Score.find({ projectId: projectIdObj }).lean();

    // Get general questions answers
    const generalAnswers = await GeneralQuestionsAnswers.find({ 
      projectId: projectIdObj 
    }).lean();

    // Get evaluations
    const evaluations = await Evaluation.find({ 
      projectId: projectIdObj 
    }).lean();

    // Get tensions
    const tensions = await Tension.find({ 
      projectId: projectIdObj 
    }).lean();

    // Get assigned users
    const users = await User.find({ 
      _id: { $in: project.assignedUsers || [] } 
    }).select('name email role').lean();

    return {
      project,
      scores,
      generalAnswers,
      evaluations,
      tensions,
      users
    };
  } catch (error) {
    console.error('Error collecting analysis data:', error);
    throw error;
  }
}

/**
 * POST /api/reports/generate
 * Generate AI report for a project
 */
exports.generateReport = async (req, res) => {
  try {
    const { projectId } = req.body;

    const { user, userIdObj, roleCategory } = await loadRequestUser(req);
    if (roleCategory !== 'admin') {
      return res.status(403).json({ error: 'Only Admin can generate reports.' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    console.log('📊 Generating report for project:', projectId);

    // Collect all analysis data
    const analysisData = await collectAnalysisData(projectId);

    // Generate report using Gemini AI
    console.log('🤖 Calling Gemini API...');
    const reportContent = await generateReport(analysisData);

    // Calculate metadata
    const metadata = {
      totalScores: analysisData.scores.length,
      totalEvaluations: analysisData.evaluations.length,
      totalTensions: analysisData.tensions.length,
      principlesAnalyzed: [
        'TRANSPARENCY',
        'HUMAN AGENCY & OVERSIGHT',
        'TECHNICAL ROBUSTNESS & SAFETY',
        'PRIVACY & DATA GOVERNANCE',
        'DIVERSITY, NON-DISCRIMINATION & FAIRNESS',
        'SOCIETAL & INTERPERSONAL WELL-BEING',
        'ACCOUNTABILITY'
      ]
    };

    // Save report to database
    // Save report to database as DRAFT (AI output is not final)
    const projectIdObj = isValidObjectId(projectId)
      ? new mongoose.Types.ObjectId(projectId)
      : projectId;

    const report = new Report({
      projectId: projectIdObj,
      useCaseId: projectIdObj,
      title: `Analysis Report - ${analysisData.project.title || 'Project'}`,
      // Legacy compatibility
      content: reportContent,
      generatedBy: userIdObj,
      metadata,
      status: 'draft'
    });

    await report.save();

    console.log('✅ Report generated and saved:', report._id);

    // Notify all assigned experts (excluding admin who generated the report)
    try {
      const Message = mongoose.model('Message');
      
      if (analysisData.project && analysisData.project.assignedUsers && analysisData.project.assignedUsers.length > 0) {
        const assignedUserIds = analysisData.project.assignedUsers
          .map(id => {
            const idStr = id.toString ? id.toString() : String(id);
            return isValidObjectId(idStr) ? new mongoose.Types.ObjectId(idStr) : id;
          })
          .filter(id => {
            // Exclude the admin who generated the report
            if (userIdObj) {
              const idStr = id.toString ? id.toString() : String(id);
              const userIdStr = userIdObj.toString ? userIdObj.toString() : String(userIdObj);
              if (idStr === userIdStr) {
                return false;
              }
            }
            return true;
          });

        if (assignedUserIds.length > 0) {
          const projectTitle = analysisData.project.title || 'Project';
          const notificationText = `[NOTIFICATION] A new report draft has been generated for project "${projectTitle}". You can review it in the Reports section.`;
          
          const projectIdObj = isValidObjectId(projectId)
            ? new mongoose.Types.ObjectId(projectId)
            : projectId;
          
          await Promise.all(
            assignedUserIds.map(assignedUserId =>
              Message.create({
                projectId: projectIdObj,
                fromUserId: userIdObj || assignedUserId, // Use admin ID if available, otherwise use assigned user ID
                toUserId: assignedUserId,
                text: notificationText,
                isNotification: true,
                createdAt: new Date(),
                readAt: null,
              })
            )
          );
          
          console.log(`📬 Notifications sent to ${assignedUserIds.length} assigned expert(s)`);
        }
      }
    } catch (notificationError) {
      // Don't fail report generation if notification fails
      console.error('⚠️ Error sending notifications:', notificationError);
    }

    res.json({
      success: true,
      report: {
        id: report._id,
        title: report.title,
        generatedAt: report.generatedAt,
        metadata: report.metadata,
        status: report.status
      }
    });
  } catch (err) {
    console.error('❌ Error generating report:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', JSON.stringify(err, null, 2));
    
    // More detailed error message
    let errorMessage = err.message || 'Failed to generate report';
    
    // Hata mesajı zaten geminiService'den detaylı geliyor, sadece ek kontroller yap
    if (err.message && (err.message.includes('404') || err.message.includes('NOT_FOUND'))) {
      if (!errorMessage.includes('Gemini API')) {
        errorMessage = 'Gemini API model not found. Please check API key and model availability. ' + errorMessage;
      }
    } else if (err.message && (err.message.includes('API key') || err.message.includes('PERMISSION_DENIED'))) {
      if (!errorMessage.includes('API Key')) {
        errorMessage = 'Invalid Gemini API key. Please check your API key. ' + errorMessage;
      }
    } else if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))) {
      errorMessage = 'API quota exceeded. Please try again later.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      originalError: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * GET /api/reports
 * Get all reports (optionally filtered by projectId and status)
 */
exports.getAllReports = async (req, res) => {
  try {
    const { projectId, status } = req.query;
    const { roleCategory } = await loadRequestUser(req);
    if (roleCategory !== 'admin') {
      return res.status(403).json({ error: 'Only Admin can list all reports.' });
    }

    const query = {};
    if (projectId) {
      query.projectId = isValidObjectId(projectId)
        ? new mongoose.Types.ObjectId(projectId)
        : projectId;
    }
    if (status) {
      query.status = status;
    }

    const reports = await Report.find(query)
      .select('-content -sections')
      .populate('projectId', 'title')
      .populate('generatedBy', 'name email')
      .sort({ generatedAt: -1 })
      .lean();

    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/reports/:id
 * Get specific report by ID
 */
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIdObj, roleCategory } = await loadRequestUser(req);

    const report = await Report.findById(id)
      .select('-content -sections')
      .populate('projectId', 'title description')
      .populate('generatedBy', 'name email role')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Authorization: admin can view all. Expert/Viewer can only view reports for assigned projects.
    if (roleCategory !== 'admin') {
      const projectIdObj = report?.projectId?._id || report?.projectId;
      const ok = await isUserAssignedToProject({
        userIdObj,
        projectIdObj: toObjectIdOrValue(projectIdObj)
      });
      if (!ok) {
        return res.status(403).json({ error: 'Not authorized to view this report.' });
      }
    }

    // Enforce visibility rules for expertComments
    const comments = Array.isArray(report?.expertComments) ? report.expertComments : [];
    if (roleCategory === 'admin') {
      report.expertComments = comments;
    } else if (roleCategory === 'expert') {
      report.expertComments = comments.filter((c) => String(c?.expertId) === String(userIdObj));
    } else {
      report.expertComments = [];
    }

    res.json(report);
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * PUT /api/reports/:id
 * Update report (status, title, etc.)
 */
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title } = req.body;
    const { roleCategory } = await loadRequestUser(req);

    if (roleCategory !== 'admin') {
      return res.status(403).json({ error: 'Only Admin can update report metadata.' });
    }

    const update = {};
    if (status) update.status = status;
    if (title) update.title = title;

    const report = await Report.findByIdAndUpdate(
      id,
      update,
      { new: true }
    )
      .select('-content -sections')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleCategory } = await loadRequestUser(req);

    if (roleCategory !== 'admin') {
      return res.status(403).json({ error: 'Only Admin can delete reports.' });
    }

    const deleted = await Report.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/reports/my-reports
 * Get reports for projects assigned to the current user
 */
exports.getMyReports = async (req, res) => {
  try {
    const { userIdObj, roleCategory } = await loadRequestUser(req);

    // Find all projects where user is assigned (ProjectAssignment is the primary source)
    let projectIds = [];

    try {
      const ProjectAssignment = require('../models/projectAssignment');
      const assignments = await ProjectAssignment.find({ userId: userIdObj })
        .select('projectId')
        .lean();
      projectIds = assignments.map(a => a.projectId);
    } catch (e) {
      // ignore
    }

    // Fallback: Project.assignedUsers
    const projects = await Project.find({ assignedUsers: userIdObj }).select('_id title').lean();
    projectIds = Array.from(new Set([
      ...projectIds.map(String),
      ...projects.map(p => String(p._id))
    ])).map(id => new mongoose.Types.ObjectId(id));

    if (projectIds.length === 0) {
      return res.json([]);
    }

    // Find all reports for these projects
    const reports = await Report.find({
      projectId: { $in: projectIds }
    })
      .select('-content -sections')
      .populate('projectId', 'title')
      .populate('generatedBy', 'name email')
      .sort({ generatedAt: -1 })
      .lean();

    // Enforce visibility rules for expertComments in list endpoints too
    const safe = reports.map((r) => {
      const comments = Array.isArray(r?.expertComments) ? r.expertComments : [];
      if (roleCategory === 'admin') return r;
      if (roleCategory === 'expert') return { ...r, expertComments: comments.filter((c) => String(c?.expertId) === String(userIdObj)) };
      return { ...r, expertComments: [] };
    });

    res.json(safe);
  } catch (err) {
    console.error('Error fetching user reports:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/reports/:id/download
 * Download report as PDF
 */
exports.downloadReportPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIdObj, roleCategory } = await loadRequestUser(req);

    const report = await Report.findById(id)
      .select('title projectId content')
      .populate('projectId', 'title')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Authorization: admin can export all. Expert/Viewer can export assigned reports.
    if (roleCategory !== 'admin') {
      const projectIdObj = report?.projectId?._id || report?.projectId;
      const ok = await isUserAssignedToProject({
        userIdObj,
        projectIdObj: toObjectIdOrValue(projectIdObj)
      });
      if (!ok) {
        return res.status(403).json({ error: 'Not authorized to download this report.' });
      }
    }

    console.log('📄 Generating PDF for report:', id);

    // Generate PDF from markdown content
    const pdfBuffer = await generatePDFFromMarkdown(
      buildExportMarkdownFromReport(report),
      report.title
    );

    // Set response headers for PDF download
    const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_')}_${id}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to generate PDF' });
  }
};

/**
 * GET /api/reports/:id/download-docx
 * Download report as DOCX (Word)
 */
exports.downloadReportDOCX = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIdObj, roleCategory } = await loadRequestUser(req);

    const report = await Report.findById(id)
      .select('title projectId content')
      .populate('projectId', 'title')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Authorization: admin can export all. Expert/Viewer can export assigned reports.
    if (roleCategory !== 'admin') {
      const projectIdObj = report?.projectId?._id || report?.projectId;
      const ok = await isUserAssignedToProject({
        userIdObj,
        projectIdObj: toObjectIdOrValue(projectIdObj)
      });
      if (!ok) {
        return res.status(403).json({ error: 'Not authorized to download this report.' });
      }
    }

    console.log('📝 Generating DOCX for report:', id);

    const docxBuffer = await generateDOCXFromMarkdown(
      buildExportMarkdownFromReport(report),
      report.title
    );

    const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_')}_${id}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    res.send(docxBuffer);
  } catch (err) {
    console.error('Error generating DOCX:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to generate DOCX' });
  }
};

/**
 * GET /api/reports/assigned-to-me
 * Expert/Viewer can list reports for assigned projects. Admin can also use it.
 */
exports.getAssignedToMe = async (req, res) => {
  try {
    const { userIdObj, roleCategory } = await loadRequestUser(req);

    let projectIds = [];
    try {
      const ProjectAssignment = require('../models/projectAssignment');
      const assignments = await ProjectAssignment.find({ userId: userIdObj })
        .select('projectId')
        .lean();
      projectIds = assignments.map(a => a.projectId);
    } catch (e) {
      // ignore
    }

    const projects = await Project.find({ assignedUsers: userIdObj }).select('_id').lean();
    projectIds = Array.from(new Set([
      ...projectIds.map(String),
      ...projects.map(p => String(p._id))
    ])).map(id => new mongoose.Types.ObjectId(id));

    if (projectIds.length === 0) return res.json([]);

    const reports = await Report.find({ projectId: { $in: projectIds } })
      .select('-content -sections')
      .populate('projectId', 'title')
      .populate('generatedBy', 'name email')
      .sort({ generatedAt: -1 })
      .lean();

    // Enforce visibility rules for expertComments in list endpoints too
    const safe = reports.map((r) => {
      const comments = Array.isArray(r?.expertComments) ? r.expertComments : [];
      if (roleCategory === 'admin') return r;
      if (roleCategory === 'expert') return { ...r, expertComments: comments.filter((c) => String(c?.expertId) === String(userIdObj)) };
      return { ...r, expertComments: [] };
    });

    res.json(safe);
  } catch (err) {
    console.error('Error fetching assigned reports:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * POST /api/reports/:id/expert-comment
 * Expert (and Admin) can upsert their own comment on a draft report.
 */
exports.saveExpertComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentText } = req.body;
    const { user, userIdObj, roleCategory } = await loadRequestUser(req);

    if (roleCategory === 'viewer') {
      return res.status(403).json({ error: 'Viewer cannot comment on reports.' });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (report.status === 'final') {
      return res.status(409).json({ error: 'Report is finalized and locked.' });
    }

    if (roleCategory !== 'admin') {
      const ok = await isUserAssignedToProject({
        userIdObj,
        projectIdObj: toObjectIdOrValue(report.projectId)
      });
      if (!ok) {
        return res.status(403).json({ error: 'Not authorized to comment on this report.' });
      }
    }

    report.expertComments = Array.isArray(report.expertComments) ? report.expertComments : [];
    const idx = report.expertComments.findIndex((c) => String(c?.expertId) === String(userIdObj));

    const next = {
      expertId: userIdObj,
      expertName: user?.name || 'Expert',
      commentText: String(commentText || ''),
      updatedAt: new Date()
    };

    if (idx >= 0) {
      report.expertComments[idx] = { ...report.expertComments[idx], ...next };
    } else {
      report.expertComments.push(next);
    }

    await report.save();

    res.json({ success: true, expertComment: next });
  } catch (err) {
    console.error('Error saving expert comment:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * POST /api/reports/:id/finalize
 * Admin-only: marks report as final and locks edits/comments.
 */
exports.finalizeReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleCategory } = await loadRequestUser(req);

    if (roleCategory !== 'admin') {
      return res.status(403).json({ error: 'Only Admin can finalize reports.' });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (report.status === 'final') {
      return res.json({ success: true, report: report.toObject() });
    }

    report.status = 'final';
    report.finalizedAt = new Date();
    report.version = (report.version || 1) + 1;
    await report.save();

    res.json({ success: true, report: report.toObject() });
  } catch (err) {
    console.error('Error finalizing report:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * POST /api/reports/generate-dashboard-narrative
 * Generate narrative synthesis from dashboard metrics, scores, and tensions
 */
exports.generateDashboardNarrative = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const projectIdObj = isValidObjectId(projectId) 
      ? new mongoose.Types.ObjectId(projectId) 
      : projectId;

    // Verify project exists
    const project = await Project.findById(projectIdObj).lean();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Collect all necessary data
    const { scores, tensions } = await collectAnalysisData(projectIdObj);

    // Build dashboardMetrics from scores
    const dashboardMetrics = {
      overallScores: {},
      byPrinciple: {},
      roleBreakdowns: {}
    };

    // Aggregate overall scores
    if (scores.length > 0) {
      const allTotals = scores.map(s => s.totals?.avg || 0).filter(v => v > 0);
      if (allTotals.length > 0) {
        dashboardMetrics.overallScores = {
          avg: allTotals.reduce((a, b) => a + b, 0) / allTotals.length,
          min: Math.min(...allTotals),
          max: Math.max(...allTotals),
          count: allTotals.length
        };
      }

      // Aggregate by principle
      const principleScores = {};
      scores.forEach(score => {
        if (score.byPrinciple) {
          Object.entries(score.byPrinciple).forEach(([principle, data]) => {
            if (data && data.avg !== undefined) {
              if (!principleScores[principle]) {
                principleScores[principle] = [];
              }
              principleScores[principle].push(data.avg);
            }
          });
        }
      });

      Object.entries(principleScores).forEach(([principle, values]) => {
        dashboardMetrics.byPrinciple[principle] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      });

      // Role breakdowns
      const roleGroups = {};
      scores.forEach(score => {
        const role = score.role || 'unknown';
        if (!roleGroups[role]) {
          roleGroups[role] = [];
        }
        if (score.totals?.avg) {
          roleGroups[role].push(score.totals.avg);
        }
      });

      Object.entries(roleGroups).forEach(([role, values]) => {
        dashboardMetrics.roleBreakdowns[role] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length
        };
      });
    }

    // Build topRiskyQuestions (questions with lowest scores)
    const Response = require('../models/response');
    const Question = require('../models/question');
    
    const responses = await Response.find({ 
      projectId: projectIdObj,
      status: 'submitted'
    }).lean();

    const questionScores = {};
    for (const response of responses) {
      if (response.answers && Array.isArray(response.answers)) {
        for (const answer of response.answers) {
          if (answer.score !== undefined && answer.questionId) {
            const questionId = answer.questionId.toString();
            if (!questionScores[questionId]) {
              questionScores[questionId] = [];
            }
            questionScores[questionId].push(answer.score);
          }
        }
      }
    }

    const topRiskyQuestions = [];
    for (const [questionId, scores] of Object.entries(questionScores)) {
      const avgRisk = scores.reduce((a, b) => a + b, 0) / scores.length;
      // Lower score = higher risk, so we want questions with avgRisk < 2.0
      if (avgRisk < 2.0 && scores.length > 0) {
        try {
          const question = await Question.findById(questionId).lean();
          if (question) {
            topRiskyQuestions.push({
              questionId: questionId,
              questionCode: question.code || questionId,
              principle: question.principle || 'Unknown',
              avgRisk: avgRisk,
              count: scores.length
            });
          }
        } catch (err) {
          // Skip if question not found
        }
      }
    }

    // Sort by avgRisk (ascending = highest risk first) and limit to top 10
    topRiskyQuestions.sort((a, b) => a.avgRisk - b.avgRisk);
    topRiskyQuestions.splice(10);

    // Build tensionSummaries
    const tensionSummaries = tensions.map(tension => ({
      claim: tension.claim || tension.claimStatement || '',
      principle1: tension.principle1 || '',
      principle2: tension.principle2 || '',
      severity: tension.severityLevel || tension.severity || 'Unknown',
      reviewState: tension.reviewState || 'Proposed',
      evidenceCount: Array.isArray(tension.evidence) ? tension.evidence.length : 0,
      evidenceTypes: Array.isArray(tension.evidence) 
        ? [...new Set(tension.evidence.map(e => e.evidenceType || 'Unknown').filter(Boolean))]
        : []
    }));

    // Build responseExcerpts (optional - sample a few expert answers)
    const responseExcerpts = [];
    const sampleResponses = responses.slice(0, 5); // Sample first 5 responses
    for (const response of sampleResponses) {
      if (response.answers && Array.isArray(response.answers)) {
        const textAnswers = response.answers
          .filter(a => a.answerText && a.answerText.trim().length > 20)
          .slice(0, 2); // Max 2 excerpts per response
        
        textAnswers.forEach(answer => {
          responseExcerpts.push({
            questionCode: answer.questionCode || 'Unknown',
            excerpt: answer.answerText.substring(0, 200) // Limit to 200 chars
          });
        });
      }
    }

    // Prepare input data for narrative generation
    const inputData = {
      dashboardMetrics,
      topRiskyQuestions,
      responseExcerpts: responseExcerpts.length > 0 ? responseExcerpts : undefined,
      tensionSummaries: tensionSummaries.length > 0 ? tensionSummaries : undefined
    };

    // Generate narrative
    const narrative = await generateDashboardNarrative(inputData);

    res.json({
      success: true,
      narrative
    });
  } catch (err) {
    console.error('Error generating dashboard narrative:', err);
    res.status(err.statusCode || 500).json({ 
      success: false,
      error: err.message || 'Failed to generate dashboard narrative'
    });
  }
};


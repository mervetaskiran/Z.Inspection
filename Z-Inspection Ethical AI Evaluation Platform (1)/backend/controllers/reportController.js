const mongoose = require('mongoose');
const { generateReport } = require('../services/geminiService');
const { generatePDFFromMarkdown } = require('../services/pdfService');

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

const chooseSectionContentForExport = (section) => {
  const expert = (section?.expertEdit || '').trim();
  if (expert.length > 0) return expert;
  return section?.aiDraft || '';
};

const buildExportMarkdownFromReport = (report) => {
  // New workflow: sections[]
  if (Array.isArray(report?.sections) && report.sections.length > 0) {
    let md = '';
    md += `> **Note:** This report contains AI-generated draft content and has been reviewed/edited by human experts.\n\n`;

    // If there is a single FULL_REPORT section, export it directly (plus the note above)
    const single = report.sections.length === 1 ? report.sections[0] : null;
    if (single && String(single.principle || '').toUpperCase() === 'FULL_REPORT') {
      md += `${chooseSectionContentForExport(single)}\n`;
      return md;
    }

    for (const section of report.sections) {
      const principle = section?.principle || 'Section';
      md += `## ${principle}\n\n`;
      md += `${chooseSectionContentForExport(section)}\n\n`;
    }

    return md;
  }

  // Legacy fallback: content
  const legacy = report?.content || '';
  if (!legacy) return '';
  return `> **Note:** This report contains AI-generated draft content and has been reviewed/edited by human experts.\n\n${legacy}\n`;
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
      // New workflow payload
      sections: [{
        principle: 'FULL_REPORT',
        aiDraft: reportContent,
        expertEdit: '',
        comments: []
      }],
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
        content: report.content, // legacy
        sections: report.sections,
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
    ).lean();

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
    const { userIdObj } = await loadRequestUser(req);

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
      .populate('projectId', 'title')
      .populate('generatedBy', 'name email')
      .sort({ generatedAt: -1 })
      .lean();

    res.json(reports);
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
 * GET /api/reports/assigned-to-me
 * Expert/Viewer can list reports for assigned projects. Admin can also use it.
 */
exports.getAssignedToMe = async (req, res) => {
  try {
    const { userIdObj } = await loadRequestUser(req);

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
      .populate('projectId', 'title')
      .populate('generatedBy', 'name email')
      .sort({ generatedAt: -1 })
      .lean();

    res.json(reports);
  } catch (err) {
    console.error('Error fetching assigned reports:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * PATCH /api/reports/:id/sections/:principle/expert-edit
 * Expert (and Admin) can update expertEdit on a draft report.
 */
exports.updateSectionExpertEdit = async (req, res) => {
  try {
    const { id, principle } = req.params;
    const { expertEdit } = req.body;
    const { userIdObj, roleCategory } = await loadRequestUser(req);

    if (roleCategory === 'viewer') {
      return res.status(403).json({ error: 'Viewer cannot edit reports.' });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Locked after finalize
    if (report.status === 'final') {
      return res.status(409).json({ error: 'Report is finalized and locked.' });
    }

    if (roleCategory !== 'admin') {
      const ok = await isUserAssignedToProject({
        userIdObj,
        projectIdObj: toObjectIdOrValue(report.projectId)
      });
      if (!ok) {
        return res.status(403).json({ error: 'Not authorized to edit this report.' });
      }
    }

    const targetPrinciple = decodeURIComponent(principle || '');
    report.sections = Array.isArray(report.sections) ? report.sections : [];

    let section = report.sections.find(s => s.principle === targetPrinciple);
    if (!section) {
      section = { principle: targetPrinciple, aiDraft: '', expertEdit: '', comments: [] };
      report.sections.push(section);
    }

    section.expertEdit = String(expertEdit || '');

    await report.save();
    res.json({ success: true, report: report.toObject() });
  } catch (err) {
    console.error('Error updating expert edit:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * POST /api/reports/:id/sections/:principle/comments
 * Expert (and Admin) can comment on a draft report.
 */
exports.addSectionComment = async (req, res) => {
  try {
    const { id, principle } = req.params;
    const { text } = req.body;
    const { user, userIdObj, roleCategory } = await loadRequestUser(req);

    if (roleCategory === 'viewer') {
      return res.status(403).json({ error: 'Viewer cannot comment on reports.' });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
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

    const targetPrinciple = decodeURIComponent(principle || '');
    report.sections = Array.isArray(report.sections) ? report.sections : [];

    let section = report.sections.find(s => s.principle === targetPrinciple);
    if (!section) {
      section = { principle: targetPrinciple, aiDraft: '', expertEdit: '', comments: [] };
      report.sections.push(section);
    }

    section.comments = Array.isArray(section.comments) ? section.comments : [];
    section.comments.push({
      userId: userIdObj,
      userName: user?.name || 'User',
      text: String(text).trim(),
      createdAt: new Date()
    });

    await report.save();
    res.json({ success: true, report: report.toObject() });
  } catch (err) {
    console.error('Error adding comment:', err);
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


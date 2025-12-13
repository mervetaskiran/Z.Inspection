const mongoose = require('mongoose');
const { generateReport } = require('../services/geminiService');

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

    // Get all scores
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
    const { projectId, userId } = req.body;

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
    const userIdObj = userId && isValidObjectId(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    const report = new Report({
      projectId: isValidObjectId(projectId)
        ? new mongoose.Types.ObjectId(projectId)
        : projectId,
      title: `Analysis Report - ${analysisData.project.title || 'Project'}`,
      content: reportContent,
      generatedBy: userIdObj,
      metadata,
      status: 'draft'
    });

    await report.save();

    console.log('✅ Report generated and saved:', report._id);

    res.json({
      success: true,
      report: {
        id: report._id,
        title: report.title,
        content: report.content,
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

    const report = await Report.findById(id)
      .populate('projectId', 'title description')
      .populate('generatedBy', 'name email role')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: err.message });
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


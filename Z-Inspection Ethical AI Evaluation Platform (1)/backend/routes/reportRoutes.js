const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { testApiKey, analyzeExpertComments } = require('../services/geminiService');

// GET /api/reports/list-models - List available Gemini models (must be before /:id route)
router.get('/list-models', async (req, res) => {
  try {
    const { listAvailableModels } = require('../services/geminiService');
    const models = await listAvailableModels();
    res.json({ 
      success: true, 
      models,
      count: models.length 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/reports/test-api-key - Test Gemini API key (must be before /:id route)
router.get('/test-api-key', async (req, res) => {
  try {
    const result = await testApiKey();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      valid: false, 
      error: error.message 
    });
  }
});

// POST /api/reports/generate - Generate AI report
router.post('/generate', reportController.generateReport);

// POST /api/reports/analyze-expert-comments - Analyze expert comments using Gemini AI (must be before /:id route)
router.post('/analyze-expert-comments', async (req, res) => {
  try {
    const { expertComments } = req.body;

    if (!expertComments) {
      return res.status(400).json({ 
        error: 'expertComments is required. Can be a string or array of strings.' 
      });
    }

    const analysis = await analyzeExpertComments(expertComments);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing expert comments:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to analyze expert comments'
    });
  }
});

// GET /api/reports/assigned-to-me - Reports for projects assigned to user (must be before /:id route)
router.get('/assigned-to-me', reportController.getAssignedToMe);

// GET /api/reports/my-reports - Get reports for projects assigned to user (must be before /:id route)
router.get('/my-reports', reportController.getMyReports);

// GET /api/reports - Get all reports
router.get('/', reportController.getAllReports);

// POST /api/reports/:id/finalize - Finalize & lock report (admin only)
router.post('/:id/finalize', reportController.finalizeReport);

// POST /api/reports/:id/expert-comment - Upsert expert comment (expert/admin)
router.post('/:id/expert-comment', reportController.saveExpertComment);

// GET /api/reports/:id/download - Download report as PDF (must be before /:id route)
router.get('/:id/download', reportController.downloadReportPDF);

// GET /api/reports/:id/download-docx - Download report as DOCX (Word) (must be before /:id route)
router.get('/:id/download-docx', reportController.downloadReportDOCX);

// GET /api/reports/:id - Get specific report
router.get('/:id', reportController.getReportById);

// PUT /api/reports/:id - Update report status
router.put('/:id', reportController.updateReport);

// DELETE /api/reports/:id - Delete report
router.delete('/:id', reportController.deleteReport);

module.exports = router;


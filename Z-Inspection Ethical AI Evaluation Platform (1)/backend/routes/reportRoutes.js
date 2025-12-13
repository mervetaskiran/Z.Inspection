const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { testApiKey } = require('../services/geminiService');

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

// GET /api/reports - Get all reports
router.get('/', reportController.getAllReports);

// GET /api/reports/:id - Get specific report
router.get('/:id', reportController.getReportById);

// PUT /api/reports/:id - Update report status
router.put('/:id', reportController.updateReport);

// DELETE /api/reports/:id - Delete report
router.delete('/:id', reportController.deleteReport);

module.exports = router;


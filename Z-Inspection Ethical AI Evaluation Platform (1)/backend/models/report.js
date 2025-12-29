const mongoose = require('mongoose');

const ExpertCommentSchema = new mongoose.Schema({
  expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expertName: { type: String, default: '' },
  commentText: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const ReportSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  // Alias for "use case" terminology (same underlying entity as projectId in this codebase)
  useCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  title: {
    type: String,
    default: 'Analysis Report'
  },
  // Legacy single-body content
  content: {
    type: String
  },
  // Expert comments (one per expert)
  expertComments: {
    type: [ExpertCommentSchema],
    default: []
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'final', 'archived'],
    default: 'draft',
    index: true
  },
  finalizedAt: {
    type: Date
  },
  metadata: {
    totalScores: Number,
    totalEvaluations: Number,
    totalTensions: Number,
    principlesAnalyzed: [String]
  },
  // New structured report data
  computedMetrics: {
    type: mongoose.Schema.Types.Mixed
  },
  geminiNarrative: {
    type: mongoose.Schema.Types.Mixed
  },
  questionnaireKey: {
    type: String,
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  // File storage metadata
  fileUrl: {
    type: String // Path or URL to stored PDF/DOCX file
  },
  filePath: {
    type: String // Local file system path (if stored locally)
  },
  mimeType: {
    type: String,
    enum: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    default: 'application/pdf'
  },
  fileSize: {
    type: Number // Size in bytes
  },
  hash: {
    type: String // Content hash for versioning/deduplication
  }
}, {
  timestamps: true
});

// Index for efficient querying
ReportSchema.index({ projectId: 1, generatedAt: -1 });
ReportSchema.index({ projectId: 1, status: 1 });
ReportSchema.index({ useCaseId: 1, generatedAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);


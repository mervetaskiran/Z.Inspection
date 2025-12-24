const mongoose = require('mongoose');

const ReportSectionSchema = new mongoose.Schema({
  principle: { type: String, required: true },
  aiDraft: { type: String, default: '' },
  expertEdit: { type: String, default: '' },
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
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
  // New section-based workflow
  sections: {
    type: [ReportSectionSchema],
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
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for efficient querying
ReportSchema.index({ projectId: 1, generatedAt: -1 });
ReportSchema.index({ projectId: 1, status: 1 });
ReportSchema.index({ useCaseId: 1, generatedAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);


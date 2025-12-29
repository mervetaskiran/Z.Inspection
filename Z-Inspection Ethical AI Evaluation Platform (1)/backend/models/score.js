const mongoose = require('mongoose');

const PrincipleScoreSchema = new mongoose.Schema({
  avg: { type: Number, required: true },
  n: { type: Number, required: true }, // Number of questions answered
  min: Number,
  max: Number
}, { _id: false });

const QuestionScoreSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  principleKey: { type: String, required: true },
  score: { type: Number, required: true }, // 0-4 scale
  weight: { type: Number, default: 1 }, // Optional question weight
  isNA: { type: Boolean, default: false } // Whether this was marked as N/A
}, { _id: false });

const ScoreSchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  role: { 
    type: String, 
    required: true,
    index: true 
  },
  questionnaireKey: { 
    type: String, 
    required: true,
    index: true 
  },
  computedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  totals: {
    avg: { type: Number, required: true },
    min: Number,
    max: Number,
    n: Number // Total questions answered
  },
  byPrinciple: {
    TRANSPARENCY: PrincipleScoreSchema,
    'HUMAN AGENCY & OVERSIGHT': PrincipleScoreSchema,
    'TECHNICAL ROBUSTNESS & SAFETY': PrincipleScoreSchema,
    'PRIVACY & DATA GOVERNANCE': PrincipleScoreSchema,
    'DIVERSITY, NON-DISCRIMINATION & FAIRNESS': PrincipleScoreSchema,
    'SOCIETAL & INTERPERSONAL WELL-BEING': PrincipleScoreSchema,
    ACCOUNTABILITY: PrincipleScoreSchema
  },
  byQuestion: [QuestionScoreSchema] // Array of per-question scores for top risky questions analysis
}, {
  timestamps: true
});

// Compound indexes for reporting
ScoreSchema.index({ projectId: 1, questionnaireKey: 1 });
ScoreSchema.index({ projectId: 1, role: 1 });
ScoreSchema.index({ projectId: 1, computedAt: -1 });

module.exports = mongoose.model('Score', ScoreSchema);


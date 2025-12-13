/**
 * Migration script to migrate from old generalquestionsanswers collection
 * to new responses collection structure
 * 
 * Run with: node backend/migrations/migrateGeneralQuestions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Helper function for ObjectId validation (compatible with Mongoose v9+)
const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

// Connect to MongoDB - Use same connection string as server.js
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin_merve:Sifre123@cluster0.tg8voq1.mongodb.net/zinspection?retryWrites=true&w=majority&appName=Cluster0';

const Response = require('../models/response');
const ProjectAssignment = require('../models/projectAssignment');
const Questionnaire = require('../models/questionnaire');
const Question = require('../models/question');

// Question code mapping from old format to new format
const questionCodeMap = {
  'gen_1': 'T1',
  'gen_2': 'P1',
  'gen_3': 'T2',
  'gen_4': 'H1',
  'gen_5': 'H2',
  'gen_6': 'F1',
  'gen_7': 'A1',
  'gen_8': 'W1',
  // Add more mappings as needed
};

// Principle mapping
const principleMap = {
  'T1': 'TRANSPARENCY',
  'T2': 'TRANSPARENCY',
  'H1': 'HUMAN AGENCY & OVERSIGHT',
  'H2': 'HUMAN AGENCY & OVERSIGHT',
  'S1': 'TECHNICAL ROBUSTNESS & SAFETY',
  'P1': 'PRIVACY & DATA GOVERNANCE',
  'P2': 'PRIVACY & DATA GOVERNANCE',
  'F1': 'DIVERSITY, NON-DISCRIMINATION & FAIRNESS',
  'W1': 'SOCIETAL & INTERPERSONAL WELL-BEING',
  'W2': 'SOCIETAL & INTERPERSONAL WELL-BEING',
  'A1': 'ACCOUNTABILITY',
  'A2': 'ACCOUNTABILITY'
};

async function migrate() {
  try {
    // Wait for connection
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get old collection
    const oldCollection = mongoose.connection.db.collection('generalquestionsanswers');

    console.log('Starting migration...');

    // Step 1: Ensure general-v1 questionnaire exists
    let questionnaire = await Questionnaire.findOne({ key: 'general-v1' });
    if (!questionnaire) {
      questionnaire = await Questionnaire.create({
        key: 'general-v1',
        title: 'General Questions v1',
        language: 'en-tr',
        version: 1,
        isActive: true
      });
      console.log('Created questionnaire: general-v1');
    }

    // Step 2: Migrate old documents
    const oldDocs = await oldCollection.find({}).toArray();
    console.log(`Found ${oldDocs.length} documents to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const oldDoc of oldDocs) {
      try {
        const projectId = oldDoc.projectId;
        const userId = oldDoc.userId;
        const userRole = oldDoc.userRole || 'unknown';

        // Check if already migrated
        const existing = await Response.findOne({
          projectId,
          userId,
          questionnaireKey: 'general-v1'
        });

        if (existing) {
          console.log(`Skipping already migrated: ${projectId}/${userId}`);
          skipped++;
          continue;
        }

        // Create or update assignment
        const assignment = await ProjectAssignment.findOneAndUpdate(
          { projectId, userId },
          {
            projectId,
            userId,
            role: userRole,
            questionnaires: ['general-v1'],
            status: oldDoc.answers && Object.keys(oldDoc.answers).length > 0 ? 'in_progress' : 'assigned'
          },
          { new: true, upsert: true }
        );

        // Convert old answers format to new format
        const answers = [];
        
        // Check if data is in principles structure or flat structure
        let oldAnswers = {};
        let oldRisks = {};
        
        if (oldDoc.principles) {
          // New structure: organized by principles
          for (const [principle, data] of Object.entries(oldDoc.principles)) {
            if (data.answers) {
              Object.assign(oldAnswers, data.answers);
            }
            if (data.risks) {
              Object.assign(oldRisks, data.risks);
            }
          }
        } else {
          // Legacy flat structure
          oldAnswers = oldDoc.answers || {};
          oldRisks = oldDoc.risks || {};
        }

        for (const [oldKey, answerValue] of Object.entries(oldAnswers)) {
          // oldKey could be questionId (ObjectId string) or questionCode (T1, T2, etc.)
          let questionCode = oldKey;
          
          // If it's an ObjectId, try to find the question
          if (isValidObjectId(oldKey)) {
            const questionById = await Question.findById(oldKey);
            if (questionById) {
              questionCode = questionById.code;
            } else {
              // Try mapping
              questionCode = questionCodeMap[oldKey] || oldKey;
            }
          } else {
            // Assume it's already a code (T1, T2, etc.) or try mapping
            questionCode = questionCodeMap[oldKey] || oldKey;
          }
          
          // Find question by code
          const question = await Question.findOne({ 
            questionnaireKey: 'general-v1', 
            code: questionCode 
          });

          if (!question) {
            console.warn(`Question ${questionCode} (from ${oldKey}) not found, skipping`);
            continue;
          }

          // Determine score from risk value
          let score = 0;
          const riskKey = oldRisks[oldKey] !== undefined ? oldKey : questionCode;
          if (oldRisks[riskKey] !== undefined || oldRisks[oldKey] !== undefined) {
            // Map old risk values (low/medium/high) to 0-4 scale
            const riskValue = oldRisks[riskKey] || oldRisks[oldKey];
            if (typeof riskValue === 'number') {
              score = riskValue; // Already 0-4
            } else if (riskValue === 'low') {
              score = 3;
            } else if (riskValue === 'medium') {
              score = 2;
            } else if (riskValue === 'high') {
              score = 1;
            }
          }

          // Format answer based on question type
          let answerFormat = {};
          if (question.answerType === 'single_choice') {
            // Try to find matching option
            const option = question.options.find(opt => 
              opt.label.en === answerValue || opt.label.tr === answerValue
            );
            if (option) {
              answerFormat.choiceKey = option.key;
              score = option.score !== undefined ? option.score : score;
            } else {
              // Fallback: use answer as choiceKey
              answerFormat.choiceKey = answerValue;
            }
          } else if (question.answerType === 'open_text') {
            answerFormat.text = answerValue;
          }

          answers.push({
            questionId: question._id,
            questionCode: questionCode,
            answer: answerFormat,
            score: score,
            notes: null,
            evidence: []
          });
        }

        // Determine status
        let status = 'draft';
        if (answers.length > 0 && Object.keys(oldAnswers).length > 0) {
          // Check if all required questions are answered
          const requiredQuestions = await Question.find({
            questionnaireKey: 'general-v1',
            required: true
          });
          const answeredCodes = new Set(answers.map(a => a.questionCode));
          const allRequiredAnswered = requiredQuestions.every(q => answeredCodes.has(q.code));
          
          status = allRequiredAnswered ? 'submitted' : 'draft';
        }

        // Create response
        await Response.create({
          projectId,
          assignmentId: assignment._id,
          userId,
          role: userRole,
          questionnaireKey: 'general-v1',
          questionnaireVersion: questionnaire.version,
          answers: answers,
          status: status,
          submittedAt: status === 'submitted' ? oldDoc.updatedAt : null,
          updatedAt: oldDoc.updatedAt || new Date()
        });

        migrated++;
        console.log(`Migrated: ${projectId}/${userId} (${answers.length} answers)`);
      } catch (error) {
        console.error(`Error migrating ${oldDoc._id}:`, error.message);
        errors++;
      }
    }

    console.log('\nMigration complete!');
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();


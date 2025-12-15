/**
 * Check if responses are being saved correctly to the right questionnaires
 * Run with: node backend/scripts/checkResponseSaving.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error('❌ MONGO_URI environment variable bulunamadı!');
}

mongoose.connect(MONGO_URI).catch((err) => {
  console.error('❌ MongoDB bağlantısı başarısız:', err);
  process.exit(1);
});

const Response = require('../models/response');
const Question = require('../models/question');
const Questionnaire = require('../models/questionnaire');

async function checkResponseSaving() {
  try {
    console.log('🔍 Checking Response Saving...\n');

    // Get all questionnaires
    const questionnaires = await Questionnaire.find({ isActive: true }).select('key title').lean();
    console.log('📋 Active Questionnaires:');
    questionnaires.forEach(q => {
      console.log(`   - ${q.key}: ${q.title}`);
    });

    // Get all responses grouped by questionnaire
    console.log('\n📊 Responses by Questionnaire:');
    const responses = await Response.find({})
      .select('projectId userId role questionnaireKey answers status submittedAt')
      .lean();

    const responsesByQuestionnaire = {};
    responses.forEach(r => {
      if (!responsesByQuestionnaire[r.questionnaireKey]) {
        responsesByQuestionnaire[r.questionnaireKey] = [];
      }
      responsesByQuestionnaire[r.questionnaireKey].push(r);
    });

    Object.keys(responsesByQuestionnaire).forEach(key => {
      const resps = responsesByQuestionnaire[key];
      console.log(`\n   ${key}: ${resps.length} response(s)`);
      resps.forEach((r, idx) => {
        const projectId = r.projectId?.toString() || r.projectId || 'Unknown';
        const userId = r.userId?.toString() || r.userId || 'Unknown';
        const userRole = r.role || 'Unknown';
        const answerCount = r.answers?.length || 0;
        console.log(`      ${idx + 1}. Project ID: ${projectId}, User ID: ${userId} (${userRole}), Answers: ${answerCount}, Status: ${r.status}`);
      });
    });

    // Check question distribution
    console.log('\n📝 Questions by Questionnaire:');
    const questions = await Question.find({})
      .select('code questionnaireKey principle appliesToRoles')
      .lean();

    const questionsByQuestionnaire = {};
    questions.forEach(q => {
      if (!questionsByQuestionnaire[q.questionnaireKey]) {
        questionsByQuestionnaire[q.questionnaireKey] = [];
      }
      questionsByQuestionnaire[q.questionnaireKey].push(q);
    });

    Object.keys(questionsByQuestionnaire).forEach(key => {
      const qs = questionsByQuestionnaire[key];
      console.log(`\n   ${key}: ${qs.length} question(s)`);
      // Show first 5 questions as sample
      qs.slice(0, 5).forEach((q, idx) => {
        console.log(`      ${idx + 1}. [${q.code}] ${q.principle} (${q.appliesToRoles?.join(', ') || 'any'})`);
      });
      if (qs.length > 5) {
        console.log(`      ... and ${qs.length - 5} more`);
      }
    });

    // Verify response-questionnaire alignment
    console.log('\n✅ Verification:');
    let allGood = true;
    
    for (const [questionnaireKey, resps] of Object.entries(responsesByQuestionnaire)) {
      const qs = questionsByQuestionnaire[questionnaireKey] || [];
      const questionCodes = new Set(qs.map(q => q.code));
      
      resps.forEach(r => {
        if (r.answers && Array.isArray(r.answers)) {
          r.answers.forEach(a => {
            if (a.questionCode && !questionCodes.has(a.questionCode)) {
              console.log(`   ⚠️ WARNING: Response in ${questionnaireKey} contains question code ${a.questionCode} which doesn't belong to this questionnaire!`);
              allGood = false;
            }
          });
        }
      });
    }

    if (allGood) {
      console.log('   ✅ All responses are correctly aligned with their questionnaires!');
    }

    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Questionnaires: ${questionnaires.length}`);
    console.log(`   Total Responses: ${responses.length}`);
    console.log(`   Total Questions: ${questions.length}`);
    
    Object.keys(responsesByQuestionnaire).forEach(key => {
      const resps = responsesByQuestionnaire[key];
      const qs = questionsByQuestionnaire[key] || [];
      console.log(`   ${key}: ${resps.length} response(s), ${qs.length} question(s)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

checkResponseSaving();


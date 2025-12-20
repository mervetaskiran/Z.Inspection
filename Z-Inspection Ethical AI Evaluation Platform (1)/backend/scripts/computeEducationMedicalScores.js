/**
 * Script to compute scores for education and medical expert responses
 * 
 * Run with: node backend/scripts/computeEducationMedicalScores.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error("❌ MONGO_URI environment variable bulunamadı!");
}

const Response = require('../models/response');
const Score = require('../models/score');
const { computeScores } = require('../services/evaluationService');

async function computeEducationMedicalScores() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log('Starting score computation for education and medical experts...\n');

    // Get all responses for education-expert-v1 and medical-expert-v1
    // First check what statuses exist
    const educationResponsesAll = await Response.find({ 
      questionnaireKey: 'education-expert-v1'
    }).select('projectId userId status').lean();
    
    const medicalResponsesAll = await Response.find({ 
      questionnaireKey: 'medical-expert-v1'
    }).select('projectId userId status').lean();
    
    console.log('Education responses:', educationResponsesAll.map(r => ({ projectId: r.projectId, userId: r.userId, status: r.status })));
    console.log('Medical responses:', medicalResponsesAll.map(r => ({ projectId: r.projectId, userId: r.userId, status: r.status })));
    
    const educationResponses = educationResponsesAll;
    const medicalResponses = medicalResponsesAll;

    console.log(`Found ${educationResponses.length} education-expert-v1 responses`);
    console.log(`Found ${medicalResponses.length} medical-expert-v1 responses\n`);

    let computed = 0;
    let errors = 0;

    // Compute scores for education-expert-v1
    for (const response of educationResponses) {
      try {
        // First, check if response has answers with scores
        const fullResponse = await Response.findOne({
          projectId: response.projectId,
          userId: response.userId,
          questionnaireKey: 'education-expert-v1'
        });
        
        if (!fullResponse || !fullResponse.answers || fullResponse.answers.length === 0) {
          console.log(`⚠️  No answers found for education-expert-v1: project=${response.projectId}, user=${response.userId}`);
          continue;
        }
        
        // Check if answers have scores
        const answersWithScores = fullResponse.answers.filter(a => a.score !== undefined && a.score !== null);
        console.log(`📊 Education response has ${fullResponse.answers.length} answers, ${answersWithScores.length} with scores`);
        
        // Try computing scores (will only work if status is 'submitted')
        const result = await computeScores(response.projectId, response.userId, 'education-expert-v1');
        if (result && result.length > 0) {
          computed++;
          console.log(`✅ Computed education-expert-v1 scores for project: ${response.projectId}, user: ${response.userId}`);
        } else {
          console.log(`⚠️  No scores computed for education-expert-v1: project=${response.projectId}, user=${response.userId} (status: ${fullResponse.status})`);
        }
      } catch (error) {
        console.error(`❌ Error computing education-expert-v1 scores for ${response.projectId}/${response.userId}:`, error.message);
        errors++;
      }
    }

    // Compute scores for medical-expert-v1
    for (const response of medicalResponses) {
      try {
        const result = await computeScores(response.projectId, response.userId, 'medical-expert-v1');
        if (result && result.length > 0) {
          computed++;
          console.log(`✅ Computed medical-expert-v1 scores for project: ${response.projectId}, user: ${response.userId}`);
        }
      } catch (error) {
        console.error(`❌ Error computing medical-expert-v1 scores for ${response.projectId}/${response.userId}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Score computation complete!');
    console.log(`Computed: ${computed}`);
    console.log(`Errors: ${errors}`);

    // Verify results
    const educationScores = await Score.countDocuments({ questionnaireKey: 'education-expert-v1' });
    const medicalScores = await Score.countDocuments({ questionnaireKey: 'medical-expert-v1' });
    console.log(`\n📊 Final counts:`);
    console.log(`  education-expert-v1 scores: ${educationScores}`);
    console.log(`  medical-expert-v1 scores: ${medicalScores}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Score computation failed:', error);
    process.exit(1);
  }
}

// Run computation
computeEducationMedicalScores();


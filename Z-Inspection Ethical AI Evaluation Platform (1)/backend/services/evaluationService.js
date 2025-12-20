const mongoose = require('mongoose');
const ProjectAssignment = require('../models/projectAssignment');
const Response = require('../models/response');
const Question = require('../models/question');
const Score = require('../models/score');

// Helper function for ObjectId validation (compatible with Mongoose v9+)
const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Create or update a project assignment
 */
async function createAssignment(projectId, userId, role, questionnaires) {
  try {
    const assignment = await ProjectAssignment.findOneAndUpdate(
      { projectId, userId },
      {
        projectId,
        userId,
        role,
        questionnaires: questionnaires || [],
        status: 'assigned',
        assignedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    // Initialize responses for all assigned questionnaires
    await initializeResponses(projectId, userId, role, questionnaires || []);
    
    return assignment;
  } catch (error) {
    throw new Error(`Failed to create assignment: ${error.message}`);
  }
}

/**
 * Initialize responses for all assigned questionnaires with all questions as unanswered
 * This ensures data integrity - every assigned question has an entry, even if unanswered
 */
async function initializeResponses(projectId, userId, role, questionnaires) {
  try {
    const Questionnaire = require('../models/questionnaire');
    const projectIdObj = isValidObjectId(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const userIdObj = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Get assignment
    const assignment = await ProjectAssignment.findOne({ projectId: projectIdObj, userId: userIdObj });
    if (!assignment) {
      throw new Error('Assignment not found');
    }
    
    // Initialize responses for each questionnaire
    for (const questionnaireKey of questionnaires) {
      // Get questionnaire version
      const questionnaire = await Questionnaire.findOne({ key: questionnaireKey, isActive: true });
      if (!questionnaire) {
        console.warn(`⚠️ Questionnaire ${questionnaireKey} not found or inactive, skipping initialization`);
        continue;
      }
      
      // Get all questions for this questionnaire
      const questions = await Question.find({ questionnaireKey }).sort({ order: 1 }).lean();
      
      if (questions.length === 0) {
        console.warn(`⚠️ No questions found for questionnaire ${questionnaireKey}`);
        continue;
      }
      
      // Check if response already exists
      const existingResponse = await Response.findOne({
        projectId: projectIdObj,
        userId: userIdObj,
        questionnaireKey
      });
      
      if (existingResponse) {
        // Merge existing answers with missing questions
        const existingQuestionCodes = new Set(existingResponse.answers.map(a => a.questionCode));
        const missingQuestions = questions.filter(q => !existingQuestionCodes.has(q.code));
        
        if (missingQuestions.length > 0) {
          const unansweredAnswers = missingQuestions.map(question => ({
            questionId: question._id,
            questionCode: question.code,
            answer: null, // Unanswered
            score: 2, // Default score for unanswered questions (required field)
            notes: null,
            evidence: []
          }));
          
          existingResponse.answers.push(...unansweredAnswers);
          await existingResponse.save();
          console.log(`✅ Added ${missingQuestions.length} missing questions to existing response for ${questionnaireKey}`);
        }
      } else {
        // Create new response with all questions as unanswered
        const unansweredAnswers = questions.map(question => ({
          questionId: question._id,
          questionCode: question.code,
          answer: null, // Unanswered
          score: 2, // Default score for unanswered questions (required field)
          notes: null,
          evidence: []
        }));
        
        await Response.create({
          projectId: projectIdObj,
          assignmentId: assignment._id,
          userId: userIdObj,
          role: role,
          questionnaireKey: questionnaireKey,
          questionnaireVersion: questionnaire.version,
          answers: unansweredAnswers,
          status: 'draft',
          updatedAt: new Date()
        });
        
        console.log(`✅ Initialized response for ${questionnaireKey} with ${questions.length} unanswered questions`);
      }
    }
  } catch (error) {
    console.error(`❌ Error initializing responses: ${error.message}`);
    throw error;
  }
}

/**
 * Save a draft response
 */
async function saveDraftResponse(projectId, userId, questionnaireKey, answers) {
  try {
    // Find or create assignment
    const assignment = await ProjectAssignment.findOne({ projectId, userId });
    if (!assignment) {
      throw new Error('Assignment not found. Please create assignment first.');
    }

    // Get questionnaire version
    const Questionnaire = require('../models/questionnaire');
    const questionnaire = await Questionnaire.findOne({ key: questionnaireKey, isActive: true });
    if (!questionnaire) {
      throw new Error(`Questionnaire ${questionnaireKey} not found or inactive`);
    }

    // Validate and map answers
    const validatedAnswers = await validateAndMapAnswers(questionnaireKey, answers);

    // Save or update response
    const response = await Response.findOneAndUpdate(
      { projectId, userId, questionnaireKey },
      {
        projectId,
        assignmentId: assignment._id,
        userId,
        role: assignment.role,
        questionnaireKey,
        questionnaireVersion: questionnaire.version,
        answers: validatedAnswers,
        status: 'draft',
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    // Update assignment status
    if (assignment.status === 'assigned') {
      await ProjectAssignment.findByIdAndUpdate(assignment._id, { status: 'in_progress' });
    }

    return response;
  } catch (error) {
    throw new Error(`Failed to save draft: ${error.message}`);
  }
}

/**
 * Submit a response (finalize)
 */
async function submitResponse(projectId, userId, questionnaireKey) {
  try {
    const response = await Response.findOne({ projectId, userId, questionnaireKey, status: 'draft' });
    if (!response) {
      throw new Error('Draft response not found');
    }

    // Validate all required questions are answered
    const questions = await Question.find({ 
      questionnaireKey, 
      required: true 
    }).sort({ order: 1 });

    const answeredCodes = new Set(response.answers.map(a => a.questionCode));
    const missingRequired = questions.filter(q => !answeredCodes.has(q.code));
    
    if (missingRequired.length > 0) {
      throw new Error(`Missing required questions: ${missingRequired.map(q => q.code).join(', ')}`);
    }

    // Update response status
    response.status = 'submitted';
    response.submittedAt = new Date();
    await response.save();

    // Update assignment status
    const assignment = await ProjectAssignment.findOne({ projectId, userId });
    if (assignment) {
      // Check if all questionnaires are submitted
      const allResponses = await Response.find({ 
        projectId, 
        userId, 
        questionnaireKey: { $in: assignment.questionnaires } 
      });
      const allSubmitted = allResponses.every(r => r.status === 'submitted');
      
      if (allSubmitted) {
        assignment.status = 'submitted';
        assignment.completedAt = new Date();
        await assignment.save();
      }
    }

    // Compute and save scores
    await computeScores(projectId, userId, questionnaireKey);

    return response;
  } catch (error) {
    throw new Error(`Failed to submit response: ${error.message}`);
  }
}

/**
 * Validate answers and compute scores
 */
async function validateAndMapAnswers(questionnaireKey, answers) {
  const questions = await Question.find({ questionnaireKey }).lean();
  const questionMap = new Map(questions.map(q => [q.code, q]));
  
  const validatedAnswers = [];

  for (const answer of answers) {
    const question = questionMap.get(answer.questionCode);
    if (!question) {
      throw new Error(`Question ${answer.questionCode} not found in questionnaire ${questionnaireKey}`);
    }

    let score = 0;

    // Compute score based on answer type
    if (question.answerType === 'single_choice') {
      if (!answer.answer?.choiceKey) {
        throw new Error(`Missing choiceKey for question ${answer.questionCode}`);
      }
      const option = question.options.find(opt => opt.key === answer.answer.choiceKey);
      if (!option) {
        throw new Error(`Invalid choiceKey ${answer.answer.choiceKey} for question ${answer.questionCode}`);
      }
      score = option.score !== undefined ? option.score : 0;
    } else if (question.answerType === 'multi_choice') {
      if (!answer.answer?.multiChoiceKeys || answer.answer.multiChoiceKeys.length === 0) {
        throw new Error(`Missing multiChoiceKeys for question ${answer.questionCode}`);
      }
      // Average score of selected options
      const selectedOptions = question.options.filter(opt => 
        answer.answer.multiChoiceKeys.includes(opt.key)
      );
      if (selectedOptions.length > 0) {
        score = selectedOptions.reduce((sum, opt) => sum + (opt.score || 0), 0) / selectedOptions.length;
      }
    } else if (question.answerType === 'open_text') {
      // For open_text, score must be provided explicitly
      score = answer.score !== undefined ? answer.score : 0;
      if (answer.scoreSuggested !== undefined) {
        score = answer.scoreSuggested; // Use suggested if provided
      }
      if (answer.scoreFinal !== undefined) {
        score = answer.scoreFinal; // Final score overrides
      }
    } else if (question.answerType === 'numeric') {
      // For numeric, map to 0-4 scale (implementation depends on question definition)
      score = answer.answer?.numeric !== undefined ? answer.answer.numeric : 0;
    }

    validatedAnswers.push({
      questionId: question._id,
      questionCode: answer.questionCode,
      answer: answer.answer,
      score: Math.round(score * 100) / 100, // Round to 2 decimals
      scoreSuggested: answer.scoreSuggested,
      scoreFinal: answer.scoreFinal,
      reviewerId: answer.reviewerId,
      notes: answer.notes,
      evidence: answer.evidence || []
    });
  }

  return validatedAnswers;
}

/**
 * Compute aggregated scores for a project/user/questionnaire
 */
async function computeScores(projectId, userId = null, questionnaireKey = null) {
  try {
    const matchStage = { 
      projectId: isValidObjectId(projectId) 
        ? new mongoose.Types.ObjectId(projectId) 
        : projectId,
      status: { $in: ['draft', 'submitted'] } // Include both draft and submitted responses
    };

    if (userId) {
      matchStage.userId = isValidObjectId(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    }

    if (questionnaireKey) {
      matchStage.questionnaireKey = questionnaireKey;
    }

    // Get all submitted responses
    const responses = await Response.find(matchStage).populate('answers.questionId');

    if (responses.length === 0) {
      return null;
    }

    // Group by userId, role, questionnaireKey
    const grouped = {};
    for (const response of responses) {
      const key = `${response.userId}_${response.role}_${response.questionnaireKey}`;
      if (!grouped[key]) {
        grouped[key] = {
          userId: response.userId,
          role: response.role,
          questionnaireKey: response.questionnaireKey,
          answers: []
        };
      }
      grouped[key].answers.push(...response.answers);
    }

    // Compute scores for each group
    const scores = [];
    for (const key in grouped) {
      const group = grouped[key];
      const scoresByPrinciple = {};
      const allScores = [];

      // Group answers by principle
      for (const answer of group.answers) {
        const question = await Question.findById(answer.questionId);
        if (!question) continue;

        const principle = question.principle;
        if (!scoresByPrinciple[principle]) {
          scoresByPrinciple[principle] = [];
        }
        scoresByPrinciple[principle].push(answer.score);
        allScores.push(answer.score);
      }

      // Calculate averages
      const byPrinciple = {};
      for (const principle in scoresByPrinciple) {
        const principleScores = scoresByPrinciple[principle];
        byPrinciple[principle] = {
          avg: principleScores.reduce((a, b) => a + b, 0) / principleScores.length,
          n: principleScores.length,
          min: Math.min(...principleScores),
          max: Math.max(...principleScores)
        };
      }

      const totalAvg = allScores.length > 0 
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
        : 0;

      const scoreDoc = {
        projectId,
        userId: group.userId,
        role: group.role,
        questionnaireKey: group.questionnaireKey,
        computedAt: new Date(),
        totals: {
          avg: totalAvg,
          min: Math.min(...allScores),
          max: Math.max(...allScores),
          n: allScores.length
        },
        byPrinciple
      };

      // Save or update score
      await Score.findOneAndUpdate(
        { projectId, userId: group.userId, questionnaireKey: group.questionnaireKey },
        scoreDoc,
        { new: true, upsert: true }
      );

      scores.push(scoreDoc);
    }

    return scores;
  } catch (error) {
    throw new Error(`Failed to compute scores: ${error.message}`);
  }
}

/**
 * Get hotspot questions (score <= 1) for a project
 */
async function getHotspotQuestions(projectId, questionnaireKey = null) {
  try {
    const projectIdObj = isValidObjectId(projectId) 
      ? new mongoose.Types.ObjectId(projectId) 
      : projectId;
    
    const matchStage = {
      projectId: projectIdObj,
      status: 'submitted',
      'answers.score': { $lte: 1 }
    };

    if (questionnaireKey) {
      matchStage.questionnaireKey = questionnaireKey;
    }

    const responses = await Response.find(matchStage);
    const hotspots = [];

    for (const response of responses) {
      for (const answer of response.answers) {
        if (answer.score <= 1) {
          hotspots.push({
            projectId: response.projectId,
            userId: response.userId,
            role: response.role,
            questionnaireKey: response.questionnaireKey,
            questionCode: answer.questionCode,
            score: answer.score,
            answer: answer.answer
          });
        }
      }
    }

    return hotspots;
  } catch (error) {
    throw new Error(`Failed to get hotspots: ${error.message}`);
  }
}

/**
 * Ensure all assigned questions are present in response, even if unanswered
 * This is called when saving answers to ensure data integrity
 */
async function ensureAllQuestionsPresent(projectId, userId, questionnaireKey) {
  try {
    const projectIdObj = isValidObjectId(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const userIdObj = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Get all questions for this questionnaire
    const questions = await Question.find({ questionnaireKey }).sort({ order: 1 }).lean();
    
    // Get existing response
    const response = await Response.findOne({
      projectId: projectIdObj,
      userId: userIdObj,
      questionnaireKey
    });
    
    if (!response) {
      // Response should have been initialized, but if not, initialize it now
      const assignment = await ProjectAssignment.findOne({ projectId: projectIdObj, userId: userIdObj });
      if (!assignment) {
        throw new Error('Assignment not found');
      }
      
      const Questionnaire = require('../models/questionnaire');
      const questionnaire = await Questionnaire.findOne({ key: questionnaireKey, isActive: true });
      if (!questionnaire) {
        throw new Error(`Questionnaire ${questionnaireKey} not found`);
      }
      
      const unansweredAnswers = questions.map(question => ({
        questionId: question._id,
        questionCode: question.code,
        answer: null,
        score: 2, // Default score for unanswered questions (required field)
        notes: null,
        evidence: []
      }));
      
      await Response.create({
        projectId: projectIdObj,
        assignmentId: assignment._id,
        userId: userIdObj,
        role: assignment.role,
        questionnaireKey: questionnaireKey,
        questionnaireVersion: questionnaire.version,
        answers: unansweredAnswers,
        status: 'draft',
        updatedAt: new Date()
      });
      
      return;
    }
    
    // Check for missing questions
    const existingQuestionCodes = new Set(response.answers.map(a => a.questionCode));
    const missingQuestions = questions.filter(q => !existingQuestionCodes.has(q.code));
    
    if (missingQuestions.length > 0) {
      const unansweredAnswers = missingQuestions.map(question => ({
        questionId: question._id,
        questionCode: question.code,
        answer: null,
        score: 2, // Default score for unanswered questions (required field)
        notes: null,
        evidence: []
      }));
      
      response.answers.push(...unansweredAnswers);
      await response.save();
      console.log(`✅ Added ${missingQuestions.length} missing questions to response for ${questionnaireKey}`);
    }
  } catch (error) {
    console.error(`❌ Error ensuring all questions present: ${error.message}`);
    throw error;
  }
}

/**
 * Validate that all required questions are answered before submission
 */
async function validateSubmission(projectId, userId, questionnaireKey) {
  try {
    const projectIdObj = isValidObjectId(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const userIdObj = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Get response
    const response = await Response.findOne({
      projectId: projectIdObj,
      userId: userIdObj,
      questionnaireKey
    });
    
    if (!response) {
      throw new Error('Response not found');
    }
    
    // Get all required questions
    const requiredQuestions = await Question.find({
      questionnaireKey,
      required: true
    }).lean();
    
    // Check which required questions are answered
    const answeredQuestionCodes = new Set();
    response.answers.forEach(answer => {
      // Check if answer is actually answered (not null)
      if (answer.answer !== null && answer.answer !== undefined) {
        // Check if answer has content
        const hasContent = 
          (answer.answer.choiceKey !== null && answer.answer.choiceKey !== undefined) ||
          (answer.answer.text !== null && answer.answer.text !== undefined && answer.answer.text.trim() !== '') ||
          (answer.answer.numeric !== null && answer.answer.numeric !== undefined) ||
          (answer.answer.multiChoiceKeys && answer.answer.multiChoiceKeys.length > 0);
        
        if (hasContent) {
          answeredQuestionCodes.add(answer.questionCode);
        }
      }
    });
    
    // Find missing required questions
    const missingRequired = requiredQuestions.filter(q => !answeredQuestionCodes.has(q.code));
    
    if (missingRequired.length > 0) {
      throw new Error(`Missing required questions: ${missingRequired.map(q => q.code).join(', ')}`);
    }
    
    // Validate data integrity: all assigned questions should be present
    const allQuestions = await Question.find({ questionnaireKey }).lean();
    const responseQuestionCodes = new Set(response.answers.map(a => a.questionCode));
    const missingQuestions = allQuestions.filter(q => !responseQuestionCodes.has(q.code));
    
    if (missingQuestions.length > 0) {
      console.error(`⚠️ DATA INTEGRITY WARNING: ${missingQuestions.length} assigned questions missing from response: ${missingQuestions.map(q => q.code).join(', ')}`);
      // Auto-fix: add missing questions as unanswered
      await ensureAllQuestionsPresent(projectId, userId, questionnaireKey);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
}

module.exports = {
  createAssignment,
  saveDraftResponse,
  submitResponse,
  computeScores,
  getHotspotQuestions,
  initializeResponses,
  ensureAllQuestionsPresent,
  validateSubmission
};


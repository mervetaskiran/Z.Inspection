const mongoose = require('mongoose');

// Helper function for ObjectId validation (compatible with Mongoose v9+)
const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Project-level average score by principle across all experts and questionnaires
 */
function projectLevelScoresByPrinciple(projectId, questionnaireKey = null) {
  const projectIdObj = isValidObjectId(projectId) 
    ? new mongoose.Types.ObjectId(projectId) 
    : projectId;
  
  const matchStage = {
    projectId: projectIdObj,
    status: 'submitted'
  };

  if (questionnaireKey) {
    matchStage.questionnaireKey = questionnaireKey;
  }

  return [
    { $match: matchStage },
    { $unwind: '$answers' },
    {
      $lookup: {
        from: 'questions',
        localField: 'answers.questionId',
        foreignField: '_id',
        as: 'question'
      }
    },
    { $unwind: '$question' },
    {
      $group: {
        _id: '$question.principle',
        avgScore: { $avg: '$answers.score' },
        minScore: { $min: '$answers.score' },
        maxScore: { $max: '$answers.score' },
        count: { $sum: 1 },
        questionCodes: { $addToSet: '$answers.questionCode' }
      }
    },
    {
      $project: {
        principle: '$_id',
        avgScore: { $round: ['$avgScore', 2] },
        minScore: 1,
        maxScore: 1,
        count: 1,
        questionCodes: 1,
        _id: 0
      }
    },
    { $sort: { principle: 1 } }
  ];
}

/**
 * Role-level average score by principle for a given project
 */
function roleLevelScoresByPrinciple(projectId, questionnaireKey = null) {
  const projectIdObj = isValidObjectId(projectId) 
    ? new mongoose.Types.ObjectId(projectId) 
    : projectId;
  
  const matchStage = {
    projectId: projectIdObj,
    status: 'submitted'
  };

  if (questionnaireKey) {
    matchStage.questionnaireKey = questionnaireKey;
  }

  return [
    { $match: matchStage },
    { $unwind: '$answers' },
    {
      $lookup: {
        from: 'questions',
        localField: 'answers.questionId',
        foreignField: '_id',
        as: 'question'
      }
    },
    { $unwind: '$question' },
    {
      $group: {
        _id: {
          role: '$role',
          principle: '$question.principle'
        },
        avgScore: { $avg: '$answers.score' },
        minScore: { $min: '$answers.score' },
        maxScore: { $max: '$answers.score' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.role',
        principles: {
          $push: {
            principle: '$_id.principle',
            avgScore: { $round: ['$avgScore', 2] },
            minScore: 1,
            maxScore: 1,
            count: 1
          }
        }
      }
    },
    {
      $project: {
        role: '$_id',
        principles: 1,
        _id: 0
      }
    },
    { $sort: { role: 1 } }
  ];
}

/**
 * Hotspot detection: questions with score <= 1
 */
function hotspotQuestions(projectId, questionnaireKey = null, threshold = 1) {
  const projectIdObj = isValidObjectId(projectId) 
    ? new mongoose.Types.ObjectId(projectId) 
    : projectId;
  
  const matchStage = {
    projectId: projectIdObj,
    status: 'submitted',
    'answers.score': { $lte: threshold }
  };

  if (questionnaireKey) {
    matchStage.questionnaireKey = questionnaireKey;
  }

  return [
    { $match: matchStage },
    { $unwind: '$answers' },
    { $match: { 'answers.score': { $lte: threshold } } },
    {
      $lookup: {
        from: 'questions',
        localField: 'answers.questionId',
        foreignField: '_id',
        as: 'question'
      }
    },
    { $unwind: '$question' },
    {
      $group: {
        _id: {
          questionCode: '$answers.questionCode',
          principle: '$question.principle'
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$answers.score' },
        minScore: { $min: '$answers.score' },
        roles: { $addToSet: '$role' },
        userIds: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        questionCode: '$_id.questionCode',
        principle: '$_id.principle',
        count: 1,
        avgScore: { $round: ['$avgScore', 2] },
        minScore: 1,
        roles: 1,
        affectedUsers: { $size: '$userIds' },
        _id: 0
      }
    },
    { $sort: { avgScore: 1, count: -1 } }
  ];
}

/**
 * Expert completion status for a project
 */
function expertCompletionStatus(projectId) {
  const projectIdObj = isValidObjectId(projectId) 
    ? new mongoose.Types.ObjectId(projectId) 
    : projectId;
  
  return [
    {
      $match: {
        projectId: projectIdObj
      }
    },
    {
      $lookup: {
        from: 'projectassignments',
        localField: 'userId',
        foreignField: 'userId',
        as: 'assignment'
      }
    },
    { $unwind: '$assignment' },
    {
      $group: {
        _id: {
          userId: '$userId',
          role: '$role'
        },
        questionnaires: { $addToSet: '$questionnaireKey' },
        submittedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
        },
        draftCount: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        },
        assignedQuestionnaires: { $first: '$assignment.questionnaires' }
      }
    },
    {
      $project: {
        userId: '$_id.userId',
        role: '$_id.role',
        submittedQuestionnaires: '$questionnaires',
        assignedQuestionnaires: 1,
        submittedCount: 1,
        draftCount: 1,
        completionRate: {
          $cond: [
            { $gt: [{ $size: '$assignedQuestionnaires' }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    '$submittedCount',
                    { $size: '$assignedQuestionnaires' }
                  ]
                },
                100
              ]
            },
            0
          ]
        },
        _id: 0
      }
    },
    { $sort: { role: 1, completionRate: -1 } }
  ];
}

module.exports = {
  projectLevelScoresByPrinciple,
  roleLevelScoresByPrinciple,
  hotspotQuestions,
  expertCompletionStatus
};


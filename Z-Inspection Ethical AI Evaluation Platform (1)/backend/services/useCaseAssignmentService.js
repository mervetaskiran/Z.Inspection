/**
 * Unified Use Case Assignment Resolver
 * 
 * Resolves assigned experts for a use case from ALL possible sources:
 * 1. usecases.assignedExperts (legacy embedded array)
 * 2. projects.assignedUsers (for linked projects)
 * 3. projectassignments collection (for projects linked to use case)
 * 4. responses.assignmentId (fallback via responses)
 * 
 * Returns: { assignedExpertsCount, assignedUserIds, assignedExperts }
 */

const mongoose = require('mongoose');

// Helper function for ObjectId validation
const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Get all assigned experts for a use case from all possible sources
 * @param {string|ObjectId} useCaseId - The use case ID
 * @returns {Promise<{assignedExpertsCount: number, assignedUserIds: string[], assignedExperts: Array}>}
 */
async function getAssignedExpertsForUseCase(useCaseId) {
  const UseCase = mongoose.model('UseCase');
  const Project = mongoose.model('Project');
  const User = mongoose.model('User');
  const ProjectAssignment = require('../models/projectAssignment');
  const Response = require('../models/response');
  
  // Start with empty set
  const assignedUserIds = new Set();
  const assignedExpertDetails = new Map(); // Map<userId, {userId, role, name}>
  
  try {
    // (1) Get use case document
    const useCase = await UseCase.findById(useCaseId).lean();
    if (!useCase) {
      return {
        assignedExpertsCount: 0,
        assignedUserIds: [],
        assignedExperts: []
      };
    }
    
    // (2) Legacy embedded assignments: usecases.assignedExperts
    if (useCase.assignedExperts && Array.isArray(useCase.assignedExperts)) {
      for (const expertId of useCase.assignedExperts) {
        if (expertId) {
          const idStr = expertId.toString ? expertId.toString() : String(expertId);
          if (isValidObjectId(idStr)) {
            assignedUserIds.add(idStr);
          }
        }
      }
    }
    
    // (3) Get all projects linked to this use case
    const linkedProjects = await Project.find({ 
      useCase: useCaseId.toString() 
    }).lean();
    
    // (4) From linked projects' assignedUsers (legacy)
    for (const project of linkedProjects) {
      if (project.assignedUsers && Array.isArray(project.assignedUsers)) {
        for (const userId of project.assignedUsers) {
          if (userId) {
            const idStr = userId.toString ? userId.toString() : String(userId);
            if (isValidObjectId(idStr)) {
              assignedUserIds.add(idStr);
            }
          }
        }
      }
    }
    
    // (5) From ProjectAssignment collection (new flow)
    const projectIds = linkedProjects.map(p => p._id);
    if (projectIds.length > 0) {
      const assignments = await ProjectAssignment.find({
        projectId: { $in: projectIds }
      }).lean();
      
      for (const assignment of assignments) {
        if (assignment.userId) {
          const idStr = assignment.userId.toString ? assignment.userId.toString() : String(assignment.userId);
          if (isValidObjectId(idStr)) {
            assignedUserIds.add(idStr);
            // Store role information
            if (!assignedExpertDetails.has(idStr)) {
              assignedExpertDetails.set(idStr, {
                userId: idStr,
                role: assignment.role || 'expert'
              });
            }
          }
        }
      }
    }
    
    // (6) Fallback: Check responses.assignmentId (if we still have no assignments)
    if (assignedUserIds.size === 0 && projectIds.length > 0) {
      const responses = await Response.find({
        projectId: { $in: projectIds }
      }).select('assignmentId userId').lean();
      
      const assignmentIds = responses
        .map(r => r.assignmentId)
        .filter(Boolean)
        .filter(id => isValidObjectId(id.toString()));
      
      if (assignmentIds.length > 0) {
        const assignmentsFromResponses = await ProjectAssignment.find({
          _id: { $in: assignmentIds }
        }).lean();
        
        for (const assignment of assignmentsFromResponses) {
          if (assignment.userId) {
            const idStr = assignment.userId.toString ? assignment.userId.toString() : String(assignment.userId);
            if (isValidObjectId(idStr)) {
              assignedUserIds.add(idStr);
              if (!assignedExpertDetails.has(idStr)) {
                assignedExpertDetails.set(idStr, {
                  userId: idStr,
                  role: assignment.role || 'expert'
                });
              }
            }
          }
        }
      }
    }
    
    // (7) Filter out admins and get user details
    const expertIdsArray = Array.from(assignedUserIds);
    let assignedExpertsCount = 0;
    const assignedExperts = [];
    
    if (expertIdsArray.length > 0) {
      // Convert to ObjectIds for query
      const expertObjectIds = expertIdsArray
        .filter(id => isValidObjectId(id))
        .map(id => new mongoose.Types.ObjectId(id));
      
      if (expertObjectIds.length > 0) {
        const experts = await User.find({
          _id: { $in: expertObjectIds },
          role: { $ne: 'admin' }
        }).select('_id name role email').lean();
        
        assignedExpertsCount = experts.length;
        
        // Build assignedExperts array with details
        for (const expert of experts) {
          const userIdStr = expert._id.toString();
          const details = assignedExpertDetails.get(userIdStr) || {};
          assignedExperts.push({
            userId: userIdStr,
            name: expert.name,
            role: expert.role,
            email: expert.email,
            assignmentRole: details.role || expert.role
          });
        }
      }
    }
    
    return {
      assignedExpertsCount,
      assignedUserIds: Array.from(assignedUserIds),
      assignedExperts
    };
    
  } catch (error) {
    console.error(`Error in getAssignedExpertsForUseCase(${useCaseId}):`, error);
    return {
      assignedExpertsCount: 0,
      assignedUserIds: [],
      assignedExperts: []
    };
  }
}

module.exports = {
  getAssignedExpertsForUseCase
};


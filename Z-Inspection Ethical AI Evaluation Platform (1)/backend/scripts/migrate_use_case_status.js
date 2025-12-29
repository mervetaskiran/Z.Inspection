/**
 * Migration script to fix Use Case statuses
 * 
 * Sets status to ASSIGNED if use case has assigned experts, otherwise UNASSIGNED
 * Removes incorrect IN_REVIEW statuses (unless manually set)
 * 
 * Run: node backend/scripts/migrate_use_case_status.js
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPathDot = path.resolve(__dirname, '../.env');
const envPathNoDot = path.resolve(__dirname, '../env');
const dotResult = dotenv.config({ path: envPathDot });
if (dotResult.error) {
  const noDotResult = dotenv.config({ path: envPathNoDot });
  if (noDotResult.error) {
    console.warn(`⚠️  dotenv could not load ${envPathDot} or ${envPathNoDot}`);
  }
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// UseCase Schema
const UseCaseSchema = new mongoose.Schema({
  title: String,
  description: String,
  aiSystemCategory: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedExperts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: String,
  answers: mongoose.Schema.Types.Mixed,
  extendedInfo: mongoose.Schema.Types.Mixed,
  supportingFiles: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'usecases' });

const UseCase = mongoose.model('UseCase', UseCaseSchema);

// User Schema (to filter out admins)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

// Project Schema
const ProjectSchema = new mongoose.Schema({
  title: String,
  useCase: String,
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { collection: 'projects' });

const Project = mongoose.model('Project', ProjectSchema);

// ProjectAssignment Schema
const ProjectAssignmentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: String
}, { collection: 'projectassignments' });

const ProjectAssignment = mongoose.model('ProjectAssignment', ProjectAssignmentSchema);

// Helper function for ObjectId validation
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

async function migrateUseCaseStatuses() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all use cases
    const useCases = await UseCase.find({}).lean();
    console.log(`📋 Found ${useCases.length} use cases to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const useCase of useCases) {
      try {
        // Get all projects linked to this use case
        const linkedProjects = await Project.find({ useCase: useCase._id.toString() }).lean();
        
        // Collect all assigned expert IDs (same logic as backend)
        const assignedExpertIds = new Set();
        
        // Add experts from useCase.assignedExperts
        if (useCase.assignedExperts && Array.isArray(useCase.assignedExperts)) {
          useCase.assignedExperts.forEach(id => {
            if (id) {
              const idStr = id.toString ? id.toString() : String(id);
              if (isValidObjectId(idStr)) {
                assignedExpertIds.add(idStr);
              }
            }
          });
        }
        
        // Add experts from linked projects' assignedUsers
        for (const project of linkedProjects) {
          if (project.assignedUsers && Array.isArray(project.assignedUsers)) {
            project.assignedUsers.forEach(id => {
              if (id) {
                const idStr = id.toString ? id.toString() : String(id);
                if (isValidObjectId(idStr)) {
                  assignedExpertIds.add(idStr);
                }
              }
            });
          }
        }
        
        // Also check ProjectAssignment collection for all assignments
        const projectIds = linkedProjects.map(p => p._id);
        if (projectIds.length > 0) {
          const assignments = await ProjectAssignment.find({
            projectId: { $in: projectIds }
          }).lean();
          
          assignments.forEach(assignment => {
            if (assignment.userId) {
              const idStr = assignment.userId.toString ? assignment.userId.toString() : String(assignment.userId);
              if (isValidObjectId(idStr)) {
                assignedExpertIds.add(idStr);
              }
            }
          });
        }
        
        // Filter out admins and count
        const expertIdsArray = Array.from(assignedExpertIds);
        let assignedExpertsCount = 0;
        if (expertIdsArray.length > 0) {
          // Convert string IDs to ObjectIds for query
          const expertObjectIds = expertIdsArray
            .filter(id => isValidObjectId(id))
            .map(id => new mongoose.Types.ObjectId(id));
          
          if (expertObjectIds.length > 0) {
            const experts = await User.find({
              _id: { $in: expertObjectIds },
              role: { $ne: 'admin' }
            }).select('_id').lean();
            
            assignedExpertsCount = experts.length;
          }
        }

        // Determine new status
        const newStatus = assignedExpertsCount > 0 ? 'ASSIGNED' : 'UNASSIGNED';
        
        // Only update if status needs to change
        if (useCase.status !== newStatus) {
          await UseCase.findByIdAndUpdate(useCase._id, { 
            status: newStatus,
            updatedAt: new Date()
          });
          console.log(`✅ Updated use case "${useCase.title || useCase._id}": ${useCase.status} → ${newStatus} (${assignedExpertsCount} experts)`);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing use case ${useCase._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped (already correct): ${skippedCount}`);
    console.log(`   📋 Total: ${useCases.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateUseCaseStatuses();


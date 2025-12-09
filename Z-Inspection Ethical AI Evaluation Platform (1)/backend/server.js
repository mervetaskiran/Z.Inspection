const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;

// --- GÜNCELLEME: Dosya yükleme limiti 300MB yapıldı ---
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ limit: '300mb', extended: true }));
app.use(cors());

// --- 1. VERİTABANI BAĞLANTISI ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin_merve:Sifre123@cluster0.tg8voq1.mongodb.net/zinspection?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Bağlantısı Başarılı'))
  .catch(err => console.error('❌ Bağlantı Hatası:', err));


// --- 2. ŞEMALAR (MODELS) ---

// User
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  preconditionApproved: { type: Boolean, default: false },
  preconditionApprovedAt: { type: Date }
});
const User = mongoose.model('User', UserSchema);

// NOTE: we will store whether the user has approved the precondition

// Project
const ProjectSchema = new mongoose.Schema({
  title: String,
  shortDescription: String,
  fullDescription: String,
  status: { type: String, default: 'ongoing' },
  stage: { type: String, default: 'set-up' },
  targetDate: String,
  progress: { type: Number, default: 0 },
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  useCase: { type: String },
  inspectionContext: { 
        requester: String,
        inspectionReason: String,
        relevantFor: String,
        isMandatory: String,
        conditionsToAnalyze: String,
        resultsUsage: String,
        resultsSharing: String,
    },

  createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', ProjectSchema);

// UseCase
const UseCaseSchema = new mongoose.Schema({
  title: String,
  description: String,
  aiSystemCategory: String,
  status: { type: String, default: 'assigned' },
  progress: { type: Number, default: 0 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedExperts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  adminNotes: String,
  supportingFiles: [{
    name: String,
    data: String, // Base64
    contentType: String,
    url: String
  }],
  createdAt: { type: Date, default: Date.now },
  extendedInfo: { type: Map, of: mongoose.Schema.Types.Mixed },
  feedback: [{ from: String, text: String, timestamp: { type: Date, default: Date.now } }],
  adminReflections: [{ id: String, text: String, visibleToExperts: Boolean, createdAt: { type: Date, default: Date.now } }]
});
const UseCase = mongoose.model('UseCase', UseCaseSchema);

// Evaluation
const EvaluationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stage: { type: String, required: true },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed },
  riskLevel: { type: String, default: 'medium' },
  status: { type: String, default: 'draft' },
  updatedAt: { type: Date, default: Date.now }
});
EvaluationSchema.index({ projectId: 1, userId: 1, stage: 1 }, { unique: true });
const Evaluation = mongoose.model('Evaluation', EvaluationSchema);

// Tension (GÜNCELLENDİ: Evidence Array, Comment ve Dosya Desteği)
const TensionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  principle1: String,
  principle2: String,
  claimStatement: String, 
  description: String,    
  severity: String, 
  status: { type: String, default: 'ongoing' },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  
  votes: [{
    userId: String,
    voteType: { type: String, enum: ['agree', 'disagree'] }
  }],
  
  comments: [{
    text: String,
    authorId: String,
    authorName: String,
    date: { type: Date, default: Date.now }
  }],

  evidences: [{
    title: String,
    description: String,
    fileName: String,
    fileData: String, // Base64 Data
    uploadedBy: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
});
const Tension = mongoose.model('Tension', TensionSchema);


// --- 3. ROUTES (API UÇLARI) ---

// Use Cases
app.get('/api/use-cases', async (req, res) => { try { const useCases = await UseCase.find(); res.json(useCases); } catch (err) { res.status(500).json({ error: err.message }); }});
app.get('/api/use-cases/:id', async (req, res) => { try { const useCase = await UseCase.findById(req.params.id); if (!useCase) return res.status(404).json({ error: 'Not found' }); res.json(useCase); } catch (err) { res.status(500).json({ error: err.message }); }});
// DEBUG route: show findById and attempt findByIdAndDelete but don't delete
app.get('/api/debug/use-cases/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const found = await UseCase.findById(id);
    const foundByQuery = await UseCase.findOne({ _id: id });
    return res.json({ found: !!found, foundByQuery: !!foundByQuery, idType: typeof id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/use-cases', async (req, res) => { try { const useCase = new UseCase(req.body); await useCase.save(); res.json(useCase); } catch (err) { res.status(500).json({ error: err.message }); }});
app.delete('/api/use-cases/:id', async (req, res) => {
  try {
    const deletedUseCase = await UseCase.findByIdAndDelete(req.params.id);
    if (!deletedUseCase) {
      return res.status(404).json({ error: 'Use case not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add supporting files to a use case (files should be sent as base64 data)
app.post('/api/use-cases/:id/supporting-files', async (req, res) => {
  try {
    const useCaseId = req.params.id;
    const { files } = req.body; // expect [{ name, data, contentType, url? }]
    const useCase = await UseCase.findById(useCaseId);
    if (!useCase) return res.status(404).json({ error: 'Use case not found' });

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!useCase.supportingFiles) useCase.supportingFiles = [];
    files.forEach(f => {
      useCase.supportingFiles.push({
        name: f.name,
        data: f.data,
        contentType: f.contentType,
        url: f.url
      });
    });

    await useCase.save();
    res.json(useCase.supportingFiles);
  } catch (err) {
    console.error('Support file upload error', err);
    res.status(500).json({ error: err.message });
  }
});

// Tensions - OLUŞTURMA (İlk evidence ile birlikte)
app.post('/api/tensions', async (req, res) => {
  try {
    const { 
      projectId, principle1, principle2, claimStatement, description, 
      evidenceDescription, evidenceFileName, evidenceFileData,
      severity, status, createdBy 
    } = req.body;

    const initialEvidences = [];
    // Eğer formdan dosya veya açıklama geldiyse ilk kanıtı oluştur
    if (evidenceDescription || evidenceFileName) {
        initialEvidences.push({
            title: 'Initial Claim Evidence',
            description: evidenceDescription,
            fileName: evidenceFileName,
            fileData: evidenceFileData,
            uploadedBy: createdBy,
            uploadedAt: new Date()
        });
    }

    const tension = new Tension({
      projectId, principle1, principle2, claimStatement, description, 
      severity, status, createdBy,
      evidences: initialEvidences,
      comments: []
    });

    await tension.save();
    console.log("⚡ Yeni Tension eklendi:", tension._id);
    res.json(tension);
  } catch (err) {
    console.error("❌ Tension Ekleme Hatası:", err);
    res.status(500).json({ error: err.message });
  }
});

// Tension getir (id ile)
app.get('/api/tensions/id/:id', async (req, res) => {
  try {
    const tension = await Tension.findById(req.params.id);
    if (!tension) return res.status(404).json({ error: 'Not found' });
    res.json(tension);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tension sil
app.delete('/api/tensions/:id', async (req, res) => {
  try {
    const deleted = await Tension.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tensions/:projectId', async (req, res) => {
  try {
    const { userId } = req.query;
    const tensions = await Tension.find({ projectId: req.params.projectId });
    const formattedTensions = tensions.map(t => {
        const agreeCount = t.votes ? t.votes.filter(v => v.voteType === 'agree').length : 0;
        const disagreeCount = t.votes ? t.votes.filter(v => v.voteType === 'disagree').length : 0;
        const myVote = userId && t.votes ? t.votes.find(v => v.userId === userId)?.voteType : null;
        return {
            ...t.toObject(),
            consensus: { agree: agreeCount, disagree: disagreeCount },
            userVote: myVote
        };
    });
    res.json(formattedTensions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tensions/:id/vote', async (req, res) => {
  try {
    const { userId, voteType } = req.body;
    const tension = await Tension.findById(req.params.id);
    if (!tension) return res.status(404).send('Not found');
    if (!tension.votes) tension.votes = [];
    const existingVoteIndex = tension.votes.findIndex(v => v.userId === userId);
    if (existingVoteIndex > -1) {
      if (tension.votes[existingVoteIndex].voteType === voteType) tension.votes.splice(existingVoteIndex, 1);
      else tension.votes[existingVoteIndex].voteType = voteType;
    } else {
      tension.votes.push({ userId, voteType });
    }
    await tension.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// YORUM EKLEME
app.post('/api/tensions/:id/comment', async (req, res) => {
  try {
    const { text, authorId, authorName } = req.body;
    const tension = await Tension.findById(req.params.id);
    if (!tension) return res.status(404).send('Not found');
    
    if (!tension.comments) tension.comments = [];
    tension.comments.push({ text, authorId, authorName, date: new Date() });
    
    await tension.save();
    res.json(tension.comments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// EVIDENCE EKLEME (Sonradan ekleme)
app.post('/api/tensions/:id/evidence', async (req, res) => {
  try {
    const { title, description, fileName, fileData, uploadedBy } = req.body;
    const tension = await Tension.findById(req.params.id);
    if (!tension) return res.status(404).send('Not found');

    if (!tension.evidences) tension.evidences = [];
    tension.evidences.push({
      title, description, fileName, fileData, uploadedBy, uploadedAt: new Date()
    });

    await tension.save();
    res.json(tension.evidences);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: err.message }); 
  }
});

// Evaluations
app.post('/api/evaluations', async (req, res) => {
  try {
    const { projectId, userId, stage, answers, riskLevel, status } = req.body;
    const evaluation = await Evaluation.findOneAndUpdate(
      { projectId, userId, stage },
      { answers, riskLevel, status: status || 'draft', updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(evaluation);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/evaluations', async (req, res) => {
  try {
    const { projectId, userId, stage } = req.query;
    const evaluation = await Evaluation.findOne({ projectId, userId, stage });
    res.json(evaluation || { answers: {}, riskLevel: 'medium' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// General Routes
app.post('/api/register', async (req, res) => { try { const newUser = new User(req.body); await newUser.save(); res.json(newUser); } catch (err) { res.status(500).json({ error: err.message }); }});
app.post('/api/login', async (req, res) => { const user = await User.findOne({ email: req.body.email, password: req.body.password, role: req.body.role }); if (user) res.json(user); else res.status(401).json({ message: "Invalid credentials" });});
// Mark user's precondition as approved (server-side)
app.post('/api/users/:id/precondition-approval', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { preconditionApproved: true, preconditionApprovedAt: new Date() },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Do not expose password
    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/projects', async (req, res) => { const projects = await Project.find(); res.json(projects); });
app.post('/api/projects', async (req, res) => { const project = new Project(req.body); await project.save(); res.json(project); });
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (!deletedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/users', async (req, res) => { const users = await User.find({}, '-password'); res.json(users); });

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
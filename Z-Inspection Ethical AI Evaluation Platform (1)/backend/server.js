const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- GÜNCELLEME: Dosya yükleme limiti 300MB yapıldı ---
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ limit: '300mb', extended: true }));
app.use(cors());

// --- 1. VERİTABANI BAĞLANTISI ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin_merve:Sifre123@cluster0.tg8voq1.mongodb.net/zinspection?retryWrites=true&w=majority&appName=Cluster0';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Bağlantısı Başarılı'))
  .catch((err) => console.error('❌ Bağlantı Hatası:', err));


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
  preconditionApprovedAt: { type: Date },
  profileImage: { type: String } // Base64 image
});
const User = mongoose.model('User', UserSchema);

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

// Evaluation (gelişmiş sürüm)
const EvaluationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stage: { type: String, required: true },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed },
  questionPriorities: { type: Map, of: String }, // Her soru için önem derecesi (low/medium/high)
  riskLevel: { type: String, default: 'medium' },
  generalRisks: [{ // Genel riskler - her proje için ayrı ayrı kaydedilir
    id: String,
    title: String,
    description: String,
    severity: { type: String, default: 'medium' }, // low | medium | high | critical
    relatedQuestions: [String]
  }],
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

// Message
const MessageSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date }
});
MessageSchema.index({ projectId: 1, fromUserId: 1, toUserId: 1, createdAt: -1 });
const Message = mongoose.model('Message', MessageSchema);

// SharedDiscussion (Shared Area için)
const SharedDiscussionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Opsiyonel: proje ile ilişkilendirilebilir
  isPinned: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedDiscussion' }, // Reply için
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // @mention için
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
SharedDiscussionSchema.index({ createdAt: -1 });
SharedDiscussionSchema.index({ isPinned: -1, createdAt: -1 });
const SharedDiscussion = mongoose.model('SharedDiscussion', SharedDiscussionSchema);

// --- 3. ROUTES (API UÇLARI) ---

// Use Cases
app.get('/api/use-cases', async (req, res) => {
  try {
    const useCases = await UseCase.find();
    res.json(useCases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/use-cases/:id', async (req, res) => {
  try {
    const useCase = await UseCase.findById(req.params.id);
    if (!useCase) return res.status(404).json({ error: 'Not found' });
    res.json(useCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/use-cases', async (req, res) => {
  try {
    const useCase = new UseCase(req.body);
    await useCase.save();
    res.json(useCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.put('/api/use-cases/:id/assign', async (req, res) => {
  try {
    const { assignedExperts = [], adminNotes = '' } = req.body;
    const updated = await UseCase.findByIdAndUpdate(
      req.params.id,
      { assignedExperts, adminNotes },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
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

// Tension güncelle
app.put('/api/tensions/:id', async (req, res) => {
  try {
    const { principle1, principle2, claimStatement, description, severity, status } = req.body;
    const updated = await Tension.findByIdAndUpdate(
      req.params.id,
      { principle1, principle2, claimStatement, description, severity, status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    const { projectId, userId, stage, answers, questionPriorities, riskLevel, generalRisks, status } = req.body;
    const evaluation = await Evaluation.findOneAndUpdate(
      { projectId, userId, stage },
      { 
        answers, 
        questionPriorities, 
        riskLevel, 
        generalRisks: generalRisks || [], 
        status: status || 'draft', 
        updatedAt: new Date() 
      },
      { new: true, upsert: true }
    );
    res.json(evaluation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/evaluations', async (req, res) => {
  try {
    const { projectId, userId, stage } = req.query;
    const evaluation = await Evaluation.findOne({ projectId, userId, stage });
    res.json(evaluation || { answers: {}, riskLevel: 'medium' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// General Routes
app.post('/api/register', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({ 
      email: req.body.email, 
      password: req.body.password, 
      role: req.body.role 
    });
    if (user) res.json(user);
    else res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Messages

// GET /api/messages/thread?projectId=&user1=&user2=
app.get('/api/messages/thread', async (req, res) => {
  try {
    const { projectId, user1, user2 } = req.query;
    if (!projectId || !user1 || !user2) {
      return res.status(400).json({ error: 'Missing required parameters: projectId, user1, user2' });
    }
    
    const messages = await Message.find({
      projectId: projectId,
      $or: [
        { fromUserId: user1, toUserId: user2 },
        { fromUserId: user2, toUserId: user1 }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('fromUserId', 'name email')
    .populate('toUserId', 'name email');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages
app.post('/api/messages', async (req, res) => {
  try {
    const { projectId, fromUserId, toUserId, text } = req.body;
    if (!projectId || !fromUserId || !toUserId || !text) {
      return res.status(400).json({ error: 'Missing required fields: projectId, fromUserId, toUserId, text' });
    }
    
    const message = new Message({
      projectId,
      fromUserId,
      toUserId,
      text,
      createdAt: new Date()
    });
    
    await message.save();
    const populated = await Message.findById(message._id)
      .populate('fromUserId', 'name email')
      .populate('toUserId', 'name email')
      .populate('projectId', 'title');
    
    // Send email notification (async, don't wait for it)
    (async () => {
      try {
        const fromUser = await User.findById(fromUserId);
        const toUser = await User.findById(toUserId);
        const project = await Project.findById(projectId);
        
        if (fromUser && toUser && project) {
          // Create transporter (using Gmail as example - configure with your SMTP settings)
          const transporter = nodemailer.createTransport({
            service: 'gmail', // or use your SMTP settings
            auth: {
              user: process.env.EMAIL_USER || 'your-email@gmail.com',
              pass: process.env.EMAIL_PASS || 'your-app-password'
            }
          });

          // Only send email if credentials are configured
          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
              from: `"Z-Inspection Platform" <${process.env.EMAIL_USER}>`,
              to: toUser.email,
              subject: `New message from ${fromUser.name} - ${project.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1F2937;">New Message on Z-Inspection Platform</h2>
                  <p>You have received a new message from <strong>${fromUser.name}</strong> regarding project <strong>"${project.title}"</strong>.</p>
                  <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; color: #374151;">${text.replace(/\n/g, '<br>')}</p>
                  </div>
                  <p style="color: #6B7280; font-size: 14px;">Please log in to the platform to respond.</p>
                  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
                  <p style="color: #9CA3AF; font-size: 12px;">This is an automated notification from Z-Inspection Platform.</p>
                </div>
              `,
              text: `You have received a new message from ${fromUser.name} regarding project "${project.title}":\n\n${text}\n\nPlease log in to the platform to respond.`
            });
            console.log('📧 Email sent successfully to:', toUser.email);
          } else {
            // Log email notification if credentials not configured
            console.log('📧 Email Notification (credentials not configured):');
            console.log(`To: ${toUser.email} (${toUser.name})`);
            console.log(`From: ${fromUser.name}`);
            console.log(`Project: ${project.title}`);
            console.log(`Message: ${text.substring(0, 100)}...`);
            console.log('---');
            console.log('💡 To enable email sending, set EMAIL_USER and EMAIL_PASS in .env file');
          }
        }
      } catch (emailErr) {
        console.error('Email notification error:', emailErr);
        // Don't fail the message send if email fails
      }
    })();
    
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/send-email (Email notification endpoint)
app.post('/api/messages/send-email', async (req, res) => {
  try {
    const { to, toName, fromName, projectTitle, message, projectId } = req.body;
    
    // Create transporter (using Gmail as example - configure with your SMTP settings)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or use your SMTP settings
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });

    // Only send email if credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: `"Z-Inspection Platform" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `New message from ${fromName} - ${projectTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1F2937;">New Message on Z-Inspection Platform</h2>
            <p>You have received a new message from <strong>${fromName}</strong> regarding project <strong>"${projectTitle}"</strong>.</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #374151;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color: #6B7280; font-size: 14px;">Please log in to the platform to respond.</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #9CA3AF; font-size: 12px;">This is an automated notification from Z-Inspection Platform.</p>
          </div>
        `,
        text: `You have received a new message from ${fromName} regarding project "${projectTitle}":\n\n${message}\n\nPlease log in to the platform to respond.`
      });
      console.log('📧 Email sent successfully to:', to);
      res.json({ success: true, message: 'Email sent successfully' });
    } else {
      // Log email notification if credentials not configured
      console.log('📧 Email Notification (credentials not configured):');
      console.log(`To: ${to} (${toName})`);
      console.log(`From: ${fromName}`);
      console.log(`Project: ${projectTitle}`);
      console.log(`Message: ${message.substring(0, 100)}...`);
      console.log('---');
      console.log('💡 To enable email sending, set EMAIL_USER and EMAIL_PASS in .env file');
      res.json({ success: true, message: 'Email notification logged (credentials not configured)' });
    }
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/mark-read
app.post('/api/messages/mark-read', async (req, res) => {
  try {
    const { messageIds, userId, projectId, otherUserId } = req.body;
    
    if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      await Message.updateMany(
        { _id: { $in: messageIds }, toUserId: userId },
        { readAt: new Date() }
      );
    } else if (projectId && userId && otherUserId) {
      // Mark all messages in a thread as read
      await Message.updateMany(
        {
          projectId: projectId,
          fromUserId: otherUserId,
          toUserId: userId,
          readAt: null
        },
        { readAt: new Date() }
      );
    } else {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/unread-count?userId=
app.get('/api/messages/unread-count', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    // Get unread messages grouped by project and sender
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const unreadMessages = await Message.find({
      toUserId: userIdObj,
      readAt: null
    })
    .populate('projectId', 'title')
    .populate('fromUserId', 'name email')
    .sort({ createdAt: -1 });
    
    // Group by projectId and fromUserId
    const conversations = {};
    unreadMessages.forEach(msg => {
      const projectId = msg.projectId._id.toString();
      const fromUserId = msg.fromUserId._id.toString();
      const key = `${projectId}-${fromUserId}`;
      
      if (!conversations[key]) {
        conversations[key] = {
          projectId: projectId,
          projectTitle: msg.projectId.title,
          fromUserId: fromUserId,
          fromUserName: msg.fromUserId.name,
          count: 0,
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt
        };
      }
      conversations[key].count++;
      if (msg.createdAt > conversations[key].lastMessageTime) {
        conversations[key].lastMessage = msg.text;
        conversations[key].lastMessageTime = msg.createdAt;
      }
    });
    
    const totalCount = unreadMessages.length;
    const conversationList = Object.values(conversations);
    
    res.json({
      totalCount,
      conversations: conversationList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/conversations?userId=
app.get('/api/messages/conversations', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Get all messages where user is involved (as sender or receiver)
    const allMessages = await Message.find({
      $or: [
        { fromUserId: userIdObj },
        { toUserId: userIdObj }
      ]
    })
    .populate('projectId', 'title')
    .populate('fromUserId', 'name email role')
    .populate('toUserId', 'name email role')
    .sort({ createdAt: -1 });

    // Group by project and other user
    const conversationsMap = {};
    
    allMessages.forEach(msg => {
      const projectId = msg.projectId._id.toString();
      const otherUserId = msg.fromUserId._id.toString() === userId ? 
        msg.toUserId._id.toString() : 
        msg.fromUserId._id.toString();
      const key = `${projectId}-${otherUserId}`;

      if (!conversationsMap[key]) {
        conversationsMap[key] = {
          projectId: projectId,
          projectTitle: msg.projectId.title,
          otherUserId: otherUserId,
          otherUserName: msg.fromUserId._id.toString() === userId ? 
            msg.toUserId.name : 
            msg.fromUserId.name,
          otherUserRole: msg.fromUserId._id.toString() === userId ? 
            msg.toUserId.role : 
            msg.fromUserId.role,
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
          unreadCount: 0
        };
      }

      // Update last message if this is newer
      if (new Date(msg.createdAt) > new Date(conversationsMap[key].lastMessageTime)) {
        conversationsMap[key].lastMessage = msg.text;
        conversationsMap[key].lastMessageTime = msg.createdAt;
      }

      // Count unread messages (where user is receiver and message is unread)
      if (msg.toUserId._id.toString() === userId && !msg.readAt) {
        conversationsMap[key].unreadCount++;
      }
    });

    // Convert to array and sort by last message time
    const conversations = Object.values(conversationsMap).sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/delete-conversation
app.delete('/api/messages/delete-conversation', async (req, res) => {
  try {
    const { projectId, userId, otherUserId } = req.body;
    if (!projectId || !userId || !otherUserId) {
      return res.status(400).json({ error: 'Missing required parameters: projectId, userId, otherUserId' });
    }

    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const otherUserIdObj = mongoose.Types.ObjectId.isValid(otherUserId) ? new mongoose.Types.ObjectId(otherUserId) : otherUserId;

    // Delete all messages in this conversation
    const result = await Message.deleteMany({
      projectId: projectId,
      $or: [
        { fromUserId: userIdObj, toUserId: otherUserIdObj },
        { fromUserId: otherUserIdObj, toUserId: userIdObj }
      ]
    });

    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} messages` 
    });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profile endpoints - SPECIFIC routes must come BEFORE general /:id route
app.post('/api/users/:id/profile-image', async (req, res) => {
  console.log('🔍 Route hit: POST /api/users/:id/profile-image');
  console.log('🔍 Request params:', req.params);
  console.log('🔍 Request body keys:', Object.keys(req.body || {}));
  
  try {
    const { image } = req.body;
    const userId = req.params.id;
    
    console.log('📸 Profile image update request:', { userId, hasImage: !!image, imageLength: image?.length });
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('❌ Invalid user ID:', userId);
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: image || null },
      { new: true }
    ).select('-password');
    
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Profile image updated successfully for user:', userId);
    res.json(user);
  } catch (err) {
    console.error('❌ Error updating profile image:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile image' });
  }
});

app.post('/api/users/:id/change-password', async (req, res) => {
  console.log('🔍 Route hit: POST /api/users/:id/change-password');
  console.log('🔍 Request params:', req.params);
  console.log('🔍 Request body keys:', Object.keys(req.body || {}));
  
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;
    
    console.log('🔐 Password change request:', { userId, hasOldPassword: !!oldPassword, hasNewPassword: !!newPassword });
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('❌ Invalid user ID:', userId);
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.password !== oldPassword) {
      console.log('❌ Old password incorrect');
      return res.status(400).json({ error: 'Old password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    console.log('✅ Password changed successfully for user:', userId);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error changing password:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id/delete-account', async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// General user update (must come AFTER specific routes)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { name },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared Discussion (Shared Area) Endpoints
// GET /api/shared-discussions?projectId= (projectId opsiyonel, tüm mesajları getirir)
app.get('/api/shared-discussions', async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (projectId && projectId !== 'all') {
      // Convert to ObjectId if valid
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        query.projectId = new mongoose.Types.ObjectId(projectId);
      } else {
        query.projectId = projectId;
      }
    }
    
    const discussions = await SharedDiscussion.find(query)
      .populate('userId', 'name email role')
      .populate('projectId', 'title')
      .populate('replyTo', 'text userId')
      .populate('mentions', 'name email')
      .sort({ isPinned: -1, createdAt: -1 }); // Pinned mesajlar önce, sonra tarihe göre
    
    res.json(discussions);
  } catch (err) {
    console.error('Error fetching shared discussions:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shared-discussions
app.post('/api/shared-discussions', async (req, res) => {
  try {
    console.log('📨 Received shared discussion request:', req.body);
    const { userId, text, projectId, replyTo, mentions } = req.body;
    
    if (!userId || !text) {
      console.error('❌ Missing required fields:', { userId: !!userId, text: !!text });
      return res.status(400).json({ error: 'Missing required fields: userId, text' });
    }
    
    // Convert userId to ObjectId if valid
    let userIdObj;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
      // Verify user exists
      const userExists = await User.findById(userIdObj);
      if (!userExists) {
        console.error('❌ User not found with id:', userId);
        return res.status(400).json({ error: 'User not found' });
      }
    } else {
      console.error('❌ Invalid userId format:', userId);
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    const projectIdObj = projectId && projectId !== 'all' && mongoose.Types.ObjectId.isValid(projectId)
      ? new mongoose.Types.ObjectId(projectId)
      : (projectId && projectId !== 'all' ? projectId : null);
    const replyToObj = replyTo && mongoose.Types.ObjectId.isValid(replyTo)
      ? new mongoose.Types.ObjectId(replyTo)
      : (replyTo || null);
    const mentionsObj = mentions && Array.isArray(mentions)
      ? mentions.map(m => mongoose.Types.ObjectId.isValid(m) ? new mongoose.Types.ObjectId(m) : m)
      : [];
    
    console.log('✅ Creating discussion with:', { userIdObj, text: text.substring(0, 50), projectIdObj });
    
    const discussion = new SharedDiscussion({
      userId: userIdObj,
      text,
      projectId: projectIdObj,
      replyTo: replyToObj,
      mentions: mentionsObj,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await discussion.save();
    console.log('✅ Discussion saved:', discussion._id);
    
    // Populate ile tam bilgileri getir
    const populated = await SharedDiscussion.findById(discussion._id)
      .populate('userId', 'name email role')
      .populate('projectId', 'title')
      .populate('replyTo', 'text userId')
      .populate('mentions', 'name email');
    
    console.log('✅ Discussion populated successfully');
    res.json(populated);
  } catch (err) {
    console.error('❌ Error creating shared discussion:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/shared-discussions/:id/pin (Admin only - pin/unpin)
app.put('/api/shared-discussions/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPinned } = req.body;
    
    const discussion = await SharedDiscussion.findByIdAndUpdate(
      id,
      { isPinned: isPinned === true, updatedAt: new Date() },
      { new: true }
    )
      .populate('userId', 'name email role')
      .populate('projectId', 'title')
      .populate('replyTo', 'text userId')
      .populate('mentions', 'name email');
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    res.json(discussion);
  } catch (err) {
    console.error('Error pinning/unpinning discussion:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/shared-discussions/:id
app.delete('/api/shared-discussions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SharedDiscussion.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting discussion:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

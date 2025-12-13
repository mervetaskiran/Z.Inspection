const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const compression = require('compression');
require('dotenv').config();

// Helper function for ObjectId validation (compatible with Mongoose v9+)
const isValidObjectId = (id) => {
  if (typeof mongoose.isValidObjectId === 'function') {
    return mongoose.isValidObjectId(id);
  }
  return mongoose.Types.ObjectId.isValid(id);
};

const app = express();
const PORT = process.env.PORT || 5000;

// Enable compression for faster responses
app.use(compression());

// --- GÜNCELLEME: Dosya yükleme limiti 300MB yapıldı ---
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ limit: '300mb', extended: true }));
app.use(cors({
  origin: '*',
  credentials: true
}));

// Set keep-alive timeout
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  next();
});

// --- 1. VERİTABANI BAĞLANTISI ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin_merve:Sifre123@cluster0.tg8voq1.mongodb.net/zinspection?retryWrites=true&w=majority&appName=Cluster0';

// Optimize MongoDB connection with connection pooling
mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })
  .then(() => {
    console.log('✅ MongoDB Atlas Bağlantısı Başarılı');
    // Set mongoose options for better performance
    mongoose.set('bufferCommands', false);
    mongoose.set('strictQuery', false);
  })
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
// Index for faster login queries
UserSchema.index({ email: 1, password: 1, role: 1 });
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

// UseCaseQuestion - Sorular ayrı collection'da
const UseCaseQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  questionEn: { type: String, required: true },
  questionTr: { type: String, required: true },
  type: { type: String, required: true }, // 'text' or 'multiple-choice'
  options: { type: [String], default: [] }, // For multiple-choice questions
  order: { type: Number, default: 0 } // Sıralama için
});
UseCaseQuestionSchema.index({ order: 1 }); // Sıralama için index
const UseCaseQuestion = mongoose.model('UseCaseQuestion', UseCaseQuestionSchema);

// UseCase - Sadece cevapları tutar
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
  answers: [{ // Sadece cevaplar - questionId ve answer
    questionId: { type: String, required: true },
    answer: { type: String, default: '' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  extendedInfo: { type: Map, of: mongoose.Schema.Types.Mixed },
  feedback: [{ from: String, text: String, timestamp: { type: Date, default: Date.now } }],
  adminReflections: [{ id: String, text: String, visibleToExperts: Boolean, createdAt: { type: Date, default: Date.now } }]
});
UseCaseSchema.index({ ownerId: 1 }); // Owner'a göre arama için index
UseCaseSchema.index({ status: 1 }); // Status'a göre arama için index
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

// GeneralQuestionsAnswers - General questions answers stored separately by role, organized by ethical principles
const GeneralQuestionsAnswersSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userRole: { type: String, required: true }, // Store role separately for filtering
  // Organized by ethical principle
  principles: {
    TRANSPARENCY: {
      answers: { type: mongoose.Schema.Types.Mixed, default: {} }, // questionId -> answer
      risks: { type: mongoose.Schema.Types.Mixed, default: {} }   // questionId -> risk score (0-4)
    },
    'HUMAN AGENCY & OVERSIGHT': {
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      risks: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    'TECHNICAL ROBUSTNESS & SAFETY': {
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      risks: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    'PRIVACY & DATA GOVERNANCE': {
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      risks: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    'DIVERSITY, NON-DISCRIMINATION & FAIRNESS': {
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      risks: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    'SOCIETAL & INTERPERSONAL WELL-BEING': {
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      risks: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    ACCOUNTABILITY: {
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      risks: { type: mongoose.Schema.Types.Mixed, default: {} }
    }
  },
  // Legacy support - keep flat structure for backward compatibility
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  risks: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now }
});
GeneralQuestionsAnswersSchema.index({ projectId: 1, userId: 1 }, { unique: true });
GeneralQuestionsAnswersSchema.index({ projectId: 1, userRole: 1 }); // Index for role-based queries
const GeneralQuestionsAnswers = mongoose.model('GeneralQuestionsAnswers', GeneralQuestionsAnswersSchema);

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

// Report - AI Generated Analysis Reports
const ReportSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, default: 'Analysis Report' },
  content: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'final', 'archived'], default: 'draft' },
  metadata: {
    totalScores: Number,
    totalEvaluations: Number,
    totalTensions: Number,
    principlesAnalyzed: [String]
  },
  version: { type: Number, default: 1 }
}, { timestamps: true });
ReportSchema.index({ projectId: 1, generatedAt: -1 });
ReportSchema.index({ projectId: 1, status: 1 });
const Report = mongoose.model('Report', ReportSchema);

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

// Use Case Questions - Soruları getir (cached for performance)
let questionsCache = null;
let questionsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get('/api/use-case-questions', async (req, res) => {
  try {
    // Return cached data if available and fresh
    const now = Date.now();
    if (questionsCache && (now - questionsCacheTime) < CACHE_DURATION) {
      return res.json(questionsCache);
    }
    
    // Fetch from database
    const questions = await UseCaseQuestion.find().sort({ order: 1 }).lean();
    questionsCache = questions;
    questionsCacheTime = now;
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use Case Questions - Soruları seed et (ilk kurulum için)
app.post('/api/use-case-questions/seed', async (req, res) => {
  try {
    const questions = [
      { id: 'q1', questionEn: 'What is the name and version of the AI system used in this project?', questionTr: 'Bu projede kullanılan AI sisteminin adı ve versiyonu nedir?', type: 'text', options: [], order: 1 },
      { id: 'q2', questionEn: 'Which organization or team is responsible for developing this AI system?', questionTr: 'Bu AI sistemini geliştiren organizasyon veya ekip kimdir?', type: 'text', options: [], order: 2 },
      { id: 'q3', questionEn: 'Which application domain best describes how the system is used (e.g., healthcare, education, finance)?', questionTr: 'Sistemin kullanıldığı uygulama alanı nedir? (Örn. sağlık, eğitim, finans)', type: 'multiple-choice', options: ['Healthcare', 'Education', 'Finance', 'Transportation', 'Energy', 'Public Sector', 'Other'], order: 3 },
      { id: 'q4', questionEn: 'What specific problem does this AI system aim to solve in your use case?', questionTr: 'Bu AI sistemi kullanım senaryonuzda hangi spesifik problemi çözmeyi amaçlıyor?', type: 'text', options: [], order: 4 },
      { id: 'q5', questionEn: 'In what environment will the system be deployed (e.g., mobile app, hospital system, web app)?', questionTr: 'Sistem hangi ortamda kullanılacak? (Örn. mobil uygulama, hastane sistemi, web)', type: 'multiple-choice', options: ['Mobile App', 'Web App', 'Hospital System', 'Desktop Application', 'Cloud Platform', 'Edge Device', 'Other'], order: 5 },
      { id: 'q6', questionEn: 'At what stage is the system currently (prototype, testing, live deployment)?', questionTr: 'Sistem şu anda hangi aşamada? (Prototip, test, aktif kullanım…)', type: 'multiple-choice', options: ['Prototype', 'Testing', 'Live Deployment', 'Pilot', 'Development'], order: 6 },
      { id: 'q7', questionEn: 'What are the main performance or impact claims made about the system?', questionTr: 'Sistem hakkında yapılan temel performans, etki veya fayda iddiaları nelerdir?', type: 'text', options: [], order: 7 },
      { id: 'q8', questionEn: 'Who are the primary and secondary users of this system?', questionTr: 'Bu sistemin birincil ve ikincil kullanıcıları kimlerdir?', type: 'text', options: [], order: 8 },
      { id: 'q9', questionEn: 'What is the typical technical proficiency level of users interacting with the system?', questionTr: 'Sistemle etkileşime giren kullanıcıların tipik teknik yeterlilik seviyesi nedir?', type: 'text', options: [], order: 9 },
      { id: 'q10', questionEn: 'How do you prevent users from over-relying on AI outputs?', questionTr: 'Kullanıcıların AI çıktısına aşırı güvenmesini nasıl engelliyorsunuz?', type: 'text', options: [], order: 10 },
      { id: 'q11', questionEn: 'Does the system introduce delays or workflow challenges that affect usability?', questionTr: 'Sistem kullanımda gecikmelere veya iş akışında zorluklara neden oluyor mu?', type: 'text', options: [], order: 11 },
      { id: 'q12', questionEn: 'What type of AI model does the system use?', questionTr: 'Sistem hangi tür AI modelini kullanıyor?', type: 'text', options: [], order: 12 },
      { id: 'q13', questionEn: 'What data sources are used to train or run the AI system?', questionTr: 'AI sisteminin eğitimi veya çalışması için hangi veri kaynakları kullanılıyor?', type: 'text', options: [], order: 13 },
      { id: 'q14', questionEn: 'What are the key characteristics (format, diversity, demographic range) of the training data?', questionTr: 'Eğitim verisinin formatı, çeşitliliği ve demografik kapsamı nedir?', type: 'text', options: [], order: 14 },
      { id: 'q15', questionEn: 'Is the dataset size sufficient for reliable model performance?', questionTr: 'Veri seti boyutu güvenilir bir model performansı için yeterli mi?', type: 'text', options: [], order: 15 },
      { id: 'q16', questionEn: 'Is the data relevant, high-quality, and free of major biases?', questionTr: 'Veri ilgili, yüksek kaliteli ve ciddi önyargılardan arındırılmış mı?', type: 'text', options: [], order: 16 },
      { id: 'q17', questionEn: 'Is any federated learning or distributed method used, and how is quality monitored?', questionTr: 'Federated learning veya dağıtık öğrenme kullanılıyor mu? Kalite nasıl denetleniyor?', type: 'text', options: [], order: 17 },
      { id: 'q18', questionEn: 'What ethical risks do you identify in this use case?', questionTr: 'Bu kullanım senaryosunda gördüğünüz etik riskler nelerdir?', type: 'text', options: [], order: 18 },
      { id: 'q19', questionEn: 'Could system performance vary depending on users\' resources or access levels?', questionTr: 'Sistem performansı kullanıcıların kaynak seviyesine veya erişimine göre değişebilir mi?', type: 'text', options: [], order: 19 },
      { id: 'q20', questionEn: 'What negative outcomes could arise from using this system in your use case?', questionTr: 'Bu sistemin kullanımından doğabilecek olumsuz sonuçlar nelerdir?', type: 'text', options: [], order: 20 },
      { id: 'q21', questionEn: 'What explainability methods (SHAP, LIME, etc.) are used to make decisions understandable?', questionTr: 'Kararları anlaşılır kılmak için hangi açıklanabilirlik yöntemleri (SHAP, LIME vb.) kullanılıyor?', type: 'text', options: [], order: 21 },
      { id: 'q22', questionEn: 'What documentation exists for the system (model card, data sheet, architecture notes)?', questionTr: 'Sistem için hangi dokümanlar mevcut? (model card, data sheet vb.)', type: 'text', options: [], order: 22 },
      { id: 'q23', questionEn: 'How is user feedback collected and incorporated into system improvements?', questionTr: 'Kullanıcı geri bildirimleri nasıl toplanıyor ve sistem iyileştirmelerine nasıl dahil ediliyor?', type: 'text', options: [], order: 23 }
    ];

    // Mevcut soruları sil ve yenilerini ekle
    await UseCaseQuestion.deleteMany({});
    const inserted = await UseCaseQuestion.insertMany(questions);
    // Clear cache after seeding
    questionsCache = null;
    questionsCacheTime = 0;
    res.json({ message: 'Questions seeded successfully', count: inserted.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use Cases - Optimize: don't fetch answers for list view
app.get('/api/use-cases', async (req, res) => {
  try {
    const { ownerId } = req.query;
    let query = UseCase.find();
    
    // Filter by ownerId if provided (for performance)
    if (ownerId) {
      query = query.where('ownerId').equals(ownerId);
    }
    
    const useCases = await query
      .select('-answers -extendedInfo -supportingFiles.data') // Don't fetch file data for list
      .lean()
      .limit(1000) // Limit results for performance
      .sort({ createdAt: -1 }); // Sort by newest first
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

// Evaluations (Legacy endpoint - also saves to new responses collection)
app.post('/api/evaluations', async (req, res) => {
  try {
    const { projectId, userId, stage, answers, questionPriorities, riskLevel, generalRisks, status } = req.body;
    
    // Convert IDs to ObjectId if needed
    const projectIdObj = isValidObjectId(projectId) 
      ? new mongoose.Types.ObjectId(projectId) 
      : projectId;
    const userIdObj = isValidObjectId(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    // Save to old Evaluation collection (for backward compatibility)
    const evaluation = await Evaluation.findOneAndUpdate(
      { projectId: projectIdObj, userId: userIdObj, stage },
      { 
        projectId: projectIdObj,
        userId: userIdObj,
        stage,
        answers: answers || {}, 
        questionPriorities: questionPriorities || {}, 
        riskLevel: riskLevel || 'medium', 
        generalRisks: generalRisks || [], 
        status: status || 'draft', 
        updatedAt: new Date() 
      },
      { new: true, upsert: true }
    );

    // Also try to save to new responses collection (non-blocking)
    if (answers && Object.keys(answers).length > 0 && stage === 'assess') {
      try {
        const Response = require('./models/response');
        const ProjectAssignment = require('./models/projectAssignment');
        
        // Get user role
        const user = await User.findById(userIdObj);
        const role = user?.role || 'unknown';
        
        // Determine questionnaire key based on role
        let questionnaireKey = 'general-v1'; // Default
        if (role === 'technical-expert') questionnaireKey = 'technical-v1';
        else if (role === 'ethical-expert') questionnaireKey = 'ethical-v1';
        else if (role === 'medical-expert') questionnaireKey = 'medical-v1';
        else if (role === 'legal-expert') questionnaireKey = 'legal-v1';
        
        // Create or get assignment
        let assignment = await ProjectAssignment.findOne({ projectId: projectIdObj, userId: userIdObj });
        if (!assignment) {
          const { createAssignment } = require('./services/evaluationService');
          assignment = await createAssignment(projectIdObj, userIdObj, role, [questionnaireKey, 'general-v1']);
        }
        
        // Get questionnaire
        const Questionnaire = require('./models/questionnaire');
        let questionnaire = await Questionnaire.findOne({ key: questionnaireKey, isActive: true });
        
        // If questionnaire doesn't exist, create it
        if (!questionnaire) {
          questionnaire = await Questionnaire.create({
            key: questionnaireKey,
            title: `${role} Questions v1`,
            language: 'en-tr',
            version: 1,
            isActive: true
          });
        }
        
        // Convert answers to new format (simplified - store as-is for now)
        const responseAnswers = [];
        const Question = require('./models/question');
        
        for (const [questionId, answerValue] of Object.entries(answers)) {
          // Try to find question
          let question = await Question.findOne({ 
            $or: [
              { _id: questionId },
              { code: questionId },
              { questionnaireKey, code: questionId }
            ]
          });
          
          // If question doesn't exist in DB, create a minimal entry or skip
          if (!question) {
            // For now, skip questions that don't exist in DB
            // In production, you'd want to seed all questions first
            continue;
          }
          
          // Determine score
          let score = 2; // Default
          if (questionPriorities && questionPriorities[questionId]) {
            const priority = questionPriorities[questionId];
            if (priority === 'low') score = 3;
            else if (priority === 'medium') score = 2;
            else if (priority === 'high') score = 1;
          }
          
          // Format answer
          let answerFormat = {};
          if (question.answerType === 'single_choice') {
            const option = question.options?.find(opt => 
              opt.label?.en === answerValue || opt.label?.tr === answerValue || opt.key === answerValue
            );
            answerFormat.choiceKey = option ? option.key : answerValue;
            if (option?.score !== undefined) score = option.score;
          } else if (question.answerType === 'open_text') {
            answerFormat.text = answerValue;
          } else if (question.answerType === 'multi_choice') {
            answerFormat.multiChoiceKeys = Array.isArray(answerValue) ? answerValue : [answerValue];
          }
          
          responseAnswers.push({
            questionId: question._id,
            questionCode: question.code,
            answer: answerFormat,
            score: score,
            notes: null,
            evidence: []
          });
        }
        
        // Save to responses collection if we have answers
        if (responseAnswers.length > 0) {
          await Response.findOneAndUpdate(
            { projectId: projectIdObj, userId: userIdObj, questionnaireKey },
            {
              projectId: projectIdObj,
              assignmentId: assignment._id,
              userId: userIdObj,
              role: role,
              questionnaireKey,
              questionnaireVersion: questionnaire.version,
              answers: responseAnswers,
              status: status === 'completed' ? 'submitted' : 'draft',
              submittedAt: status === 'completed' ? new Date() : null,
              updatedAt: new Date()
            },
            { new: true, upsert: true }
          );
          console.log(`✅ Saved ${responseAnswers.length} answers to responses collection for ${role}`);
        }
      } catch (newSystemError) {
        // Log error but don't fail the request - old system still works
        console.error('⚠️ Error saving to new responses collection (non-critical):', newSystemError.message);
      }
    }
    
    res.json(evaluation);
  } catch (err) {
    console.error('❌ Error in /api/evaluations:', err);
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

// General Questions Answers - Test endpoint
app.get('/api/general-questions/test', (req, res) => {
  res.json({ message: 'General questions endpoint is working!' });
});

// General Questions Answers
app.post('/api/general-questions', async (req, res) => {
  try {
    const { projectId, userId, userRole, answers, risks, principles } = req.body;
    
    // Convert string IDs to ObjectId if needed
    const projectIdObj = isValidObjectId(projectId) 
      ? new mongoose.Types.ObjectId(projectId) 
      : projectId;
    const userIdObj = isValidObjectId(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    // Organize answers and risks by principle if provided
    let principlesData = {};
    if (principles) {
      principlesData = { principles };
    } else if (answers && risks) {
      // Legacy: organize flat answers/risks by principle
      const principleMap = {
        'T1': 'TRANSPARENCY', 'T2': 'TRANSPARENCY',
        'H1': 'HUMAN AGENCY & OVERSIGHT', 'H2': 'HUMAN AGENCY & OVERSIGHT',
        'S1': 'TECHNICAL ROBUSTNESS & SAFETY',
        'P1': 'PRIVACY & DATA GOVERNANCE', 'P2': 'PRIVACY & DATA GOVERNANCE',
        'F1': 'DIVERSITY, NON-DISCRIMINATION & FAIRNESS',
        'W1': 'SOCIETAL & INTERPERSONAL WELL-BEING', 'W2': 'SOCIETAL & INTERPERSONAL WELL-BEING',
        'A1': 'ACCOUNTABILITY', 'A2': 'ACCOUNTABILITY'
      };
      
      principlesData = {
        principles: {
          TRANSPARENCY: { answers: {}, risks: {} },
          'HUMAN AGENCY & OVERSIGHT': { answers: {}, risks: {} },
          'TECHNICAL ROBUSTNESS & SAFETY': { answers: {}, risks: {} },
          'PRIVACY & DATA GOVERNANCE': { answers: {}, risks: {} },
          'DIVERSITY, NON-DISCRIMINATION & FAIRNESS': { answers: {}, risks: {} },
          'SOCIETAL & INTERPERSONAL WELL-BEING': { answers: {}, risks: {} },
          ACCOUNTABILITY: { answers: {}, risks: {} }
        }
      };
      
      // Organize by principle
      Object.keys(answers).forEach(qId => {
        const principle = principleMap[qId];
        if (principle && principlesData.principles[principle]) {
          principlesData.principles[principle].answers[qId] = answers[qId];
        }
      });
      
      Object.keys(risks).forEach(qId => {
        const principle = principleMap[qId];
        if (principle && principlesData.principles[principle]) {
          principlesData.principles[principle].risks[qId] = risks[qId];
        }
      });
    }
    
    const generalAnswers = await GeneralQuestionsAnswers.findOneAndUpdate(
      { projectId: projectIdObj, userId: userIdObj },
      {
        projectId: projectIdObj,
        userId: userIdObj,
        userRole: userRole || 'unknown',
        ...principlesData,
        answers: answers || {}, // Keep for backward compatibility
        risks: risks || {},     // Keep for backward compatibility
        updatedAt: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(generalAnswers);
  } catch (err) {
    console.error('Error saving general questions:', err);
    res.status(500).json({ error: err.message || 'Failed to save general questions' });
  }
});

app.get('/api/general-questions', async (req, res) => {
  try {
    const { projectId, userId } = req.query;
    
    // Convert string IDs to ObjectId if needed
    const projectIdObj = isValidObjectId(projectId) 
      ? new mongoose.Types.ObjectId(projectId) 
      : projectId;
    const userIdObj = isValidObjectId(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    const generalAnswers = await GeneralQuestionsAnswers.findOne({ 
      projectId: projectIdObj, 
      userId: userIdObj 
    });
    
    // Return the result with principles structure
    const result = generalAnswers ? {
      _id: generalAnswers._id,
      projectId: generalAnswers.projectId,
      userId: generalAnswers.userId,
      userRole: generalAnswers.userRole,
      principles: generalAnswers.principles || {},
      answers: generalAnswers.answers || {}, // Keep for backward compatibility
      risks: generalAnswers.risks || {},     // Keep for backward compatibility
      updatedAt: generalAnswers.updatedAt
    } : { principles: {}, answers: {}, risks: {} };
    
    res.json(result);
  } catch (err) {
    console.error('Error loading general questions:', err);
    res.status(500).json({ error: err.message || 'Failed to load general questions' });
  }
});

// Get all general questions answers for a project (grouped by role)
app.get('/api/general-questions/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const allAnswers = await GeneralQuestionsAnswers.find({ projectId }).populate('userId', 'name email role');
    res.json(allAnswers);
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
    // Add timeout to prevent hanging
    const loginPromise = User.findOne({ 
      email: req.body.email, 
      password: req.body.password, 
      role: req.body.role 
    }).select('-profileImage').lean().maxTimeMS(5000); // Exclude large profileImage, add timeout
    
    const user = await Promise.race([
      loginPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), 5000)
      )
    ]);
    
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    if (err.message === 'Login timeout') {
      res.status(504).json({ error: 'Login request timed out. Please try again.' });
    } else {
      res.status(500).json({ error: err.message });
    }
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
    const projects = await Project.find()
      .select('-fullDescription') // Exclude large description for list view
      .lean()
      .maxTimeMS(5000)
      .limit(1000);
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
    const userIdObj = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
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

    const userIdObj = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;

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

    const userIdObj = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const otherUserIdObj = isValidObjectId(otherUserId) ? new mongoose.Types.ObjectId(otherUserId) : otherUserId;

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
    const { includeProfileImages } = req.query;
    // By default, exclude profileImage for performance (large base64 strings)
    // But allow including them if explicitly requested
    const selectFields = includeProfileImages === 'true' 
      ? '-password' 
      : '-password -profileImage';
    
    const users = await User.find({}, selectFields)
      .lean()
      .maxTimeMS(5000)
      .limit(1000);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profile endpoints - SPECIFIC routes must come BEFORE general /:id route
// GET single user's profile image
app.get('/api/users/:id/profile-image', async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findById(userId).select('profileImage');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ profileImage: user.profileImage || null });
  } catch (err) {
    console.error('❌ Error fetching profile image:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch profile image' });
  }
});

// GET single user with profile image
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('❌ Error fetching user:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch user' });
  }
});

// POST update profile image
app.post('/api/users/:id/profile-image', async (req, res) => {
  console.log('🔍 Route hit: POST /api/users/:id/profile-image');
  console.log('🔍 Request params:', req.params);
  console.log('🔍 Request body keys:', Object.keys(req.body || {}));
  
  try {
    const { image } = req.body;
    const userId = req.params.id;
    
    console.log('📸 Profile image update request:', { userId, hasImage: !!image, imageLength: image?.length });
    
    // Validate userId
    if (!isValidObjectId(userId)) {
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
    
    if (!isValidObjectId(userId)) {
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
    
    if (!isValidObjectId(userId)) {
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
    
    if (!isValidObjectId(userId)) {
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
      if (isValidObjectId(projectId)) {
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
    if (isValidObjectId(userId)) {
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

    const projectIdObj = projectId && projectId !== 'all' && isValidObjectId(projectId)
      ? new mongoose.Types.ObjectId(projectId)
      : (projectId && projectId !== 'all' ? projectId : null);
    const replyToObj = replyTo && isValidObjectId(replyTo)
      ? new mongoose.Types.ObjectId(replyTo)
      : (replyTo || null);
    const mentionsObj = mentions && Array.isArray(mentions)
      ? mentions.map(m => isValidObjectId(m) ? new mongoose.Types.ObjectId(m) : m)
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

// New Evaluation API Routes
const evaluationRoutes = require('./routes/evaluationRoutes');
app.use('/api/evaluations', evaluationRoutes);

// Report Generation Routes (Gemini AI)
const reportRoutes = require('./routes/reportRoutes');
app.use('/api/reports', reportRoutes);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

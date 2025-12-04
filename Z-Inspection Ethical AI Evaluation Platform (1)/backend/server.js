const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;

// --- 1. AYARLAR VE MIDDLEWARE ---
app.use(cors()); // Frontend (3000) ve Backend (5000) iletişimine izin ver
app.use(express.json()); // JSON veri formatını kabul et

// --- 2. MONGODB BAĞLANTISI ---
// Yerel MongoDB kullanıyorsan: 'mongodb://localhost:27017/zinspection'
// Atlas kullanıyorsan bağlantı stringini buraya yapıştır.
const MONGO_URI = 'mongodb://localhost:27017/zinspection';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Bağlantısı Başarılı'))
  .catch(err => console.error('❌ MongoDB Bağlantı Hatası:', err));

// --- 3. VERİTABANI MODELLERİ (SCHEMAS) ---

// Kullanıcı Modeli (LoginScreen.tsx ve OtherMembers.tsx için)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Not: Prodüksiyonda şifrelenmelidir (bcrypt)
  role: { 
    type: String, 
    enum: ['admin', 'ethical-expert', 'medical-expert', 'use-case-owner', 'education-expert'],
    required: true 
  },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Proje Modeli (AdminDashboardEnhanced.tsx ve ProjectDetail.tsx için)
const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  shortDescription: String,
  fullDescription: String,
  status: { type: String, default: 'ongoing' }, // ongoing, proven, disproven
  stage: { type: String, default: 'set-up' }, // set-up, assess, resolve
  targetDate: String,
  progress: { type: Number, default: 0 },
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // User ID'leri
  createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', ProjectSchema);

// Use Case (Kullanım Durumu) Modeli (UseCaseAssignmentsTab ve UseCaseOwnerDashboard.tsx için)
const UseCaseSchema = new mongoose.Schema({
  title: String,
  description: String,
  aiSystemCategory: String,
  status: { type: String, default: 'assigned' }, // assigned, in-review, completed
  progress: { type: Number, default: 0 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedExperts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  adminNotes: String,
  supportingFiles: [String],
  createdAt: { type: Date, default: Date.now }
});
const UseCase = mongoose.model('UseCase', UseCaseSchema);

// Değerlendirme Formu Modeli (EvaluationForm.tsx için)
const EvaluationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: String,
  stage: String, // set-up, assess, resolve
  answers: { type: Map, of: mongoose.Schema.Types.Mixed }, // Soru ID ve Cevapları
  riskLevel: { type: String, default: 'medium' },
  isDraft: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});
const Evaluation = mongoose.model('Evaluation', EvaluationSchema);

// Etik Gerilimler (EthicalTensionSelector.tsx için)
const TensionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  principle1: String,
  principle2: String,
  description: String,
  severity: Number,
  createdAt: { type: Date, default: Date.now }
});
const Tension = mongoose.model('Tension', TensionSchema);

// --- 4. API UÇLARI (ROUTES) ---

// === AUTH (KİMLİK DOĞRULAMA) ===

// Kayıt Ol
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    // Email kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Bu email zaten kayıtlı." });

    const newUser = new User({ name, email, password, role, isOnline: true });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Giriş Yap
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email, password, role });
    
    if (user) {
      user.isOnline = true;
      await user.save();
      res.json(user);
    } else {
      res.status(401).json({ message: "Geçersiz email, şifre veya rol." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Çıkış Yap (Opsiyonel: Online durumu güncellemek için)
app.post('/api/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    res.json({ message: "Çıkış başarılı" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tüm Kullanıcıları Getir (OtherMembers.tsx ve dropdownlar için)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Şifreleri gönderme
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === PROJELER ===

// Projeleri Getir
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni Proje Oluştur
app.post('/api/projects', async (req, res) => {
  try {
    const newProject = new Project(req.body);
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proje Detayı Getir
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.json(project);
  } catch (err) {
    res.status(404).json({ message: "Proje bulunamadı" });
  }
});

// === USE CASES (KULLANIM DURUMLARI) ===

// Use Case'leri Getir
app.get('/api/use-cases', async (req, res) => {
  try {
    const useCases = await UseCase.find();
    res.json(useCases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni Use Case Ekle
app.post('/api/use-cases', async (req, res) => {
  try {
    const newUseCase = new UseCase(req.body);
    await newUseCase.save();
    res.status(201).json(newUseCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Uzman Ata (AssignExpertsModal için)
app.put('/api/use-cases/:id/assign', async (req, res) => {
  try {
    const { assignedExperts, adminNotes } = req.body;
    const updatedUseCase = await UseCase.findByIdAndUpdate(
      req.params.id,
      { 
        assignedExperts, 
        adminNotes, 
        status: 'in-review' 
      },
      { new: true }
    );
    res.json(updatedUseCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === DEĞERLENDİRMELER (EVALUATIONS) ===

// Değerlendirme Kaydet (Formu kaydeder veya günceller)
app.post('/api/evaluations', async (req, res) => {
  try {
    const { projectId, userId, stage, answers, riskLevel, isDraft } = req.body;
    
    // Aynı proje, kullanıcı ve aşama için kayıt varsa güncelle, yoksa oluştur
    const evaluation = await Evaluation.findOneAndUpdate(
      { projectId, userId, stage },
      { 
        answers, 
        riskLevel, 
        isDraft, 
        updatedAt: new Date() 
      },
      { new: true, upsert: true } // upsert: yoksa yarat
    );

    // Eğer taslak değilse (submit edildiyse), projenin ilerlemesini güncelle (basit mantık)
    if (!isDraft) {
      await Project.findByIdAndUpdate(projectId, { $inc: { progress: 10 } });
    }

    res.json(evaluation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Belirli bir değerlendirmeyi getir (Formu doldururken eski cevapları görmek için)
app.get('/api/evaluations', async (req, res) => {
  try {
    const { projectId, userId, stage } = req.query;
    const evaluation = await Evaluation.findOne({ projectId, userId, stage });
    res.json(evaluation || { answers: {} }); // Boş ise boş cevap dön
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === ETİK GERİLİMLER (TENSIONS) ===

app.post('/api/tensions', async (req, res) => {
  try {
    const newTension = new Tension(req.body);
    await newTension.save();
    res.status(201).json(newTension);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tensions/:projectId', async (req, res) => {
  try {
    const tensions = await Tension.find({ projectId: req.params.projectId });
    res.json(tensions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 5. SUNUCUYU BAŞLAT ---
app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
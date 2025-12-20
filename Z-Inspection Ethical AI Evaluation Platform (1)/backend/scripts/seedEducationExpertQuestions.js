/**
 * Seed education expert questions into the questions collection
 * These are additional questions for education-expert role
 * Run with: node backend/scripts/seedEducationExpertQuestions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB - Use same connection string as server.js
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error('❌ MONGO_URI environment variable bulunamadı!');
}

mongoose.connect(MONGO_URI).catch((err) => {
  console.error('❌ MongoDB bağlantısı başarısız:', err);
  process.exit(1);
});

const Questionnaire = require('../models/questionnaire');
const Question = require('../models/question');

const educationExpertQuestions = [
  // 1️⃣ HUMAN AGENCY & OVERSIGHT + FAIRNESS
  {
    code: 'E1',
    principle: 'HUMAN AGENCY & OVERSIGHT', // Primary principle (also relates to FAIRNESS)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Are the students\' digital literacy levels sufficient for safe and effective use of the system?',
      tr: 'Öğrencilerin dijital okuryazarlık seviyesi sistemi güvenli ve etkili kullanmak için yeterli mi?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'partially', label: { en: 'Partially', tr: 'Kısmen' }, score: 2 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 },
      { key: 'not_sure', label: { en: 'Not sure', tr: 'Emin değilim' }, score: 2 }
    ],
    required: true,
    order: 100
  },
  // 2️⃣ HUMAN AGENCY & OVERSIGHT + TRANSPARENCY
  {
    code: 'E2',
    principle: 'HUMAN AGENCY & OVERSIGHT', // Primary principle (also relates to TRANSPARENCY)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Are the training materials and onboarding guides clear, sufficient, and pedagogically appropriate?',
      tr: 'Sağlanan eğitim materyalleri ve onboarding rehberleri yeterli, anlaşılır ve pedagojik olarak uygun mu?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'partially', label: { en: 'Partially', tr: 'Kısmen' }, score: 2 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 },
      { key: 'insufficient', label: { en: 'Insufficient', tr: 'Yetersiz' }, score: 1 }
    ],
    required: true,
    order: 101
  },
  // 3️⃣ HUMAN AGENCY & OVERSIGHT + SOCIETAL WELL-BEING (Risk Scale)
  {
    code: 'E3',
    principle: 'HUMAN AGENCY & OVERSIGHT', // Primary principle (also relates to SOCIETAL WELL-BEING)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Is there a risk that the system\'s outputs may contradict teacher instructions or deviate from the national curriculum?',
      tr: 'Sistemin çıktılarının öğretmen talimatlarıyla çelişme veya ulusal müfredattan sapma riski var mı?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'risk_1', label: { en: '1 - Low risk', tr: '1 - Düşük risk' }, score: 4 },
      { key: 'risk_2', label: { en: '2', tr: '2' }, score: 3 },
      { key: 'risk_3', label: { en: '3', tr: '3' }, score: 2 },
      { key: 'risk_4', label: { en: '4', tr: '4' }, score: 1 },
      { key: 'risk_5', label: { en: '5 - High risk', tr: '5 - Yüksek risk' }, score: 0 }
    ],
    required: true,
    order: 102
  },
  // 4️⃣ SOCIETAL & ENVIRONMENTAL WELL-BEING
  {
    code: 'E4',
    principle: 'SOCIETAL & INTERPERSONAL WELL-BEING',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the system oversimplify complex topics in ways that may hinder deep learning?',
      tr: 'Sistem, karmaşık konuları aşırı basitleştirerek derin öğrenmeyi olumsuz etkileyebilir mi?'
    },
    answerType: 'open_text',
    required: true,
    order: 103
  },
  // 5️⃣ HUMAN AGENCY & OVERSIGHT
  {
    code: 'E5',
    principle: 'HUMAN AGENCY & OVERSIGHT',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the system encourage interactive (Socratic) learning, or does it push students toward passive consumption?',
      tr: 'Sistem etkileşimli (Sokratik) öğrenmeyi mi destekliyor, yoksa öğrencileri pasif kullanıcı hâline mi getiriyor?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'active_learning', label: { en: 'Active learning', tr: 'Aktif öğrenme' }, score: 4 },
      { key: 'neutral', label: { en: 'Neutral', tr: 'Nötr' }, score: 2 },
      { key: 'passive_use', label: { en: 'Passive use', tr: 'Pasif kullanım' }, score: 1 }
    ],
    required: true,
    order: 104
  },
  // 6️⃣ HUMAN AGENCY & OVERSIGHT
  {
    code: 'E6',
    principle: 'HUMAN AGENCY & OVERSIGHT',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Do you see a need for additional training or onboarding for users?',
      tr: 'Kullanıcılar için ek eğitim veya uyum süreci ihtiyacı görüyor musunuz?'
    },
    answerType: 'open_text',
    required: true,
    order: 105
  },
  // 7️⃣ HUMAN AGENCY & OVERSIGHT + TECHNICAL ROBUSTNESS
  {
    code: 'E7',
    principle: 'HUMAN AGENCY & OVERSIGHT', // Primary principle (also relates to TECHNICAL ROBUSTNESS)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Are students capable of recognizing incorrect or low-quality AI responses and is there a risk of "automation bias" (over-trusting the AI)?',
      tr: 'Öğrenciler yanlış veya düşük kaliteli AI çıktısını fark edebilecek yeterlilikteler mi ve AI\'ya aşırı güvenme (automation bias) riski var mı?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'partially', label: { en: 'Partially', tr: 'Kısmen' }, score: 2 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 },
      { key: 'not_sure', label: { en: 'Not sure', tr: 'Emin değilim' }, score: 2 }
    ],
    required: true,
    order: 106
  },
  // 8️⃣ SOCIETAL & ENVIRONMENTAL WELL-BEING
  {
    code: 'E8',
    principle: 'SOCIETAL & INTERPERSONAL WELL-BEING',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Could long-term use of the system cause digital fatigue, attention loss, or cognitive overload in students?',
      tr: 'Sistemin uzun süreli kullanımı öğrencilerde dijital yorgunluk, dikkat dağınıklığı veya bilişsel yük oluşturabilir mi?'
    },
    answerType: 'open_text',
    required: true,
    order: 107
  },
  // 9️⃣ FAIRNESS & NON-DISCRIMINATION
  {
    code: 'E9',
    principle: 'DIVERSITY, NON-DISCRIMINATION & FAIRNESS',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Could students with lower digital skills have more difficulty understanding system outputs?',
      tr: 'Dijital becerisi düşük öğrenciler sistem çıktılarıyla ilgili daha fazla zorluk yaşayabilir mi?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 1 },
      { key: 'partially', label: { en: 'Partially', tr: 'Kısmen' }, score: 2 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 4 },
      { key: 'depends', label: { en: 'Depends', tr: 'Duruma bağlı' }, score: 2 }
    ],
    required: true,
    order: 108
  },
  // 🔟 DIVERSITY, NON-DISCRIMINATION & FAIRNESS
  {
    code: 'E10',
    principle: 'DIVERSITY, NON-DISCRIMINATION & FAIRNESS',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the system provide accessible and inclusive features for disadvantaged or special-needs students?',
      tr: 'Sistem dezavantajlı veya özel gereksinimli öğrenciler için yeterince kapsayıcı ve erişilebilir mi?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'partially', label: { en: 'Partially', tr: 'Kısmen' }, score: 2 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 }
    ],
    required: true,
    order: 109
  },
  // 1️⃣1️⃣ PRIVACY & DATA GOVERNANCE
  {
    code: 'E11',
    principle: 'PRIVACY & DATA GOVERNANCE',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the system process and store student data in compliance with GDPR/KVKK and AI Act data governance requirements?',
      tr: 'Sistem öğrenci verilerini KVKK/GDPR ve AI Act veri yönetişimi gerekliliklerine uygun şekilde işliyor mu?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 },
      { key: 'uncertain', label: { en: 'Uncertain', tr: 'Belirsiz' }, score: 2 }
    ],
    required: true,
    order: 110
  },
  // 1️⃣2️⃣ ACCOUNTABILITY
  {
    code: 'E12',
    principle: 'ACCOUNTABILITY',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Has the teacher completed the Ethical Declaration Form and obtained the required administrative permissions?',
      tr: 'Öğretmen Etik Beyan Formu\'nu doldurmuş ve gerekli idari izinleri almış mı?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 }
    ],
    required: true,
    order: 111
  },
  // 1️⃣3️⃣ ACCOUNTABILITY
  {
    code: 'E13',
    principle: 'ACCOUNTABILITY',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Is there an AI Ethics Committee or an official mechanism for appeals, complaints, or oversight?',
      tr: 'Bir Yapay Zekâ Etiği Ekibi veya resmi itiraz/gözetim mekanizması var mı?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 }
    ],
    required: true,
    order: 112
  },
  // 1️⃣4️⃣ TECHNICAL ROBUSTNESS & SAFETY (Risk Scale)
  {
    code: 'E14',
    principle: 'TECHNICAL ROBUSTNESS & SAFETY',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'What is the risk of the system generating inaccurate, fabricated (hallucinated), or pedagogically harmful information?',
      tr: 'Sistem yanlış, uydurma (halüsinasyon) veya pedagojik açıdan zararlı bilgi üretme riski taşıyor mu?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'risk_1', label: { en: '1 - Low risk', tr: '1 - Düşük risk' }, score: 4 },
      { key: 'risk_2', label: { en: '2', tr: '2' }, score: 3 },
      { key: 'risk_3', label: { en: '3', tr: '3' }, score: 2 },
      { key: 'risk_4', label: { en: '4', tr: '4' }, score: 1 },
      { key: 'risk_5', label: { en: '5 - High risk', tr: '5 - Yüksek risk' }, score: 0 }
    ],
    required: true,
    order: 113
  },
  // 1️⃣5️⃣ SOCIETAL & ENVIRONMENTAL WELL-BEING + ACCOUNTABILITY
  {
    code: 'E15',
    principle: 'SOCIETAL & INTERPERSONAL WELL-BEING', // Primary principle (also relates to ACCOUNTABILITY)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the system make it easier for students to cheat, plagiarize, or bypass learning tasks?',
      tr: 'Sistem öğrencilerin kopya çekmesini, intihal yapmasını veya öğrenmeyi atlamasını kolaylaştırıyor mu?'
    },
    answerType: 'open_text',
    required: true,
    order: 114
  },
  // 1️⃣6️⃣ TRANSPARENCY + TECHNICAL ROBUSTNESS
  {
    code: 'E16',
    principle: 'TRANSPARENCY', // Primary principle (also relates to TECHNICAL ROBUSTNESS)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Are the information sources used by the system reliable, updated, and academically valid?',
      tr: 'Sistemin kullandığı bilgi kaynakları güvenilir, güncel ve akademik olarak geçerli mi?'
    },
    answerType: 'open_text',
    required: true,
    order: 115
  },
  // 1️⃣7️⃣ TRANSPARENCY
  {
    code: 'E17',
    principle: 'TRANSPARENCY',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the system provide sufficient explainability and transparency for students to verify or understand its outputs?',
      tr: 'Sistem çıktılarının doğrulanması veya anlaşılması için yeterli açıklanabilirlik ve şeffaflık sunuyor mu?'
    },
    answerType: 'open_text',
    required: true,
    order: 116
  },
  // 1️⃣8️⃣ HUMAN AGENCY & OVERSIGHT + TRANSPARENCY
  {
    code: 'E18',
    principle: 'HUMAN AGENCY & OVERSIGHT', // Primary principle (also relates to TRANSPARENCY)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Could students trust the AI too much and accept information without verifying it?',
      tr: 'Öğrenciler AI\'a aşırı güvenip bilgiyi doğrulamadan kabul etme eğiliminde olabilir mi?'
    },
    answerType: 'open_text',
    required: true,
    order: 117
  },
  // 1️⃣9️⃣ TECHNICAL ROBUSTNESS & SAFETY + TRANSPARENCY
  {
    code: 'E19',
    principle: 'TECHNICAL ROBUSTNESS & SAFETY', // Primary principle (also relates to TRANSPARENCY)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Can the system produce ambiguous or misleading outputs that may confuse students?',
      tr: 'Sistem öğrencileri yanlış yönlendirebilecek belirsiz veya yanıltıcı çıktılar üretebilir mi?'
    },
    answerType: 'open_text',
    required: true,
    order: 118
  },
  // 2️⃣0️⃣ ACCOUNTABILITY
  {
    code: 'E20',
    principle: 'ACCOUNTABILITY',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Is there a risk of students misusing the system in harmful, unethical, or unintended ways?',
      tr: 'Öğrencilerin sistemi zararlı, etik dışı veya amacı dışında kullanma ihtimali var mı?'
    },
    answerType: 'open_text',
    required: true,
    order: 119
  },
  // 2️⃣1️⃣ HUMAN AGENCY & OVERSIGHT
  {
    code: 'E21',
    principle: 'HUMAN AGENCY & OVERSIGHT',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Are teacher supervision and human-in-the-loop mechanisms adequate during system use?',
      tr: 'Sistem kullanımında öğretmen gözetimi (human-in-the-loop) mekanizmaları yeterli mi?'
    },
    answerType: 'open_text',
    required: true,
    order: 120
  },
  // 2️⃣2️⃣ ACCOUNTABILITY
  {
    code: 'E22',
    principle: 'ACCOUNTABILITY',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'What additional precautions, classroom rules, or usage boundaries would you recommend?',
      tr: 'Hangi ek önlemleri, sınıf içi kuralları veya kullanım sınırlarını önerirsiniz?'
    },
    answerType: 'open_text',
    required: true,
    order: 121
  },
  // 2️⃣3️⃣ SOCIETAL & ENVIRONMENTAL WELL-BEING
  {
    code: 'E23',
    principle: 'SOCIETAL & INTERPERSONAL WELL-BEING',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'What improvements would you suggest to make the system more supportive for student learning?',
      tr: 'Sistem öğrenci öğrenmesini daha iyi desteklemesi için hangi iyileştirmeleri önerirsiniz?'
    },
    answerType: 'open_text',
    required: true,
    order: 122
  },
  // 2️⃣4️⃣ ACCOUNTABILITY
  {
    code: 'E24',
    principle: 'ACCOUNTABILITY',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the AI system qualify as a "high-risk educational AI system" under the EU AI Act (e.g., systems used for assessing students, determining access, or evaluating performance)?',
      tr: 'Sistem, AB AI Act\'e göre "eğitim için yüksek riskli sistem" kategorisine giriyor mu (örn. değerlendirme, performans ölçme vb.)?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 1 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 4 },
      { key: 'under_evaluation', label: { en: 'Under Evaluation', tr: 'Değerlendirme altında' }, score: 2 }
    ],
    required: true,
    order: 123
  },
  // 2️⃣5️⃣ HUMAN AGENCY & OVERSIGHT
  {
    code: 'E25',
    principle: 'HUMAN AGENCY & OVERSIGHT',
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Are human oversight measures (intervention ability, stopping the system, reviewing outputs) clearly defined as required by the AI Act?',
      tr: 'AI Act\'in zorunlu kıldığı insan gözetimi (müdahale, durdurma, çıktıları kontrol etme) mekanizmaları açıkça tanımlanmış mı?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'partially', label: { en: 'Partially', tr: 'Kısmen' }, score: 2 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 }
    ],
    required: true,
    order: 124
  },
  // 2️⃣6️⃣ HUMAN AGENCY + FAIRNESS
  {
    code: 'E26',
    principle: 'HUMAN AGENCY & OVERSIGHT', // Primary principle (also relates to FAIRNESS)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Are you confident that the system does not employ any prohibited AI practices defined in the AI Act (e.g., manipulative nudging, exploitation of minors)?',
      tr: 'Sistem, AI Act\'te yasaklanan uygulamalardan (manipülatif yönlendirme, çocukları istismar eden hedefleme) hiçbirini içeriyor mu?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 },
      { key: 'need_investigation', label: { en: 'Need Investigation', tr: 'İnceleme gerekli' }, score: 1 }
    ],
    required: true,
    order: 125
  },
  // 2️⃣7️⃣ TRANSPARENCY + ACCOUNTABILITY
  {
    code: 'E27',
    principle: 'TRANSPARENCY', // Primary principle (also relates to ACCOUNTABILITY)
    appliesToRoles: ['education-expert'],
    text: { 
      en: 'Does the system automatically log its activities to ensure traceability and auditability of educational decisions?',
      tr: 'Eğitimsel kararların izlenebilirliğini ve denetlenebilirliğini sağlamak için sistem otomatik olarak log kaydı tutuyor mu?'
    },
    answerType: 'single_choice',
    options: [
      { key: 'yes', label: { en: 'Yes', tr: 'Evet' }, score: 4 },
      { key: 'no', label: { en: 'No', tr: 'Hayır' }, score: 1 },
      { key: 'not_sure', label: { en: 'Not sure', tr: 'Emin değilim' }, score: 2 }
    ],
    required: true,
    order: 126
  }
];

async function seedEducationExpertQuestions() {
  try {
    console.log('Starting education expert questions seeding...');

    // Use education-expert-v1 questionnaire
    let questionnaire = await Questionnaire.findOne({ key: 'education-expert-v1' });
    if (!questionnaire) {
      questionnaire = await Questionnaire.create({
        key: 'education-expert-v1',
        title: 'Education Expert Questions v1',
        language: 'en-tr',
        version: 1,
        isActive: true
      });
      console.log('✅ Created questionnaire: education-expert-v1');
    } else {
      console.log('ℹ️ Questionnaire education-expert-v1 already exists');
    }

    // Create questions
    let created = 0;
    let skipped = 0;
    let updated = 0;
    
    for (const qData of educationExpertQuestions) {
      const existing = await Question.findOne({ 
        questionnaireKey: 'education-expert-v1', 
        code: qData.code 
      });
      
      if (!existing) {
        await Question.create({
          questionnaireKey: 'education-expert-v1',
          ...qData,
          scoring: {
            scale: '0-4',
            method: qData.answerType === 'open_text' ? 'rubric' : 'mapped'
          }
        });
        created++;
        console.log(`✅ Created question: ${qData.code} - ${qData.text.en.substring(0, 50)}...`);
      } else {
        // Update existing question if it exists
        await Question.findOneAndUpdate(
          { questionnaireKey: 'education-expert-v1', code: qData.code },
          {
            ...qData,
            scoring: {
              scale: '0-4',
              method: qData.answerType === 'open_text' ? 'rubric' : 'mapped'
            },
            updatedAt: new Date()
          }
        );
        updated++;
        console.log(`🔄 Updated question: ${qData.code} - ${qData.text.en.substring(0, 50)}...`);
      }
    }

    console.log('\n✅ Education expert questions seeding complete!');
    console.log(`Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    
    // Clear cache for education-expert-v1 questions
    console.log('\n🔄 Clearing questions cache...');
    try {
      const http = require('http');
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/evaluations/questions/clear-cache',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Cache cleared successfully');
        }
      });
      req.on('error', () => {
        // Server might not be running, that's okay
        console.log('ℹ️ Could not clear cache (server might not be running)');
      });
      req.write(JSON.stringify({ questionnaireKey: 'education-expert-v1' }));
      req.end();
    } catch (err) {
      // Ignore cache clearing errors
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedEducationExpertQuestions();


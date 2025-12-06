import { Question } from '../../types';

export const technicalQuestions: Question[] = [
  // --- SET-UP AŞAMASI ---
  {
    id: 'tech_setup_1',
    stage: 'set-up',
    text: 'Sistemin kullandığı temel model mimarisi nedir?',
    type: 'select',
    options: ['CNN (Convolutional Neural Network)', 'Transformer / LLM', 'Random Forest / Decision Tree', 'Regression (Linear/Logistic)', 'Rule-based System'],
    required: true,
    description: 'Modelin karmaşıklık seviyesini ve açıklanabilirlik potansiyelini belirlemek için gereklidir.'
  },
  {
    id: 'tech_setup_2',
    stage: 'set-up',
    text: 'Eğitim verisi için veri temizleme ve ön işleme prosedürleri dokümante edildi mi?',
    type: 'radio',
    options: ['Evet, tam dokümantasyon var', 'Kısmen', 'Hayır'],
    required: true
  },

  // --- ASSESS AŞAMASI ---
  {
    id: 'tech_assess_1',
    stage: 'assess',
    text: 'Sistem "Veri Zehirleme" (Data Poisoning) saldırılarına karşı ne kadar dirençli?',
    type: 'likert',
    options: ['1', '2', '3', '4', '5'],
    description: '1: Çok Savunmasız, 5: Çok Güvenli. Eğitim setine manipüle edilmiş veri sızma riskini değerlendirin.',
    min: 1,
    max: 5
  },
  {
    id: 'tech_assess_2',
    stage: 'assess',
    text: 'Modelin karar verme sürecindeki belirsizlik (uncertainty) kullanıcıya iletiliyor mu?',
    type: 'radio',
    options: ['Evet (Güven skoru gösteriliyor)', 'Hayır (Sadece sonuç gösteriliyor)'],
    required: true,
    description: 'Örn: "Bu sonuçtan %85 eminim" gibi bir çıktı veriyor mu?'
  },
  {
    id: 'tech_assess_3',
    stage: 'assess',
    text: 'Sistemin teknik hata oranı (False Positive / False Negative) kabul edilebilir seviyede mi?',
    type: 'text',
    description: 'Lütfen F1-Score, Accuracy veya Recall değerlerini referans vererek açıklayın.',
    required: true
  }
];
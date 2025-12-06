// src/data/questions/ethical.ts
import { Question } from '../../types'; // Question tipinin olduğu yer (src/types.ts ise ../../types)

export const ethicalQuestions: Question[] = [
  // --- SET-UP Aşaması Soruları (Bunlar ilk ekranda görünmeli) ---
  {
    id: 'eth_setup_1',
    stage: 'set-up', // <--- BURASI ÇOK ÖNEMLİ
    text: 'Yapay zeka sistemi hangi yasal düzenlemelere (GDPR, AI Act vb.) tabi?',
    type: 'multiple-choice',
    options: ['GDPR', 'AI Act', 'KVKK', 'Hiçbiri', 'Belirsiz'],
    required: true,
    description: 'Projenin yasal zeminini anlamak için gereklidir.'
  },
  {
    id: 'eth_setup_2',
    stage: 'set-up',
    text: 'Bu proje hassas kişisel verileri işliyor mu?',
    type: 'radio',
    options: ['Evet', 'Hayır'],
    required: true
  },

  // --- ASSESS Aşaması Soruları (Bunlar ikinci sekmeye geçince görünmeli) ---
  {
    id: 'eth_assess_1',
    stage: 'assess',
    text: 'Sistem belirli demografik gruplara karşı önyargı (bias) içeriyor mu?',
    type: 'text',
    required: true,
    description: 'Eğitim verisindeki dengesizlikler incelenmelidir.'
  },
  {
    id: 'eth_assess_2',
    stage: 'assess',
    text: 'Sistemin şeffaflık seviyesi nedir?',
    type: 'likert',
    options: ['1', '2', '3', '4', '5'],
    min: 1,
    max: 5
  }
];
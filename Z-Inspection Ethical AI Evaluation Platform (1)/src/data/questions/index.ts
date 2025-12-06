// src/data/questions/index.ts

import { Question } from '../../types'; // Question tipinin olduğu yeri doğru gösterdiğinden emin ol

// Diğer dosyalardan soruları çağırıyoruz
// index.ts içinde:
import { technicalQuestions } from './technical'; // Artık hata vermez
import { medicalQuestions } from './medical';     // Artık hata vermez
import { legalQuestions } from './legal';         // Artık hata vermez
import { ownerQuestions } from './owner';  
import { ethicalQuestions } from './ethical'       // Artık hata vermez

// Hangi rolün hangi soru listesini göreceğini eşleştiriyoruz
const questionsMap: Record<string, Question[]> = {
  'ethical-expert': ethicalQuestions,
  'technical-expert': technicalQuestions,
  'medical-expert': medicalQuestions,
  'legal-expert': legalQuestions,
  'use-case-owner': ownerQuestions,
  'education-expert': [], // Dosyası yoksa boş dizi
  'admin': [ // Admin hepsini görsün
    ...ethicalQuestions, 
    ...technicalQuestions, 
    ...medicalQuestions, 
    ...legalQuestions,
    ...ownerQuestions
  ]
};

// React tarafında çağırdığımız fonksiyon BU:
export const getQuestionsByRole = (role: string): Question[] => {
  return questionsMap[role] || [];
};
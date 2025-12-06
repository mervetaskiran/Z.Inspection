import { Question } from '../../types';

export const ownerQuestions: Question[] = [
  // --- SET-UP AŞAMASI ---
  {
    id: 'own_setup_1',
    stage: 'set-up',
    text: 'Bu yapay zeka projesinin temel iş hedefi nedir?',
    type: 'text',
    required: true,
    description: 'Örn: Maliyet düşürme, hız kazanma, kalite artırma vb.'
  },
  {
    id: 'own_setup_2',
    stage: 'set-up',
    text: 'Projenin beklenen paydaşları (Stakeholders) kimlerdir?',
    type: 'checkbox',
    options: ['Müşteriler', 'İç Çalışanlar', 'Yöneticiler', 'Tedarikçiler', 'Kamu Otoritesi'],
    required: true
  },

  // --- ASSESS AŞAMASI ---
  {
    id: 'own_assess_1',
    stage: 'assess',
    text: 'Son kullanıcıların sistemi benimseme (User Adoption) oranı nedir veya öngörülüyor?',
    type: 'likert',
    options: ['1', '2', '3', '4', '5'],
    description: '1: Çok Düşük (Direnç var), 5: Çok Yüksek (İstekliler)',
    min: 1,
    max: 5
  },
  {
    id: 'own_assess_2',
    stage: 'assess',
    text: 'Sistemin bakım ve işletme maliyetleri öngörülen bütçe dahilinde mi?',
    type: 'radio',
    options: ['Evet', 'Hayır, beklenenden yüksek', 'Henüz bilinmiyor'],
    required: true
  },
  {
    id: 'own_assess_3',
    stage: 'assess',
    text: 'Proje çıktıları, kurumun etik değerleri ve marka imajı ile uyumlu mu?',
    type: 'text',
    required: true
  }
];
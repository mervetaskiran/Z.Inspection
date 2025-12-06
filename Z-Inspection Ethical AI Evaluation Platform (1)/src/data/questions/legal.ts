import { Question } from '../../types';

export const legalQuestions: Question[] = [
  // --- SET-UP AŞAMASI ---
  {
    id: 'leg_setup_1',
    stage: 'set-up',
    text: 'Sistem hangi coğrafi yargı alanlarında (jurisdiction) kullanılacak?',
    type: 'checkbox',
    options: ['Avrupa Birliği (GDPR)', 'Türkiye (KVKK)', 'ABD (CCPA/Federal)', 'Global'],
    required: true
  },
  {
    id: 'leg_setup_2',
    stage: 'set-up',
    text: 'Veri Koruma Etki Değerlendirmesi (DPIA) yapıldı mı?',
    type: 'radio',
    options: ['Evet, tamamlandı', 'Süreç devam ediyor', 'Hayır, gerekli görülmedi'],
    required: true
  },

  // --- ASSESS AŞAMASI ---
  {
    id: 'leg_assess_1',
    stage: 'assess',
    text: 'Sistem "Tam Otomatik Karar Verme" (Automated Decision Making) yapıyor mu?',
    type: 'radio',
    options: ['Evet (İnsan müdahalesi yok)', 'Hayır (İnsan döngüde / Human-in-the-loop)'],
    required: true,
    description: 'GDPR Madde 22 gereği insan müdahalesi olmayan kararlar özel izin gerektirir.'
  },
  {
    id: 'leg_assess_2',
    stage: 'assess',
    text: 'Kullanıcıların "Unutulma Hakkı" (Right to be Forgotten) teknik olarak destekleniyor mu?',
    type: 'select',
    options: ['Evet, tam destekli', 'Kısmen (Yedeklerden silinmesi zaman alıyor)', 'Hayır, teknik olarak mümkün değil'],
    required: true
  },
  {
    id: 'leg_assess_3',
    stage: 'assess',
    text: 'Olası bir hatalı kararda hukuki sorumluluk (Liability) kimde olacak?',
    type: 'text',
    description: 'Geliştirici firma mı, kullanan kurum mu, yoksa operatör mü? Yasal metinlerde bu açık mı?',
    required: false
  }
];
import { Question } from '../../types';

export const medicalQuestions: Question[] = [
  // --- SET-UP AŞAMASI ---
  {
    id: 'med_setup_1',
    stage: 'set-up',
    text: 'Bu AI sisteminin tıbbi kullanım amacı (Intended Use) nedir?',
    type: 'select',
    options: ['Doğrudan Teşhis (Diagnosis)', 'Karar Destek / Triyaj', 'Hasta İzleme', 'İdari / Operasyonel', 'Eğitim / Araştırma'],
    required: true,
    description: 'Sistemin risk sınıfını belirleyen en temel faktördür.'
  },
  {
    id: 'med_setup_2',
    stage: 'set-up',
    text: 'Hedef hasta popülasyonu net bir şekilde tanımlandı mı?',
    type: 'radio',
    options: ['Evet', 'Hayır'],
    required: true,
    description: 'Çocuklar, yaşlılar veya belirli kronik rahatsızlığı olanlar gibi.'
  },

  // --- ASSESS AŞAMASI ---
  {
    id: 'med_assess_1',
    stage: 'assess',
    text: 'Sistemin yanlış bir öneri vermesi durumunda hasta üzerindeki potansiyel zarar nedir?',
    type: 'select',
    options: ['Hayati Tehlike (Kritik)', 'Kalıcı Hasar', 'Geçici Hasar / Tedavi Gecikmesi', 'Minimum / İhmal Edilebilir', 'Zarar Yok (Sadece İdari)'],
    required: true
  },
  {
    id: 'med_assess_2',
    stage: 'assess',
    text: 'Yapay zeka çıktısının klinik geçerliliği (Clinical Validity) kanıtlanmış mıdır?',
    type: 'text',
    required: true,
    description: 'Klinik deneyler, hakemli makaleler veya retrospektif çalışmalar varsa belirtiniz.'
  },
  {
    id: 'med_assess_3',
    stage: 'assess',
    text: 'Doktorların sisteme aşırı güvenme (Automation Bias) riski var mı?',
    type: 'likert',
    options: ['1', '2', '3', '4', '5'],
    description: '1: Düşük Risk, 5: Yüksek Risk. Doktorun kendi kararını sorgulamadan AI sonucunu kabul etme eğilimi.',
    min: 1,
    max: 5
  }
];
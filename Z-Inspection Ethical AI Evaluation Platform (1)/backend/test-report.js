// Test script for Gemini Report Generation
// Usage: node test-report.js
// Note: Requires Node.js 18+ (built-in fetch) or install node-fetch

// For Node.js < 18, uncomment the line below and install: npm install node-fetch
// const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000';

async function testReportGeneration() {
  try {
    console.log('🔍 Projeler listeleniyor...\n');
    
    // Önce projeleri listele
    const projectsRes = await fetch(`${API_BASE}/api/projects`);
    
    if (!projectsRes.ok) {
      console.error('❌ Projeler alınamadı:', projectsRes.status);
      return;
    }
    
    const projects = await projectsRes.json();
    
    if (projects.length === 0) {
      console.log('❌ Hiç proje bulunamadı. Önce bir proje oluşturun.');
      console.log('💡 Frontend\'den yeni bir proje oluşturabilirsiniz.');
      return;
    }
    
    const projectId = projects[0]._id || projects[0].id;
    const projectTitle = projects[0].title || 'Unknown';
    
    console.log(`📋 Test için kullanılan proje:`);
    console.log(`   ID: ${projectId}`);
    console.log(`   Title: ${projectTitle}\n`);
    
    // Rapor oluştur
    console.log('🤖 Gemini AI ile rapor oluşturuluyor...');
    console.log('⏳ Bu işlem 10-30 saniye sürebilir...\n');
    
    const startTime = Date.now();
    const reportRes = await fetch(`${API_BASE}/api/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    
    const result = await reportRes.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (reportRes.ok && result.success) {
      console.log('✅ Rapor başarıyla oluşturuldu!');
      console.log(`⏱️  Süre: ${duration} saniye\n`);
      console.log('📄 Rapor Detayları:');
      console.log(`   ID: ${result.report.id}`);
      console.log(`   Başlık: ${result.report.title}`);
      console.log(`   Durum: ${result.report.status}`);
      console.log(`   Oluşturulma: ${new Date(result.report.generatedAt).toLocaleString()}`);
      console.log(`\n📊 Metadata:`);
      console.log(`   Toplam Puan: ${result.report.metadata.totalScores}`);
      console.log(`   Toplam Değerlendirme: ${result.report.metadata.totalEvaluations}`);
      console.log(`   Toplam Tension: ${result.report.metadata.totalTensions}`);
      console.log(`   Analiz Edilen Prensipler: ${result.report.metadata.principlesAnalyzed.length}`);
      
      console.log(`\n📝 Rapor İçeriği (ilk 800 karakter):`);
      console.log('─'.repeat(60));
      console.log(result.report.content.substring(0, 800) + '...');
      console.log('─'.repeat(60));
      
      console.log(`\n💡 Tam raporu görmek için:`);
      console.log(`   curl http://localhost:5000/api/reports/${result.report.id}`);
      
    } else {
      console.error('❌ Rapor oluşturulamadı!');
      console.error('Hata:', result.error || 'Bilinmeyen hata');
      if (result.details) {
        console.error('Detaylar:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    console.error('💡 Backend\'in çalıştığından emin olun: http://localhost:5000');
  }
}

// Çalıştır
testReportGeneration();


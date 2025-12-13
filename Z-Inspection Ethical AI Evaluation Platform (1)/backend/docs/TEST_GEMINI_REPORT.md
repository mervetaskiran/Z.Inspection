# Gemini Rapor API Test Kılavuzu

## 🚀 Hızlı Test Adımları

### 1. Backend'i Başlatın

```bash
cd backend
npm install  # Eğer henüz yüklemediyseniz
npm start
# veya
node server.js
```

Backend'in `http://localhost:5000` adresinde çalıştığından emin olun.

### 2. MongoDB'de Bir Proje ID'si Bulun

**Yöntem 1: Browser Console'dan**
1. Uygulamayı açın (http://localhost:5173 veya frontend portu)
2. Browser Console'u açın (F12)
3. Şu komutu çalıştırın:
```javascript
// Tüm projeleri listele
fetch('http://localhost:5000/api/projects')
  .then(r => r.json())
  .then(projects => {
    console.log('Projeler:', projects);
    if (projects.length > 0) {
      console.log('İlk proje ID:', projects[0]._id || projects[0].id);
    }
  });
```

**Yöntem 2: MongoDB Compass'tan**
- MongoDB Compass'ı açın
- `zinspection` database'ine bağlanın
- `projects` collection'ına gidin
- Bir proje seçin ve `_id` değerini kopyalayın

### 3. Test Yöntemleri

## 📝 Yöntem 1: Browser Console'dan Test (En Kolay)

1. Uygulamayı açın ve giriş yapın
2. Browser Console'u açın (F12)
3. Aşağıdaki kodu çalıştırın:

```javascript
// Önce bir proje ID'si alın
const getProjectId = async () => {
  const response = await fetch('http://localhost:5000/api/projects');
  const projects = await response.json();
  return projects[0]?._id || projects[0]?.id;
};

// Rapor oluştur
const generateReport = async () => {
  const projectId = await getProjectId();
  console.log('Proje ID:', projectId);
  
  const response = await fetch('http://localhost:5000/api/reports/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: projectId,
      userId: null // Opsiyonel
    })
  });
  
  const result = await response.json();
  console.log('Rapor Sonucu:', result);
  return result;
};

// Çalıştır
generateReport();
```

## 📝 Yöntem 2: cURL ile Test (Terminal)

```bash
# 1. Önce bir proje ID'si alın
curl http://localhost:5000/api/projects

# 2. Çıktıdan bir projectId kopyalayın ve aşağıdaki komutta kullanın
curl -X POST http://localhost:5000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "BURAYA_PROJE_ID_YAPIŞTIRIN"
  }'
```

**Örnek:**
```bash
curl -X POST http://localhost:5000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"projectId": "67890abcdef1234567890123"}'
```

## 📝 Yöntem 3: Postman ile Test

1. Postman'i açın
2. Yeni bir POST request oluşturun
3. URL: `http://localhost:5000/api/reports/generate`
4. Headers:
   - `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "projectId": "BURAYA_PROJE_ID_YAPIŞTIRIN",
  "userId": "OPSIYONEL_USER_ID"
}
```
6. Send'e tıklayın

## 📝 Yöntem 4: Node.js Script ile Test

`backend/test-report.js` dosyası oluşturun:

```javascript
const fetch = require('node-fetch'); // veya axios kullanabilirsiniz

async function testReportGeneration() {
  try {
    // Önce projeleri listele
    const projectsRes = await fetch('http://localhost:5000/api/projects');
    const projects = await projectsRes.json();
    
    if (projects.length === 0) {
      console.log('❌ Hiç proje bulunamadı. Önce bir proje oluşturun.');
      return;
    }
    
    const projectId = projects[0]._id || projects[0].id;
    console.log('📋 Test için kullanılan proje:', projectId);
    
    // Rapor oluştur
    console.log('🤖 Rapor oluşturuluyor...');
    const reportRes = await fetch('http://localhost:5000/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    
    const result = await reportRes.json();
    
    if (reportRes.ok) {
      console.log('✅ Rapor başarıyla oluşturuldu!');
      console.log('📄 Rapor ID:', result.report.id);
      console.log('📝 Rapor Başlığı:', result.report.title);
      console.log('📊 Metadata:', result.report.metadata);
      console.log('\n📄 Rapor İçeriği (ilk 500 karakter):');
      console.log(result.report.content.substring(0, 500) + '...');
    } else {
      console.error('❌ Hata:', result.error);
    }
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
  }
}

testReportGeneration();
```

Çalıştırın:
```bash
cd backend
node test-report.js
```

## 📝 Yöntem 5: Frontend'den Test Butonu (Önerilen)

Frontend'e geçici bir test butonu ekleyebiliriz. İsterseniz bunu da ekleyebilirim.

## ✅ Başarılı Test Sonucu

Başarılı bir test sonucu şöyle görünür:

```json
{
  "success": true,
  "report": {
    "id": "67890abcdef1234567890123",
    "title": "Analysis Report - Project Name",
    "content": "## Executive Summary\n\nThis report presents...",
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "metadata": {
      "totalScores": 3,
      "totalEvaluations": 2,
      "totalTensions": 1,
      "principlesAnalyzed": [...]
    },
    "status": "draft"
  }
}
```

## 🔍 Raporları Görüntüleme

Oluşturulan raporları listelemek için:

```bash
# Tüm raporlar
curl http://localhost:5000/api/reports

# Belirli proje için raporlar
curl "http://localhost:5000/api/reports?projectId=BURAYA_PROJE_ID"

# Belirli bir raporu getir
curl http://localhost:5000/api/reports/BURAYA_RAPOR_ID
```

## 🐛 Hata Ayıklama

### Hata: "Project not found"
- Proje ID'sinin doğru olduğundan emin olun
- MongoDB'de projenin var olduğunu kontrol edin

### Hata: "Failed to generate report: API key not valid"
- Gemini API key'in doğru olduğundan emin olun
- API quota'sını kontrol edin

### Hata: "MongoDB connection error"
- Backend'in çalıştığından emin olun
- MongoDB bağlantısını kontrol edin

### Rapor içeriği boş geliyor
- Projede yeterli veri olup olmadığını kontrol edin
- Scores, evaluations, tensions verilerinin mevcut olduğundan emin olun

## 📊 Test Senaryoları

1. **Boş Proje Testi**: Hiç veri olmayan bir proje için rapor oluşturmayı deneyin
2. **Dolu Proje Testi**: Tüm verileri dolu bir proje için rapor oluşturmayı deneyin
3. **Çoklu Rapor Testi**: Aynı proje için birden fazla rapor oluşturmayı deneyin
4. **Rapor Listeleme**: Oluşturulan raporları listelemeyi test edin
5. **Rapor Güncelleme**: Rapor durumunu güncellemeyi test edin

## 💡 İpuçları

- İlk test için küçük bir proje kullanın (daha hızlı sonuç alırsınız)
- Gemini API response time 10-30 saniye arasında olabilir, sabırlı olun
- Rapor içeriği markdown formatında gelir, görüntülemek için markdown parser kullanabilirsiniz
- Her rapor MongoDB'de saklanır, istediğiniz zaman tekrar erişebilirsiniz


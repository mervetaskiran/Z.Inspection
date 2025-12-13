# Google Gemini AI Rapor Oluşturma Kılavuzu

## 📋 Genel Bakış

Bu sistem, MongoDB'deki analiz sonuçlarını okuyup Google Gemini AI kullanarak otomatik "Sonuç Raporu" oluşturur.

## 🔧 Kurulum

### 1. Paket Yükleme

```bash
cd backend
npm install
```

Bu komut `@google/generative-ai` paketini yükler.

### 2. API Key Yapılandırması

API key zaten kodda hardcoded olarak ayarlanmış:
- API Key: `AIzaSyBeKUTBEtMfoUKam4n7TWNDJOOSUoaoTvs`

Alternatif olarak, `.env` dosyasına ekleyebilirsiniz:
```
GEMINI_API_KEY=AIzaSyBeKUTBEtMfoUKam4n7TWNDJOOSUoaoTvs
```

## 🚀 Kullanım

### Rapor Oluşturma

**Endpoint:** `POST /api/reports/generate`

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012" // Opsiyonel
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "507f1f77bcf86cd799439013",
    "title": "Analysis Report - Project Name",
    "content": "Generated report content...",
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "metadata": {
      "totalScores": 5,
      "totalEvaluations": 3,
      "totalTensions": 2,
      "principlesAnalyzed": [...]
    },
    "status": "draft"
  }
}
```

### Raporları Listeleme

**Endpoint:** `GET /api/reports?projectId=xxx&status=draft`

**Query Parameters:**
- `projectId` (opsiyonel): Belirli bir proje için raporlar
- `status` (opsiyonel): `draft`, `final`, `archived`

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439013",
    "title": "Analysis Report - Project Name",
    "content": "Report content...",
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "status": "draft",
    "metadata": {...}
  }
]
```

### Belirli Bir Raporu Getirme

**Endpoint:** `GET /api/reports/:id`

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439013",
  "title": "Analysis Report - Project Name",
  "content": "Full report content...",
  "projectId": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Project Name"
  },
  "generatedBy": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "User Name",
    "email": "user@example.com"
  },
  "status": "draft",
  "metadata": {...}
}
```

### Rapor Durumunu Güncelleme

**Endpoint:** `PUT /api/reports/:id`

**Request Body:**
```json
{
  "status": "final", // draft, final, archived
  "title": "Updated Title" // Opsiyonel
}
```

### Rapor Silme

**Endpoint:** `DELETE /api/reports/:id`

**Response:**
```json
{
  "success": true
}
```

## 📊 Toplanan Veriler

Rapor oluşturulurken aşağıdaki veriler MongoDB'den toplanır:

1. **Project Bilgileri:**
   - Title, description, status, stage, progress

2. **Scores (Puanlar):**
   - Her role için prensip bazında puanlar
   - Genel ortalama puanlar
   - `Score` collection'ından

3. **General Questions Answers:**
   - Tüm prensipler için cevaplar
   - Risk skorları (0-4)
   - `GeneralQuestionsAnswers` collection'ından

4. **Evaluations:**
   - Set-up ve assess stage değerlendirmeleri
   - Risk seviyeleri
   - Genel riskler
   - `Evaluation` collection'ından

5. **Tensions:**
   - Etik çatışmalar
   - Oylar ve yorumlar
   - `Tension` collection'ından

6. **Users:**
   - Projeye atanmış kullanıcılar
   - `User` collection'ından

## 🤖 Gemini AI Prompt Yapısı

Rapor oluşturulurken Gemini AI'ye gönderilen prompt şu bölümleri içerir:

1. **Project Information**
2. **Evaluation Scores by Principle**
3. **General Questions Answers**
4. **Identified Tensions**
5. **Detailed Evaluations**
6. **Report Generation Instructions**

Gemini AI bu verilere dayanarak şunları içeren bir rapor oluşturur:
- Executive Summary
- Overall Risk Assessment
- Principle-by-Principle Analysis
- Identified Tensions Analysis
- Key Findings
- Recommendations
- Conclusion

## 🔒 Güvenlik Notları

⚠️ **ÖNEMLİ:** API key şu anda kodda hardcoded. Production ortamında:
1. `.env` dosyasına taşıyın
2. `.env` dosyasını `.gitignore`'a ekleyin
3. Environment variable olarak kullanın

## 📝 Örnek Kullanım (cURL)

```bash
# Rapor oluştur
curl -X POST http://localhost:5000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012"
  }'

# Raporları listele
curl http://localhost:5000/api/reports?projectId=507f1f77bcf86cd799439011

# Belirli raporu getir
curl http://localhost:5000/api/reports/507f1f77bcf86cd799439013

# Rapor durumunu güncelle
curl -X PUT http://localhost:5000/api/reports/507f1f77bcf86cd799439013 \
  -H "Content-Type: application/json" \
  -d '{"status": "final"}'
```

## 🐛 Hata Ayıklama

Eğer rapor oluşturma başarısız olursa:

1. **API Key Kontrolü:**
   - Gemini API key'in geçerli olduğundan emin olun
   - API quota'sını kontrol edin

2. **MongoDB Bağlantısı:**
   - MongoDB bağlantısının aktif olduğundan emin olun
   - Project ID'nin geçerli olduğunu kontrol edin

3. **Log Kontrolü:**
   - Server console'da hata mesajlarını kontrol edin
   - `❌ Gemini API Error:` veya `❌ Error generating report:` mesajlarını arayın

## 📈 Performans

- Rapor oluşturma işlemi genellikle 10-30 saniye sürer
- Gemini API response time'a bağlıdır
- Büyük projeler için daha uzun sürebilir

## 🔄 Versiyonlama

Her rapor bir `version` numarasına sahiptir. Aynı proje için yeni rapor oluşturulduğunda:
- Yeni bir doküman oluşturulur (eski raporlar silinmez)
- `generatedAt` timestamp'i ile sıralanabilir
- `status` ile filtreleme yapılabilir


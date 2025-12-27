# Use Case Questions Migration - Kontrol Listesi

## ✅ Yapılan Güncellemeler

### 1. Migration Script
- ✅ Dosya: `backend/scripts/migrate_usecasequestions.js`
- ✅ 27 soru tanımı güncellendi
- ✅ S0_Q4: "Where will it be deployed (web/app/API/on-prem)" olarak güncellendi
- ✅ S4_Q15 tag: "AI Act Art. 11 – keeping documentation up to date" olarak güncellendi
- ✅ S6_Q19 tag: "AI Act Art. 13 + Trustworthy AI transparency" olarak güncellendi

### 2. Backend Schema
- ✅ UseCaseQuestion schema'sına eklendi: `key`, `tag`, `placeholder`, `helper`, `isActive`
- ✅ GET `/api/use-case-questions` endpoint'i sadece `isActive: true` soruları döndürüyor
- ✅ UseCase schema'sına `questionKey` alanı eklendi (future-proofing)

### 3. UI Güncellemeleri
- ✅ `UseCaseDetail.tsx`: Tag badge, English (bold), Turkish (muted), helper text gösterimi eklendi

## 📋 Kontrol Edilmesi Gerekenler

### MongoDB'de Sorular Düzgün Tutuluyor mu?

Migration çalıştırdıktan sonra kontrol edin:

```javascript
// MongoDB'de kontrol
db.usecasequestions.find({ isActive: true }).sort({ order: 1 })

// Beklenen: 27 aktif soru
// Her soruda olması gerekenler:
// - key: "S0_Q1", "S0_Q2", ... "S9_Q27"
// - questionEn: İngilizce soru metni
// - questionTr: Türkçe soru metni
// - tag: AI Act referansı (bazıları boş olabilir)
// - placeholder: Placeholder metni
// - helper: Helper/örnek metni
// - isActive: true
// - order: 1-27 arası
```

### UI'da Düzgün Gözüküyor mu?

1. **UseCaseDetail.tsx** kontrolü:
   - Tag badge gösteriliyor mu? (q.tag varsa)
   - English soru bold gösteriliyor mu?
   - Turkish soru muted (gray-500) gösteriliyor mu?
   - Helper text gösteriliyor mu? (cevap yoksa)

2. **Test senaryosu**:
   ```
   1. Bir use case oluştur
   2. Use case detail sayfasına git
   3. Soruların görüntülendiğini kontrol et:
      - Tag badge'lerin gösterildiğini
      - İngilizce soruların bold olduğunu
      - Türkçe soruların muted olduğunu
      - Helper text'lerin gösterildiğini
   ```

### Use Case Assignment Düzgün Çalışıyor mu?

1. **Backend endpoint kontrolü**:
   - ✅ `PUT /api/use-cases/:id/assign` mevcut
   - ✅ `assignedExperts` array'i güncelleniyor

2. **Frontend kontrolü**:
   - AdminDashboardEnhanced'da assign modal var mı kontrol et
   - PUT request doğru gönderiliyor mu kontrol et

3. **Test senaryosu**:
   ```
   1. Admin olarak login ol
   2. Bir use case seç
   3. Expert'leri assign et
   4. UseCaseDetail sayfasında assigned experts'ların göründüğünü kontrol et
   ```

## 🚀 Migration Çalıştırma

```bash
cd backend
npm run migrate:usecasequestions
```

## ⚠️ Önemli Notlar

1. **Mevcut Cevaplar Korunur**: Migration mevcut soruların `_id`'lerini koruyarak `usecases.answers` içindeki referansların bozulmasını önler.

2. **Backup**: Migration öncesi otomatik backup oluşturulur:
   - `usecasequestions_backup_YYYYMMDD`
   - `usecases_backup_YYYYMMDD`

3. **Answer Lookup**: Şu anda `UseCaseDetail.tsx`'de answer lookup `questionId === q.id` ile yapılıyor. Bu doğru çalışmalı çünkü:
   - Mevcut cevaplar `questionId` olarak sorunun `id` field'ını (String) kullanıyor
   - Migration sonrası bu `id` field'ı korunuyor
   - Yeni sorular için `id = key` (örn: "S0_Q1") olarak ayarlanıyor

4. **Cache**: GET endpoint'te cache kullanılıyor. Migration sonrası cache'i temizlemek için server'ı yeniden başlatın veya cache süresini bekleyin (CACHE_DURATION).

## 🔍 Detaylı Kontrol Komutları

### MongoDB Kontrolü

```javascript
// Tüm soruları görüntüle
db.usecasequestions.find().sort({ order: 1 }).pretty()

// Aktif soruları say
db.usecasequestions.countDocuments({ isActive: true })

// Belirli bir soruyu kontrol et
db.usecasequestions.findOne({ key: "S0_Q1" })

// Tag'leri kontrol et
db.usecasequestions.distinct("tag")

// Use case'lerdeki answer referanslarını kontrol et
db.usecases.find({ "answers.questionId": { $exists: true } }).pretty()
```

### API Kontrolü

```bash
# Soruları çek
curl http://localhost:5000/api/use-case-questions

# Belirli bir use case'i çek
curl http://localhost:5000/api/use-cases/{id}
```


# Use Case Questions Migration - Özet ve Kontrol

## ✅ Tamamlanan İşler

### 1. Migration Script Güncellemeleri
- ✅ `backend/scripts/migrate_usecasequestions.js` oluşturuldu
- ✅ 27 soru tanımı eklendi (güncel versiyon)
- ✅ S0_Q4: "Where will it be deployed (web/app/API/on-prem)" olarak güncellendi
- ✅ S4_Q15 tag: "AI Act Art. 11 – keeping documentation up to date" 
- ✅ S6_Q19 tag: "AI Act Art. 13 + Trustworthy AI transparency"

### 2. Backend Güncellemeleri
- ✅ UseCaseQuestion schema'sına eklendi: `key`, `tag`, `placeholder`, `helper`, `isActive`
- ✅ GET `/api/use-case-questions` sadece `isActive: true` soruları döndürüyor
- ✅ UseCase schema'sına `questionKey` alanı eklendi (future-proofing)
- ✅ PUT `/api/use-cases/:id/assign` endpoint'i mevcut ve çalışıyor

### 3. Frontend Güncellemeleri
- ✅ `UseCaseDetail.tsx`: 
  - Tag badge gösterimi
  - English soru (bold)
  - Turkish soru (muted gray)
  - Helper text gösterimi
  - Answer lookup fallback (id, _id, key desteği)

### 4. Package.json
- ✅ Migration script eklendi: `npm run migrate:usecasequestions`

## 🔍 Kontrol Edilmesi Gerekenler

### 1. MongoDB'de Sorular Düzgün Tutuluyor mu?

**Migration çalıştırdıktan sonra:**

```bash
# MongoDB'de kontrol
db.usecasequestions.find({ isActive: true }).sort({ order: 1 }).pretty()

# Beklenen: 27 aktif soru
# Her soruda kontrol edilmesi gerekenler:
# ✓ key: "S0_Q1", "S0_Q2", ... "S9_Q27"
# ✓ questionEn: İngilizce soru metni (doğru mu?)
# ✓ questionTr: Türkçe soru metni (doğru mu?)
# ✓ tag: AI Act referansı (bazıları boş olabilir)
# ✓ placeholder: Placeholder metni
# ✓ helper: Helper/örnek metni
# ✓ isActive: true
# ✓ order: 1-27 arası
```

**Örnek kontrol:**
```javascript
// İlk soruyu kontrol et
db.usecasequestions.findOne({ key: "S0_Q1" })

// Tag'leri kontrol et
db.usecasequestions.find({ tag: { $ne: "" } }).forEach(q => print(q.key + ": " + q.tag))

// Sıralama kontrolü
db.usecasequestions.find({ isActive: true }).sort({ order: 1 }).forEach((q, i) => print((i+1) + ". " + q.key + ": " + q.questionEn.substring(0, 50)))
```

### 2. UI'da Düzgün Gözüküyor mu?

**UseCaseDetail.tsx kontrol listesi:**

1. ✅ **Tag badge gösterimi**: `q.tag` varsa mavi badge gösteriliyor
2. ✅ **English soru**: Bold (font-bold) gösteriliyor
3. ✅ **Turkish soru**: Muted (text-gray-500) gösteriliyor, alt satırda
4. ✅ **Helper text**: Cevap yoksa gösteriliyor (text-xs, italic, gray-400)
5. ✅ **Answer lookup**: id, _id, key ile eşleştirme yapılıyor (fallback desteği)

**Test senaryosu:**
```
1. Bir use case oluştur
2. Use case detail sayfasına git (/use-case-detail veya benzeri)
3. Kontrol et:
   ✓ Soru sayısı 27 mi?
   ✓ Tag badge'ler görünüyor mu? (S0_Q1, S1_Q5, S2_Q7, vb. için)
   ✓ İngilizce sorular bold mu?
   ✓ Türkçe sorular muted (gri) mi?
   ✓ Helper text'ler gösteriliyor mu? (cevap yoksa)
```

### 3. Use Case Assignment Düzgün Çalışıyor mu?

**Backend endpoint:**
- ✅ `PUT /api/use-cases/:id/assign` mevcut
- ✅ `assignedExperts` array'i güncelleniyor
- ✅ `adminNotes` güncelleniyor

**Frontend:**
- ✅ `AdminDashboardEnhanced.tsx`'de assign modal var
- ✅ PUT request doğru endpoint'e gönderiliyor
- ✅ `assignedExperts` ve `adminNotes` doğru gönderiliyor

**Test senaryosu:**
```
1. Admin olarak login ol
2. Admin Dashboard'a git
3. "Use Case Assignments" tab'ına git
4. Bir use case seç ve "Assign Experts" butonuna tıkla
5. Expert'leri seç ve assign et
6. UseCaseDetail sayfasında:
   ✓ Assigned experts listesi görünüyor mu?
   ✓ Expert'ler doğru gösteriliyor mu?
```

**MongoDB'de kontrol:**
```javascript
// Use case'i kontrol et
db.usecases.findOne({ _id: ObjectId("...") })

// Assigned experts kontrolü
db.usecases.find({ "assignedExperts": { $exists: true, $ne: [] } }).forEach(uc => {
  print(uc.title + ": " + uc.assignedExperts.length + " experts")
})
```

## 🚀 Migration Çalıştırma

```bash
cd backend
npm run migrate:usecasequestions
```

**Migration çıktısı:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📦 Step 1: Creating backups...
✅ Created backup: usecasequestions_backup_YYYYMMDD (X documents)
✅ Created backup: usecases_backup_YYYYMMDD (X documents)
✅ Backups created

📋 Step 2: Fetching existing questions...
   Found X existing questions
   Preparing 27 new questions

🔄 Step 3: Updating existing questions...
   ✅ Updated X existing questions
   ⚠️  Deactivated Y old questions (set isActive=false)
   ✅ Inserted Z new questions

✅ Migration completed successfully!
   Updated: X
   Deactivated: Y
   Inserted: Z
   Total active questions: 27

🔍 Verifying migration...
   Active questions in DB: 27
   Expected: 27
   ✅ Verification passed!

✅ Disconnected from MongoDB
```

## ⚠️ Önemli Notlar

1. **Mevcut Cevaplar Korunur**: 
   - Migration mevcut soruların `_id`'lerini korur
   - `usecases.answers` içindeki `questionId` referansları bozulmaz
   - Answer lookup hem `id`, hem `_id`, hem de `key` ile çalışır (fallback)

2. **Backup**: 
   - Migration öncesi otomatik backup oluşturulur
   - `usecasequestions_backup_YYYYMMDD`
   - `usecases_backup_YYYYMMDD`

3. **Cache**: 
   - GET endpoint'te cache kullanılıyor (CACHE_DURATION)
   - Migration sonrası cache'i temizlemek için server'ı yeniden başlatın

4. **Answer Lookup**: 
   - `UseCaseDetail.tsx`'de answer lookup şu şekillerde çalışıyor:
     - `a.questionId === q.id`
     - `a.questionId === q._id?.toString()`
     - `a.questionKey === q.key`
     - `a.questionId === q.key`

## 📝 Değişen Dosyalar

1. `backend/scripts/migrate_usecasequestions.js` (YENİ)
2. `backend/server.js` (schema güncellemeleri)
3. `backend/package.json` (migration script)
4. `frontend/src/components/UseCaseDetail.tsx` (UI güncellemeleri)

## 🐛 Potansiyel Sorunlar ve Çözümler

### Sorun: Sorular UI'da görünmüyor
**Çözüm:**
- Cache'i temizle (server'ı yeniden başlat)
- GET endpoint'inin `isActive: true` filtresini kontrol et
- Browser console'da hata var mı kontrol et

### Sorun: Answer'lar görünmüyor
**Çözüm:**
- Answer lookup fallback'leri çalışıyor mu kontrol et
- `uc.answers` array'i dolu mu kontrol et
- `questionId` formatını kontrol et (string, _id, key)

### Sorun: Expert assignment çalışmıyor
**Çözüm:**
- PUT endpoint'inin çalıştığını kontrol et
- `assignedExperts` array'inin doğru formatda olduğunu kontrol et (ObjectId array)
- Network tab'da request'in başarılı olduğunu kontrol et


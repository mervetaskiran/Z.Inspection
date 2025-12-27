# Eski Soruları Düzeltme Adımları

## Sorun
Use Case formunda eski sorular görünüyor. Yeni soru seti (27 soru) görünmüyor.

## Çözüm Adımları

### 1. Migration Script'ini Çalıştırın

```bash
cd backend
npm run migrate:usecasequestions
```

Veya doğrudan:
```bash
node backend/scripts/migrate_usecasequestions.js
```

### 2. Backend Server'ı Yeniden Başlatın

Cache temizlemek için backend server'ı yeniden başlatın:

```bash
# Server'ı durdurun (Ctrl+C)
# Sonra tekrar başlatın
cd backend
npm start
```

### 3. MongoDB'de Kontrol Edin

Migration'ın başarılı olduğunu kontrol edin:

```javascript
// MongoDB shell'de veya MongoDB Compass'ta
db.usecasequestions.countDocuments({ isActive: true })
// Beklenen: 27

// İlk soruyu kontrol edin
db.usecasequestions.findOne({ key: "S0_Q1" })

// Sıralama kontrolü
db.usecasequestions.find({ isActive: true }).sort({ order: 1 }).forEach((q, i) => {
  print((i+1) + ". " + q.key + ": " + q.questionEn.substring(0, 50))
})
```

### 4. Frontend Cache'ini Temizleyin

1. Browser'ı tamamen kapatın ve yeniden açın
2. Veya Hard Refresh yapın: `Ctrl+Shift+R` (Windows) veya `Cmd+Shift+R` (Mac)
3. Veya Developer Tools > Application > Clear Storage > Clear site data

### 5. API'yi Doğrudan Test Edin

Browser'da veya curl ile:

```bash
curl http://localhost:5000/api/use-case-questions
```

Veya browser'da:
```
http://localhost:5000/api/use-case-questions
```

27 soru görmelisiniz. Her soruda:
- `key`: "S0_Q1", "S0_Q2", ... "S9_Q27"
- `tag`: AI Act referansı (bazıları boş)
- `placeholder`: Placeholder metni
- `helper`: Helper/örnek metni
- `questionEn`: İngilizce soru
- `questionTr`: Türkçe soru

## UI Güncellemeleri Yapıldı

`UseCaseOwnerDashboard.tsx` component'i güncellendi:
- ✅ Tag badge gösterimi eklendi
- ✅ English soru bold olarak gösteriliyor
- ✅ Turkish soru muted (gri) olarak gösteriliyor
- ✅ Placeholder text textarea'da gösteriliyor
- ✅ Helper text textarea altında gösteriliyor

## Hala Eski Sorular Görünüyorsa

1. **Backend cache'i kontrol edin**: Server'ı yeniden başlattınız mı?
2. **MongoDB'de kontrol edin**: `isActive: true` olan 27 soru var mı?
3. **API response'u kontrol edin**: Browser DevTools > Network > `/api/use-case-questions` > Response
4. **Frontend state'i kontrol edin**: React DevTools ile `questions` state'ini kontrol edin

## Migration Çıktısı

Migration başarılı olduğunda şunu görmelisiniz:

```
✅ Migration completed successfully!
   Updated: X
   Deactivated: Y
   Inserted: Z
   Total active questions: 27

🔍 Verifying migration...
   Active questions in DB: 27
   Expected: 27
   ✅ Verification passed!
```


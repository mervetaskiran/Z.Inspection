# Review State Sistemi - Özet

## ✅ Tamamlanan Özellikler

### 1. Review State Hesaplama Kuralları

TensionCard.tsx içinde `getReviewState()` fonksiyonu ile implement edildi:

- **Proposed**: `total == 0` → Gray
- **Single review**: `total == 1` → Light blue
- **Accepted**: `total >= 2 AND disagreeCount == 0` → Green
- **Disputed**: `total >= 2 AND agreeCount == 0` → Red
- **Under review**: `total >= 2 AND agreeCount > 0 AND disagreeCount > 0` → Blue

### 2. UI Güncellemeleri

#### Review Badge
- Risk badge yanında "Review: <state>" badge gösteriliyor
- Renkler:
  - Proposed: Gray (bg-gray-100 text-gray-800)
  - Single review: Light blue (bg-blue-50 text-blue-700)
  - Under review: Blue (bg-blue-100 text-blue-800)
  - Accepted: Green (bg-green-100 text-green-800)
  - Disputed: Red (bg-red-100 text-red-800)

#### Tooltip
- Info icon butonuna tıklanınca veya hover yapınca tooltip gösteriliyor
- Text: "Review is computed from expert votes (no admin approval)."
- Position: Badge'in üstünde, z-index ile overlay

#### Discussion Recommended Uyarısı
- Sadece "Under review" durumunda gösteriliyor
- Consensus bar'ın altında, vote butonlarının üstünde
- Text: "Discussion recommended"
- Subtext: "Experts disagree — add evidence or comments to resolve."
- Style: Blue background (bg-blue-50), border, Info icon

### 3. Data Yapısı

- `tension.consensus.agree` ve `tension.consensus.disagree` değerleri kullanılıyor
- Backend'de `/api/tensions` endpoint'i zaten `consensus` objesini döndürüyor
- FE'de `agreeCount` ve `disagreeCount` hesaplanıyor
- Review state FE'de hesaplanıyor (DB'ye yazılmıyor)

## 📋 Kontrol Listesi

- ✅ Review state hesaplama kuralları doğru
- ✅ Badge renkleri doğru
- ✅ Tooltip gösteriliyor
- ✅ "Discussion recommended" uyarısı gösteriliyor (Under review durumunda)
- ✅ Admin approval ile ilgili hiçbir şey yok
- ✅ Min 2 oy kuralı yumuşatıldı (Accepted ve Disputed için total >= 2)

## 🎯 Edge Cases Kontrolü

- ✅ 1 agree, 0 disagree → Single review ✓
- ✅ 0 agree, 1 disagree → Single review ✓
- ✅ 2 agree, 0 disagree → Accepted ✓
- ✅ 0 agree, 2 disagree → Disputed ✓
- ✅ 1 agree, 1 disagree → Under review ✓

## 📝 Kullanılan Component

- `frontend/src/components/TensionCard.tsx`

## 🔍 Test Senaryoları

1. Yeni tension (0 vote) → Proposed (gray)
2. 1 agree vote → Single review (light blue)
3. 1 disagree vote → Single review (light blue)
4. 2 agree votes → Accepted (green)
5. 2 disagree votes → Disputed (red)
6. 1 agree + 1 disagree → Under review (blue) + "Discussion recommended" uyarısı
7. 2 agree + 1 disagree → Under review (blue) + "Discussion recommended" uyarısı


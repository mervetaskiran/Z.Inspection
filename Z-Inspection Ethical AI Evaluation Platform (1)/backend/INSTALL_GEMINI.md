# 🔧 Gemini Paketi Yükleme

## Sorun
`@google/generative-ai` paketi yüklü değil, bu yüzden backend başlamıyor ve endpoint'ler çalışmıyor.

## Çözüm

### 1. Backend Dizinine Gidin
```bash
cd backend
```

### 2. Paketi Yükleyin
```bash
npm install @google/generative-ai
```

### 3. Backend'i Yeniden Başlatın
```bash
npm start
```

### 4. Server Console'u Kontrol Edin

Başarılı başlama mesajları:
```
✅ MongoDB Atlas Bağlantısı Başarılı
🚀 Server running on port 5000
```

**Eğer hata görüyorsanız**, hata mesajını paylaşın.

### 5. Test Edin

Backend başladıktan sonra browser console'da:

```javascript
fetch('http://localhost:5000/api/reports/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    projectId: '693c504b7774e6feb2bf2d5d' 
  })
})
.then(r => r.json())
.then(result => console.log('✅ Başarılı!', result))
.catch(err => console.error('❌ Hata:', err));
```

## Alternatif: Tüm Paketleri Yeniden Yükleyin

Eğer hala sorun varsa:

```bash
cd backend
rm -rf node_modules  # Windows'ta: rmdir /s node_modules
rm package-lock.json  # Windows'ta: del package-lock.json
npm install
npm start
```


# 🚀 Değişiklikleri Görmek İçin

## ✅ Yapılan Değişiklikler

1. **Backend**: Evidence schema'ya comments eklendi, yeni API endpoint eklendi
2. **Frontend**: Evidence comments UI, Tension sahibi vote butonları disable

## 🔄 Server'ları Kontrol Etme ve Başlatma

### 1. Backend Server (ÖNEMLİ: Restart Gerekli)

Backend schema değişikliği yaptık, bu yüzden **mutlaka restart edilmesi gerekiyor**:

```powershell
# Backend klasörüne gidin
cd backend

# Eğer çalışıyorsa durdurun (Ctrl+C)
# Sonra başlatın:
npm start
```

**Veya root dizinde:**
```powershell
npm run dev:backend
```

### 2. Frontend Server

Frontend için genellikle hot reload çalışır, ama emin olmak için:

```powershell
# Root dizinde:
npm run dev:frontend

# Veya frontend klasöründe:
cd frontend
npm run dev
```

### 3. Browser'ı Refresh Edin

- Backend restart sonrası browser'da **Hard Refresh** yapın: `Ctrl+Shift+R` (Windows) veya `Cmd+Shift+R` (Mac)
- Veya browser'ı tamamen kapatıp yeniden açın

## 📍 Kontrol Adımları

### Backend Çalışıyor mu?
Terminal'de şunu görmelisiniz:
```
✅ MongoDB Atlas Bağlantısı Başarılı
🚀 Server running on port 5000
```

### Frontend Çalışıyor mu?
Browser'da `http://localhost:3000` açık olmalı.

### Yeni Özellikleri Test Etme

1. **Tension Detail Drawer**: Bir tension kartında "View Details" butonuna tıklayın
2. **Evidence Tab**: Evidence kartlarında "Comments (n)" butonunu görmelisiniz
3. **Comment Ekleme**: Comment ekleyip test edin
4. **Vote Butonları**: Tension sahibi iseniz, vote butonları disabled olmalı

## 🐛 Sorun Giderme

### "Cannot connect to server" hatası
- Backend çalışıyor mu kontrol edin
- Backend'i restart edin

### Değişiklikler görünmüyor
1. Backend'i restart edin (schema değişikliği için gerekli)
2. Frontend'i restart edin (gerekirse)
3. Browser'da Hard Refresh yapın (`Ctrl+Shift+R`)
4. Browser cache'ini temizleyin (Developer Tools > Application > Clear Storage)

### Port 5000 kullanılıyor
```powershell
# Hangi işlem kullanıyor?
netstat -ano | findstr :5000

# İşlemi sonlandır (PID numarasını bulun):
taskkill /PID <PID> /F
```


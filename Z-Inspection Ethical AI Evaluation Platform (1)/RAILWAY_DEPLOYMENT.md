# Railway Deployment Guide - Z-Inspection Platform

Bu rehber, Z-Inspection backend'ini Railway'e deploy etmek için detaylı adımları içerir.

## 🚀 Adım Adım Railway Deployment

### 1. Railway Hesabı Oluşturma

1. https://railway.app adresine gidin
2. "Start a New Project" → "Login with GitHub" ile giriş yapın
3. GitHub repository'nizi bağlayın

### 2. Backend Service Oluşturma

1. **New Service** → **GitHub Repo** seçin
2. Repository'nizi seçin
3. **Root Directory**: `backend` olarak ayarlayın
4. Railway otomatik olarak build başlayacak

### 3. Environment Variables Ekleme

Railway Dashboard → Backend Service → **Variables** sekmesine gidin ve şu environment variable'ları ekleyin:

#### Zorunlu Variables:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/zinspection?retryWrites=true&w=majority
NODE_ENV=production
```

#### Email Configuration (E-posta gönderimi için):

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-gmail-app-password
```

**Gmail App Password Nasıl Oluşturulur:**
1. Google hesabınıza giriş yapın
2. https://myaccount.google.com/security
3. "2-Step Verification" açık olmalı
4. "App passwords" → "Mail" → Custom name → Generate
5. 16 haneli şifreyi kopyalayın (boşluksuz)

#### Optional Variables:

```env
GEMINI_API_KEY=your-gemini-api-key
SERVER_URL=https://your-backend-url.railway.app
CLIENT_URL=https://your-frontend-url.railway.app
```

**Not**: Railway otomatik olarak `PORT` environment variable'ını ayarlar, manuel eklemenize gerek yok.

### 4. Domain Oluşturma

1. Backend service → **Settings** → **Networking**
2. **Generate Domain** butonuna tıklayın
3. Backend URL'ini kopyalayın (örn: `https://z-inspection-backend.railway.app`)

### 5. Deployment Kontrolü

1. **Deployments** sekmesinde deploy durumunu görebilirsiniz
2. **Logs** sekmesinde real-time logları izleyebilirsiniz
3. Başarılı deploy sonrası şu logları görmelisiniz:
   ```
   🚀 Server running on port 5000
   ✅ MongoDB Atlas Bağlantısı Başarılı
   📧 Email service: ✅ Configured
   ```

### 6. Health Check

Backend'in çalıştığını kontrol edin:
```
GET https://your-backend-url.railway.app/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": 123.45
}
```

## 🔧 Railway Yapılandırma Dosyaları

Projenizde zaten mevcut olan dosyalar:

- ✅ `backend/railway.json` - Railway build ve deploy ayarları
- ✅ `backend/Procfile` - Process başlatma komutu
- ✅ `backend/nixpacks.toml` - Build configuration
- ✅ `backend/package.json` - Node.js dependencies

Bu dosyalar Railway tarafından otomatik olarak kullanılır.

## 📝 Önemli Notlar

### Environment Variables

- Railway'de environment variable'lar **Variables** sekmesinden eklenir
- `.env` dosyası Railway'de kullanılmaz (sadece local development için)
- Sensitive bilgileri (şifreler, API keys) asla kod içine yazmayın

### Port Configuration

- Railway otomatik olarak `PORT` environment variable'ını ayarlar
- `server.js` dosyasında `const PORT = process.env.PORT || 5000;` şeklinde ayarlanmıştır
- Bu yapılandırma Railway ile uyumludur

### CORS Configuration

- Backend'de CORS `origin: '*'` olarak ayarlıdır
- Production'da frontend URL'inizi spesifik olarak ekleyebilirsiniz:
  ```javascript
  app.use(cors({
    origin: ['https://your-frontend-url.railway.app'],
    credentials: true
  }));
  ```

### Email Configuration

- Email credentials yoksa, kod console'da log'lanır (production'da mail gönderilemez)
- Production'da mutlaka `EMAIL_USER` ve `EMAIL_PASS` ayarlayın
- Gmail App Password kullanmanız önerilir

## 🔄 Güncelleme Süreci

1. Kod değişikliklerinizi GitHub'a push edin
2. Railway otomatik olarak yeni deploy başlatır
3. **Deployments** sekmesinden deploy durumunu izleyin
4. Başarılı deploy sonrası değişiklikler canlıda olur

## 🆘 Sorun Giderme

### Deploy Başarısız Oluyor

1. **Logları kontrol edin**: Railway Dashboard → Logs
2. **Environment variables kontrolü**: Tüm zorunlu variable'ların eklendiğinden emin olun
3. **Build hataları**: Dependencies eksik olabilir, `package.json` kontrol edin

### MongoDB Bağlantı Hatası

1. MongoDB Atlas'ta IP whitelist kontrolü: `0.0.0.0/0` ekleyin (tüm IP'ler)
2. `MONGO_URI` formatını kontrol edin
3. Username ve password'ün doğru olduğundan emin olun

### Email Gönderilemiyor

1. `EMAIL_USER` ve `EMAIL_PASS` variable'larının eklendiğinden emin olun
2. Gmail App Password kullandığınızdan emin olun (normal şifre değil)
3. Logları kontrol edin: `📧 Email service: ✅ Configured` görünüyor mu?

### Port Hatası

- Railway otomatik olarak PORT ayarlar, genelde sorun olmaz
- Eğer sorun yaşarsanız, `PORT` variable'ını manuel ekleyin

## 📞 Destek

Sorun yaşarsanız:
1. Railway Dashboard → Logs sekmesinden hata mesajlarını kontrol edin
2. Backend health check endpoint'ini test edin: `/api/health`
3. Environment variables'ların doğru olduğundan emin olun


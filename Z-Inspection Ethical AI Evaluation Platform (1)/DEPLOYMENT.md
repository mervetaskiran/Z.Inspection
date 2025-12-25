# Deployment Rehberi - Z-Inspection Platform

Bu rehber, Z-Inspection platformunu online'a açmak için adım adım talimatlar içerir.

## 🚀 Hızlı Başlangıç - Railway (Önerilen)

Railway en kolay ve hızlı deployment seçeneğidir.

### Ön Gereksinimler
- GitHub hesabı
- MongoDB Atlas hesabı (ücretsiz)
- Railway hesabı (https://railway.app - GitHub ile giriş yapın)

### Adımlar

#### 1. MongoDB Atlas Kurulumu
1. https://www.mongodb.com/cloud/atlas adresine gidin
2. Ücretsiz hesap oluşturun
3. Yeni bir cluster oluşturun (M0 - Free tier)
4. Database Access → Add New Database User (kullanıcı adı ve şifre oluşturun)
5. Network Access → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0)
6. Connect → Drivers → Connection string'i kopyalayın
7. Connection string'de `<password>` ve `<username>` yerlerini doldurun

#### 2. Railway'de Backend Deployment

1. **Railway'a Giriş**
   - https://railway.app → "Login with GitHub"
   - "New Project" → "Deploy from GitHub repo"
   - Repository'nizi seçin

2. **Backend Service Oluştur**
   - "New Service" → "GitHub Repo"
   - Root directory: `backend` olarak ayarlayın
   - Environment Variables ekleyin (Railway Dashboard → Variables sekmesi):
     ```
     MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/zinspection?retryWrites=true&w=majority
     PORT=5000
     NODE_ENV=production
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASS=your-gmail-app-password
     GEMINI_API_KEY=your-gemini-api-key
     ```
   - **Önemli**: Railway otomatik olarak `PORT` environment variable'ını ayarlar, ancak manuel ekleyebilirsiniz
   - Deploy başlayacak

3. **Backend URL'ini Al**
   - Deploy tamamlandıktan sonra "Settings" → "Generate Domain" 
   - Backend URL'ini kopyalayın (örn: `https://z-inspection-backend.railway.app`)

#### 3. Railway'de Frontend Deployment

1. **Frontend Service Oluştur**
   - Aynı project içinde "New Service" → "GitHub Repo"
   - Root directory: root (proje ana dizini)
   - Build Command: `npm install && npm run build`
   - Start Command: Frontend static olduğu için Railway static hosting kullanın

2. **Environment Variables**
   ```
   VITE_API_URL=https://z-inspection-backend.railway.app
   ```

3. **Static Files Serving**
   - Railway, build klasöründeki static dosyaları otomatik olarak serve eder
   - Settings → Generate Domain ile frontend URL'ini alın

---

## 🌐 Alternatif: Render.com

Render.com da ücretsiz tier sunuyor ve kullanımı kolaydır.

### Backend Deployment (Render)

1. https://render.com → Sign up (GitHub ile)
2. "New" → "Web Service"
3. GitHub repo'nuzu bağlayın
4. Ayarlar:
   - **Name**: z-inspection-backend
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Environment Variables:
   ```
   MONGO_URI=mongodb+srv://...
   PORT=10000
   NODE_ENV=production
   ```
6. "Create Web Service"

### Frontend Deployment (Render)

1. "New" → "Static Site"
2. GitHub repo'nuzu bağlayın
3. Ayarlar:
   - **Name**: z-inspection-frontend
   - **Root Directory**: (root)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Plan**: Free
4. Environment Variables:
   ```
   VITE_API_URL=https://z-inspection-backend.onrender.com
   ```

---

## 🔧 Environment Variables Listesi

### Backend (.env veya Railway/Render Environment Variables)

**Zorunlu Variables:**
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/z-inspection?retryWrites=true&w=majority
NODE_ENV=production
```

**Email Configuration (E-posta gönderimi için):**
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password-16-digits
```

**Optional Variables:**
```
PORT=5000
GEMINI_API_KEY=your-gemini-api-key
SERVER_URL=https://your-backend-url.railway.app
CLIENT_URL=https://your-frontend-url.railway.app
```

**Not**: Railway otomatik olarak `PORT` environment variable'ını ayarlar. Manuel eklemeniz gerekmez, ama ekleyebilirsiniz.

### Frontend (Build-time variables - VITE_ prefix ile)
```
VITE_API_URL=https://your-backend-url.railway.app
```

**Not**: Frontend environment variables sadece build sırasında kullanılır. Değişiklik yaparsanız yeniden build gerekir.

---

## 📝 Backend'de Health Check Endpoint Ekleme

Backend'inizde health check endpoint'i eklemek için `backend/server.js` dosyasına şunu ekleyin:

```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## ✅ Deployment Sonrası Kontroller

1. **Backend Kontrolü**
   - `https://your-backend-url/api/health` → `{"status":"ok"}` dönmeli
   - MongoDB bağlantısını kontrol edin (loglara bakın)

2. **Frontend Kontrolü**
   - Frontend URL'ini açın
   - Browser console'da API çağrılarının başarılı olduğunu kontrol edin
   - Login yapmayı deneyin

3. **CORS Ayarları**
   - Backend'de `cors` ayarları zaten `origin: '*'` olarak ayarlı
   - Eğer sorun yaşarsanız, frontend URL'ini spesifik olarak ekleyin

---

## 🔄 Güncelleme Süreci

1. GitHub'a push yapın
2. Railway/Render otomatik olarak yeni deploy başlatır
3. Deploy tamamlandıktan sonra değişiklikler canlıda olur

---

## 💡 İpuçları

- **Ücretsiz Tier Limitleri**: Render ve Railway ücretsiz tier'larında uyku modu olabilir (ilk istek yavaş olabilir)
- **Domain Bağlama**: Custom domain eklemek için Railway/Render dashboard'dan yapabilirsiniz
- **Loglar**: Railway/Render dashboard'dan real-time logları görüntüleyebilirsiniz
- **Environment Variables**: Hassas bilgileri (MongoDB URI, API keys) environment variables olarak saklayın, asla kod içine yazmayın

---

## 🆘 Sorun Giderme

### Backend çalışmıyor
- Environment variables'ların doğru olduğunu kontrol edin
- MongoDB Atlas'ta IP whitelist kontrolü yapın
- Logları kontrol edin

### Frontend backend'e bağlanamıyor
- `VITE_API_URL` değişkeninin doğru olduğunu kontrol edin
- Backend'in çalıştığını health check ile doğrulayın
- CORS ayarlarını kontrol edin
- Browser console'da hata mesajlarını kontrol edin

### Build hatası
- Node.js versiyonunu kontrol edin (package.json'da belirtilen)
- Dependencies'lerin yüklendiğinden emin olun
- Build loglarını detaylı inceleyin



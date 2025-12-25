# Backend Kurulum ve Çalıştırma

## 1. Backend'i Başlatma

Backend'i başlatmak için:

```bash
cd backend
npm start
```

Backend başarıyla başladığında şu mesajı görmelisiniz:
```
🚀 Server running on port 5000
✅ MongoDB Atlas Bağlantısı Başarılı
```

## 2. Environment Variables (.env dosyası)

`backend/.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# MongoDB Connection
MONGO_URI=your_mongodb_connection_string

# E-posta gönderimi için
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# URL'ler
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
```

### Gmail App Password Oluşturma

Eğer Gmail kullanıyorsanız:

1. Google hesabınıza giriş yapın
2. Hesap Ayarları → Güvenlik
3. 2 Adımlı Doğrulama'yı açın (eğer açık değilse)
4. Uygulama Şifreleri bölümüne gidin
5. "E-posta" ve "Diğer (Özel ad)" seçin
6. Oluşturulan 16 haneli şifreyi `EMAIL_PASS` olarak kullanın

## 3. Sorun Giderme

### Backend çalışmıyor

- `backend/.env` dosyasının var olduğundan emin olun
- MongoDB bağlantı string'inizin doğru olduğundan emin olun
- Port 5000'in başka bir uygulama tarafından kullanılmadığından emin olun

### E-posta gönderilemiyor

- `EMAIL_USER` ve `EMAIL_PASS` değerlerinin doğru olduğundan emin olun
- Gmail App Password kullanıyorsanız, normal şifrenizi değil App Password'ü kullanın
- Gmail'in "Daha az güvenli uygulama erişimi" ayarını kontrol edin (artık kullanılmıyor, App Password gerekli)

### Frontend bağlanamıyor

- Backend'in 5000 portunda çalıştığından emin olun
- `vite.config.ts` dosyasındaki proxy ayarlarının doğru olduğundan emin olun
- Browser console'da hata mesajlarını kontrol edin


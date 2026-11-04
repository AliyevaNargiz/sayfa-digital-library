# Necle’nin Kütüphanesi — başlangıç

Bu proje Necle için hazırlanmış, tamamen bağımsız ve boş başlayan bir kitaplıktır. Ahmad’ın kitapları veya dosyaları dahil değildir.

1. https://nodejs.org/ adresinden Node.js 24 veya daha yeni bir sürüm yükleyin.
2. ZIP’i açıp bu klasörde bir terminal açın.
3. `node scripts/start-portable.mjs` çalıştırın.
4. http://127.0.0.1:3000 adresini açın.

Kaynak ZIP’inde hazır tarayıcı dosyaları bulunur; ilk çalıştırma için `npm install` gerekmez. Git deposundan kurulum yaparken `npm ci` ve `npm run build:client` gerekir.

Tüm kitaplar tek katalogda görünür. **Kitap ekle** elle kayıt açar; başlık veya ISBN araması alanları doldurabilir. **Fotoğrafla ekle** kamerayı ve toplu fotoğraf seçimini açar. **Dijital dosya ekle** PDF, EPUB ve belgeleri içe aktarır. Kategoriler ayrıca oluşturulabilir. Hazır kayıtları inceleyip kaydedin; bulunamayan bilgi uydurulmaz.

Kayıtlar `.data/library.sqlite`, yüklenen dosyalar `.data/files/` içinde kalır. Sunucu kapalıyken `.data` klasörünün tamamını yedekleyin. Katalog JSON yedeği dosya içeriklerini taşımaz. Fotoğraf okuma ilk kullanımda internetten dil dosyaları indirir; fotoğrafın kendisi dış OCR servislerine gönderilmez.

Arayüzü `public/`, sunucuyu kökteki `.mjs` dosyalarından, OCR ve belge işlemlerini `client/` klasöründen değiştirebilirsiniz. Geliştirme, test, kendi hesabınızda barındırma ve gizlilik ayrıntıları için `README.md` dosyasını okuyun.

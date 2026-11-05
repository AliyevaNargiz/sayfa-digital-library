# Sayfa

Türkçe, telefon/tablet/bilgisayara uygun kişisel kitaplık uygulaması. Her kullanıcı kendi hesabında fiziksel ve dijital kitaplarını aynı katalogda tutar. Yeni hesaplar boş başlar; başka kullanıcıların kitapları paylaşılmaz.

## Özellikler

- Merkezlenmiş ana sayfa; kâğıt, ahşap, koyu yeşil ve kiremit renkler; kitaplık fotoğrafı, katalog kartı, Noto Serif başlıklar ve Source Sans 3 metin. Fontlar yerelden sunulur.
- İngilizce, Türkçe, Azerbaycanca ve Rusça arayüz; ilk ziyarette barındırma ülke bilgisi, bölgesel saat dilimi ve cihaz diline göre öneri, bayrak ve yerel dil adlarıyla seçim, hatırlanan tercih ve hesap ayarlarından değiştirme. Kitap bilgileri ve kullanıcı içeriği çevrilmez.
- Giriş/kayıt, kitaplık, okuma rehberi ve hesap ekranları. Hareket azaltma tercihine saygılı hafif animasyonlar ve küçük ekranlara uygun düzen.
- Elle ekleme ve kitap adı/ISBN ile kapak, yazar, yayınevi, açıklama ve diğer katalog bilgilerini otomatik bulma. Bulunamayan bilgi uydurulmaz; her alan düzenlenebilir.
- Telefon kamerasından veya galeriden çoklu fotoğraf. Tesseract.js Türkçe/İngilizce metni cihazda okur; metin/ISBN kitap kataloglarında aranır. Kaydetmeden önce adaylar incelenir. Net kapak fotoğrafları önerilir.
- PDF, EPUB, ofis/metin belgelerini toplu yükleme, metadata/metin/kapak çıkarma; aynı kullanıcının aynı dosyası tekrar eklenmez. Dosya başına 25 MB, fotoğraf başına 15 MB. İçe aktarma durdurulabilir; yeni işlem önceki dosya adlarını temizler.
- Kategoriler, biçim ve okuma filtreleri, toplu silme/okundu, ödünç/iade ve kişisel notlar. Toplu işlem bitince seçim kapanır.
- Okuma rehberi kendi kitaplığını başlık, açıklama ve çıkarılmış belge metniyle eşleştirir. **Üretken AI bağlı değildir**; anahtar veya ücretli servis gerektirmez. Taranmış PDF metni otomatik okunmaz.
- PWA manifesti ve kitap simgesi; tarayıcının standart ana ekrana ekleme özelliği kullanılabilir. Uygulama internet gerektirir. Özel kayıtlar/dosyalar service worker önbelleğine yazılmaz.

## Kimlik ve özel veriler

ChatGPT Sites dağıtımında platformun yönetilen ChatGPT girişi kullanılır. Kullanıcı kayıt profili doğrulanmış platform kimliğinden oluşturulur; uygulama şifre tutmaz. Halka açık ana sayfa, API erişimi anlamına gelmez. Kitap, kategori ve dosya erişimleri sunucuda kullanıcı kimliğiyle sınırlandırılır. Başka hesaba ait dosya bağlantıları çalışmaz.

İsteğe bağlı Firebase modülü e-posta/şifre, e-posta doğrulama, şifre sıfırlama ve Google girişini içerir. **Firebase projesi bağlanıp yapılandırılmadan bu seçenekler yayında etkin değildir.** Kendi barındırmanızda Firebase Authentication içinde Email/Password ve Google sağlayıcılarını etkinleştirin, alan adınızı authorized domains listesine ekleyin; aşağıdaki runtime değişkenlerini ayarlayın:

- `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, isteğe bağlı `FIREBASE_APP_ID`.
- `APP_OWNER_EMAIL`: doğrulanmış yönetici e-postası; gizli sunucu ayarı olarak tutun. İlk kayıt olan kişi yönetici olmaz.

Firebase ID token imzası/issuer/audience/expiry/verified email sunucuda doğrulanır. Dosya erişimi için kısa süreli HttpOnly, Secure, SameSite cookie kullanılır. Sağlayıcı değiştirirken aynı doğrulanmış e-posta mevcut uygulama hesabına bağlanır. Canlı sağlayıcı bağlantısı olmadan Google/e-posta uçtan uca testi yapılmış sayılmaz.

Yalnız yönetici hesap adlarını, e-postaları, kayıt ve kullanım bilgilerini görebilir; yönetim ekranı kitap içeriği sunmaz. Hesap ekranı kendi katalog bilgilerini dışa aktarır ve kendi kitaplığını/dosyalarını silebilir. Katalog dışa aktarımı dosya baytlarını içermez. Kitaplığı silmek giriş sağlayıcısı hesabını veya uygulama profilini silmez.

Eski tek kullanıcılı veriler migration sonrasında sahipsiz, erişime kapalı kalır; yalnız `APP_OWNER_EMAIL` ile eşleşen doğrulanmış yöneticiye atanır. Ahmad’ın bağımsız uygulaması otomatik aktarılmaz veya silinmez.

## Depolama ve başlangıç sınırları

Sites sürümü yönetilen D1 veritabanı ve R2 dosya deposu kullanır. Varsayılan sınırlar: 200 hesap, kullanıcı başına 1.000 kitap ve 100 MB dosya, uygulama genelinde 10.000 kitap ve 1.000 MB dosya. Eşzamanlı yüklemeler atomik rezervasyonla sınırlandırılır. Ayarlanabilen değişkenler: `MAX_USERS`, `MAX_USER_BOOKS`, `MAX_TOTAL_BOOKS`, `MAX_USER_STORAGE_MB`, `MAX_TOTAL_STORAGE_MB`.

Bunlar uygulamanın koruma sınırlarıdır; sağlayıcı ücretsiz katmanını veya gelecekteki ücretleri garanti etmez. Trafik, belge metni ve platform kotalarını izleyin. Sınırsız ücretsiz depolama sunulmaz. Yayındaki veriler Git deposuna veya kaynak ZIP’ine dahil edilmez.

## Yerel geliştirme

Node.js 24+ ve Python 3 gerekir:

```sh
npm ci
npm run build:client
npm start
npm test
```

http://127.0.0.1:3000 açılır. Yerel geliştirme modu tek güvenilen kullanıcı içindir; kimlik sağlayıcısı yapılandırmadan internete açmayın. Yerel veriler `.data/library.sqlite` ve `.data/files/` içinde saklanır. Sunucuyu durdurup tüm `.data` klasörünü yedekleyin. Hazır kaynak ZIP’inde bağımlılıksız başlatma: `node scripts/start-portable.mjs`.

Arayüz: vanilla JavaScript, HTML ve CSS. Sunucu: JavaScript ES modules / Cloudflare Workers. Veritabanı: SQLite/D1, Drizzle şema/migration; dosyalar R2. Tarayıcı modülleri esbuild ile derlenir. React/Next.js kullanılmaz. OCR: Tesseract.js, PDF: PDF.js, kimlik: yönetilen ChatGPT veya isteğe bağlı Firebase SDK.

Arayüz `public/`, sunucu kökteki `.mjs`, belge/OCR/kimlik modülleri `client/` içindedir. Client değişikliklerinden sonra `npm run build:client` gerekir.

## Dağıtım

Mevcut Sites kimliği ve `DB`/`BUCKET` bağlarını `.openai/hosting.json` içinde koruyun. Secret değerleri manifest veya Git’e koymayın. Migration dosyaları uygulanmışsa değiştirmeyin; yeni migration üretin. Kaynak commit/push sonrası aynı durumdan `node scripts/build-hosted.mjs` ile artifact oluşturun.

Kendi Cloudflare hesabınızda D1/R2 oluşturup `wrangler.jsonc` yer tutucularını doldurun, Firebase’i yapılandırın, `npm run db:remote` ardından `npm run deploy` çalıştırın. GitHub Pages tek başına özel API/veritabanını çalıştırmaz. Sağlayıcı koşulları geçerlidir.

## Gizlilik ve doğrulama

OCR ilk kullanımda dil dosyalarını jsDelivr üzerinden indirir. Fotoğraf harici OCR servisine gönderilmez. Bulunan metin/ISBN Ali & Nino ve Open Library kataloglarına gönderilir. Dosyalar kullanıcıya ait depoda saklanır; konu eşleştirme sunucuda kendi kayıtları üzerinde çalışır. Bulunamayan açıklama açıkça belirtilir, konu özeti uydurulmaz.

Testler API, kullanıcılar arası izolasyon, migration, yetkiler, eşzamanlı depolama kotası, token doğrulama ve arayüz akışlarını kapsar. Gerçek telefon kamerası, cihaz kurulumu ve bağlanmamış Firebase sağlayıcısı ayrı cihaz/sağlayıcı testi gerektirir. Kapak resimleri ilgili hak sahiplerine aittir.

E-posta/Google girişinin neden isteğe bağlı olduğu, hangi verinin nerede saklandığı ve adım adım kurulum için [FIREBASE-SETUP.md](FIREBASE-SETUP.md) dosyasına bakın.

Başlık ve gövde fontlarının Ə/ə ve tüm Azerbaycan Latin harfleri ile Kiril glifleri kontrol edildi. Dil seçimi yalnız açık onaydan sonra saklanır. Önceki sürümün eski dil tercihi bir defa yeniden onaylanır. Bölge uç noktası yalnız barındırmanın güvenilir `request.cf.country` bilgisini kullanır; GPS veya harici IP servisi çağrılmaz, konum veritabanına yazılmaz. Ülke bilgisi yoksa Bakü saat dilimi Azerbaycancayı önerir; onaylanan tercih her zaman önceliklidir.

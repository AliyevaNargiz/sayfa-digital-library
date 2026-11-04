# Necle’nin Kütüphanesi

Necle için Türkçe, klasik bir kişisel kitaplık. Fiziksel ve dijital kitaplar **aynı katalogda** görünür. Örneğin 2 fiziksel + 10 dijital kitap, toplam 12 kitap olarak sayılır. Bu proje boş başlar; Ahmad’ın kitapları, veritabanı veya yüklediği dosyalar bu projeye aktarılmaz.

## Özellikler

- Klasik serif yazı karakterleri, krem kâğıt, koyu yeşil ve pirinç tonları; telefon, tablet ve bilgisayara uygun arayüz.
- Elle kitap ekleme; kitap adı veya ISBN ile otomatik yazar, kapak, yayınevi, yıl, dil, sayfa ve açıklama bulma. Kataloglarda bulunmayan alanlar boş veya açıkça eksik bırakılır; bilgiler uydurulmaz.
- Kalıcı kategori oluşturma, adını değiştirme ve kaldırma. Kategori kaldırmak kitapları silmez; o etiketleri kaldırır.
- **Fotoğrafla ekle:** doğrudan telefon kamerası veya galeriden birden fazla fotoğraf. Tesseract.js Türkçe/İngilizce yazıyı cihazın içinde okur; yalnızca bulunan yazı veya ISBN çevrimiçi kitap kataloglarına gönderilir. Ücretli yapay zekâ API anahtarı gerekmez.
- Okunabilen bir grup fotoğrafında birden çok aday bulunabilir; küçük, eğik veya üstü kapalı yazılar güvenilir biçimde tanınmayabilir. En iyi sonuç için her kapağı net ve karşıdan çekin. Bir fotoğraf bir kitap garantisi yoktur; kaydetmeden önce tüm adaylar incelenebilir, düzenlenebilir veya seçimden çıkarılabilir.
- Çevrimiçi kapak yoksa fotoğrafın küçük JPEG önizlemesi, **kullanıcı kitabı eklediğinde**, yalnızca özel dosya deposuna kaydedilir. Orijinal fotoğraf katalog servislerine gönderilmez.
- PDF, EPUB, ofis ve metin belgelerini topluca yükleme; metadata, okunabilir metin ve kapak önizlemesi çıkarma; aynı dosyanın tekrarını atlama. Dosya başına 25 MB, fotoğraf başına 15 MB. İçe aktarma durdurulabilir; kaydedilmiş kayıtlar korunur. Yeni içe aktarma geçmiş dosya adlarını temizler.
- Fiziksel/dijital biçim, kategori ve okuma durumuyla filtreleme; ortak toplamlar; kapak veya liste görünümü; toplu silme ve okundu işaretleme. İşlem bitince seçim modu otomatik kapanır.
- Ödünç verme ve iade, kişisel notlar, JSON katalog yedeği, telefon ana ekranına eklenebilir web uygulaması ve kaynak kod ZIP’i.
- Konu araması başlıklar, açıklamalar ve okunabilir belge metinlerinde çalışır; üretken yapay zekâ veya anlamsal anlayış iddiasında bulunmaz.

## Bilgisayarınızda çalıştırma

Node.js 24 veya daha yeni bir sürüm gerekir.

İndirilen kaynak ZIP’i hazır tarayıcı dosyalarını da içerir:

```sh
node scripts/start-portable.mjs
```

http://127.0.0.1:3000 adresini açın. İlk katalog boştur. Kayıtlar `.data/library.sqlite`, dosyalar `.data/files/` içinde kalır. Sunucuyu durdurup açmak bunları silmez. Tam yerel yedek için sunucuyu durdurup `.data` klasörünün tamamını kopyalayın.

Git deposundan geliştirme yapıyorsanız:

```sh
npm ci
npm run build:client
npm start
npm test
```

`public/app.js`, `public/index.html` ve `public/style.css` arayüzü oluşturur. `client/file-metadata.mjs` belge ayrıntılarını, `client/ocr-reader.mjs` fotoğraf okumasını işler. Bu iki dosyayı değiştirdikten sonra `npm run build:client` çalıştırın. Sunucu değişikliklerinde sunucuyu yeniden başlatın.

## Fotoğraf okuma ve gizlilik

İlk kullanımda tesseract.js-core ve Türkçe/İngilizce dil dosyaları jsDelivr üzerinden indirilir. Dil dosyaları cihazda önbelleğe alınabilir; bu, fotoğrafların harici bir OCR servisine gönderildiği anlamına gelmez. Fotoğraf metni Ali & Nino ve Open Library’de aranır. Katalog kesintisinde kitap elle eklenebilir. Farklı baskılar farklı kapak, yayınevi ve tarih taşıyabileceği için her alan incelenebilir.

Fotoğraf eşleştirme ücretsiz OCR ve katalog aramasıdır; görüntüyü insan gibi anlayan bir servis değildir. Açıklamalar çevrimiçi katalogdan, dosyadaki metinden veya kullanıcının düzenlemesinden gelir. Taranmış PDF’lerde OCR yapılmaz; fotoğraf içe aktarma özelliği kitap kapakları içindir.

## Uygulama olarak kullanma

**Ana ekrana ekle** düğmesi cihazınıza uygun yükleme yolunu gösterir. iPhone/iPad’de Safari → Paylaş → Ana Ekrana Ekle; Android’de Chrome → Uygulamayı yükle; bilgisayarda Chrome/Edge yükleme simgesi kullanılabilir. Yerel sunucunuz yalnızca kendi bilgisayarınız içindir; farklı cihazlarda aynı kayıtları görmek için siteyi çevrimiçi barındırın. Çevrimiçi sürüm HTTPS ve internet bağlantısı gerektirir. Özel kayıtlar ve belgeler service worker tarafından çevrimdışı önbelleğe alınmaz.

ChatGPT Sites sürümü başlangıçta site sahibine özeldir. Necle’nin kendi hesabıyla erişimi ayrıca Sites paylaşım ayarlarından verilmelidir; kullanıcı adresi bilinmeden erişim listesi değiştirilmez.

## Kendi Cloudflare hesabınızda barındırma

Workers, D1 ve R2 etkin bir Cloudflare hesabı gerekir. Sağlayıcının kota ve ücret koşulları geçerlidir; depolama veya hesap oluşturma bu pakete dahil değildir.

1. `npm ci` ve `npm run build:client` çalıştırın.
2. `npx wrangler login` ile kendi hesabınıza girin.
3. `npx wrangler d1 create necle-library` çalıştırın; dönen database ID’yi `wrangler.jsonc` içindeki yer tutucuya yazın.
4. `npx wrangler r2 bucket create necle-library-files` çalıştırın.
5. `npm run db:remote` ile şemayı uygulayın.
6. `npx wrangler secret put APP_PASSWORD` ile güçlü bir şifre belirleyin.
7. `npm run deploy` çalıştırın. Wrangler’ın verdiği HTTPS adresini açın.

Bu kopya kendi şifresini, D1 veritabanını ve R2 dosya deposunu kullanır; Ahmad’ın kütüphanesine bağlanmaz. GitHub Pages tek başına özel veritabanı ve dosya API’sini çalıştıramaz. Sites dağıtımında `.openai/hosting.json` içindeki **bu projeye ait** kimlik, `DB` ve `BUCKET` bağları korunmalıdır. Yeni şema değişiklikleri için eski uygulanmış SQL’i değiştirmeyin; `npm run db:generate` ile yeni bir migration ekleyin.

## Yedekler ve kaynak kod

**Yedek indir** JSON dosyası kitap bilgileri, notlar ve kategorileri içerir. Dijital dosyaların ve kapak önizlemelerinin gerçek baytlarını içermez; asılları ayrıca indirin. Yedek yükleme mevcut kimlikleri değiştirmeden eksik kayıtları ekler. Kaynak ZIP’i kodları ve hazır tarayıcı varlıklarını içerir; canlı veritabanı, yüklenen belgeler veya parolalar dahil değildir.

```sh
npm run package:source
node scripts/build-hosted.mjs
```

ZIP oluşturmak için Python 3 gerekir. Paket `public/necle-library-source.zip` yoluna yazılır. İki bağımsız Git deposu önerilir: `ahmads-library` ve `necle-library`; canlı veritabanları ve dosyalar Git’e eklenmez.

API, veri kalıcılığı ve arayüz etkileşimleri otomatik testlerle denetlenir. OCR motoru örnek bir kapak üzerinde çalıştırılarak doğrulanmıştır. Bu çalışma alanında gerçek telefon kamerası ve gerçek cihaz uygulama kurulumu test edilememiştir; kullanıcının cihazında kontrol edilmelidir. Fotoğraf ve kapak resimleri kendi hak sahiplerine aittir. Derlenmiş kitaplıkların lisansları ZIP içindeki `THIRD-PARTY-LICENSES` klasöründedir.

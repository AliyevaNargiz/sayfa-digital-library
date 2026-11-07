# Sayfa — rəqəmsal kitabxanan

Fiziki kitabları, PDF/EPUB sənədlərini, şəxsi qeydləri və oxu vəziyyətini bir hesabda birləşdirən, telefon, planşet və kompüter üçün şəxsi kitabxana tətbiqi.

**Canlı tətbiq:** https://sayfa-kitaplik.ahmadnargizgpt.chatgpt.site

**Mənbə kodu:** https://github.com/AliyevaNargiz/sayfa-digital-library

Hər istifadəçi öz hesabı ilə daxil olur və yalnız öz kitablarını, kateqoriyalarını və fayllarını görür. Yeni kitabxana boş başlayır. Google ilə giriş Firebase Authentication vasitəsilə işləyir; kitab bazası və sənədlər ayrıca D1/R2 deposunda saxlanır.

## Dəyişiklik tarixçəsi

Tarixlər mövcud Git commit-lərinə əsaslanır və Bakı vaxtı ilə göstərilir. Eyni gün ərzində bir neçə mərhələ tamamlanıb. Aşağıda əvvəlki dizaynlar tarixçə kimi qeyd edilir; cari görünüş isti rəngli oxu otağı dizaynıdır.

### İlkin şəxsi kitabxana — Sayfa-dan əvvəl

Bu mərhələlər Ahmadın ayrıca şəxsi kitabxanasının Git tarixçəsindədir. Onun şəxsi kitab siyahısı və canlı məlumatları bu depoya köçürülmür.

| Tarix | Edilən işlər |
| --- | --- |
| **21 oktyabr 2026** | İlkin şəxsi kitabxana və qalıcı saxlama quruldu. Ahmadın 140 kitablıq fiziki kolleksiyası əlavə edildi. Klassik kitabxana görünüşü, fotoşəkilli isti dizayn, araşdırılmış üz qabıqları və internetdən üz qabığı seçimi yaradıldı. |
| **28 oktyabr 2026** | Kitab adı ilə avtomatik məlumat doldurma, şəxsi rəqəmsal kitabxana və toplu sənəd yükləmə əlavə edildi. İdxalı dayandırmaq, çoxlu kitab seçmək, toplu əməliyyatlar, quraşdırılan web tətbiqi, təsvirlər və mətn/mövzu üzrə axtarış hazırlandı. |
| **4 noyabr 2026** | İşlək mənbə kodu paketi və öz serverində yerləşdirmə sənədləri hazırlandı. Sonra yeni, boş kitabxana layihəsinə keçildi. |

### Bu deponun inkişafı — Necle-dən Sayfa-ya

| Tarix | Yenilik | Commit |
| --- | --- | --- |
| **4 noyabr 2026** | Necle üçün müstəqil, boş başlayan türk dilli kitabxana yaradıldı. Fiziki və rəqəmsal kitablar vahid kataloqda birləşdirildi. Kateqoriyalar, əl ilə və ad/ISBN ilə əlavə etmə, cihazda pulsuz OCR və bir neçə foto ilə kitab əlavə etmə hazırlandı. | [`1480cbb`](https://github.com/AliyevaNargiz/sayfa-digital-library/commit/1480cbb9024973115edc71be52086092f7953dba) |
| **5 noyabr 2026** | Layihə **Sayfa** adlı vahid, çoxistifadəçili tətbiqə çevrildi. Şəxsi hesablar, giriş/qeydiyyat səhifələri, hər hesab üçün ayrı kitab/fayl/kateqoriya məlumatları, sahibə məxsus idarəetmə paneli və saxlama limitləri əlavə edildi. | [`f91bf46`](https://github.com/AliyevaNargiz/sayfa-digital-library/commit/f91bf46aa8fb7ae371edd8cbe3b79cc4ff36d921) |
| **5 noyabr 2026** | İngilis, türk, Azərbaycan və rus dilləri, ilk girişdə dil təklifi və seçim pəncərəsi əlavə edildi. Loqo, ana ekran simgesi, animasiyalar və uyğunlaşan ekran ölçüləri yeniləndi. | [`f76d5d1`](https://github.com/AliyevaNargiz/sayfa-digital-library/commit/f76d5d13bcd7bbcca69b9b6de0e85c8e1fab24ab) |
| **5 noyabr 2026** | Cari isti oxu otağı dizaynı quruldu: kitab rəfi fotosu, kataloq kartı və aydın əlavə etmə seçimləri. Kitabxanada ayrıca filtr paneli və telefonda yığılan filtrlər yaradıldı. Bölgə/Bakı saat qurşağı əsasında dil təklifi düzəldildi; dil seçimi açıq təsdiqdən sonra yadda saxlanır. Noto Serif fontuna keçilərək **Ə/ə** və Kiril hərfləri yoxlandı. | [`6007454`](https://github.com/AliyevaNargiz/sayfa-digital-library/commit/6007454ac90f6a90249356b599f5238b5db71087) |
| **7 noyabr 2026** | **CSV endirmə və toplu idxal** əlavə edildi: kitab məlumatları, qeydlər, kateqoriyalar, tarixlər və oxu/borcvermə vəziyyəti daşınır. Sətir yoxlaması, təkrarlanan qeydlərin ötürülməsi, idxalı dayandırma və eyni CSV ilə davam etmə hazırlandı. | [`00afecf`](https://github.com/AliyevaNargiz/sayfa-digital-library/commit/00afecf88a851c8cd14f0066b69d3a43a886d771) |
| **7 noyabr 2026** | **Google ilə giriş** Firebase Authentication vasitəsilə qoşuldu. Eyni təsdiqlənmiş e-poçtla mövcud hesabın saxlanması yoxlandı. Aktiv olmayan e-poçt/şifrə forması gizlədildi. Bu mərhələdə 42 avtomatik test keçdi. | [`41713a8`](https://github.com/AliyevaNargiz/sayfa-digital-library/commit/41713a8958571fac6157bf364885213064e060a4) |
| **7 noyabr 2026** | Bütün mənbə kodunun və əvvəlki Sayfa commit-lərinin bu GitHub deposuna köçürülməsi, Azərbaycan dilində aktual README və tarixçə, gələcək dəyişiklikləri GitHub-a göndərmə qaydası hazırlandı. | Bu README-ni əlavə edən commit |

Sonrakı tamamlanmış dəyişikliklər də bu cədvələ real tarixləri ilə əlavə edilməlidir. Tam commit siyahısı: [GitHub tarixçəsi](https://github.com/AliyevaNargiz/sayfa-digital-library/commits/main/).

## Hazırda nələr işləyir?

- **Vahid kataloq:** fiziki və rəqəmsal kitabların hamısı bir yerdə görünür; ümumi, fiziki, rəqəmsal və oxunmuş kitab sayları ayrıca hesablanır.
- **Şəxsi hesablar:** Google ilə giriş, hər istifadəçi üçün ayrı kitabxana, profil və istifadə göstəriciləri. İlk qeydiyyatdan keçən şəxs avtomatik idarəçi olmur.
- **Əl ilə əlavə etmə:** kitab adı, müəllif, ISBN, nəşriyyat, il, dil, səhifə, kateqoriya, rəf, təsvir və şəxsi qeydlər.
- **Avtomatik məlumat axtarışı:** ad və ya ISBN ilə kataloqlardan müəllif, üz qabığı və digər məlumatların tapılması. Məlumat tapılmadıqda uydurulmur; istifadəçi hər xananı dəyişə bilər.
- **Foto ilə əlavə etmə:** telefon kamerası və ya qalereyadan bir neçə şəkil; Tesseract.js mətni cihazda oxuyur, tapılan kitablar saxlanmadan əvvəl yoxlanır. OCR hazırda türk və ingilis dili modellərindən istifadə edir. İnterfeys dilini dəyişmək OCR modelini avtomatik dəyişmir.
- **Rəqəmsal sənədlər:** PDF, EPUB və dəstəklənən ofis/mətn fayllarının toplu yüklənməsi, məlumat/mətn/önizləmə çıxarılması və təkrarlanan faylların ötürülməsi. İdxal dayandırıla bilir; yeni proses əvvəlki fayl adlarını təmizləyir.
- **Kitabxana idarəetməsi:** kateqoriyalar, axtarış, format və oxu filtrləri, sıralama, siyahı/üz qabığı görünüşü, toplu silmə və oxunub kimi işarələmə. Əməliyyatdan sonra seçim rejimi avtomatik bağlanır.
- **Borcvermə:** borc alan şəxs, verilmə və qaytarılma tarixləri, qaytarılmış kitabın qeyd edilməsi.
- **Oxu bələdçisi:** öz kitablarının adları, təsvirləri və oxuna bilən sənəd mətnlərində mövzu uyğunlaşdırılması. **Generativ AI qoşulmayıb.** Taranmış PDF-lərə avtomatik OCR tətbiq edilmir.
- **Dörd dil:** Azərbaycan, türk, ingilis və rus. İlk ziyarətdə bölgə/cihaz əsasında təklif, sonra istifadəçinin təsdiqlənmiş seçimi. Kitab adları və istifadəçi məzmunu orijinal dilində qalır.
- **Uyğunlaşan PWA:** telefon, planşet və kompüter üçün düzən, ana ekrana əlavə olunan ikon, azaldılmış hərəkət seçiminə uyğun animasiyalar. Kitabxana üçün internet lazımdır; şəxsi sənədlər service worker vasitəsilə oflayn keşlənmir.
- **CSV/JSON:** kitab məlumatlarının endirilməsi, CSV ilə toplu bərpa, yoxlama və dayandırma. CSV/JSON orijinal PDF/EPUB fayllarının özünü daşımır.

## Məlumatlar harada saxlanır?

| Məlumat | Yer |
| --- | --- |
| Kitab qeydləri, kateqoriyalar, qeydlər, profil və istifadə miqdarı | Canlı sayta bağlı **Cloudflare D1** bazası |
| Yüklənmiş sənədlər və şəxsi üz qabığı önizləmələri | Canlı sayta bağlı **Cloudflare R2** fayl deposu |
| Google girişi | **Firebase Authentication** |
| İnterfeys dili seçimi | İstifadəçinin brauzerində local storage |
| Yerli inkişaf məlumatları | `.data/library.sqlite` və `.data/files/` |

**GitHub mənbə kodunun tarixçəsidir; canlı kitabxananın bazası deyil.** Başqa cihazda eyni hesabla daxil olanda serverdəki həmin kitabxana açılır. Adi kod yeniləməsi üçün kitabları yenidən əlavə etmək lazım deyil: eyni D1/R2 bağlarını saxlamaq lazımdır.

Bu depoya canlı bazalar, istifadəçi qeydləri, yüklənmiş şəxsi sənədlər, giriş tokenləri və runtime məxfi ayarları daxil edilmir. `data/` qovluğundakı başlanğıc kataloq faylları boşdur; Ahmadın şəxsi kolleksiyası ilə doldurulmur.

Standart başlanğıc limitləri: **200 hesab**, hər hesaba **1.000 kitab və 100 MB fayl**, tətbiq üzrə **10.000 kitab və 1.000 MB fayl**. Dəyişənlər: `MAX_USERS`, `MAX_USER_BOOKS`, `MAX_TOTAL_BOOKS`, `MAX_USER_STORAGE_MB`, `MAX_TOTAL_STORAGE_MB`. Bunlar tətbiqin tutum limitləridir; provayderin limitsiz və ya daimi pulsuz xidmət zəmanəti deyil.

## Yerli kompüterdə işə salmaq

**Node.js 24+** tələb olunur. Mənbə ZIP-i yaratmaq üçün əlavə olaraq Python 3 lazımdır.

```sh
git clone https://github.com/AliyevaNargiz/sayfa-digital-library.git
cd sayfa-digital-library
npm ci
npm run build:client
npm start
```

Brauzerdə **http://127.0.0.1:3000** açılır. Başlanğıc kitabxana boşdur. Yerli inkişaf rejimi etibarlı tək istifadəçi üçündür; kimlik xidməti qurmadan onu internetə açmayın.

```sh
npm test
```

Son tətbiq dəyişiklikləri üzrə **42 avtomatik test** keçib: hesablararası ayrılıq, icazələr, saxlama limitləri, migration, token yoxlaması, CSV və interfeys axınları. Gerçək Google hesabı ilə ilk giriş, telefon kamerası və cihazda PWA quraşdırılması ayrıca istifadəçi/cihaz yoxlaması tələb edir.

Yerli ehtiyat nüsxə üçün serveri dayandırıb `.data` qovluğunu bütöv kopyalayın.

## Kodun quruluşu

| Yol | Vəzifə |
| --- | --- |
| `public/index.html`, `public/style.css`, `public/app.js` | Səhifələr, dizayn və interfeys əməliyyatları |
| `public/i18n.js`, `public/messages.js` | Dil təklifi, seçim və tərcümələr |
| `public/auth-ui.js`, `client/auth-client.mjs` | Google/Firebase giriş interfeysi və SDK |
| `worker.mjs`, `hosted-entry.mjs`, `selfhost-entry.mjs` | API və yerləşdirmə giriş nöqtələri |
| `server.mjs`, `local-bucket.mjs` | Yerli SQLite və fayl saxlama |
| `identity-service.mjs`, `account-service.mjs` | Hesab kimliyi, profil və idarəetmə |
| `book-data.mjs`, `category-service.mjs`, `quota-service.mjs` | Qeyd yoxlaması, kateqoriyalar və limitlər |
| `metadata-service.mjs`, `cover-service.mjs`, `description-service.mjs` | Kitab/üz qabığı axtarışı və təsvirlər |
| `digital-service.mjs`, `photo-service.mjs` | Şəxsi sənəd və foto önizləməsi |
| `client/file-metadata.mjs`, `client/ocr-reader.mjs` | Sənəd təhlili və cihazda OCR |
| `csv-library.mjs`, `csv-transfer-service.mjs`, `client/library-transfer.mjs` | CSV çevirmə, endirmə və idxal |
| `assistant-service.mjs` | Mətn/mövzu uyğunlaşdırılması |
| `locale-service.mjs` | Hosting ölkə məlumatından dil üçün ipucu |
| `db/schema.ts`, `drizzle/`, `migrations/` | Baza sxemi və migration faylları |
| `test/` | API və interfeys testləri |
| `scripts/` | Yığma, mənbə paketi və lokal başlatma |

İnterfeys **vanilla JavaScript, HTML və CSS**, server **JavaScript ES modules / Cloudflare Workers**, baza **SQLite/D1** üzərindədir. Şəma/migration üçün Drizzle, brauzer modulları üçün esbuild, OCR üçün Tesseract.js, PDF üçün PDF.js istifadə olunur. React/Next.js istifadə edilmir.

`node_modules`, `dist` və yığılmış üçüncü tərəf brauzer paketləri Git-də saxlanmır; bunlar `npm ci` və `npm run build:client` ilə yaradılır. Onları yaradan bütün mənbə kodu, `package.json` və kilid faylı depodadır.

## Google və runtime ayarları

Aşağıdakı dəyərlər hostingin runtime ayarlarında verilir; real dəyərlər Git-ə yazılmır:

- `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_APP_ID` — Firebase web konfiqurasiyası.
- `FIREBASE_EMAIL_PASSWORD_ENABLED=true` — yalnız həmin Firebase provayderi ayrıca aktivdirsə e-poçt/şifrə formasını göstərir. Standart olaraq gizlidir.
- `APP_OWNER_EMAIL` — təsdiqlənmiş tətbiq sahibinin e-poçtu; serverdə məxfi ayardır.

Firebase konfiqurasiyası olmayan **Sites** nüsxəsində platformanın ChatGPT girişi ehtiyat rejim kimi istifadə olunur. Eyni təsdiqlənmiş e-poçtla Google girişi mövcud Sayfa hesabına bağlanır. İstifadəçi göndərdiyi məlumatla özünü idarəçi edə bilmir.

Addımlar: [Firebase və saxlama təlimatı](FIREBASE-SETUP.md). Tətbiq Analytics SDK-sını başlatmır; kitablar Firestore/Firebase Storage-a avtomatik köçürülmür.

## Yerləşdirmə

Canlı Sites layihəsinin kimliyi `.openai/hosting.json` faylındadır. Mövcud layihəni yeniləyərkən bu kimliyi, `DB` və `BUCKET` bağlarını qoruyun. GitHub-a push etmək mövcud saytı öz-özünə yayımlamır.

Öz Cloudflare hesabınız üçün `wrangler.jsonc` daxilində D1 baza ID-sini və R2 bucket ayarlarını uyğunlaşdırın, Firebase/runtime ayarlarını qurun, yeni migration-ları tətbiq edin və yerləşdirin:

```sh
npm run build:client
npm run db:remote
npm run deploy
```

GitHub Pages təkbaşına bu server API-sini, şəxsi bazanı və fayl deposunu işə sala bilmir. Əvvəl tətbiq olunmuş SQL migration-larını dəyişməyin; yeni sxem dəyişikliyi üçün yeni migration əlavə edin. Bəzi daxili fayl/bucket adlarında layihənin əvvəlki `necle-library` adı qalıb; mövcud saxlama bağlarını kor-koranə dəyişməyin.

## Kitabxananı CSV ilə köçürmək

**Hesabım → Kitabxananı özünlə apar → CSV endir / CSV yüklə**.

CSV-də kitab məlumatları, çoxsətirli təsvir və qeydlər, kateqoriyalar, oxu/borcvermə vəziyyəti, tarixlər və çıxarılmış sənəd mətni saxlanır. Unicode və Ə/ə hərfləri qorunur. İdxaldan əvvəl xətalı sətirlər göstərilir. Hədd: **20 MB və 1.000 kitab**.

Eyni Sayfa ID-si olan kitablar yenidən yazılmır. ID-siz CSV üçün sabit kimlik yaradılır; eyni faylı təkrar yükləmək təhlükəsiz davam etməyə imkan verir. Ayrı kimlikli eyni kitab nüsxələri ayrıca qala bilər. Başqa tətbiq bu CSV sütunlarını dəstəkləməli və ya uyğunlaşdırmalıdır.

**CSV/JSON orijinal PDF/EPUB fayllarını və yüklənmiş üz qabığı şəkillərini daşımır.** CSV-də fayl adları məlumat üçün olur; orijinalları ayrıca köçürün. Köhnə serverə bağlı şəxsi üz qabığı linkləri idxal edilmir. CSV şəxsi qeydləri və borc alanların adlarını da daşıya bilər.

## Hər dəyişiklikdən sonra GitHub-a göndərmək

Bu layihənin GitHub deposu `AliyevaNargiz/sayfa-digital-library`-dir. Gələcək tamamlanmış dəyişikliklərdə README tarixçəsi və aidiyyəti sənədlər yenilənməli, uyğun yoxlamalar aparılmalı və yeni commit göndərilməlidir:

```sh
git add .
git commit -m "Edilən dəyişikliyin qısa təsviri"
git push github main
```

Bu iş sahəsində `github` bu depoya, `origin` isə Sites-in ayrıca mənbə deposuna aiddir. GitHub-dan yeni clone etdikdə GitHub uzaq deposunun adı adətən `origin` olur; onda `git push origin main` istifadə edilir. Canlı sayt üçün ayrıca Sites yığma/yayımlama axını qalır.

Bu qayda gələcək agent işi üçün [AGENTS.md](AGENTS.md) faylında da qeyd edilir. Saytda istifadəçinin əlavə etdiyi kitablar mənbə kodu dəyişikliyi deyil və GitHub-a avtomatik push edilmir.

Əlavə sənədlər: [qısa başlanğıc](START-HERE.md), [Firebase təlimatı](FIREBASE-SETUP.md), [ətraflı türk dilli təlimat](docs/README.tr.md).

Font lisenziyaları `public/fonts/` daxilindədir. Kitab üz qabıqları və fotoşəkillərin hüquqları öz sahiblərinə məxsusdur.

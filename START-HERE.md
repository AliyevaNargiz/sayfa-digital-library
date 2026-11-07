# Sayfa — qısa başlanğıc

Canlı tətbiq: https://sayfa-kitaplik.ahmadnargizgpt.chatgpt.site

GitHub mənbəyini kompüterdə işə salmaq üçün Node.js 24+ quraşdırıb layihə qovluğunda işlədin:

```sh
npm ci
npm run build:client
npm start
```

http://127.0.0.1:3000 açılır. Yerli inkişaf rejimi etibarlı tək istifadəçi üçündür; internetdə çoxistifadəçili nüsxə üçün kimlik xidməti və D1/R2 qurulmalıdır. Canlı Sayfa Google/Firebase girişi istifadə edir; Firebase konfiqurasiyası olmayan Sites nüsxəsində ChatGPT girişi ehtiyat rejimdir.

Yeni kitabxana boş başlayır. Kitabı əl ilə, ad/ISBN axtarışı ilə, bir neçə üz qabığı fotosundan və ya rəqəmsal fayl kimi əlavə etmək mümkündür. Saxlamadan əvvəl avtomatik tapılan məlumatları yoxlayın.

CSV üçün **Hesabım → Kitabxananı özünlə apar** bölməsindən istifadə edin. CSV/JSON sənəd fayllarının özünü daşımır. Yerli bazanı və sənədləri tam saxlamaq üçün server dayandırılmış vəziyyətdə `.data` qovluğunu bütöv yedəkləyin.

Ətraflı xüsusiyyətlər, tarixçə, quraşdırma və GitHub qaydası: [README.md](README.md). Google konfiqurasiyası: [FIREBASE-SETUP.md](FIREBASE-SETUP.md).

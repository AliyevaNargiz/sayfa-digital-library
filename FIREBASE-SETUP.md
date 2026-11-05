# Optional email and Google login

Sayfa currently uses ChatGPT Sites’ managed ChatGPT sign-in. No Firebase project is connected. Firebase is an optional identity provider for direct email/password and Google sign-in; it is not needed for the current library to work.

## Where information lives

| Information | Current location | With optional Firebase login |
| --- | --- | --- |
| Book records, categories, notes, app profiles | Managed Cloudflare D1 database attached to this Site | Same D1 database |
| PDFs, EPUBs, documents, private cover previews | Managed Cloudflare R2 bucket attached to this Site | Same R2 bucket |
| Sign-in credentials | Managed ChatGPT sign-in provider | Firebase Authentication |
| Interface language preference | This browser’s local storage | Same browser preference |

Signing in to the same account on another device opens the same server-side library. Private records are not stored in the source-code ZIP or cached for offline reading. This is an installable web app (PWA), not an App Store/Play Store native package; it needs an internet connection for the library.

## Connect Firebase Authentication

1. Open https://console.firebase.google.com/ using the Google account that should own the project. Choose **Create a project**. Analytics is optional.
2. Open **Build → Authentication → Get started → Sign-in method**. Enable **Email/Password** and, if wanted, **Google**. Choose a support email for Google login.
3. Under **Authentication → Settings → Authorized domains**, add `sayfa-kitaplik.ahmadnargizgpt.chatgpt.site` and any future custom domain. Do not include `https://` or a path.
4. Open **Project settings → General → Your apps → Add app → Web**. Register Sayfa. Firebase Hosting is not required; the app already has hosting.
5. The web app configuration contains `apiKey`, `projectId`, `authDomain`, and `appId`. Configure these on the existing Site as runtime variables named `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, and `FIREBASE_APP_ID`, then deploy a new version. The web config is public client configuration, not a service-account private key. Never post a service-account JSON or private key in chat.
6. Test a new email registration, verification link, password reset, Google sign-in, sign-out, and a private file download on a real phone. Test two accounts to confirm independent libraries. Set the project’s password policy to at least 12 characters and review provider quotas.

Sayfa switches to Firebase only when the required runtime variables exist. Its prepared client uses the official Firebase SDK; its server verifies signed ID tokens and requires verified email. Existing app accounts link only through the same verified email. Do not enable a new provider without checking account mapping and the owner’s verified email first.

The Google project remains yours. It can have free-tier limits, provider restrictions, and future pricing changes; this document is not a promise of unlimited free authentication or storage. No Firebase Firestore, Firebase Storage, or paid subscription is required by this implementation.

## Multi-country use

The first visit suggests a language from browser settings, not location tracking: English, Türkçe, Azərbaycan dili, Русский. Native names and sample national flags identify the choices. The menu can change the choice later. Unsupported browser languages fall back to English. More locales can be added to `public/messages.js` and `public/i18n.js`.

The interface is translated; book titles, user-created categories, descriptions, notes, recognized OCR text, and filenames stay in their original language. OCR currently reads Turkish and English; choosing another interface language does not add a new OCR model or a translation service. No generative AI is connected.

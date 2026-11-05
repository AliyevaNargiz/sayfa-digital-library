// Keep the library online and private: never cache records, files, or sign-in pages.
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).catch(()=>new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sayfa</title><style>body{background:#f3ede2;color:#50392b;font:18px/1.7 Georgia,serif;max-width:440px;padding:18vh 28px;margin:auto}h1{font-weight:normal}a{color:#955b43}</style><h1>Your books are waiting.</h1><p>You are offline. Reconnect to open your library. Your saved books and files stay in your account.</p><p><a href="/">Try again</a></p></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});

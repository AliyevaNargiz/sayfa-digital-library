'use strict';
window.addEventListener('beforeinstallprompt',event=>event.preventDefault());
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});

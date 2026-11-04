'use strict';
(()=>{
 const button=document.getElementById('install-app'),dialog=document.getElementById('install-dialog');let prompt;
 const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone;
 const update=()=>{button.hidden=!!standalone();};update();
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;button.textContent='Kütüphane uygulamasını yükle';update();});
 window.addEventListener('appinstalled',()=>{prompt=null;button.hidden=true;if(dialog.open)dialog.close();});
 button.addEventListener('click',async()=>{if(prompt){const current=prompt;prompt=null;try{await current.prompt();const choice=await current.userChoice;if(choice.outcome==='accepted'){button.hidden=true;return;}}catch{}}if(!dialog.open)dialog.showModal();});
 document.getElementById('close-install').addEventListener('click',()=>dialog.close());
 if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
})();

import app from './worker.mjs';
import assets from './hosted-assets.json' with {type:'json'};
export default {async fetch(request,env,ctx){
 if(!request.headers.get('oai-authenticated-user-id'))return new Response('Özel kütüphanenizi açmak için giriş yapın.',{status:401});
 const path=new URL(request.url).pathname;
 if(path==='/api/session')return Response.json({authenticated:true,local:false,passwordProtected:false},{headers:{'Cache-Control':'no-store'}});
 if(path==='/api/logout')return Response.json({error:'Bu kütüphane ChatGPT girişinizle korunur. İşiniz bitince sekmeyi kapatabilirsiniz.'},{status:400});
 return app.fetch(request,{...env,LOCAL_DEV:true,ASSETS:{async fetch(req){
  const path=new URL(req.url).pathname;
  const asset=assets[path==='/'?'/index.html':path];
  if(!asset)return new Response('Not found',{status:404});
  return new Response(asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{'Content-Type':asset.type}});
 }}},ctx);
}};

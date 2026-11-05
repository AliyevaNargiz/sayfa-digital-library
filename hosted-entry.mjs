import app from './worker.mjs';
import assets from './hosted-assets.json' with {type:'json'};
export default {async fetch(request,env,ctx){
 return app.fetch(request,{...env,HOSTED:true,LOCAL_DEV:false,ASSETS:{async fetch(req){
  let path=new URL(req.url).pathname;if(['/login','/register','/library','/guide','/account','/admin','/privacy','/auth/complete'].includes(path))path='/index.html';
  const asset=assets[path==='/'?'/index.html':path];
  if(!asset)return new Response('Not found',{status:404});
  return new Response(asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{'Content-Type':asset.type}});
 }}},ctx);
}};

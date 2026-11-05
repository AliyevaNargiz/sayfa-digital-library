const cookieName='__Host-sayfa_identity';
let keyCache={expires:0,fetchedAt:0,keys:[]};
const decode=value=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
const normalized=email=>String(email||'').trim().toLocaleLowerCase('en-US');
export const authMode=env=>env.FIREBASE_PROJECT_ID&&env.FIREBASE_API_KEY&&env.FIREBASE_AUTH_DOMAIN?'firebase':env.HOSTED?'chatgpt':'local';
export function publicAuthConfig(env){return {provider:authMode(env),firebase:authMode(env)==='firebase'?{apiKey:env.FIREBASE_API_KEY,authDomain:env.FIREBASE_AUTH_DOMAIN,projectId:env.FIREBASE_PROJECT_ID,appId:env.FIREBASE_APP_ID||undefined}:null,passwordProtected:!!env.APP_PASSWORD,signInPath:'/signin-with-chatgpt',signOutPath:'/signout-with-chatgpt'};}
export async function verifyFirebaseToken(token,projectId,fetcher=fetch){
 try{
  if(typeof token!=='string'||token.length>12000)return null;const parts=token.split('.');if(parts.length!==3)return null;const header=decode(parts[0]),payload=decode(parts[1]),now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||payload.iss!=='https://securetoken.google.com/'+projectId||payload.aud!==projectId||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+60||payload.auth_time>now+60)return null;
  if(fetcher!==fetch||keyCache.expires<Date.now()||(!keyCache.keys.some(k=>k.kid===header.kid)&&Date.now()-(keyCache.fetchedAt||0)>60000)){const response=await fetcher('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',{signal:AbortSignal.timeout(8000)});if(!response.ok)return null;const data=await response.json();if(!Array.isArray(data.keys))return null;keyCache={keys:data.keys,expires:Date.now()+3600000,fetchedAt:Date.now()};}
  const jwk=keyCache.keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)return null;const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);const signature=Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,new TextEncoder().encode(parts[0]+'.'+parts[1])))return null;
  if(payload.email_verified!==true||typeof payload.email!=='string')return null;
  return {provider:'firebase',subject:payload.sub,email:normalized(payload.email),emailVerified:true,name:typeof payload.name==='string'?payload.name:'',expires:payload.exp,token};
 }catch{return null;}
}
export async function requestIdentity(request,env){
 if(authMode(env)==='firebase'){const bearer=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1],cookie=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);return verifyFirebaseToken(bearer||cookie,env.FIREBASE_PROJECT_ID,env.AUTH_FETCH||fetch);}
 if(env.HOSTED){const id=request.headers.get('oai-authenticated-user-id');if(!id)return null;let name=request.headers.get('oai-authenticated-user-full-name')||'';if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8')try{name=decodeURIComponent(name);}catch{name='';}return {provider:'chatgpt',subject:id,email:normalized(request.headers.get('oai-authenticated-user-email')),emailVerified:true,name};}
 if(env.TEST_IDENTITY_RESOLVER)return env.TEST_IDENTITY_RESOLVER(request);
 if(env.TEST_IDENTITY)return env.TEST_IDENTITY;
 if(env.LOCAL_DEV&&!env.APP_PASSWORD)return {provider:'local',subject:'developer',email:'',emailVerified:true,name:'Yerel kullanıcı'};
 return null;
}
export function identityCookie(identity){return cookieName+'='+identity.token+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+Math.max(0,Math.min(3600,identity.expires-Math.floor(Date.now()/1000)));}
export const clearIdentityCookie=()=>cookieName+'=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
export const isAdministrator=(identity,env)=>!!identity?.emailVerified&&!!env.APP_OWNER_EMAIL&&normalized(identity.email)===normalized(env.APP_OWNER_EMAIL);
export async function findUser(identity,env){
 if(!identity)return null;let user=await env.DB.prepare('SELECT u.* FROM users u JOIN identities i ON i.user_id=u.id WHERE i.provider=? AND i.subject=?').bind(identity.provider,identity.subject).first();
 if(!user&&identity.emailVerified&&identity.email){user=await env.DB.prepare('SELECT * FROM users WHERE normalized_email=?').bind(normalized(identity.email)).first();if(user)await env.DB.prepare('INSERT INTO identities (provider,subject,user_id) VALUES (?,?,?) ON CONFLICT(provider,subject) DO NOTHING').bind(identity.provider,identity.subject,user.id).run();}
 return user;
}
export function userDescriptor(user,identity,env){return user?{id:user.id,email:user.email||identity?.email||'',displayName:user.display_name,createdAt:user.created_at,isAdmin:isAdministrator(identity,env)}:null;}
export async function registerUser(identity,displayName,env){
 const old=await findUser(identity,env);if(old)return old;
 const name=String(displayName||identity.name||'Okur').trim();if(!name||name.length>100)throw Error('Adınız 1–100 karakter olmalıdır.');const date=new Date().toISOString(),id=crypto.randomUUID(),email=identity.email?normalized(identity.email):'identity:'+identity.provider+':'+identity.subject,max=Math.max(1,Number(env.MAX_USERS)||200);
 await env.DB.prepare('INSERT INTO users (id,email,normalized_email,display_name,created_at,last_seen) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM users) < ? ON CONFLICT(normalized_email) DO NOTHING').bind(id,identity.email||null,email,name,date,date,max).run();
 const user=await env.DB.prepare('SELECT * FROM users WHERE id=? OR normalized_email=?').bind(id,email).first();if(!user)throw Object.assign(Error('Yeni hesaplar için başlangıç kapasitesi doldu. Lütfen daha sonra tekrar deneyin.'),{status:503});
 await env.DB.prepare('INSERT INTO identities (provider,subject,user_id) VALUES (?,?,?) ON CONFLICT(provider,subject) DO NOTHING').bind(identity.provider,identity.subject,user.id).run();
 return user;
}
export async function claimLegacyLibrary(user,identity,env){
 if(identity.provider!=='local'&&!isAdministrator(identity,env))return;
 await env.DB.batch(['books','digital_files','categories'].map(table=>env.DB.prepare('UPDATE '+table+" SET owner_id=? WHERE owner_id='__legacy__'").bind(user.id)));
}

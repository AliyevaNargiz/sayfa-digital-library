import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {publicAuthConfig,registerUser,findUser} from '../identity-service.mjs';
import {startServer,databaseAdapter} from '../server.mjs';
const bindings={HOSTED:true,FIREBASE_PROJECT_ID:'google-test',FIREBASE_API_KEY:'public-test-config',FIREBASE_AUTH_DOMAIN:'google-test.firebaseapp.com'};
test('Google sign-in hides managed sign-in and disabled email/password forms; email can be explicitly enabled',async()=>{
 for(const emailPasswordEnabled of [false,true]){
  const dom=new JSDOM(await readFile(new URL('../public/index.html',import.meta.url),'utf8'),{url:'https://sayfa.example/login',runScripts:'outside-only'}),w=dom.window;let googleCalls=0;
  try{const config=publicAuthConfig({...bindings,FIREBASE_EMAIL_PASSWORD_ENABLED:String(emailPasswordEnabled)});assert.equal(config.provider,'firebase');assert.equal(config.emailPasswordEnabled,emailPasswordEnabled);w.fetch=async()=>Response.json(config);w.__firebase={setupFirebase:async()=>({google:async()=>{googleCalls++;},headers:async()=>({}),logout:async()=>{}})};
   w.eval((await readFile(new URL('../public/auth-ui.js',import.meta.url),'utf8')).replace("import('/auth-client.js')","Promise.resolve(window.__firebase)"));await w.sayfaAuth.ready;
   assert.equal(w.document.querySelector('[data-managed]').hidden,true);assert.equal(w.document.querySelector('[data-firebase]').hidden,false);assert.equal(w.document.getElementById('auth-form').hidden,!emailPasswordEnabled);assert.equal(w.document.querySelector('.auth-divider').hidden,!emailPasswordEnabled);assert.equal(w.document.getElementById('google-login').disabled,false);
   w.document.getElementById('google-login').click();await new Promise(r=>setTimeout(r,0));assert.equal(googleCalls,1);assert.equal(w.document.getElementById('google-login').disabled,false);
  }finally{dom.window.close();}
 }
});
test('verified Google/Firebase email keeps the existing ChatGPT account and private library identity',async()=>{
 const app=await startServer({port:0,dbPath:':memory:'});try{const env={DB:databaseAdapter(app.db)},old={provider:'chatgpt',subject:'old-person',email:'reader@example.test',emailVerified:true,name:'Reader'},existing=await registerUser(old,'Reader',env);
  const linked=await findUser({provider:'firebase',subject:'google-uid',email:'READER@example.test',emailVerified:true,name:'Google Reader'},env);assert.equal(linked.id,existing.id);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
  assert.equal(await findUser({provider:'firebase',subject:'unverified',email:'reader@example.test',emailVerified:false},env),null);assert.equal(await findUser({provider:'firebase',subject:'other',email:'other@example.test',emailVerified:true},env),null);
 }finally{await new Promise(r=>app.server.close(r));app.db.close();}
});

await import('./build-client.mjs');
const {execFileSync}=await import('node:child_process');execFileSync('python3',['scripts/package-source.py'],{stdio:'inherit'});
import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
const assets={};
for(const [name,type] of Object.entries({'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8','file-metadata.js':'text/javascript; charset=utf-8','pdf.worker.mjs':'text/javascript; charset=utf-8','style.css':'text/css; charset=utf-8','icon.svg':'image/svg+xml','install-app.js':'text/javascript; charset=utf-8','sw.js':'text/javascript; charset=utf-8','manifest.webmanifest':'application/manifest+json','ocr-reader.js':'text/javascript; charset=utf-8','tesseract-worker.js':'text/javascript; charset=utf-8','auth-client.js':'text/javascript; charset=utf-8','auth-ui.js':'text/javascript; charset=utf-8','messages.js':'text/javascript; charset=utf-8','i18n.js':'text/javascript; charset=utf-8','motion.js':'text/javascript; charset=utf-8','fonts.css':'text/css; charset=utf-8','brand-mark.svg':'image/svg+xml'})){
 let body=await readFile('public/'+name,'utf8');
 if(name==='index.html')body=body.replace('id="lock-button"','id="lock-button" hidden');
 assets['/'+name]={body,type};
}
for(const name of await readdir('public/fonts'))assets['/fonts/'+name]={body:(await readFile('public/fonts/'+name)).toString('base64'),type:name.endsWith('.ttf')?'font/ttf':name.endsWith('.woff2')?'font/woff2':'text/plain',encoding:'base64'};
for(const name of await readdir('public/flags'))assets['/flags/'+name]={body:await readFile('public/flags/'+name,'utf8'),type:'image/svg+xml'};
for(const name of ['app-icon-192.png','app-icon-512.png'])assets['/'+name]={body:(await readFile('public/'+name)).toString('base64'),type:'image/png',encoding:'base64'};
assets['/necle-library-source.zip']={body:(await readFile('public/necle-library-source.zip')).toString('base64'),type:'application/zip',encoding:'base64'};
assets['/reading-room.jpg']={body:(await readFile('public/reading-room.jpg')).toString('base64'),type:'image/jpeg',encoding:'base64'};
for(const name of await readdir('public/covers').catch(()=>[])){if(/^ahmed-collection-\d{3}\.jpg$/.test(name))assets['/covers/'+name]={body:(await readFile('public/covers/'+name)).toString('base64'),type:'image/jpeg',encoding:'base64'};}
await writeFile('hosted-assets.json',JSON.stringify(assets));
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['hosted-entry.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
const {cp}=await import('node:fs/promises');await cp('drizzle','dist/drizzle',{recursive:true});

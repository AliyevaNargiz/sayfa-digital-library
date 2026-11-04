const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validate=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>80)throw Error('Kategori adı 1–80 karakter olmalıdır.');return value.trim();};
const key=value=>value.normalize('NFKC').toLocaleLowerCase('tr-TR');
export async function categoryRequest(request,env){
 const path=new URL(request.url).pathname,match=path.match(/^\/api\/categories\/([a-zA-Z0-9-]{1,80})$/);
 if(path==='/api/categories'&&request.method==='GET'){const {results}=await env.DB.prepare('SELECT id,name FROM categories ORDER BY name').all();return json(results);}
 if(path==='/api/categories'&&request.method==='POST'){
  const {name:input}=await request.json(),name=validate(input);if(await env.DB.prepare('SELECT id FROM categories WHERE normalized = ?').bind(key(name)).first())return json({error:'Bu kategori zaten var.'},409);
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO categories (id,name,normalized) VALUES (?,?,?)').bind(id,name,key(name)).run();return json({id,name},201);
 }
 if(match&&['PUT','DELETE'].includes(request.method)){
  const old=await env.DB.prepare('SELECT id,name FROM categories WHERE id = ?').bind(match[1]).first();if(!old)return json({error:'Kategori bulunamadı.'},404);
  const name=request.method==='PUT'?validate((await request.json()).name):'';
  if(name){const existing=await env.DB.prepare('SELECT id FROM categories WHERE normalized = ?').bind(key(name)).first();if(existing&&existing.id!==old.id)return json({error:'Bu kategori zaten var.'},409);}
  await env.DB.batch([env.DB.prepare("UPDATE books SET data=json_set(data,'$.genre',?) WHERE json_extract(data,'$.genre') = ?").bind(name,old.name),name?env.DB.prepare('UPDATE categories SET name=?,normalized=? WHERE id=?').bind(name,key(name),old.id):env.DB.prepare('DELETE FROM categories WHERE id=?').bind(old.id)]);
  return json(name?{id:old.id,name}:{ok:true});
 }
 return json({error:'İşlem bulunamadı.'},404);
}

import {changed} from './quota-service.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validate=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>80)throw Error('Kategori adı 1–80 karakter olmalıdır.');return value.trim();};
const key=value=>value.normalize('NFKC').toLocaleLowerCase('tr-TR');
export async function categoryRequest(request,env){
 const path=new URL(request.url).pathname,match=path.match(/^\/api\/categories\/([a-zA-Z0-9-]{1,80})$/);
 if(path==='/api/categories'&&request.method==='GET'){const {results}=await env.DB.prepare('SELECT id,name FROM categories WHERE owner_id=? ORDER BY name').bind(env.USER.id).all();return json(results);}
 if(path==='/api/categories'&&request.method==='POST'){
  const {name:input}=await request.json(),name=validate(input);if(await env.DB.prepare('SELECT id FROM categories WHERE normalized = ? AND owner_id=?').bind(key(name),env.USER.id).first())return json({error:'Bu kategori zaten var.'},409);
  const id=crypto.randomUUID();const result=await env.DB.prepare('INSERT INTO categories (id,name,normalized,owner_id) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM categories WHERE owner_id=?)<100').bind(id,name,key(name),env.USER.id,env.USER.id).run();if(!changed(result))throw Object.assign(Error('En fazla 100 kategori oluşturabilirsiniz.'),{status:413});return json({id,name},201);
 }
 if(match&&['PUT','DELETE'].includes(request.method)){
  const old=await env.DB.prepare('SELECT id,name FROM categories WHERE id = ? AND owner_id=?').bind(match[1],env.USER.id).first();if(!old)return json({error:'Kategori bulunamadı.'},404);
  const name=request.method==='PUT'?validate((await request.json()).name):'';
  if(name){const existing=await env.DB.prepare('SELECT id FROM categories WHERE normalized = ? AND owner_id=?').bind(key(name),env.USER.id).first();if(existing&&existing.id!==old.id)return json({error:'Bu kategori zaten var.'},409);}
  await env.DB.batch([env.DB.prepare("UPDATE books SET data=json_set(data,'$.genre',?) WHERE json_extract(data,'$.genre') = ? AND owner_id=?").bind(name,old.name,env.USER.id),name?env.DB.prepare('UPDATE categories SET name=?,normalized=? WHERE id=? AND owner_id=?').bind(name,key(name),old.id,env.USER.id):env.DB.prepare('DELETE FROM categories WHERE id=? AND owner_id=?').bind(old.id,env.USER.id)]);
  return json(name?{id:old.id,name}:{ok:true});
 }
 return json({error:'İşlem bulunamadı.'},404);
}

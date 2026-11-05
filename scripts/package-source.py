"""Create the private, runnable source ZIP. Never include runtime data or secrets."""
import json, pathlib, subprocess, sys, zipfile
root=pathlib.Path(__file__).resolve().parent.parent
output=root/'public'/'necle-library-source.zip'
tracked=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
compiled=['public/file-metadata.js','public/pdf.worker.mjs','public/ocr-reader.js','public/tesseract-worker.js','public/auth-client.js']
excluded={'.git','.data','node_modules','dist','.wrangler','__pycache__'}
def allowed(name):
 p=pathlib.PurePosixPath(name)
 return bool(name) and not any(x in excluded for x in p.parts) and not p.is_absolute() and '..' not in p.parts and not name.endswith(('.zip','.sqlite','.sqlite-wal','.sqlite-shm','.pem','.key')) and p.name not in {'.env','.env.local','.env.production','.dev.vars','hosted-assets.json'} and not p.name.startswith('.env.')
files=sorted({name for name in tracked+compiled if allowed(name)})
for name in compiled:
 if not (root/name).is_file():raise SystemExit('Run npm run build:client before packaging.')
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for name in files:
  path=root/name
  if not path.is_file():continue
  if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent!=root):raise SystemExit('Refusing symlink in source package: '+name)
  archive.write(path,'necle-library/'+name)
 for folder in ['pdfjs-dist','fflate','tesseract.js','tesseract.js-core']:
  for path in (root/'node_modules'/folder).glob('LICENSE*'):
   if path.is_file():archive.write(path,'necle-library/THIRD-PARTY-LICENSES/'+folder+'-'+path.name+'.txt')
print(json.dumps({'archive':str(output),'files':len(files),'bytes':output.stat().st_size}))

import subprocess,re,json,zipfile
from pathlib import Path
root=Path('.asset-work/quaternius');root.mkdir(parents=True,exist_ok=True)
cookies=str(root/'cookies')
def curl(url,*args): return subprocess.check_output(['curl','-fLsS','--retry','2','-b',cookies,'-c',cookies,*args,url])
for slug in ['universal-base-characters','modular-character-outfits-fantasy','universal-animation-library']:
 target=root/(slug+'.zip')
 if not target.exists():
  page=curl('https://quaternius.itch.io/'+slug+'/purchase').decode()
  token=re.search(r'name="csrf_token" value="([^"]+)',page).group(1)
  result=json.loads(curl('https://quaternius.itch.io/'+slug+'/download_url','--data-urlencode','csrf_token='+token))
  page=curl(result['url']).decode()
  token=re.search(r'name="csrf_token" value="([^"]+)',page).group(1)
  upload=re.search(r'data-upload_id="(\d+)"',page).group(1)
  result=json.loads(curl('https://quaternius.itch.io/'+slug+'/file/'+upload+'?source=game_download','--data-urlencode','csrf_token='+token))
  curl(result['url'],'-o',str(target))
  print('Downloaded free standard pack:',slug,flush=True)
 with zipfile.ZipFile(target) as z:
  files=[n for n in z.namelist() if n.lower().endswith(('.gltf','.glb','.bin','.png','.jpg','.jpeg','.txt','.md')) and '__MACOSX' not in n and '..' not in Path(n).parts and not Path(n).is_absolute()]
  for n in files:z.extract(n,root/slug)
  print(slug,len(files),'files',flush=True)
for file in root.rglob('*.gltf'):
 document=json.loads(file.read_text());changed=False
 for image in document.get('images',[]):
  original=file.parent/image['uri']
  candidate=original.with_name(original.name.replace('_png.png','.png'))
  if not original.exists() and candidate.exists():
   image['uri']=candidate.name;changed=True
 if changed:file.write_text(json.dumps(document))

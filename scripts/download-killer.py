import hashlib
import html
import re
import subprocess
from pathlib import Path

root = Path('.asset-work/killer')
root.mkdir(parents=True, exist_ok=True)
source = root / 'source'
source.mkdir(exist_ok=True)
packs = [
    ('7i5gexwackl20ag/Demon_-_Game_Ready_Mesh.rar',
     '410df7a238c5f0bffcccdb02e9a6b49fd5b0e6ad5a90a005716972f938f71ab5',
     ['Game Ready Mesh/Demon.fbx']),
    ('laeacdehq5eswcg/Demon_-_Textures.rar',
     'ec23d0b6ee3c228e2de8699608d7310c91c386a1e834a5bdfd1751a33574a184',
     ['Textures/Low Poly_baseTexBaked.jpg', 'Textures/Low Poly_normals.jpg',
      'Textures/SkinMaskBW.jpg']),
]
for index, (link, checksum, files) in enumerate(packs):
    archive = root / f'demon-{index}.rar'
    if not archive.exists():
        page = subprocess.check_output([
            'curl', '-fLsS', '--retry', '2',
            'https://www.mediafire.com/download/' + link,
        ]).decode()
        match = re.search(r'href="(https://download[^"<>]+)"', page)
        if not match:
            raise RuntimeError('Free download link missing; review the original author release.')
        temporary = archive.with_suffix('.partial')
        subprocess.run(['curl', '-fLsS', '--retry', '2', html.unescape(match[1]),
                        '-o', str(temporary)], check=True)
        temporary.rename(archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != checksum:
        raise RuntimeError(f'Source archive changed: {archive}')
    subprocess.run(['bsdtar', '-xf', str(archive), '-C', str(source), *files], check=True)
    print(f'Extracted verified Aaron Neal source pack {index + 1}')

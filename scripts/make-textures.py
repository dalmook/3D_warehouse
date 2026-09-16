"""Deterministic original tileable albedo/normal textures; no external images."""
from PIL import Image
import random,math,pathlib
p=pathlib.Path(__file__).resolve().parents[1]/'assets/textures';p.mkdir(parents=True,exist_ok=True)
r=random.Random(42);n=256
for name,base in [('wood',(159,119,73)),('cardboard',(184,142,91)),('epoxy',(165,171,173))]:
 im=Image.new('RGB',(n,n));normal=Image.new('RGB',(n,n));rough=Image.new('L',(n,n))
 for y in range(n):
  for x in range(n):
   noise=r.uniform(-1,1);grain=math.sin(y*.48+math.sin(x*math.tau/n)*3)*5 if name=='wood' else math.sin(y*math.pi)*2
   value=noise*(3 if name=='epoxy' else 7)+grain
   im.putpixel((x,y),tuple(max(0,min(255,int(c+value))) for c in base))
   normal.putpixel((x,y),(128+int(noise*3),128+int(grain*.7),255));rough.putpixel((x,y),int(180+noise*10))
 im.save(p/(name+'-albedo.png'));normal.save(p/(name+'-normal.png'));rough.save(p/(name+'-roughness.png'))

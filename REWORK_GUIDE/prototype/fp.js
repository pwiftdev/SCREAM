import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function R(seed){ let s=seed>>>0; return ()=>{ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function rgb(h){ const n=parseInt(h.slice(1),16); return [n>>16&255,n>>8&255,n&255]; }
function J(h,k){ const c=rgb(h); return 'rgb('+Math.min(255,c[0]*k|0)+','+Math.min(255,c[1]*k|0)+','+Math.min(255,c[2]*k|0)+')'; }
const FACE16=["HHHHHHHHHHHHHHHH","HHHWWWWWWWWWWHHH","HHWWWWWWWWWWWWHH","HWWWWWWWWWWWWWWH","HWEEEWWWWWWEEEWH","HWEEEEWWWWEEEEWH","HWWEEEWWWWEEEWWH","HWWWEEWWWWEEWWWH","HWWWWWWWWWWWWWWH","HWWWWWWEEWWWWWWH","HWWWWWWWWWWWWWWH","HWWWWWEEEEWWWWWH","HWWWWWEEEEWWWWWH","HHWWWWWEEWWWWWHH","HHWWWWWEEWWWWWHH","HHHWWWWWWWWWWHHH"];

function plankP(a,base,seam){ a.N(base,.18); for(let b=0;b<4;b++){ const y=b*4+3; for(let x=0;x<16;x++) a.P(x,y,seam); const sx=(b*5+3)%16; for(let y2=b*4;y2<b*4+3;y2++) a.P(sx,y2,seam); for(let i=0;i<3;i++) a.P(a.r()*16|0,b*4+(a.r()*3|0),J(base,.8)); } }
function winP(a,frame,c1,c2){ PAINT[frame](a); for(let y=2;y<14;y++) for(let x=2;x<14;x++){ if(x===7||x===8||y===7||y===8) a.P(x,y,'#1c1410'); else a.P(x,y,a.r()<.25?c2:c1,true); } }
function border(a,c){ for(let i=0;i<16;i++){ a.P(i,0,c); a.P(i,15,c); a.P(0,i,c); a.P(15,i,c); } }
const PAINT={
  grass_top:a=>{ a.N('#3a5a2e',.35); for(let i=0;i<22;i++) a.P(a.r()*16|0,a.r()*16|0,'#2c4723'); },
  grass_side:a=>{ a.N('#5a4030',.3); a.N('#3a5a2e',.3,0,0,16,3); for(let x=0;x<16;x++){ const d=a.r()*3|0; for(let y=3;y<3+d;y++) a.P(x,y,J('#3a5a2e',.9)); } },
  dirt:a=>{ a.N('#4f3a2a',.35); for(let i=0;i<14;i++) a.P(a.r()*16|0,a.r()*16|0,'#3a2a1e'); },
  gravel:a=>{ a.N('#5d5650',.55); for(let i=0;i<30;i++) a.P(a.r()*16|0,a.r()*16|0,a.r()<.5?'#3e3a36':'#7a746c'); },
  stone:a=>{ a.N('#6b6d72',.22); for(let i=0;i<6;i++){ let x=a.r()*16|0,y=a.r()*16|0; for(let k=0;k<4;k++){ a.P(x%16,y%16,'#505257'); x+=a.r()<.5?1:0; y+=1; } } },
  mossy:a=>{ PAINT.stone(a); for(let i=0;i<6;i++){ const cx=a.r()*16|0, cy=a.r()*16|0; for(let k=0;k<10;k++) a.P((cx+(a.r()*4|0))%16,(cy+(a.r()*3|0))%16,J('#4c6a3e',1+(a.r()-.5)*.4)); } },
  headstone_face:a=>{ PAINT.stone(a); for(let y=3;y<11;y++){ a.P(7,y,'#3a3c40'); a.P(8,y,'#3a3c40'); } for(let x=5;x<11;x++) a.P(x,5,'#3a3c40'); for(let x=4;x<12;x++) if(a.r()<.6) a.P(x,13,'#46484c'); },
  cobble:a=>{ a.N('#5c5e63',.3); const m='#3d3f43'; [4,9,13].forEach(y=>{ for(let x=0;x<16;x++) a.P(x,y,m); }); [[5,0,4],[11,0,4],[3,5,9],[9,5,9],[13,5,9],[6,10,13],[12,10,13],[2,14,16],[10,14,16]].forEach(([x,y0,y1])=>{ for(let y=y0;y<y1;y++) a.P(x,y,m); }); },
  plank:a=>plankP(a,'#6e4c31','#4a311f'), plank2:a=>plankP(a,'#6b665e','#45413b'), darkplank:a=>plankP(a,'#3e2b1f','#26190f'),
  log_side:a=>{ for(let x=0;x<16;x++){ const c=x%3===0?'#2e2016':'#3f2c1d'; for(let y=0;y<16;y++) a.P(x,y,J(c,1+(a.r()-.5)*.25)); } },
  log_top:a=>{ a.N('#5a4430',.2); border(a,'#3f2c1d'); for(let i=4;i<12;i++){ a.P(i,4,'#47331f'); a.P(i,11,'#47331f'); a.P(4,i,'#47331f'); a.P(11,i,'#47331f'); } },
  roof:a=>{ a.N('#3a2c48',.25); for(let y=0;y<16;y+=4){ for(let x=0;x<16;x++) a.P(x,y+3,'#221a2b'); for(let x=(y/4%2)*4;x<16;x+=8) for(let k=0;k<3;k++) a.P(x,y+k,'#2a2034'); } },
  leaves:a=>{ a.alpha(); for(let y=0;y<16;y++) for(let x=0;x<16;x++) if(a.r()<.5) a.P(x,y,J(a.r()<.5?'#3a3a24':'#4a3b22',1+(a.r()-.5)*.4)); },
  iron:a=>a.N('#2b2c31',.25),
  pumpkin_side:a=>{ for(let x=0;x<16;x++){ const c=(x%4===0)?'#9a4a0e':'#c8641a'; for(let y=0;y<16;y++) a.P(x,y,J(c,1+(a.r()-.5)*.18)); } },
  pumpkin_top:a=>{ PAINT.pumpkin_side(a); for(let y=6;y<10;y++) for(let x=6;x<10;x++) a.P(x,y,'#3d5a28'); },
  pumpkin_face:a=>{ PAINT.pumpkin_side(a); const G='#ffc94a'; [[3,4],[4,4],[3,5],[4,5],[5,5],[4,6],[5,6],[11,4],[12,4],[10,5],[11,5],[12,5],[10,6],[11,6]].forEach(([x,y])=>a.P(x,y,G,true)); a.P(7,8,G,true); a.P(8,8,G,true); for(let x=3;x<13;x++) a.P(x,11,G,true); for(let x=4;x<12;x++) if(x%3!==0) a.P(x,12,G,true); a.P(3,10,G,true); a.P(12,10,G,true); },
  lantern:a=>{ for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const fr=x<2||x>13||y<2||y>13||x===7||x===8; if(fr) a.P(x,y,J('#2b2b30',1+(a.r()-.5)*.2)); else { const d=Math.hypot(x-7.5,y-8); a.P(x,y,d<3?'#fff2c0':d<5?'#ffd27a':'#e8a040',true); } } },
  window:a=>winP(a,'plank','#f2b443','#ffd87a'), window2:a=>winP(a,'plank2','#f2b443','#ffd87a'),
  swin:a=>winP(a,'stone','#c41a24','#ff5a3a'), moonwin:a=>winP(a,'plank2','#4a6a98','#8fb0e0'),
  chest_side:a=>{ a.N('#7a5230',.2); border(a,'#4a301a'); for(let i=0;i<16;i++) a.P(i,6,'#4a301a'); },
  chest_front:a=>{ PAINT.chest_side(a); for(let y=5;y<9;y++) for(let x=7;x<9;x++) a.P(x,y,'#d9b45a'); },
  chest_top:a=>{ a.N('#7a5230',.2); border(a,'#4a301a'); },
  chest_open:a=>{ for(let y=0;y<16;y++) for(let x=0;x<16;x++){ if(x<1||x>14||y<1||y>14) a.P(x,y,'#4a301a'); else a.P(x,y,['#ff7a2a','#ffc04a','#fff0d0','#e2561c','#c84aff'][a.r()*5|0],true); } },
  candy:a=>{ for(let y=0;y<16;y++) for(let x=0;x<16;x++) a.P(x,y,['#e2561c','#f2b134','#f2ede4','#9a1418','#7a3aa0','#e2561c'][a.r()*6|0]); },
  shelf_side:a=>{ a.N('#5a3d27',.15); for(const row of [1,9]){ let x=1; while(x<15){ const w=1+(a.r()*2|0), c=['#7a1a1a','#2c3440','#4f6b45','#6a5a3a','#3a2a44'][a.r()*5|0]; for(let i=0;i<w&&x<15;i++,x++) for(let y=row;y<row+6;y++) a.P(x,y,J(c,1+(a.r()-.5)*.2)); } } },
  web:a=>{ a.alpha(); for(let i=0;i<16;i++){ a.P(i,i,'#e8e4dc'); a.P(15-i,i,'#e8e4dc'); a.P(i,8,'#cfcac0'); a.P(8,i,'#cfcac0'); } for(const k of [3,6]) for(let i=k;i<16-k;i++){ a.P(i,k,'#cfcac0'); a.P(i,15-k,'#cfcac0'); a.P(k,i,'#cfcac0'); a.P(15-k,i,'#cfcac0'); } },
  spike:a=>{ a.N('#34363c',.2); for(let y=1;y<16;y+=4) for(let x=1;x<16;x+=4){ a.P(x,y,'#d8dbe0'); a.P(x+1,y,'#9a9da3'); a.P(x,y+1,'#9a9da3'); } },
  trapdoor:a=>{ plankP(a,'#3e2b1f','#26190f'); border(a,'#1a110a'); a.P(7,7,'#8a8a90'); a.P(8,7,'#8a8a90'); },
  door:a=>{ plankP(a,'#3a281c','#22160e'); a.P(12,8,'#8a7a5a'); a.P(12,9,'#8a7a5a'); },
  bone:a=>{ a.N('#d6cfbf',.2); for(let i=0;i<10;i++) a.P(a.r()*16|0,a.r()*16|0,'#b3ab98'); },
  screamer:a=>a.N('#5a0a0e',.25),
  screamer_face:a=>{ a.N('#5a0a0e',.25); const C='#ff3b3b'; for(let y=4;y<7;y++){ for(let x=3;x<6;x++) a.P(x,y,C,true); for(let x=10;x<13;x++) a.P(x,y,C,true); } for(let y=9;y<14;y++) for(let x=6;x<10;x++) a.P(x,y,C,true); },
  void:a=>a.N('#030303',.1),
  moon:a=>{ a.N('#e9e4d6',.08); [[3,3],[4,3],[3,4],[10,5],[11,5],[6,10],[7,10],[6,11],[12,12]].forEach(([x,y])=>a.P(x,y,'#c9c2b0')); },
  mask_face:a=>{ for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const ch=FACE16[y][x]; a.P(x,y,ch==='H'?'#0f0f12':ch==='E'?'#050505':J('#efebe2',1+(a.r()-.5)*.06)); } },
  hood:a=>a.N('#141418',.2), cloak:a=>a.N('#1c1c21',.2), cloakR:a=>a.N('#3a0d11',.2), hand:a=>a.N('#cfc8ba',.1), leg:a=>a.N('#121215',.2)
};
const TEX={};
function tex(name){
  if(TEX[name]) return TEX[name];
  const c=document.createElement('canvas'); c.width=c.height=16; const e=document.createElement('canvas'); e.width=e.height=16;
  const g=c.getContext('2d'), ge=e.getContext('2d'); ge.fillStyle='#000'; ge.fillRect(0,0,16,16);
  let glow=false, alpha=false; let seed=0; for(const ch of name) seed=seed*31+ch.charCodeAt(0);
  const a={ r:R(seed),
    P:(x,y,col,em)=>{ g.fillStyle=col; g.fillRect(x,y,1,1); if(em){ ge.fillStyle=col; ge.fillRect(x,y,1,1); glow=true; } },
    alpha:()=>{ alpha=true; g.clearRect(0,0,16,16); } };
  a.N=(base,v,x0=0,y0=0,w=16,h=16)=>{ for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++) a.P(x,y,J(base,1+(a.r()-.5)*v)); };
  (PAINT[name]||PAINT.stone)(a);
  const mk=cv=>{ const t=new THREE.CanvasTexture(cv); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter; t.generateMipmaps=false; t.colorSpace=THREE.SRGBColorSpace; return t; };
  return TEX[name]={map:mk(c), emi:glow?mk(e):null, alpha};
}
const MAT={};
function mat(name,opt){ opt=opt||{}; const k=name+'|'+(opt.op||'')+'|'+(opt.top?1:0); if(MAT[k]) return MAT[k];
  const t=tex(name);
  const m=new THREE.MeshLambertMaterial({map:t.map, transparent:!!(t.alpha||opt.op), alphaTest:t.alpha?.5:0, opacity:opt.op??1, depthWrite:!opt.op, side:t.alpha?THREE.DoubleSide:THREE.FrontSide});
  if(t.emi){ m.emissiveMap=t.emi; m.emissive=new THREE.Color(0xffffff); m.emissiveIntensity=1.5; }
  if(opt.top){ m.depthTest=false; }
  return MAT[k]=m; }
const TY={
  grass:{side:'grass_side',top:'grass_top',bottom:'dirt'}, dirt:{all:'dirt'}, gravel:{all:'gravel'}, stone:{all:'stone'}, mossy:{all:'mossy'}, cobble:{all:'cobble'},
  plank:{all:'plank'}, plank2:{all:'plank2'}, darkplank:{all:'darkplank'}, log:{side:'log_side',top:'log_top'}, roof:{all:'roof'}, leaves:{all:'leaves'}, iron:{all:'iron'},
  pumpkin:{side:'pumpkin_side',top:'pumpkin_top',front:'pumpkin_face'}, lantern:{all:'lantern',shape:[.4,.5,.4]}, candle:{all:'lantern',shape:[.18,.28,.18]},
  window:{all:'window'}, window2:{all:'window2'}, swin:{all:'swin'}, moonwin:{all:'moonwin'},
  chest:{side:'chest_side',top:'chest_top',front:'chest_front',shape:[.88,.82,.88]}, chestOpen:{side:'chest_side',top:'chest_open',front:'chest_front',shape:[.88,.82,.88]},
  candy:{all:'candy',shape:[.7,.3,.7]}, shelf:{side:'shelf_side',top:'plank',front:'shelf_side'}, web:{all:'web'}, spike:{all:'spike',shape:[1,.1,1]}, trapdoor:{all:'trapdoor'},
  door:{all:'door'}, bone:{all:'bone',shape:[.8,.4,.8]}, screamer:{side:'screamer',top:'screamer',front:'screamer_face',shape:[.8,.8,.8]}, void:{all:'void'},
  post:{all:'log_side',shape:[.22,1,.22]}, ipost:{all:'iron',shape:[.14,1.25,.14]}, railx:{all:'iron',shape:[1,.08,.08],oy:.85}, railz:{all:'iron',shape:[.08,.08,1],oy:.85},
  wrailx:{all:'darkplank',shape:[1,.12,.12],oy:.7}, wrailz:{all:'darkplank',shape:[.12,.12,1],oy:.7},
  headstone:{side:'stone',top:'stone',front:'headstone_face',shape:[.78,1.1,.24]}, headstoneM:{side:'mossy',top:'mossy',front:'mossy',shape:[.78,1.1,.24]},
  crossV:{all:'stone',shape:[.2,1.6,.2]}, crossH:{all:'stone',shape:[.9,.2,.2],oy:1.05}, icrossV:{all:'iron',shape:[.16,1.3,.16]}, icrossH:{all:'iron',shape:[.7,.16,.16],oy:.8},
  slab:{all:'mossy',shape:[1,.5,1]}, mound:{all:'dirt',shape:[.9,.16,.9]}
};
function mats(type,opt){ const d=TY[type]; const side=d.side||d.all, top=d.top||d.all||side, bot=d.bottom||d.all||side, front=d.front||side;
  return [mat(side,opt),mat(side,opt),mat(top,opt),mat(bot,opt),mat(front,opt),mat(side,opt)]; }

function makeChar(variant){
  const g=new THREE.Group(), M=n=>mat(n), cl=variant==='rival'?'cloakR':'cloak';
  const box=(w,h,d,m,x,y,z)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); g.add(o); return o; };
  box(.25,.75,.25,M('leg'),-.125,.375,0); box(.25,.75,.25,M('leg'),.125,.375,0);
  const body=box(.5,.75,.28,M(cl),0,1.125,0);
  const am=[M(cl),M(cl),M(cl),M('hand'),M(cl),M(cl)];
  const aL=box(.25,.75,.25,am,-.375,1.125,0), aR=box(.25,.75,.25,am,.375,1.125,0);
  const head=box(.5,.5,.5,[M('hood'),M('hood'),M('hood'),M('hood'),M('mask_face'),M('hood')],0,1.75,0);
  box(.56,.12,.56,M('hood'),0,2.02,-.02);
  g.userData={head,aL,aR,body}; return g; }

function mkAdd(BM){ return (x,y,z,t,rot)=>{ const d=TY[t]; BM.set(x+','+y+','+z+(d&&d.shape?'|'+t:''),[x,y,z,t,rot||0]); }; }
function graveyard(){
  const BM=new Map(),L=[], r=R(7), add=mkAdd(BM);
  for(let x=-6;x<54;x++) for(let z=-12;z<62;z++) add(x,-1,z,(x>=22&&x<=25&&z>=10)?'gravel':'grass');
  const used=new Set(), key=(x,z)=>x+','+z, block=(x,z)=>used.add(key(x,z)), isUsed=(x,z)=>used.has(key(x,z));
  for(let x=14;x<=33;x++) for(let z=-1;z<=11;z++) block(x,z);
  for(let x=24;x<=29;x++) for(let z=33;z<=39;z++) block(x,z);
  for(let x=22;x<=26;x++) for(let z=28;z<=33;z++) block(x,z);
  for(let x=21;x<=26;x++) for(let z=10;z<62;z++) block(x,z);
  const grave=(x,z)=>{ if(isUsed(x,z)||isUsed(x,z+1)) return; block(x,z); block(x,z+1); const k=r();
    if(k<.42){ add(x,0,z,r()<.35?'headstoneM':'headstone'); add(x,0,z+1,'mound'); }
    else if(k<.66){ add(x,0,z,'crossV'); add(x,0,z,'crossH'); add(x,0,z+1,'mound'); }
    else if(k<.82){ add(x,0,z,'slab'); add(x,0,z+1,'slab'); }
    else { add(x,0,z,r()<.5?'mossy':'stone'); add(x,1,z,'headstone'); add(x,0,z+1,'mound'); }
    if(r()<.12){ add(x+1,0,z+1,'candle'); } };
  for(let z=13;z<=54;z+=3) for(let x=2;x<=46;x+=3){ if(r()<.24) continue; grave(x+(r()<.5?0:1),z); }
  const fence=(x0,z0,x1,z1)=>{ for(let x=x0;x<=x1;x++){ add(x,0,z0,'ipost'); add(x,0,z1,'ipost'); if(x<x1){ add(x,0,z0,'railx'); add(x,0,z1,'railx'); } }
    for(let z=z0;z<=z1;z++){ add(x0,0,z,'ipost'); add(x1,0,z,'ipost'); if(z<z1){ add(x0,0,z,'railz'); add(x1,0,z,'railz'); } } };
  fence(5,24,10,28); fence(36,40,41,45); fence(31,19,35,23);
  const tree=(x,z,h)=>{ for(let y=0;y<h;y++) add(x,y,z,'log'); add(x+1,h-2,z,'log'); add(x+2,h-1,z,'log'); add(x-1,h-1,z,'log'); add(x,h-2,z-1,'log'); add(x,h-1,z-2,'log'); add(x-2,h,z,'log');
    for(let a=-2;a<=2;a++) for(let b=-2;b<=2;b++) if(r()<.35) add(x+a,h+(r()<.5?0:1),z+b,'leaves'); block(x,z); };
  tree(18,45,7); tree(32,47,6); tree(8,31,8); tree(41,27,7); tree(13,18,6); tree(37,15,8); tree(29,55,7); tree(4,50,6);
  [[21,47],[21,38],[21,30],[26,23],[21,15]].forEach(([x,z],i)=>{ add(x,0,z,'post'); add(x,1,z,'post'); add(x,2,z,'lantern'); L.push([x+.5,2.3,z+.5,'#ffb04a',i<2?6:4,9,1.6,.12]); });
  for(let i=0;i<22;i++){ const x=2+(r()*46|0), z=12+(r()*44|0); if(!isUsed(x,z)){ block(x,z); add(x,0,z,'pumpkin',(r()-.5)*.8); } }
  add(19,0,33,'pumpkin',.4); add(29,0,38,'pumpkin',-.5); L.push([29.5,.6,38.8,'#ff8a2a',3,6,1.8,.25]);
  const C0=15,C1=32,Z0=0,Z1=9;
  for(let x=C0;x<=C1;x++) for(let z=Z0;z<=Z1;z++){ const edge=x===C0||x===C1||z===Z0||z===Z1; if(!edge) continue;
    for(let y=0;y<=6;y++) add(x,y,z,y===0?'cobble':(r()<.25?'mossy':'stone')); }
  [[18,19],[28,29]].forEach(xs=>xs.forEach(x=>{ for(let y=2;y<=4;y++) add(x,y,Z1,'swin'); }));
  [2,5].forEach(z=>{ for(let y=2;y<=4;y++){ add(C0,y,z,'swin'); add(C1,y,z,'swin'); } });
  for(let k=0;k<=8;k++){ const y=7+k; for(let x=C0-1+k;x<=C1+1-k;x++) for(let z=Z0-1;z<=Z1+1;z++) add(x,y,z,'roof'); }
  for(let x=22;x<=25;x++) for(let z=7;z<=10;z++) for(let y=0;y<=16;y++){ const door=z===10&&(x===23||x===24)&&y<=2; if(door) continue; add(x,y,z,y===0?'cobble':(r()<.2?'mossy':'stone')); }
  for(let y=0;y<=2;y++){ add(23,y,9,'void'); add(24,y,9,'void'); }
  for(let y=11;y<=12;y++){ add(23,y,10,'swin'); add(24,y,10,'swin'); }
  for(let k=0;k<2;k++) for(let x=22+k;x<=25-k;x++) for(let z=7+k;z<=10-k;z++) add(x,17+k,z,'roof');
  add(23,19,8,'icrossV'); add(23,19,8,'icrossH');
  L.push([23.5,3.5,12,'#e0303a',8,14,1.4,.08]); L.push([23.8,12,11.5,'#e0303a',5,12,1.5,.08]);
  for(let x=26;x<=27;x++) for(let z=36;z<=37;z++){ add(x,0,z,'mossy'); add(x,1,z,'slab'); }
  add(26,0,35,'stone'); add(27,0,35,'stone'); add(26,1,35,'mossy'); add(27,1,35,'stone'); add(26,2,35,'crossV'); add(26,2,35,'crossH');
  add(27,1.5,37,'candle'); add(26,1.5,36,'candle'); add(25,0,36,'bone'); L.push([27,2.1,37.6,'#ffb04a',2.5,5,1.8,.3]);
  return {B:[...BM.values()],L,chars:[{v:'rival',x:24,z:30.5,face:[25.3,41.2]}]};
}
function heistRoom(){
  const BM=new Map(),L=[], r=R(3), add=mkAdd(BM);
  for(let x=-2;x<=24;x++) for(let z=-6;z<=14;z++) add(x,-1,z,(x>=0&&x<=10&&z>=0&&z<=9)?'darkplank':'grass');
  for(let x=0;x<=10;x++) for(let z=0;z<=9;z++){ const edge=x===0||x===10||z===0||z===9; add(x,4,z,'darkplank'); if(!edge) continue;
    for(let y=0;y<=3;y++){ if(x===10&&(z===5||z===6)&&y<=2) continue; const corner=(x===0||x===10)&&(z===0||z===9); add(x,y,z,corner?'log':(y===0?'darkplank':'plank2')); } }
  add(2,1,0,'moonwin'); add(3,1,0,'moonwin'); add(2,2,0,'moonwin'); add(3,2,0,'moonwin');
  for(let x=6;x<=9;x++) for(let y=0;y<=2;y++) add(x,y,1,'shelf');
  for(let z=3;z<=5;z++) for(let y=0;y<=1;y++) add(1,y,z,'shelf');
  add(5,0,2,'chestOpen'); add(4,0,2,'candy'); add(6,0,3,'candy'); add(4,0,3,'candy'); add(5,0,3,'candy');
  L.push([5.5,1.1,2.8,'#ffa040',5,6,1.8,.1]);
  add(2,0,2,'candle'); add(3,0,1,'lantern'); L.push([3.5,.6,1.6,'#ffb04a',3,7,1.6,.25]);
  add(8,0,3,'screamer',-.5); L.push([8.4,.7,3.6,'#ff2020',2.2,4,2,.5]);
  add(7,0,6,'spike'); add(8,0,6,'spike'); add(7,0,5,'spike'); add(5,-1,5,'trapdoor');
  add(1,3,1,'web'); add(9,3,1,'web'); add(1,3,8,'web'); add(9,3,8,'web'); add(2,0,6,'bone'); add(1,0,7,'bone');
  for(let x=12;x<=22;x+=3){ add(x,0,3,'headstone'); add(x+1,0,8,'crossV'); add(x+1,0,8,'crossH'); }
  add(14,0,6,'post'); add(14,1,6,'post'); add(14,2,6,'lantern'); L.push([14.5,2.3,6.5,'#ffb04a',5,10,1.5,.12]);
  return {B:[...BM.values()],L,chars:[]};
}
function yard(done){
  const BM=new Map(),L=[], r=R(5), add=mkAdd(BM);
  const inHouse=(x,z)=>x>=6&&x<=17&&z>=4&&z<=10;
  for(let x=-10;x<=36;x++) for(let z=-10;z<=34;z++) add(x,-1,z,inHouse(x,z)?'darkplank':(x>=11&&x<=12&&z>=11&&z<=24)?'gravel':(x>=9&&x<=14&&z===11)?'darkplank':'grass');
  for(let i=0;i<=24;i++){ [[0,i,'z'],[24,i,'z'],[i,0,'x'],[i,24,'x']].forEach(([x,z,d])=>{ if(z===24&&(x===11||x===12)) return; add(x,0,z,'post'); if(i<24) add(x,0,z,d==='x'?'wrailx':'wrailz'); }); }
  for(let x=6;x<=17;x++) for(let z=4;z<=10;z++){ const edge=x===6||x===17||z===4||z===10; if(!edge) continue;
    for(let y=0;y<=3;y++){ if(z===10&&(x===11||x===12)&&y<=1) continue; if(!done&&y===3&&((z===10&&x>=13)||(x===17&&z>=7))) continue;
      const corner=(x===6||x===17)&&(z===4||z===10); let t=corner?'log':'plank';
      if(y>=1&&y<=2&&((z===10&&(x===8||x===9||x===14||x===15))||((x===6||x===17)&&z===7))) t='window'; add(x,y,z,t); } }
  if(done){ add(11,0,10,'door'); add(12,0,10,'door'); add(11,1,10,'door'); add(12,1,10,'door');
    for(let k=0;k<=4;k++){ const y=4+k; for(let z=3+k;z<=11-k;z++) for(let x=5;x<=18;x++) add(x,y,z,'roof'); for(let z=4+k;z<=10-k;z++){ add(6,y,z,'plank'); add(17,y,z,'plank'); } }
    for(let y=4;y<=10;y++) add(15,y,6,'cobble'); add(9,5,10,'window'); add(14,5,10,'window');
  } else {
    for(let x=6;x<=10;x++) for(let z=3;z<=6;z++) add(x,4,z,'roof');
    for(let y=0;y<=4;y++){ add(18,y,11,'log'); add(18,y,8,'log'); } for(let z=8;z<=11;z++) add(18,4,z,'darkplank');
    add(15,0,12,'plank'); add(16,0,12,'plank'); add(15,1,12,'plank'); add(16,0,13,'stone');
  }
  add(9,0,11,'post'); add(9,1,11,'lantern'); add(14,0,11,'post'); add(14,1,11,'lantern');
  L.push([9.5,1.4,11.6,'#ffb04a',4,8,1.6,.12]); L.push([14.5,1.4,11.6,'#ffb04a',4,8,1.6,.12]); L.push([11.5,2,7,'#ffa040',6,9,1.6,.1]);
  add(10,0,12,'pumpkin'); add(13,0,12,'pumpkin',.2); add(7,0,13,'pumpkin',-.3); add(16,0,15,'pumpkin',.4); add(4,0,19,'pumpkin');
  add(20,0,6,'headstone'); add(20,0,7,'mound'); add(21,0,9,'crossV'); add(21,0,9,'crossH'); add(3,0,8,'headstoneM');
  for(let y=0;y<6;y++) add(3,y,17,'log'); add(4,4,17,'log'); add(5,5,17,'log'); add(2,5,17,'log'); add(3,4,16,'log'); add(3,5,15,'log');
  return {B:[...BM.values()],L,chars:done?[{v:'me',x:12.5,z:13.6,face:[13.6,18.2]}]:[]};
}

const SPECS={
  explore:{w:graveyard, pos:[25.3,1.62,41.2], look:[27,.8,37.2], bg:'#05060a', density:.05, hemi:['#3a4a70','#0a0806',.6], moon:.35, sky:true, spot:true, held:'lantern', bob:[.025,1.1], sway:.35},
  loading:{w:graveyard, pos:[24,2.4,58], look:[24,5,4], bg:'#05060a', density:.045, hemi:['#3a4a70','#0a0806',.6], moon:.4, sky:true, spot:false, held:null, bob:[.01,.5], sway:.2, dolly:[.35,22]},
  results:{w:graveyard, pos:[9,5,53], look:[24,4,8], bg:'#2a1216', density:.035, hemi:['#d07a60','#160909',.85], moon:.6, moonColor:'#ff9a7a', sky:'dawn', spot:false, held:null, bob:[.01,.4], sway:.3},
  heist:{w:heistRoom, pos:[5.2,1.62,7.4], look:[5.5,.55,2.5], bg:'#05060a', density:.06, hemi:['#2a3550','#050403',.45], moon:0, sky:false, spot:true, held:'lantern', bob:[.04,2.4], sway:.5},
  build:{w:()=>yard(false), pos:[18.6,1.9,18.2], look:[13,3.5,10.5], bg:'#070910', density:.035, hemi:['#4a5a80','#0a0806',.75], moon:.45, sky:true, spot:true, held:null, bob:[.012,.8], sway:.15, ghost:[13,3,10], target:[12,3,10]},
  menu:{w:()=>yard(true), pos:[13.8,1.55,18.4], look:[10.4,1.5,13.4], bg:'#05060a', density:.04, hemi:['#3a4a70','#0a0806',.55], moon:.35, sky:true, spot:false, held:null, bob:[.008,.5], sway:.2, rim:[12.5,2.2,12.6]}
};

let renderer, camera, cur=null, heldG, spot, spotT, lampLight, ghostMesh, outline, ghostType='plank', heldType='lantern';
const scenes={}; let yaw=0;
function fogSprite(){ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(200,210,230,0.9)'); gr.addColorStop(1,'rgba(200,210,230,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); }
let FOGT=null;
function build(name){
  if(scenes[name]) return scenes[name];
  const sp=SPECS[name], w=sp.w(), scene=new THREE.Scene();
  scene.background=new THREE.Color(sp.bg); scene.fog=new THREE.FogExp2(sp.bg,sp.density);
  scene.add(new THREE.HemisphereLight(sp.hemi[0],sp.hemi[1],sp.hemi[2]));
  if(sp.moon){ const d=new THREE.DirectionalLight(sp.moonColor||'#8fa4d8',sp.moon); d.position.set(-40,60,-60); scene.add(d); }
  const byType={}; for(const b of w.B) (byType[b[3]]||(byType[b[3]]=[])).push(b);
  const m4=new THREE.Matrix4(), rot=new THREE.Matrix4();
  for(const t in byType){ const d=TY[t]; if(!d) continue; const [sw,sh,sd]=d.shape||[1,1,1], oy=d.oy||0;
    const geo=new THREE.BoxGeometry(sw,sh,sd); geo.translate(0,sh/2+oy,0);
    const list=byType[t], im=new THREE.InstancedMesh(geo,mats(t),list.length);
    list.forEach((b,i)=>{ m4.makeTranslation(b[0]+.5,b[1],b[2]+.5); if(b[4]) m4.multiply(rot.makeRotationY(b[4])); im.setMatrixAt(i,m4); });
    im.frustumCulled=false; scene.add(im); }
  const lights=w.L.map(l=>{ const p=new THREE.PointLight(l[3],l[4],l[5]??10,l[6]??1.6); p.position.set(l[0],l[1],l[2]); scene.add(p); return {p,base:l[4],ph:Math.random()*10,fl:l[7]??.15}; });
  if(sp.rim){ const p=new THREE.PointLight('#e01b22',6,6,1.4); p.position.set(...sp.rim); scene.add(p); lights.push({p,base:6,ph:0,fl:.05}); const f=new THREE.PointLight('#ffc890',4,7,1.6); f.position.set(13.2,1.9,15.6); scene.add(f); lights.push({p:f,base:4,ph:1,fl:.1}); }
  if(sp.sky){ const n=600, pos=new Float32Array(n*3), rr=R(9); for(let i=0;i<n;i++){ const th=rr()*Math.PI*2, ph=rr()*Math.PI*.45; pos[i*3]=Math.cos(th)*Math.cos(ph)*200; pos[i*3+1]=Math.sin(ph)*200+10; pos[i*3+2]=Math.sin(th)*Math.cos(ph)*200; }
    const gg=new THREE.BufferGeometry(); gg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    if(sp.sky===true) scene.add(new THREE.Points(gg,new THREE.PointsMaterial({color:'#f2ede4',size:2,sizeAttenuation:false,fog:false,transparent:true,opacity:.7})));
    const moon=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.MeshBasicMaterial({map:tex('moon').map,fog:false,color:sp.sky==='dawn'?'#ffb9a0':'#ffffff'}));
    const y0=Math.atan2(sp.look[0]-sp.pos[0],-(sp.look[2]-sp.pos[2]))-0.75, el=sp.sky==='dawn'?.18:.5; moon.position.set(sp.pos[0]+Math.sin(y0)*150*Math.cos(el),sp.pos[1]+150*Math.sin(el),sp.pos[2]-Math.cos(y0)*150*Math.cos(el)); moon.lookAt(...sp.pos); scene.add(moon); }
  FOGT=FOGT||fogSprite(); const mist=[]; const rr=R(4);
  for(let i=0;i<16;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:FOGT,transparent:true,opacity:.06+rr()*.07,depthWrite:false,color:sp.sky==='dawn'?'#e0a090':'#c8d0e0'}));
    s.position.set(sp.look[0]+(rr()-.5)*30,.5+rr()*1.2,sp.look[2]+(rr()-.5)*24); s.scale.set(9+rr()*8,2.4+rr()*1.5,1); scene.add(s); mist.push({s,x:s.position.x,sp:.2+rr()*.4}); }
  const chars=w.chars.map(c=>{ const g=makeChar(c.v); g.position.set(c.x,0,c.z); g.rotation.y=Math.atan2(c.face[0]-c.x,c.face[1]-c.z); scene.add(g); return g; });
  return scenes[name]={scene,lights,sp,mist,chars};
}
function setHeldMesh(){
  if(!heldG) return; while(heldG.children.length) heldG.remove(heldG.children[0]);
  const top=n=>mat(n,{top:true});
  if(!cur||!cur.sp.held) { lampLight.visible=false; return; }
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.62),[top('cloak'),top('cloak'),top('cloak'),top('cloak'),top('hand'),top('cloak')]);
  arm.position.set(.46,-.42,-.5); arm.rotation.set(-.25,.28,0); arm.renderOrder=999; heldG.add(arm);
  if(cur.sp.held==='lantern'){ const l=new THREE.Mesh(new THREE.BoxGeometry(.1,.13,.1),top('lantern')); l.position.set(.4,-.47,-.92); l.renderOrder=1000; heldG.add(l);
    const h=new THREE.Mesh(new THREE.BoxGeometry(.03,.12,.03),top('iron')); h.position.set(.4,-.38,-.92); h.renderOrder=1000; heldG.add(h); lampLight.visible=true; }
  else { const d=TY[heldType]?mats(heldType,{top:true}):mats('plank',{top:true}); const b=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.16),d); b.position.set(.42,-.4,-.9); b.rotation.set(.2,.7,0); b.renderOrder=1000; heldG.add(b); lampLight.visible=false; }
}
function setGhost(){
  if(!cur) return; const sc=cur.scene;
  if(ghostMesh){ ghostMesh.parent&&ghostMesh.parent.remove(ghostMesh); ghostMesh=null; }
  if(outline){ outline.parent&&outline.parent.remove(outline); outline=null; }
  if(!cur.sp.ghost) return;
  const [gx,gy,gz]=cur.sp.ghost, t=TY[ghostType]?ghostType:'plank';
  ghostMesh=new THREE.Group();
  const gm=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mats(t,{op:.55})); gm.position.set(gx+.5,gy+.5,gz+.5); ghostMesh.add(gm);
  const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004,1.004,1.004)),new THREE.LineBasicMaterial({color:'#f2ede4'})); e.position.copy(gm.position); ghostMesh.add(e);
  sc.add(ghostMesh);
  const [tx,ty,tz]=cur.sp.target; outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006,1.006,1.006)),new THREE.LineBasicMaterial({color:'#000000'})); outline.position.set(tx+.5,ty+.5,tz+.5); sc.add(outline);
}
function show(name){
  if(!renderer||!SPECS[name]) return; const s=build(name);
  if(camera.parent) camera.parent.remove(camera); s.scene.add(camera); cur=s;
  spot.visible=!!s.sp.spot; setHeldMesh(); setGhost();
}
function mount(canvas){
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.setSize(canvas.width,canvas.height,false);
  camera=new THREE.PerspectiveCamera(72,canvas.width/canvas.height,.05,400);
  heldG=new THREE.Group(); camera.add(heldG);
  spot=new THREE.SpotLight('#ffe9c8',40,32,.42,.55,1.3); spot.position.set(.25,-.15,0); spotT=new THREE.Object3D(); spotT.position.set(0,-.05,-1); camera.add(spot); camera.add(spotT); spot.target=spotT;
  lampLight=new THREE.PointLight('#ffb04a',3,7,1.5); lampLight.position.set(.4,-.47,-.92); camera.add(lampLight);
  const tmp=new THREE.Vector3();
  const loop=ms=>{ requestAnimationFrame(loop); if(!cur) return; const t=ms/1000, sp=cur.sp;
    let [px,py,pz]=sp.pos; const [lx,ly,lz]=sp.look;
    if(sp.dolly) pz-=(t*sp.dolly[0])%sp.dolly[1];
    const ba=sp.bob[0], bs=sp.bob[1]; py+=Math.sin(t*bs*2)*ba; px+=Math.cos(t*bs)*ba*.6;
    camera.position.set(px,py,pz);
    tmp.set(lx+Math.sin(t*.27)*sp.sway,ly+Math.sin(t*.19)*sp.sway*.3,lz+(sp.dolly?-((t*sp.dolly[0])%sp.dolly[1]):0)); camera.lookAt(tmp);
    const dx=tmp.x-px, dz=tmp.z-pz; yaw=((Math.atan2(dx,-dz)*180/Math.PI)+360)%360;
    for(const l of cur.lights) l.p.intensity=l.base*(1-l.fl+l.fl*(.6*Math.sin(t*9+l.ph)+.4*Math.sin(t*23+l.ph*2)));
    lampLight.intensity=3*(.9+.1*Math.sin(t*11));
    for(const m of cur.mist){ m.s.position.x=m.x+Math.sin(t*m.sp*.3)*3; }
    for(const c of cur.chars){ const u=c.userData; u.head.rotation.z=Math.sin(t*.45)*.12; u.head.rotation.y=Math.sin(t*.3)*.15; u.body.position.y=1.125+Math.sin(t*1.4)*.01; }
    heldG.position.y=Math.sin(t*bs*2)*ba*.6;
    renderer.render(cur.scene,camera); };
  requestAnimationFrame(loop);
}
window.FP={ mount, show, getYaw:()=>yaw,
  setBlock:t=>{ ghostType=t; heldType=t; if(cur&&cur.sp.held==='block') setHeldMesh(); setGhost(); } };
window.dispatchEvent(new Event('fp-ready'));

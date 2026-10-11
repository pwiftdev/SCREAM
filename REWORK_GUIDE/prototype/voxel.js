(function(){
const FOG=[27,31,46];
const T={
grass:{c:'#3a5532',side:['gggg','gdgd','dddd','dddd'],pal:{g:'#3a5532',d:'#4a3626'},j:.1},
dirt:{c:'#4a3626',j:.1}, mound:{c:'#3a2b20',j:.1}, path:{c:'#58493a',j:.12},
stone:{c:'#6a6c74',j:.1},
mossy:{c:'#626d5f',pat:['m..m','.mm.','..m.','m...'],pal:{m:'#4a6243'},j:.1},
cobble:{c:'#55575e',pat:['.k..','kk.k','..k.','k..k'],pal:{k:'#44464c'},j:.08},
iron:{c:'#26272c',j:.05},
wood:{c:'#47321f',side:['.k..','.k..','..k.','.k..'],pal:{k:'#3a2818'},j:.08},
plank:{c:'#6a4930',side:['....','kkkk','....','kkkk'],top:['..k.','..k.','k...','k...'],pal:{k:'#5a3d27'},j:.07},
plank2:{c:'#5e5a54',side:['....','kkkk','....','kkkk'],top:['..k.','..k.','k...','k...'],pal:{k:'#4c4843'},j:.07},
darkplank:{c:'#3b291e',j:.06},
roof:{c:'#2e2438',pat:['....','kkkk','....','kkkk'],pal:{k:'#251d2e'},j:.06},
roofr:{c:'#4a1a1e',pat:['....','kkkk','....','kkkk'],pal:{k:'#3a1216'},j:.06},
door:{c:'#2a1c14',side:['kkkk','k..k','k.yk','k..k'],pal:{k:'#1c120c',y:'#8a7a5a'}},
window:{c:'#6a4930',side:['kkkk','kYYk','kYYk','kkkk'],pal:{k:'#2b1d15',Y:'!#f2b443'},glow:'#f0a030',gr:3},
window2:{c:'#5e5a54',side:['kkkk','kYYk','kYYk','kkkk'],pal:{k:'#2b2622',Y:'!#f2b443'},glow:'#f0a030',gr:3},
swin:{c:'#6a6c74',side:['.kk.','kRRk','kRRk','kRRk'],pal:{k:'#2a2a2e',R:'!#e0303a'},glow:'#e0303a',gr:3},
pumpkin:{c:'#c9621a',side:['....','Y..Y','....','.YY.'],top:['....','.s..','..s.','....'],pal:{Y:'!#ffd060',s:'#3d5a28'},glow:'#ff9a2e',gr:2.6,j:.06},
lantern:{c:'#26262b',side:['kkkk','kYYk','kYYk','kkkk'],pal:{k:'#26262b',Y:'!#ffd27a'},glow:'#ffc35a',gr:3.4},
chest:{c:'#7a5230',side:['kkkk','....','kYYk','....'],top:['....','.kk.','.kk.','....'],pal:{k:'#4a301a',Y:'!#ffd27a'},glow:'#ffb347',gr:2.4},
candy:{c:'#e2561c',pat:['.Yw.','Yw..','w.Y.','..wY'],pal:{Y:'#f2b134',w:'#f2ede4'},j:.05},
spike:{c:'#34363c',top:['s.s.','....','.s.s','....'],pal:{s:'#c3c6cc'}},
trapdoor:{c:'#3b291e',top:['kkkk','k..k','kkkk','k..k'],pal:{k:'#24180f'}},
web:{c:'#cfcac0',pat:['w..w','.ww.','.ww.','w..w'],pal:{w:'#e8e4dc'},alpha:.38},
screamer:{c:'#6e0b0f',side:['....','E..E','....','.EE.'],top:['k..k','.kk.','.kk.','k..k'],pal:{E:'!#ff4040',k:'#4a070a'},glow:'#ff2020',gr:2.8},
shelf:{c:'#47321f',side:['kkkk','rbgr','kkkk','grbr'],pal:{k:'#2e2015',r:'#7a1a1a',b:'#2c3440',g:'#4f6b45'}},
bone:{c:'#ddd6c6',pat:['..k.','k...','...k','.k..'],pal:{k:'#bdb5a3'},j:.06},
leaf:{c:'#2b3323',j:.15}, water:{c:'#16212e'},
cloak:{c:'#1c1c21',j:.05}, cloakR:{c:'#3a0d11',j:.05}, hood:{c:'#0f0f12',j:.04}, mask:{c:'#efebe2',j:.03},
eye:{c:'#050505',j:0}, trim:{c:'#5a0a0e',j:.03}, hand:{c:'#cfc8ba',j:.03}, leg:{c:'#121215',j:.04}, boot:{c:'#2a1f18',j:.05}
};
const SH=[1,.74,.56];
const HC={};
function rgb(h){ if(HC[h]) return HC[h]; const s=h.replace('#',''); return HC[h]=[parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]; }
function shade(h,k,fog){ const c=rgb(h); let r=c[0]*k,g=c[1]*k,b=c[2]*k; if(fog>0){ r+=(FOG[0]-r)*fog; g+=(FOG[1]-g)*fog; b+=(FOG[2]-b)*fog; } return 'rgb('+Math.min(255,r|0)+','+Math.min(255,g|0)+','+Math.min(255,b|0)+')'; }
function hash(a,b,c){ let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(c|0,1274126177); h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function rng(s){ return function(){ s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
class World{ constructor(){ this.m=new Map(); }
  set(x,y,z,t){ this.m.set(x+','+y+','+z,{x,y,z,t}); }
  del(x,y,z){ this.m.delete(x+','+y+','+z); }
  get(x,y,z){ return this.m.get(x+','+y+','+z); }
  solid(x,y,z){ const b=this.m.get(x+','+y+','+z); return !!b && !T[b.t].alpha; } }

function sky(ctx,W,H,kind){
  const g=ctx.createLinearGradient(0,0,0,H);
  if(kind==='dawn'){ g.addColorStop(0,'#0b0a12'); g.addColorStop(.55,'#24101c'); g.addColorStop(1,'#4a181a'); }
  else { g.addColorStop(0,'#04050a'); g.addColorStop(1,'#111421'); }
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const r=rng(11); ctx.fillStyle='#f2ede4';
  for(let i=0;i<160;i++){ const x=r()*W,y=r()*H*.6,sz=r()<.15?3:2; ctx.globalAlpha=.15+r()*.5; ctx.fillRect(x|0,y|0,sz,sz); }
  ctx.globalAlpha=1;
  const m=Math.round(H*.11), mx=Math.round(W*.8), my=Math.round(H*(kind==='dawn'?.3:.16));
  const gl=ctx.createRadialGradient(mx,my,0,mx,my,m*3); gl.addColorStop(0,kind==='dawn'?'rgba(255,120,90,0.25)':'rgba(220,225,255,0.18)'); gl.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gl; ctx.fillRect(mx-m*3,my-m*3,m*6,m*6);
  ctx.fillStyle=kind==='dawn'?'#e9b9a0':'#e9e4d6'; ctx.fillRect(mx-m/2,my-m/2,m,m);
  ctx.fillStyle=kind==='dawn'?'#cf9a85':'#cdc7b6'; const q=m/8;
  [[1,1,2],[5,2,1],[3,5,2],[6,6,1]].forEach(([a,b,s])=>ctx.fillRect(mx-m/2+a*q,my-m/2+b*q,s*q,s*q));
}

function render(canvas,world,o){
  const ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height, s=o.s;
  const f=o.focus||[0,0,0], fx=o.fx??W/2, fy=o.fy??H/2;
  const ox=fx-(f[0]-f[1])*s, oy=fy-(f[0]+f[1])*s/2+f[2]*s;
  const P=(x,y,z)=>[ox+(x-y)*s, oy+(x+y)*s/2-z*s];
  if(!o.keep){ ctx.clearRect(0,0,W,H); if(o.sky) sky(ctx,W,H,o.sky); }
  const n=o.cells??4, fogA=o.fog||0;
  const arr=[...world.m.values()].sort((a,b)=>(a.x+a.y+a.z)-(b.x+b.y+b.z));
  let dmin=Infinity,dmax=-Infinity; for(const b of arr){ const d=b.x+b.y; if(d<dmin)dmin=d; if(d>dmax)dmax=d; }
  const lights=[];
  function quad(p,u,v,a0,b0,a1,b1){ ctx.beginPath();
    ctx.moveTo(p[0]+u[0]*a0+v[0]*b0,p[1]+u[1]*a0+v[1]*b0); ctx.lineTo(p[0]+u[0]*a1+v[0]*b0,p[1]+u[1]*a1+v[1]*b0);
    ctx.lineTo(p[0]+u[0]*a1+v[0]*b1,p[1]+u[1]*a1+v[1]*b1); ctx.lineTo(p[0]+u[0]*a0+v[0]*b1,p[1]+u[1]*a0+v[1]*b1); ctx.closePath(); ctx.fill(); }
  function face(p0,p1,p2,pat,t,k,fog,x,y,z,fid){
    const u=[p1[0]-p0[0],p1[1]-p0[1]], v=[p2[0]-p0[0],p2[1]-p0[1]];
    const bj=n<=1?(hash(x*3+fid,y*5,z*7)-.5)*2*(t.j??.06):0;
    ctx.fillStyle=shade(t.c,k*(1+bj),fog); quad(p0,u,v,0,0,1,1);
    if(n<=1) return;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){
      const ch=pat?pat[(j*4/n)|0][(i*4/n)|0]:'.';
      let hc=ch==='.'?t.c:t.pal[ch]; const em=hc[0]==='!'; if(em) hc=hc.slice(1);
      const jit=(hash(x*7+i+fid*31,y*13+j,z*5+fid)-.5)*2*(t.j??.08);
      if(ch==='.'&&Math.abs(jit)<.015) continue;
      ctx.fillStyle=em?shade(hc,1,0):shade(hc,k*(1+jit),fog);
      quad(p0,u,v,i/n-.01,j/n-.01,(i+1)/n+.01,(j+1)/n+.01);
    }
  }
  for(const b of arr){
    const t=T[b.t]; if(!t) continue; const {x,y,z}=b;
    const top=!world.solid(x,y,z+1), rx=!world.solid(x+1,y,z), ly=!world.solid(x,y+1,z);
    if(!(top||rx||ly)) continue;
    const c=P(x+.5,y+.5,z+.5); if(c[0]<-2*s||c[0]>W+2*s||c[1]<-2*s||c[1]>H+3*s) continue;
    const fog=fogA?fogA*Math.pow(1-(x+y-dmin)/Math.max(1,dmax-dmin),1.6):0;
    if(t.alpha) ctx.globalAlpha=t.alpha;
    if(top) face(P(x,y,z+1),P(x+1,y,z+1),P(x,y+1,z+1),t.top||t.pat,t,SH[0],fog,x,y,z,0);
    if(rx) face(P(x+1,y,z+1),P(x+1,y+1,z+1),P(x+1,y,z),t.side||t.pat,t,SH[1],fog,x,y,z,1);
    if(ly) face(P(x,y+1,z+1),P(x+1,y+1,z+1),P(x,y+1,z),t.side||t.pat,t,SH[2],fog,x,y,z,2);
    if(t.alpha) ctx.globalAlpha=1;
    if(t.glow) lights.push([c,t.glow,t.gr||3]);
  }
  ctx.globalCompositeOperation='lighter';
  for(const [c,g,r] of lights){ const R=s*r, q=rgb(g), gr=ctx.createRadialGradient(c[0],c[1],0,c[0],c[1],R);
    gr.addColorStop(0,'rgba('+q+',0.32)'); gr.addColorStop(1,'rgba('+q+',0)'); ctx.fillStyle=gr; ctx.fillRect(c[0]-R,c[1]-R,2*R,2*R); }
  ctx.globalCompositeOperation='source-over';
  if(o.mist){ const r=rng(3); for(let i=0;i<o.mist;i++){ const x=r()*W,y=H*(.3+r()*.65),rw=300+r()*520;
    ctx.save(); ctx.translate(x,y); ctx.scale(1,.22); const g=ctx.createRadialGradient(0,0,0,0,0,rw);
    g.addColorStop(0,'rgba(190,200,220,0.11)'); g.addColorStop(1,'rgba(190,200,220,0)'); ctx.fillStyle=g; ctx.fillRect(-rw,-rw,2*rw,2*rw); ctx.restore(); } }
  if(o.ghost){ const [x,y,z]=o.ghost; ctx.fillStyle='rgba(224,27,34,0.28)'; ctx.strokeStyle='#ff4a4a'; ctx.lineWidth=2;
    [[P(x,y,z+1),P(x+1,y,z+1),P(x+1,y+1,z+1),P(x,y+1,z+1)],[P(x+1,y,z+1),P(x+1,y+1,z+1),P(x+1,y+1,z),P(x+1,y,z)],[P(x,y+1,z+1),P(x+1,y+1,z+1),P(x+1,y+1,z),P(x,y+1,z)]]
    .forEach(fc=>{ ctx.beginPath(); fc.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); }); }
  if(o.vignette){ const g=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*1.05); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,'+o.vignette+')'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  return {P};
}

function graveyard(N,seed){
  const w=new World(), r=rng(seed), c=N>>1, ch={x:3,y:3,w:10,d:7};
  const inCh=(x,y)=>x>=ch.x-1&&x<=ch.x+ch.w+1&&y>=ch.y-1&&y<=ch.y+ch.d+2;
  const pY=x=>c+Math.round(Math.sin(x*.25)*1.2), pX=y=>c+Math.round(Math.cos(y*.3));
  const onPath=(x,y)=>Math.abs(y-pY(x)-.5)<=2.5||Math.abs(x-pX(y)-.5)<=2.5;
  const hm=[];
  for(let x=0;x<N;x++){ hm[x]=[]; for(let y=0;y<N;y++){
    let h=(Math.sin(x*.33+seed)+Math.cos(y*.29+seed*.5)+Math.sin((x+y)*.17))>1.5?1:0;
    if((Math.abs(x-c)<5&&Math.abs(y-c)<5)||inCh(x,y)) h=0;
    hm[x][y]=h; for(let z=0;z<=h;z++) w.set(x,y,z,z===h?'grass':'dirt');
    if(x===N-1||y===N-1){ w.set(x,y,-1,'dirt'); w.set(x,y,-2,'stone'); w.set(x,y,-3,'stone'); } } }
  const top=(x,y)=>(hm[x]&&hm[x][y]!=null)?hm[x][y]:0;
  for(let x=0;x<N;x++){ const y0=pY(x); for(const d of [0,1]){ const y=y0+d; if(y<N) w.set(x,y,top(x,y),'path'); } }
  for(let y=0;y<N;y++){ const x0=pX(y); for(const d of [0,1]){ const x=x0+d; if(x<N) w.set(x,y,top(x,y),'path'); } }
  for(let x=ch.x;x<ch.x+ch.w;x++) for(let y=ch.y;y<ch.y+ch.d;y++){ w.set(x,y,0,'cobble');
    const edge=x===ch.x||y===ch.y||x===ch.x+ch.w-1||y===ch.y+ch.d-1;
    if(edge) for(let z=1;z<=5;z++) w.set(x,y,z,r()<.22?'mossy':'stone'); }
  const dx=ch.x+5, fy=ch.y+ch.d-1; w.set(dx,fy,1,'door'); w.set(dx,fy,2,'door');
  [ch.x+2,ch.x+8].forEach(x=>{ w.set(x,fy,2,'swin'); w.set(x,fy,3,'swin'); });
  [ch.y+2,ch.y+4].forEach(y=>{ w.set(ch.x+ch.w-1,y,2,'swin'); w.set(ch.x+ch.w-1,y,3,'swin'); });
  for(let k=0;;k++){ const y0=ch.y-1+k, y1=ch.y+ch.d-k; if(y0>y1) break; for(let x=ch.x-1;x<=ch.x+ch.w;x++) for(let y=y0;y<=y1;y++) w.set(x,y,6+k,'roof'); }
  for(let x=ch.x;x<ch.x+3;x++) for(let y=ch.y;y<ch.y+3;y++) for(let z=1;z<=12;z++) w.set(x,y,z,r()<.2?'mossy':'stone');
  w.set(ch.x+2,ch.y+1,10,'swin'); w.set(ch.x+1,ch.y+2,10,'swin');
  w.set(ch.x+1,ch.y+1,13,'roof'); w.set(ch.x+1,ch.y+1,14,'roof');
  [15,16,17].forEach(z=>w.set(ch.x+1,ch.y+1,z,'iron')); w.set(ch.x,ch.y+1,16,'iron'); w.set(ch.x+2,ch.y+1,16,'iron');
  for(let i=0;i<N;i++){ if(!onPath(0,i)){ w.set(0,i,top(0,i)+1,'iron'); if(i%3===0) w.set(0,i,top(0,i)+2,'iron'); }
    if(!onPath(i,0)&&!inCh(i,0)){ w.set(i,0,top(i,0)+1,'iron'); if(i%3===0) w.set(i,0,top(i,0)+2,'iron'); } }
  const tree=(x,y)=>{ const h0=top(x,y), H=5+(r()*3|0); for(let z=1;z<=H;z++) w.set(x,y,h0+z,'wood');
    w.set(x+1,y,h0+H-1,'wood'); w.set(x+2,y,h0+H,'wood'); w.set(x,y-1,h0+H-2,'wood'); w.set(x,y-2,h0+H-1,'wood'); w.set(x-1,y,h0+H,'wood');
    for(let a=-2;a<=2;a++) for(let b=-2;b<=2;b++) if(r()<.3) w.set(x+a,y+b,h0+H+1,'leaf'); };
  [[N-6,5],[5,N-7],[N-5,N-10],[c+8,c+7],[c-9,c+6],[c+9,c-8]].forEach(([x,y])=>{ if(x>1&&y>1&&x<N-1&&y<N-1&&!onPath(x,y)&&!inCh(x,y)) tree(x,y); });
  const free=(x,y)=>x>1&&y>1&&x<N-2&&y<N-2&&!w.get(x,y,top(x,y)+1)&&!onPath(x,y)&&!inCh(x,y)&&!(Math.abs(x-c)<5&&Math.abs(y-c)<5);
  for(let gx=2;gx<N-2;gx+=3) for(let gy=2;gy<N-2;gy+=3){
    const x=gx+(r()<.5?0:1), y=gy; if(!free(x,y)||!free(x+1,y)||r()<.22) continue;
    const h=top(x,y), k=r(), st=r()<.3?'mossy':'stone';
    if(k<.45){ w.set(x,y,h+1,st); w.set(x,y,h+2,st); if(w.get(x,y+1,h)&&w.get(x,y+1,h).t==='grass') w.set(x,y+1,h,'mound'); }
    else if(k<.7){ for(let z=1;z<=3;z++) w.set(x,y,h+z,st); w.set(x-1,y,h+2,st); w.set(x+1,y,h+2,st); }
    else if(k<.86){ w.set(x,y,h+1,'cobble'); w.set(x+1,y,h+1,'cobble'); w.set(x,y,h+2,st); w.set(x+1,y,h+2,st); }
    else { w.set(x,y,h+1,st); if(r()<.5) w.set(x+1,y,h+1,'lantern'); } }
  for(let i=0;i<14;i++){ const x=2+(r()*(N-4)|0), y=2+(r()*(N-4)|0); if(free(x,y)) w.set(x,y,top(x,y)+1,'pumpkin'); }
  for(let x=3;x<N-2;x+=7){ const y=pY(x)+3; if(y<N-1&&!w.get(x,y,top(x,y)+1)){ const h=top(x,y); w.set(x,y,h+1,'iron'); w.set(x,y,h+2,'iron'); w.set(x,y,h+3,'lantern'); } }
  w.set(c+2,c-3,1,'stone'); w.set(c+3,c-3,1,'stone'); w.set(c+2,c-3,2,'mossy'); w.set(c+3,c-3,2,'stone'); w.set(c+2,c-3,3,'stone'); w.set(c+3,c-3,3,'mossy');
  w.set(c+2,c-2,1,'cobble'); w.set(c+3,c-2,1,'cobble'); w.set(c+4,c-2,1,'lantern'); w.set(c-3,c+2,1,'pumpkin'); w.set(c+3,c+3,1,'bone');
  return {w, anchors:{tomb:[c+3,c-1.5,2.5], me:[c+.5,c+1.5,1], other:[c-5.5,c-3.5,1]}};
}

function house(opt){
  const {cut=false, wall='plank', win='window', roof='roof', N=24, stashC=false}=opt, w=new World();
  for(let x=0;x<N;x++) for(let y=0;y<N;y++){ w.set(x,y,0,'grass'); if(x===N-1||y===N-1){ w.set(x,y,-1,'dirt'); w.set(x,y,-2,'stone'); } }
  for(let i=0;i<N;i++){ [[0,i],[i,0],[N-1,i],[i,N-1]].forEach(([x,y])=>{ if(!(y===N-1&&(x===8||x===9))) w.set(x,y,1,'darkplank'); }); }
  const X0=5,X1=15,Y0=4,Y1=12;
  for(let x=X0;x<=X1;x++) for(let y=Y0;y<=Y1;y++) w.set(x,y,0,'plank');
  for(let x=X0;x<=X1;x++) for(let y=Y0;y<=Y1;y++){
    const edge=x===X0||x===X1||y===Y0||y===Y1; if(!edge) continue;
    const front=x===X1||y===Y1, corner=(x===X0||x===X1)&&(y===Y0||y===Y1), hmax=cut&&front?1:4;
    for(let z=1;z<=hmax;z++) w.set(x,y,z,corner?'darkplank':wall); }
  [[X0,6],[X0,10]].forEach(([x,y])=>{ w.set(x,y,2,win); w.set(x,y,3,win); });
  [[8,Y0],[12,Y0]].forEach(([x,y])=>{ w.set(x,y,2,win); w.set(x,y,3,win); });
  if(!cut){ [[X1,6],[X1,10]].forEach(([x,y])=>{ w.set(x,y,2,win); w.set(x,y,3,win); }); [[6,Y1],[13,Y1]].forEach(([x,y])=>{ w.set(x,y,2,win); w.set(x,y,3,win); });
    w.set(8,Y1,1,'door'); w.set(8,Y1,2,'door'); } else w.del(8,Y1,1);
  const ph=cut?3:4; for(let y=Y0+1;y<Y1;y++){ if(y===7||y===8) continue; for(let z=1;z<=ph;z++) w.set(11,y,z,wall); }
  if(!cut){
    for(let x=X0;x<=X1;x++) for(let y=Y0;y<=Y1;y++) w.set(x,y,5,'darkplank');
    for(let x=X0+1;x<X1;x++) for(let y=Y0+1;y<Y1;y++){ const e=x===X0+1||x===X1-1||y===Y0+1||y===Y1-1; if(e){ w.set(x,y,6,wall); w.set(x,y,7,wall); } }
    [[X1-1,7],[X1-1,9]].forEach(([x,y])=>w.set(x,y,7,win)); [[8,Y1-1],[11,Y1-1]].forEach(([x,y])=>w.set(x,y,7,win));
    for(let k=0;;k++){ const y0=Y0+k, y1=Y1-k; if(y0>y1) break; for(let x=X0;x<=X1;x++) for(let y=y0;y<=y1;y++) w.set(x,y,8+k,roof); }
    for(let z=5;z<=14;z++) w.set(X1-2,Y0+2,z,'cobble');
  }
  for(let y=Y1+1;y<N;y++){ w.set(8,y,0,'path'); w.set(9,y,0,'path'); }
  w.set(7,Y1+1,1,'lantern'); w.set(10,Y1+1,1,'pumpkin'); w.set(6,Y1+2,1,'pumpkin');
  [[18,6],[18,9],[20,7]].forEach(([x,y])=>{ w.set(x,y,1,'stone'); w.set(x,y,2,'mossy'); });
  const t=(x,y)=>{ for(let z=1;z<=6;z++) w.set(x,y,z,'wood'); w.set(x+1,y,5,'wood'); w.set(x+2,y,6,'wood'); w.set(x,y-1,6,'wood'); w.set(x-1,y,6,'wood'); };
  t(3,18); w.set(17,16,1,'pumpkin'); w.set(14,19,1,'pumpkin'); w.set(3,8,1,'pumpkin'); w.set(20,15,1,'bone');
  w.set(6,5,1,'chest'); w.set(7,5,1,'candy'); w.set(6,6,1,'candy');
  w.set(14,5,1,'chest'); w.set(13,5,1,'candy');
  if(stashC) w.set(13,11,1,'chest');
  for(let y=8;y<=10;y++){ w.set(6,y,1,'shelf'); w.set(6,y,2,'shelf'); }
  for(let i=0;i<3;i++) for(let z=1;z<=i+1;z++) w.set(14,9+i,z,'darkplank');
  w.set(9,7,0,'spike'); w.set(9,8,0,'spike'); w.set(12,9,0,'trapdoor'); w.set(12,5,1,'screamer');
  w.set(9,5,1,'lantern'); w.set(7,11,1,'bone'); w.set(6,11,3,'web'); w.set(X0+1,Y0+1,3,'web');
  return {w, anchors:{ghost:[9.5,10.5,2], chest:[6.5,5.5,2], me:[8.5,7.5,1]}};
}
function plotWorld(kind){
  const w=new World(), big=kind==='holder', NX=big?18:13, NY=big?13:10;
  for(let x=0;x<NX;x++) for(let y=0;y<NY;y++){ w.set(x,y,0,'grass'); if(x===NX-1||y===NY-1){ w.set(x,y,-1,'dirt'); w.set(x,y,-2,'stone'); } }
  const post=big?'iron':'darkplank';
  for(let i=0;i<NX;i++){ w.set(i,0,1,post); w.set(i,NY-1,1,post); } for(let i=0;i<NY;i++){ w.set(0,i,1,post); w.set(NX-1,i,1,post); }
  w.del(6,NY-1,1); w.del(7,NY-1,1);
  if(big){ [[0,0],[NX-1,0],[0,NY-1],[NX-1,NY-1]].forEach(([x,y])=>{ w.set(x,y,2,'iron'); w.set(x,y,3,'lantern'); }); }
  w.set(5,NY-2,1,'darkplank'); w.set(5,NY-2,2,'darkplank'); w.set(5,NY-2,3,'plank'); w.set(4,NY-2,3,'plank');
  w.set(3,3,1,'pumpkin'); w.set(NX-4,4,1,'pumpkin'); w.set(NX-3,NY-3,1,'stone'); w.set(NX-3,NY-3,2,'mossy');
  for(let y=1;y<NY;y++){ w.set(6,y,0,'path'); }
  return {w, c:[NX/2,NY/2,0]};
}
const FACE8=["HHHHHHHH","HWWWWWWH","HEEWWEEH","WEEWWEEW","WWEWWEWW","WWWWWWWW","WWWEEWWW","WWWEEWWW"];
function charWorld(variant){
  const w=new World(), cl=variant==='rival'?'cloakR':'cloak';
  for(let x=0;x<8;x++) for(let y=0;y<4;y++) for(let z=0;z<12;z++) w.set(x,y,z,z<=2?'boot':'leg');
  for(let x=0;x<8;x++) for(let y=0;y<4;y++) for(let z=12;z<24;z++) w.set(x,y,z,(y===3&&(x===3||x===4))?'trim':cl);
  for(const ax of [-4,8]) for(let x=ax;x<ax+4;x++) for(let y=0;y<4;y++) for(let z=12;z<24;z++) w.set(x,y,z,z<=14?'hand':cl);
  for(let x=0;x<8;x++) for(let y=-2;y<6;y++) for(let z=24;z<32;z++){
    const row=31-z, ch=FACE8[row][x]; let t='hood';
    if(y>=4){ t=ch==='H'?'hood':(ch==='E'&&y===5)?'eye':'mask'; }
    w.set(x,y,z,t); }
  return w;
}
const CW={};
function drawChar(canvas,ms,fx,fy,variant,keep){
  const ctx=canvas.getContext('2d'); if(!keep) ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save(); ctx.translate(fx,fy); ctx.scale(1,.5); const g=ctx.createRadialGradient(0,0,0,0,0,ms*12); g.addColorStop(0,'rgba(0,0,0,0.6)'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(-ms*12,-ms*12,ms*24,ms*24); ctx.restore();
  const w=CW[variant]||(CW[variant]=charWorld(variant));
  return render(canvas,w,{s:ms,focus:[4,2,0],fx,fy,cells:1,keep:true});
}
const GC={}; const gy=(N,s)=>GC[N+'_'+s]||(GC[N+'_'+s]=graveyard(N,s));
const HSC={}; const hs=(k,o)=>HSC[k]||(HSC[k]=house(o));
function scr(r,a){ const out={}; for(const k in a) out[k]=r.P(a[k][0],a[k][1],a[k][2]); return out; }

const PRESETS={
  loading:c=>{ const g=gy(34,7); render(c,g.w,{s:19,focus:[17,17,0],fy:c.height*.6,sky:'night',fog:.5,mist:8,vignette:.8}); },
  menu:c=>{ const g=gy(34,7); render(c,g.w,{s:24,focus:[17,17,0],fx:c.width*.6,fy:c.height*.66,sky:'night',fog:.5,mist:8,vignette:.7}); },
  menuChar:c=>{ drawChar(c,17,c.width/2,c.height-80,'me'); },
  results:c=>{ const g=gy(34,7); render(c,g.w,{s:22,focus:[17,17,0],fy:c.height*.62,sky:'dawn',fog:.55,mist:8,vignette:.8}); },
  explore:c=>{ const g=gy(44,7), s=46; const r=render(c,g.w,{s,focus:[22,23,1],sky:'night',fog:.6,mist:10,vignette:.85});
    const ms=s*2.3/32, A=scr(r,g.anchors);
    drawChar(c,ms,A.other[0],A.other[1],'rival',true); drawChar(c,ms,A.me[0],A.me[1],'me',true);
    return {tomb:A.tomb, me:A.me, other:A.other}; },
  build:c=>{ const h=hs('build',{cut:true}); const r=render(c,h.w,{s:30,focus:[10,9,1],fy:c.height*.56,sky:'night',fog:.3,mist:4,vignette:.6,ghost:[9,10,1]}); return scr(r,h.anchors); },
  heist:c=>{ const h=hs('heist',{cut:true,wall:'plank2',win:'window2',roof:'roofr',stashC:true}); const s=50;
    const r=render(c,h.w,{s,focus:[9,8,1],fx:c.width*.47,fy:c.height*.6,sky:'night',fog:.3,mist:3,vignette:.85});
    const A=scr(r,h.anchors); drawChar(c,s*2.3/32,A.me[0],A.me[1],'me',true); return A; },
  plotFree:c=>{ const p=plotWorld('free'); render(c,p.w,{s:15,focus:p.c,fy:c.height*.58}); },
  plotHolder:c=>{ const p=plotWorld('holder'); render(c,p.w,{s:11,focus:p.c,fy:c.height*.58}); },
  plotTaken:c=>{ const h=hs('small',{}); render(c,h.w,{s:8,focus:[12,12,2],fy:c.height*.62}); }
};
function draw(canvas,name){ const f=PRESETS[name]; return f?f(canvas):null; }
function icon(canvas,type){ const w=new World(); w.set(0,0,0,type); const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  render(canvas,w,{s:canvas.width*.34,focus:[.5,.5,.5],keep:true,cells:4}); }

const MC={grass:'#2b4227',forest:'#192617',road:'#463b30',water:'#132033',grave:'#2c3a2a',fence:'#1d1d21',stone:'#6a6c74',carn:'#38291f',plot:'#33502d',plotb:'#4a3626',holder:'#29331f',chapel:'#3e3a34'};
function topdown(canvas,map,o){
  o=o||{}; const ctx=canvas.getContext('2d'), cr=o.crop||{x:0,y:0,w:map.w,h:map.h}, t=canvas.width/cr.w;
  const px=(x,y,col,j)=>{ const q=rgb(col), k=1+(hash(x,y,9)-.5)*(j??.16); ctx.fillStyle='rgb('+(q[0]*k|0)+','+(q[1]*k|0)+','+(q[2]*k|0)+')';
    ctx.fillRect(Math.floor((x-cr.x)*t),Math.floor((y-cr.y)*t),Math.ceil(t)+1,Math.ceil(t)+1); };
  const g=[]; for(let x=0;x<map.w;x++){ g[x]=[]; for(let y=0;y<map.h;y++){ const n=Math.sin(x*.41)+Math.cos(y*.53)+Math.sin(x*.13+y*.21); g[x][y]=(n>1.3||x===0||y===0||x===map.w-1||y===map.h-1)?'forest':'grass'; } }
  for(const z of map.zones) for(let x=z.x;x<z.x+z.w;x++) for(let y=z.y;y<z.y+z.h;y++){ const e=x===z.x||y===z.y||x===z.x+z.w-1||y===z.y+z.h-1;
    g[x][y]=z.type==='graveyard'?(e?'fence':(x%2===1&&y%3===1?'stone':'grave')):z.type==='water'?'water':z.type==='carnival'?'carn':'chapel'; }
  for(const [x0,y0,w,h] of map.roads) for(let x=x0;x<x0+w;x++) for(let y=y0;y<y0+h;y++) if(g[x]) g[x][y]='road';
  for(const p of map.plots) for(let x=p.x;x<p.x+p.w;x++) for(let y=p.y;y<p.y+p.h;y++){ const e=x===p.x||y===p.y||x===p.x+p.w-1||y===p.y+p.h-1; g[x][y]=p.state==='holder'?(e?'stone':'holder'):(e?'plotb':'plot'); }
  for(let x=cr.x;x<cr.x+cr.w;x++) for(let y=cr.y;y<cr.y+cr.h;y++){ if(!g[x]||!g[x][y]) continue; const k=g[x][y];
    let col=MC[k]; if(k==='forest'&&hash(x,y,3)<.45) col='#121c10'; if(k==='water'&&hash(x,y,4)<.12) col='#1d2d45'; if(k==='road'&&(x%4===0)&&(y===17||y===18)) col='#54473a';
    px(x,y,col); }
  const ch=map.zones.find(z=>z.type==='chapel'); if(ch){ for(let x=ch.x+4;x<ch.x+12;x++) for(let y=ch.y+2;y<ch.y+9;y++) px(x,y,(y===ch.y+5)?'#3b2d47':'#5c5e66'); px(ch.x+7,ch.y+1,'#9a1418'); px(ch.x+7,ch.y+9,'#2a1c14',0); }
  const ca=map.zones.find(z=>z.type==='carnival'); if(ca){
    const tent=(x0,y0,s)=>{ for(let x=x0;x<x0+s;x++) for(let y=y0;y<y0+s;y++) px(x,y,(x-x0)%2?'#e8e2d4':'#9a1418',.08); };
    tent(ca.x+2,ca.y+2,4); tent(ca.x+8,ca.y+3,3); tent(ca.x+3,ca.y+8,3);
    const cx=ca.x+12, cy=ca.y+8; for(let a=0;a<24;a++){ const x=Math.round(cx+Math.cos(a/24*6.283)*2.6), y=Math.round(cy+Math.sin(a/24*6.283)*2.6); px(x,y,'#cfc8ba',.05); } px(cx,cy,'#9a1418',0); }
  for(const p of map.plots) if(p.state==='taken'){ const roofs=['#3b2d47','#4a1a1e','#2c3440','#3a3328']; const rc=roofs[(hash(p.x,p.y,1)*4)|0];
    for(let x=p.x+1;x<p.x+p.w-1;x++) for(let y=p.y+1;y<p.y+p.h-1;y++) px(x,y,(y===p.y+1)?'#6a4930':rc,.1); }
}

const SPR={
  candy:{r:["..........","o........o","oo.OOOO.oo","ooOOYYOOoo","ooOYOOYOoo","oo.OOOO.oo","o........o",".........."],p:{o:'#f2b134',O:'#e2561c',Y:'#f2ede4'}},
  lantern:{r:["...KKKK...","...K..K...","..KKKKKK..","..K.YY.K..","..KYWWYK..","..KYWWYK..","..K.YY.K..","..KKKKKK..","...KKKK..."],p:{K:'#7a7a84',Y:'#f2c14e',W:'#fff6d0'}},
  key:{r:["..SSS.....",".S...S....",".S...S....","..SSS.....","...S......","...SS.....","...S......","...SSS....","...S......"],p:{S:'#cfc8ba'}},
  firecracker:{r:["......Y...",".....Y.Y..","....K.....","...RRR....","...RWR....","...RRR....","...RWR....","...RRR....","...RRR...."],p:{R:'#e01b22',W:'#f2ede4',K:'#3a3a40',Y:'#f2c14e'}},
  smoke:{r:["....KK....","...K......","..GGGG....",".GGGGGG...",".GGWGGG...",".GGGGGG...","..GGGG...."],p:{K:'#9a958c',G:'#6a6c74',W:'#cfc8ba'}},
  map:{r:["PPPPPPPP","PGGPPRRP","PGPPPPRP","PPPRPPPP","PPRRPGGP","PPPPPGPP","PPPPPPPP"],p:{P:'#d9cfb4',G:'#4f6b45',R:'#9a1418'}},
  skull:{r:["..BBBBBB..",".BBBBBBBB.",".BKKBBKKB.",".BKKBBKKB.",".BBBKKBBB.","..BBBBBB..","..B.BB.B.."],p:{B:'#e8e2d4',K:'#0a0a0c'}},
  house:{r:["....RR....","...RRRR...","..RRRRRR..",".RRRRRRRR.","..PPPPPP..","..PYPPYP..","..PPKKPP..","..PPKKPP.."],p:{R:'#9a1418',P:'#8a6644',Y:'#f2c14e',K:'#1c120c'}},
  alert:{r:["....RR....","...RRRR...","...RWWR...","..RRWWRR..","..RRWWRR..",".RRRRRRRR.",".RRRWWRRR.","RRRRRRRRRR"],p:{R:'#e01b22',W:'#0a0a0c'}},
  mic:{r:["...WWW...","..WWWWW..","..WWWWW..","..WWWWW..",".W.WWW.W.",".W.....W.","..WWWWW..","....W....","..WWWWW.."],p:{W:'#f2ede4'}},
  heart:{r:["..RR.RR..",".RRRRRRR.","RRWRRRRRR","RRRRRRRRR",".RRRRRRR.","..RRRRR..","...RRR...","....R...."],p:{R:'#e01b22',W:'#ff8a8a'}},
  bag:{r:["...KKKK...","..K....K..",".OOOOOOOO.","OOYOOOOYOO","OOOOYYOOOO","OOOYOOYOOO",".OOOOOOOO.","..OOOOOO.."],p:{O:'#c8641a',Y:'#ffcf5a',K:'#7a7a84'}},
  boot:{r:["..BB....","..BB....","..BB....","..BBBB..","..BBBBBB"],p:{B:'#cfc8ba'}}
};
function sprite(canvas,name){ const s=SPR[name]; if(!s) return; const ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H); const cols=s.r[0].length, rows=s.r.length, k=Math.floor(Math.min(W/cols,H/rows)); const ox=Math.floor((W-cols*k)/2), oy=Math.floor((H-rows*k)/2);
  s.r.forEach((row,j)=>[...row].forEach((ch,i)=>{ if(ch!=='.'){ ctx.fillStyle=s.p[ch]; ctx.fillRect(ox+i*k,oy+j*k,k,k); } })); }

window.Voxel={draw,icon,topdown,sprite,render,T};
})();

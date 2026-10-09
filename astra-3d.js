import * as THREE from './vendor/astra-three.js?v=detail-1';

// All school geometry is built in metres and can be exported as a portable GLB.
const rooms = [
  {id:'dev',name:'開発部屋',short:'開発',text:'アイデアをコードに。仲間と一緒に、動くものをつくる教室。',color:0x769b86},
  {id:'design',name:'デザイン部屋',short:'デザイン',text:'色と形から考える、使う人にやさしい体験づくり。',color:0xc68a79},
  {id:'scrum',name:'スクラム部屋',short:'スクラム',text:'今日の進み具合と次の一歩を、チームで共有する場所。',color:0xb8a368},
  {id:'library',name:'資料部屋',short:'資料',text:'参考資料や学びの記録を集めて、次の発見につなげる。',color:0x79949c},
  {id:'meeting',name:'会議室',short:'会議',text:'顔を合わせて話す。相談と意思決定のための落ち着いた部屋。',color:0x92967a},
  {id:'communication',name:'コミュニケーションルーム',short:'交流',text:'ちょっとひと息。雑談から、新しいアイデアが生まれる場所。',color:0xc89970},
  {id:'study',name:'勉強部屋',short:'勉強',text:'一人でも、みんなでも。自分のペースで学びを深める。',color:0x8aaa96},
  {id:'presentation',name:'プレゼンルーム',short:'プレゼン',text:'つくったものを伝える、見せる。挑戦を分かち合う教室。',color:0x899eb9},
  {id:'editing',name:'編集部屋',short:'編集',text:'文章・表・スライドを整えて、伝わる成果物に仕上げる。',color:0xb18f9d},
].map((r,i)=>({...r,index:i,side:i<5?-1:1,x:i<5?(i-2)*6.6:(i-6.5)*8.25,width:i<5?6.6:8.25}));
const $=id=>document.getElementById(id);
const canvas=$('campus'),status=$('status');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xdccce4);scene.fog=new THREE.Fog(0xe8cabe,44,105);
const model=new THREE.Group();model.name='Astra_Digital_Engineer_School';scene.add(model);
const camera=new THREE.PerspectiveCamera(58,1,.08,160);camera.rotation.order='YXZ';
let renderer,svgFallback=false;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}
catch(error){
  svgFallback=true;renderer=new THREE.SVGRenderer();renderer.setQuality('low');renderer.setPrecision(2);
  renderer.domElement.classList.add('svg-scene');renderer.domElement.setAttribute('aria-hidden','true');
  $('viewport').insertBefore(renderer.domElement,canvas);canvas.classList.add('svg-input');
  document.querySelector('.model-note').textContent='放課後の校舎 · 軽量表示';
}

// Deterministic painted washes make surfaces feel illustrated while preserving real geometry.
function paintedTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,256,256);let seed=287;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);for(let i=0;i<110;i++){ctx.fillStyle=`rgba(154,130,110,${.015+rand()*.035})`;ctx.beginPath();ctx.ellipse(rand()*256,rand()*256,10+rand()*45,2+rand()*10,rand()*.7,0,Math.PI*2);ctx.fill();}for(let i=0;i<12000;i++){ctx.fillStyle=rand()>.5?'#8978650a':'#ffffff19';ctx.fillRect(rand()*256,rand()*256,1,1);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
const wash=paintedTexture();
const materials=new Map();
function mat(color,options={}){const key=JSON.stringify([color,options]);if(!materials.has(key)){const c=new THREE.Color(color);materials.set(key,new THREE.MeshStandardMaterial({color:c,map:options.transparent?null:wash,roughness:.98,...options}));}return materials.get(key);}
const unitBox=new THREE.BoxGeometry(1,1,1),inkEdges=new THREE.EdgesGeometry(unitBox),ink=new THREE.LineBasicMaterial({color:0x78676a,transparent:true,opacity:.2});
function box(parent,name,x,y,z,w,h,d,color,options={}){const geometry=(w>5||d>5)&&h>.2?new THREE.BoxGeometry(1,1,1,Math.max(1,Math.ceil(w/1.8)),Math.max(1,Math.ceil(h/.8)),Math.max(1,Math.ceil(d/1.8))):unitBox;const mesh=new THREE.Mesh(geometry,mat(color,options));mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;if(false){const lines=new THREE.LineSegments(inkEdges,ink);lines.name='Illustrated edges';mesh.add(lines);}parent.add(mesh);return mesh;}
function sphere(parent,x,y,z,r,color,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
const roundedCache=new Map();
function roundedPanel(parent,name,x,y,z,w,h,depth,color,rotation=0){
  const key=[w,h,depth].join(',');let geometry=roundedCache.get(key);
  if(!geometry){const radius=Math.min(.065,w*.14,h*.14),a=-w/2,b=-h/2,shape=new THREE.Shape();shape.moveTo(a+radius,b);shape.lineTo(a+w-radius,b);shape.quadraticCurveTo(a+w,b,a+w,b+radius);shape.lineTo(a+w,b+h-radius);shape.quadraticCurveTo(a+w,b+h,a+w-radius,b+h);shape.lineTo(a+radius,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-radius);shape.lineTo(a,b+radius);shape.quadraticCurveTo(a,b,a+radius,b);geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.007,bevelThickness:.006,curveSegments:4});geometry.translate(0,0,-depth/2);roundedCache.set(key,geometry);}
  const mesh=new THREE.Mesh(geometry,mat(color,{roughness:.65}));mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.x=rotation;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const rodGeometry=new THREE.CylinderGeometry(1,1,1,8);
function tube(parent,name,from,to,radius=.012,color=0x7d8587){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);const mesh=new THREE.Mesh(rodGeometry,mat(color,{metalness:.65,roughness:.32,map:null}));mesh.name=name;mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radius,delta.length(),radius);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;}
function label(parent,text,x,y,z,width,height,rotation=0,bg='#355b49',fg='#fff9dd'){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*height/width);const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=fg+'88';ctx.lineWidth=3;ctx.strokeRect(12,12,c.width-24,c.height-24);
  const size=Math.min(c.height*.54,c.width/(text.length*.98));ctx.font=`500 ${size}px "Noto Sans JP", Meiryo, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;ctx.fillText(text,c.width/2,c.height*.52);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.userData.label={text,width,height,bg,fg};parent.add(mesh);return mesh;
}
function woodTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');let seed=92;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);ctx.fillStyle='#b68b71';ctx.fillRect(0,0,512,512);for(let row=0;row<8;row++){const y=row*64;ctx.fillStyle=['#b78e76','#c09c80','#b48b72','#c7a58b'][row%4];ctx.fillRect(0,y,512,63);ctx.fillStyle='#a6805555';ctx.fillRect((row%2)*256,y,2,64);for(let i=0;i<18;i++){ctx.strokeStyle=rand()>.5?'#99734426':'#f1d8a52c';ctx.beginPath();const yy=y+rand()*62;ctx.moveTo(0,yy);ctx.bezierCurveTo(130,yy+rand()*5,360,yy-rand()*5,512,yy+rand()*3);ctx.stroke();}}const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(8,7);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
const floorMaterial=new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.98,color:0xf2d8b8});
const floor=new THREE.Mesh(new THREE.BoxGeometry(33.6,.2,28),floorMaterial);floor.position.y=-.12;floor.receiveShadow=true;model.add(floor);
const ceiling=new THREE.Group();ceiling.name='Ceilings_hidden_in_overview';model.add(ceiling);
box(ceiling,'Corridor ceiling',0,3.55,0,33.6,.16,14,0xf5eee0);
const walls=new THREE.Group();walls.name='Walls';model.add(walls);
const pickTargets=[];
const hallZ=6.6,roomDepth=7;
// Front walls contain genuine openings; rooms continue behind them.
for(const room of rooms){
  const g=new THREE.Group();g.name=`${room.index+1}_${room.id}`;g.userData={roomId:room.id,label:room.name};model.add(g);room.group=g;
  const {x,width:w,side:s}=room,z=s*hallZ,doorX=x-w*.27;
  box(walls,'Wall above doorway',x,3.12,z,w,.72,.18,0xf5eddb);
  const leftEdge=x-w/2,rightEdge=x+w/2,windowX=x+w*.2,windowWidth=w*.36;
  for(const [a,b] of [[leftEdge,doorX-.68],[doorX+.68,rightEdge]]){
    const cuts=[a,...[windowX-windowWidth/2,windowX+windowWidth/2].filter(t=>t>a&&t<b),b];
    for(let k=0;k<cuts.length-1;k++){
      const l=cuts[k],r=cuts[k+1],mid=(l+r)/2;
      if(mid>windowX-windowWidth/2&&mid<windowX+windowWidth/2){
        box(walls,'Wall below corridor window',mid,.625,z,r-l,1.25,.18,0xf0e9d7);
        box(walls,'Wall above corridor window',mid,2.565,z,r-l,.27,.18,0xf0e9d7);
      }else box(walls,'Plaster wall',mid,1.35,z,r-l,2.7,.18,0xf0e9d7);
    }
    box(walls,'Wood wainscot',(a+b)/2,.43,z-s*.11,b-a,.86,.065,0xb99269);
    box(walls,'Wood wall cap',(a+b)/2,.9,z-s*.15,b-a,.075,.1,0x8f7456);
  }
  // Corridor glazing offers a view into each classroom.
  for(const dx of [-windowWidth/2,windowWidth/2])box(g,'Interior window side frame',windowX+dx,1.84,z-s*.16,.07,1.17,.095,0x967b57);
  for(const yy of [1.27,2.41])box(g,'Interior window horizontal frame',windowX,yy,z-s*.16,windowWidth,.07,.095,0x967b57);
  box(g,'Interior blue glazing',windowX,1.84,z-s*.22,w*.36-.13,.98,.028,0xb5d7d8,{transparent:true,opacity:.38,depthWrite:false});
  for(const xx of [-.5,0,.5])box(g,'Window mullion',windowX+xx*w*.33,1.84,z-s*.26,.045,1.08,.05,0xe7dfc8);
  // A partly open sliding timber door gives a tangible entrance.
  const door=box(g,'Sliding classroom door',doorX+.47,1.27,z+s*.1,1.21,2.54,.09,0xc19b6f);door.userData.roomId=room.id;pickTargets.push(door);
  box(g,'Door glass',doorX+.47,1.92,z-s*.005,.96,.82,.035,0xb9d7d0,{transparent:true,opacity:.52,depthWrite:false});
  box(g,'Door handle',doorX+.91,1.16,z-s*.08,.045,.25,.05,0x615c46,{metalness:.45});
  for(const dx of [-.72,.72])box(g,'Door jamb',doorX+dx,1.4,z-s*.07,.075,2.8,.14,0x8b7054);
  box(g,'Door rail',doorX,2.75,z-s*.08,1.52,.09,.15,0x8b7054);
  const sign=label(g,room.name,x,3.07,z-s*.16,Math.min(w-.6,4.2),.4,s>0?Math.PI:0);sign.userData.roomId=room.id;pickTargets.push(sign);
  const badge=label(g,String(room.index+1).padStart(2,'0'),doorX-.94,2.28,z-s*.15,.36,.35,s>0?Math.PI:0,'#e8ddbf','#53644d');badge.userData.roomId=room.id;pickTargets.push(badge);
  box(walls,'Room back lower wall',x,.5,s*13.6,w,1,.18,0xefe6cf);
  box(walls,'Room back upper wall',x,3.16,s*13.6,w,.62,.18,0xefe6cf);
  for(const xx of [-.5,0,.5])box(walls,'Exterior window pier',x+xx*(w-.18),1.9,s*13.6,.17,1.8,.22,0xdcd5bb);
  box(g,'Exterior glazing',x,1.88,s*13.6,w-.3,1.7,.035,0xc2e3e1,{transparent:true,opacity:.18,depthWrite:false});
  box(g,'Exterior window horizontal frame',x,1.8,s*13.49,w,.045,.08,0xe7e4d0);
  box(g,'Window sill',x,1.04,s*13.45,w,.12,.36,0xe8dfc5);
  for(const edge of [leftEdge,rightEdge])box(walls,'Classroom partition',edge,1.75,s*10.1,.16,3.5,7,0xece4d4);
  box(ceiling,'Classroom ceiling',x,3.55,s*10.1,w,.16,7,0xf5eee0);
  for(const edge of [leftEdge+.1,rightEdge-.1]){
    box(g,'Painted skirting board',edge,.085,s*10.1,.065,.17,6.9,0xaaa493);
    box(g,'Wall cornice',edge,3.36,s*10.1,.07,.085,6.9,0xe2ddcf);
    box(g,'Electrical outlet plate',edge, .34,s*9.4,.018,.105,.08,0xf8f4e9);
    for(const yy of [.32,.36])box(g,'Outlet socket',edge+(edge<x?.013:-.013),yy,s*9.4,.012,.016,.034,0x757773);
  }
  box(g,'Window radiator',x,.62,s*13.24,w*.6,.5,.17,0xd9d6c9);
  for(let i=0;i<Math.floor(w*4);i++)box(g,'Radiator fin',x-w*.29+i*.15,.62,s*13.11,.07,.46,.045,0xebe6d8);
  box(g,'Curtain rail',x,2.91,s*13.38,w-.18,.045,.065,0x989994);
  for(const edge of [x-w*.42,x+w*.42])for(let i=0;i<4;i++)box(g,'Folded linen curtain',edge+(i-1.5)*.08,1.96,s*(13.35+(i%2)*.04),.075,1.83,.07,0xe6dcca);
  box(g,'Wall clock frame',x-w*.28,2.78,s*12.99,.3,.3,.045,0x717d78);
  label(g,'15:30',x-w*.28,2.78,s*12.96,.26,.2,s>0?Math.PI:0,'#f2eee1','#53615d');

  buildRoomInterior(g,room);
  // Warm pools of daylight are actual coplanar meshes, portable in the GLB.
  for(let j=0;j<3;j++){
    const sunpatch=box(g,'Window light',x+(j-1)*w*.25,.006,s*10.55,w*.18,.012,4.2,0xffe8a7,{transparent:true,opacity:.24,depthWrite:false});sunpatch.rotation.y=-.28*s;sunpatch.castShadow=false;
  }
}
function buildRoomInterior(g,r){
  const {x,side:s,width:w}=r;
  const B=(name,dx,y,z,bw,bh,bd,color)=>box(g,name,x+dx,y,s*z,bw,bh,bd,color);
  const L=(text,dx,y,z,width=2.8,height=.38,bg='#355b49',fg='#fff9dd')=>label(g,text,x+dx,y,s*z,width,height,s>0?Math.PI:0,bg,fg);
  const chair=(dx,z,color=0xb9996f)=>{
    roundedPanel(g,'Contoured plywood seat',x+dx,.455,s*z,.44,.43,.027,color,Math.PI/2);
    const back=roundedPanel(g,'Curved plywood backrest',x+dx,.82,s*(z-.22),.43,.28,.022,color);back.rotation.x=s*.1;
    for(const a of [-.185,.185])for(const b of [-.17,.17]){tube(g,'Tubular steel chair leg',[x+dx+a,.43,s*(z+b)],[x+dx+a*1.17,.035,s*(z+b*1.2)]);B('Rubber chair foot',dx+a*1.17,.028,z+b*1.2,.04,.035,.04,0x3d4546);}
    for(const a of [-.185,.185])tube(g,'Backrest upright',[x+dx+a,.4,s*(z-.17)],[x+dx+a,.88,s*(z-.235)]);
    tube(g,'Chair lower brace',[x+dx-.185,.22,s*(z+.17)],[x+dx+.185,.22,s*(z+.17)],.009);
    for(const a of [-.155,.155])B('Backrest screw',dx+a,.82,z-.236,.012,.012,.006,0xb0b3b0);
  };
  const table=(dx,z,bw=2,bd=1.1)=>{B('Work table',dx,.745,z,bw,.065,bd,0xc9aa7b);for(const a of [-bw/2+.12,bw/2-.12])for(const b of [-bd/2+.12,bd/2-.12])B('Table leg',dx+a,.38,z+b,.07,.72,.07,0x718478);};
  const screen=(dx,z,text,color=0x78afa6)=>{B('Monitor',dx,1.23,z,1.08,.66,.08,0x53665e);B('Monitor stand',dx,.94,z,.06,.25,.08,0x53665e);B('Monitor base',dx,.84,z,.3,.04,.22,0x53665e);B('Monitor image',dx,1.23,z-.055,.95,.54,.015,color);L(text,dx,1.23,z-.067,.88,.33,'#294f48');B('Keyboard',dx,.855,z-.34,.65,.035,.2,0x8d9991);};
  const board=(title,items)=>{B('Purpose board',w*.26,1.94,12.99,w*.43,1.45,.08,r.color);L(title,w*.26,2.42,12.93,w*.38,.3);items.forEach((t,i)=>L(t,w*.26,2.08-i*.28,12.93,w*.36,.23,'#f3edda','#355b49'));};
  L(r.name,0,3.06,12.96,Math.min(w-1,4.6),.4);

  if(r.id==='dev'){
    for(const dx of [-.25,w*.27])for(const z of [9,11.2]){table(dx,z,1.7,.95);chair(dx,z-1);screen(dx,z+.14,'CODE  { }');}
    B('Server cabinet',-w*.4,1,11.6,.55,2,1,0x59685e);for(let i=0;i<7;i++){B('Server rack',-w*.4,.35+i*.2,11.08,.45,.13,.035,0x39493f);B('Server light',-w*.48,.35+i*.2,11.05,.035,.035,.025,0x9ce29b);}board('共同開発',['設計 → 実装 → テスト','コードレビュー']);
  }else if(r.id==='design'){
    table(.35,10.1,3.1,1.8);chair(-.7,8.8);chair(1.3,8.8);B('Drawing tablet',-.4,.88,10,.8,.055,.6,0x63766d);B('Sketch paper',.65,.86,10,.85,.035,.62,0xfff7e4);
    for(let i=0;i<6;i++)B('Colour sample',-.8+i*.42,.88,10.6,.3,.04,.23,[0xc78376,0xe7bd68,0x8caa8b,0x79a4ba,0xa59bc1,0xddaa8d][i]);board('デザインボード',['配色・レイアウト','画面の試作']);
    for(let i=0;i<3;i++)B('Design poster',-w*.32,1.6,8.8+i*1.3,.08,1.1,.95,[0xdda990,0x9ebcc0,0xc6b18f][i]);
  }else if(r.id==='scrum'){
    table(.3,10.4,2.3,1.25);chair(-.3,9.35);chair(.9,9.35);
    for(let i=0;i<3;i++){const dx=(i-1)*1.7;B('Kanban column',dx,1.88,12.95,1.5,1.65,.08,0xece3c6);L(['未着手','進行中','完了'][i],dx,2.5,12.89,1.38,.3);for(let j=0;j<3;j++)B('Task sticky',dx+(j%2-.5)*.55,2.15-Math.floor(j/2)*.44,12.86,.43,.32,.025,[0xe3bf72,0x9fbdb0,0xd7a694][i]);}
    L('朝会・進捗共有',0,2.85,12.9,3,.24);
  }else if(r.id==='library'){
    for(const zz of [8.4,10.3,12.2])bookshelf(g,x-w*.42,s*zz);
    table(.25,10.25,2.15,1.1);chair(.25,9.25);B('Open book',.25,.87,10.25,.7,.06,.5,0xfff4d8);board('資料を探す',['参考書・仕様書','共有資料・学習記録']);
  }else if(r.id==='meeting'){
    table(.35,10.1,2,3.2);for(const zz of [9.1,10.2,11.3]){chair(-1.25,zz);chair(1.95,zz);}B('Conference speaker',.35,.9,10.1,.3,.12,.3,0x65756a);board('会議・相談',['議題 → 意見 → 決定','次のアクション']);
  }else if(r.id==='communication'){
    for(const dx of [-1.5,1.5]){B('Lounge sofa seat',dx,.48,10.8,1.4,.35,2.5,0xbcaa81);B('Lounge sofa back',dx+(dx<0?-.6:.6),.96,10.8,.2,.9,2.5,0x9eae86);for(const zz of [10.05,11.55])B('Cushion',dx,.73,zz,.8,.17,.65,0xcdb78e);}table(0,10.8,1.35,1.6);for(const dx of [-.32,.32])B('Coffee cup',dx,.91,10.8,.13,.2,.13,0xf0e7cf);board('テーマで話す',['雑談・相談','アイデア交換']);
  }else if(r.id==='study'){
    for(const dx of [-.5,1.6])for(const zz of [9,11.4]){table(dx,zz,1.6,1);chair(dx,zz-1);B('Study notebook',dx,.87,zz,.6,.03,.45,0xf8eed7);B('Desk partition',dx,.99,zz+.48,1.6,.46,.05,0xadc1a5);}board('集中して学ぶ',['ITパスポート','TOEIC・分野別演習']);
  }else if(r.id==='presentation'){
    B('Presentation stage',.1,.17,12,5.7,.32,1.55,0xb79975);B('Projection screen frame',.1,2.15,13.05,4.9,1.55,.12,0x6d8279);B('Projection screen',.1,2.15,12.97,4.65,1.32,.025,0xf6f0de);L('プレゼンテーション',.1,2.34,12.94,4.3,.35);L('成果を伝える・発表する',.1,1.94,12.94,3.8,.24,'#ece2c9','#355b49');B('Lectern',-2.05,.88,11.7,.68,1.25,.5,0x947b58);for(const zz of [8.6,9.9])for(const dx of [-1.5,0,1.5])chair(dx,zz);
  }else if(r.id==='editing'){
    table(.35,10.1,4.1,1.6);for(const dx of [-1.1,.35,1.8])chair(dx,8.7);
    ['Word','Excel','PowerPoint'].forEach((t,i)=>screen(-1.1+i*1.45,10.55,t,[0x8aaac3,0x93b8a0,0xcea48f][i]));
    board('共同編集',['文章・表・スライド','読み込む → 編集 → 保存']);
  }
  r.layout={dev:'PC作業席とサーバーラック',design:'大きな制作机と配色サンプル',scrum:'未着手・進行中・完了のタスクボード',library:'本棚と閲覧席',meeting:'会議テーブルと議題ボード',communication:'向かい合うソファとカフェテーブル',study:'仕切り付きの個別学習席',presentation:'壇上・スクリーン・観客席',editing:'Word・Excel・PowerPointの共同編集席'}[r.id];
}
function desk(parent,x,z,room){
  box(parent,'Desk top',x,.78,z,1.05,.085,.66,0xd4b483);
  for(const dx of [-.44,.44])for(const dz of [-.25,.25])box(parent,'Desk leg',x+dx,.38,z+dz,.035,.73,.035,0x727f75,{metalness:.35});
  box(parent,'Chair seat',x-.7,.46,z,.43,.06,.43,0xbc9365);
  box(parent,'Chair back',x-.91,.75,z,.045,.38,.44,0xc4a16f);
  for(const dx of [-.85,-.55])for(const dz of [-.16,.16])box(parent,'Chair leg',x+dx,.23,z+dz,.026,.44,.026,0x788479);
  if(['dev','design','editing'].includes(room.id)){
    box(parent,'Laptop keyboard',x,.84,z,.48,.028,.34,0x68786f);const screen=box(parent,'Laptop screen',x+.2,1.025,z,.026,.35,.48,0x596961);screen.rotation.z=-.12;
    box(parent,'Laptop display',x+.177,1.025,z,.01,.28,.4,0xa9d9d0,{emissive:0x6fafa1,emissiveIntensity:.1});
  }else{box(parent,'Notebook',x,.837,z,.35,.023,.26,room.color);box(parent,'Notebook pages',x-.013,.849,z,.32,.013,.24,0xf8f2d9);}
}
function bookshelf(parent,x,z){box(parent,'Bookcase back',x,1.08,z,.12,2.1,1.5,0xa17c52);for(const y of [.1,.7,1.35,2.05])box(parent,'Book shelf',x+.22,y,z,.55,.075,1.5,0xb79768);for(let n=0;n<11;n++)for(const y of [.38,1,1.65])box(parent,'Book',x+.22,y,z-.63+n*.125,.31,.43+(n%3)*.025,.085,[0x799985,0xb68d75,0xc2b077,0x8b9fa6][n%4]);}
// The glazed ends keep the corridor bright and make the outside landscape visible.
for(const side of [-1,1]){
  box(walls,'Corridor end base',side*16.6,.44,0,.2,.88,13.4,0xe6dcc5);
  box(walls,'Corridor end top',side*16.6,3.18,0,.2,.7,13.4,0xefe7d5);
  for(let z=-6.5;z<=6.5;z+=2.16)box(walls,'End window upright',side*16.6,1.88,z,.23,2.15,.085,0xdfdec8);
  box(model,'Corridor end glass',side*16.6,1.86,0,.035,1.92,13,0xbfe3df,{transparent:true,opacity:.12,depthWrite:false});
  box(model,'Window crossbar',side*16.48,1.83,0,.09,.06,13.2,0xe7e3cd);
  box(model,'Window ledge',side*16.37,.94,0,.5,.12,13.2,0xd9cbae);
}
for(let x=-13.2;x<14;x+=6.6){
  box(ceiling,'Ceiling timber rib',x,3.41,0,.18,.2,13.2,0xb0a18a);
  for(const z of [-3,3]){box(ceiling,'Pendant housing',x,3.26,z,1.25,.09,.32,0xded6bf);box(ceiling,'Pendant diffuser',x,3.20,z,1.1,.024,.26,0xfff3cb,{emissive:0xffebba,emissiveIntensity:.7});}
}
// Hall furniture and architectural details.
for(const side of [-1,1]){
  box(model,'Bench seat',side*15.3,.46,2.4,.75,.12,2.7,0xad865d);
  box(model,'Bench back',side*15.62,.82,2.4,.1,.62,2.7,0xb59067);
  for(const z of [1.3,3.5])box(model,'Bench legs',side*15.3,.21,z,.56,.42,.09,0x64776a);
  plant(model,side*15.3,-4.9,.8);
}
label(model,'つくる。まなぶ。つながる。',0,2.88,6.41,3.6,.25,Math.PI,'#ebe3ce','#627763');
const landscape=new THREE.Group();landscape.name='Garden';model.add(landscape);
box(landscape,'Lawn',0,-.35,0,90,.2,80,0xadc98e);
box(landscape,'Path',0,-.225,18,38,.04,3.5,0xd7cdb0);
box(landscape,'Foundation',0,-.2,0,34.4,.22,28.6,0xb8b7a1);
for(let i=0;i<16;i++){const angle=i*Math.PI*2/16;tree(landscape,Math.cos(angle)*(24+(i%3)*2),Math.sin(angle)*(23+(i%2)*4),.8+(i%4)*.12);}
function plant(parent,x,z,size){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.28*size,.21*size,.42*size,10),mat(0xc39171));pot.position.set(x,.21*size,z);parent.add(pot);for(let i=0;i<5;i++)sphere(parent,x+Math.sin(i*2.4)*.17*size,.6*size+(i%2)*.22*size,z+Math.cos(i*2.4)*.17*size,.26*size,[0x658b5d,0x80a06a,0x98af7a][i%3],.65,1.8,.65);}
function tree(parent,x,z,s){box(parent,'Tree trunk',x,1.5*s,z,.36*s,3*s,.36*s,0x96815d);for(let i=0;i<5;i++)sphere(parent,x+Math.sin(i*2.4)*1.1*s,3.4*s+(i%2)*.8*s,z+Math.cos(i*2.4)*1.1*s,1.6*s,[0x93b77d,0xa7c78a,0x7da26e,0xb0ca90][i%4],1,1.1,1);}
for(let i=0;i<9;i++)sphere(landscape,(i-4)*11,22+(i%3)*3,-42,3.5,0xffffff,2.3,.6,1.1);
const skyCanvas=document.createElement('canvas');skyCanvas.width=1024;skyCanvas.height=512;const skyContext=skyCanvas.getContext('2d');const skyGradient=skyContext.createLinearGradient(0,0,0,512);skyGradient.addColorStop(0,'#879bbc');skyGradient.addColorStop(.48,'#c9c5dc');skyGradient.addColorStop(.78,'#edc9bb');skyGradient.addColorStop(1,'#f4debf');skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,1024,512);for(let i=0;i<24;i++){const px=(i*173)%1080,py=180+(i*37)%160;skyContext.fillStyle=i%2?'#fff1da70':'#fae5d559';skyContext.beginPath();skyContext.ellipse(px,py,80+i%3*25,7+i%4*3,-.04,0,Math.PI*2);skyContext.fill();}const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;if(!svgFallback)scene.background=skyTexture;
// Long, soft-looking sunlight on the floor is visible in both renderers.
for(const side of [-1,1])for(let i=0;i<5;i++){const patch=box(model,'Evening window light',(i-2)*6,0.014,side*3.4,1.6,.009,4.8,0xffdfae,{transparent:true,opacity:.19,depthWrite:false});patch.rotation.y=side*.42;patch.castShadow=false;}
const hemi=new THREE.HemisphereLight(0xdadff4,0x927d91,1.65);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffcf97,2.1);sun.position.set(30,14,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:25,bottom:-25,near:1,far:90});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun);
const fill=new THREE.DirectionalLight(0xa7bfd8,.65);fill.position.set(-18,10,-20);scene.add(fill);
// A small, low-intensity light in each room keeps interior details legible.
for(const r of rooms){const light=new THREE.PointLight(0xffedcd,7,10,2);light.position.set(r.x,2.8,r.side*10);scene.add(light);}

let mode='hall',selected=null,yaw=0,pitch=0,overviewAngle=.65,overviewRadius=45,drag=null,lastTime=0,dirty=true;
const moving=new Set(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const keys={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',q:'turnLeft',e:'turnRight'};
function reset(){mode='hall';ceiling.visible=true;camera.position.set(0,1.65,5.2);yaw=0;pitch=.005;moving.clear();$('location').textContent='共同開発棟 · 中央廊下';$('reset').classList.add('active');$('overview').classList.remove('active');$('instructions').innerHTML='ドラッグで見回す <span>／</span> WASD・矢印で歩く <span>／</span> 部屋札をクリック';closeCard();dirty=true;}
function overview(){mode='overview';ceiling.visible=false;moving.clear();$('location').textContent='校舎全体 · 屋根を外した俯瞰';$('overview').classList.add('active');$('reset').classList.remove('active');$('instructions').textContent='ドラッグ・左右の回転ボタンで回す ／ ホイール・前後ボタンで拡大縮小 ／ 教室を選ぶ';closeCard();dirty=true;}
function selectRoom(room){selected=room;$('room-card').hidden=false;$('room-number').textContent=`ROOM ${String(room.index+1).padStart(2,'0')} / ${room.side<0?'正面の教室':'反対側の教室'}`;$('room-name').textContent=room.name;$('room-description').textContent=room.text+' 内装：'+room.layout+'。';$('open-room').href=`./#r=${room.id}`;document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('selected',b.dataset.room===room.id));status.textContent=`${room.name}を選択しました。「教室の中を見る」で室内へ移動できます。`;dirty=true;}
function closeCard(){$('room-card').hidden=true;document.querySelectorAll('[data-room]').forEach(b=>b.classList.remove('selected'));selected=null;}
function visit(){if(!selected)return;const room=selected;mode='room';ceiling.visible=true;camera.position.set(room.x+.1,1.65,room.side*7.6);yaw=room.side>0?Math.PI:0;pitch=-.16;moving.clear();$('location').textContent=`ROOM ${String(room.index+1).padStart(2,'0')} · ${room.name}`;status.textContent=`${room.name}の室内です。「廊下へ」で中央廊下に戻れます。`;$('reset').classList.remove('active');$('overview').classList.remove('active');$('room-card').hidden=true;dirty=true;}
$('room-list').innerHTML=rooms.map(r=>`<button data-room="${r.id}"><small>${String(r.index+1).padStart(2,'0')} · ${r.side<0?'FRONT':'BACK'}</small>${r.name}</button>`).join('');
document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>{const room=rooms.find(r=>r.id===b.dataset.room);if(!renderer){location.href=`./#r=${room.id}`;return;}selectRoom(room);}));
$('reset').onclick=reset;$('overview').onclick=overview;$('turn').onclick=()=>{if(mode==='overview')overviewAngle+=Math.PI;else{yaw+=Math.PI;pitch=0;}moving.clear();dirty=true;};$('close-card').onclick=closeCard;$('visit').onclick=visit;
function pick(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(model.children,true);for(const hit of hits){if(!hit.object.visible)continue;if(hit.object.userData.roomId)return rooms.find(r=>r.id===hit.object.userData.roomId);if(hit.object.material?.transparent)continue;return null;}return null;}
canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;canvas.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch,angle:overviewAngle,moved:false};canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';});
canvas.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(mode==='overview')overviewAngle=drag.angle-dx*.005;else{yaw=drag.yaw-dx*.004;pitch=THREE.MathUtils.clamp(drag.pitch-dy*.003,-.85,.85);}dirty=true;});
canvas.addEventListener('pointerup',event=>{if(!drag)return;const clicked=!drag.moved;drag=null;canvas.style.cursor='grab';if(clicked){const room=pick(event);if(room)selectRoom(room);}});canvas.addEventListener('pointercancel',()=>{drag=null;canvas.style.cursor='grab';});
canvas.addEventListener('wheel',event=>{if(mode!=='overview')return;event.preventDefault();overviewRadius=THREE.MathUtils.clamp(overviewRadius+event.deltaY*.025,23,70);dirty=true;},{passive:false});
canvas.addEventListener('keydown',event=>{const key=keys[event.key]||keys[event.key.toLowerCase()];if(key){event.preventDefault();moving.add(key);}if(event.key==='Escape')reset();});
window.addEventListener('keyup',event=>moving.delete(keys[event.key]||keys[event.key.toLowerCase()]));window.addEventListener('blur',()=>moving.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)moving.clear();});canvas.addEventListener('blur',()=>moving.clear());
document.querySelectorAll('[data-move]').forEach(button=>{button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);moving.add(button.dataset.move);});for(const e of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(e,()=>moving.delete(button.dataset.move));});
function move(dt){if(!moving.size)return;const f=Number(moving.has('forward'))-Number(moving.has('back')),side=Number(moving.has('right'))-Number(moving.has('left')),turn=Number(moving.has('turnLeft'))-Number(moving.has('turnRight'));if(mode==='overview'){overviewAngle+=(turn-side)*dt;overviewRadius=THREE.MathUtils.clamp(overviewRadius-f*dt*15,23,70);}else{yaw+=turn*dt*1.4;const speed=dt*3.8/Math.max(1,Math.hypot(f,side));camera.position.x+=(-Math.sin(yaw)*f+Math.cos(yaw)*side)*speed;camera.position.z+=(-Math.cos(yaw)*f-Math.sin(yaw)*side)*speed;const bounds=mode==='room'&&selected?{x1:selected.x-selected.width/2+.45,x2:selected.x+selected.width/2-.45,z1:selected.side<0?-13.1:7.1,z2:selected.side<0?-7.1:13.1}:{x1:-14.55,x2:14.55,z1:-5.9,z2:5.9};camera.position.x=THREE.MathUtils.clamp(camera.position.x,bounds.x1,bounds.x2);camera.position.z=THREE.MathUtils.clamp(camera.position.z,bounds.z1,bounds.z2);}dirty=true;}
function updateCamera(){if(mode==='overview'){camera.position.set(Math.sin(overviewAngle)*overviewRadius,overviewRadius*.72,Math.cos(overviewAngle)*overviewRadius);camera.lookAt(0,0,0);}else camera.rotation.set(pitch,yaw,0,'YXZ');}
$('download').onclick=async()=>{const button=$('download');button.disabled=true;button.textContent='書き出し中…';status.textContent='家具・日本語の部屋札を含む3Dモデルを書き出しています。';try{const exporter=new THREE.GLTFExporter();const portable=new THREE.Scene();portable.name='Astra School';const clone=model.clone(true);clone.getObjectByName('Ceilings_hidden_in_overview').visible=true;clone.traverse(object=>{if(object.userData.svgGround)object.visible=true;});portable.add(clone);portable.add(new THREE.HemisphereLight(0xffffff,0xbda984,2));const light=new THREE.DirectionalLight(0xffedc3,2);light.position.set(25,28,18);portable.add(light);const data=await exporter.parseAsync(portable,{binary:true,maxTextureSize:1024});const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='astra-digital-engineer-school.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='GLBモデルを保存しました。Blenderなどで読み込み・編集できます。';}catch(error){status.textContent=`モデルの書き出しに失敗しました。${error.message}`;}finally{button.disabled=false;button.textContent='3Dモデルを保存 ↓';}};
// The SVG renderer projects the same editable mesh model when WebGL is unavailable.
// Its simplified lighting and projected labels avoid reliance on GPU textures.
const fallbackLabels=[];
if(svgFallback){
  for(const name of ['Lawn','Path','Foundation']){const ground=landscape.getObjectByName(name);ground.visible=false;ground.userData.svgGround=true;}
  scene.add(new THREE.AmbientLight(0xe8d9da,.4));sun.intensity=.68;fill.intensity=.32;
  scene.traverse(object=>{if(object.isPointLight)object.intensity=0;});
  model.traverse(object=>{
    if(object.isMesh&&typeof object.userData.label==='object'){
      const {text,bg,fg}=object.userData.label;
      const node=document.createElement('span');node.className='projected-label';node.textContent=text;node.style.background=bg;node.style.color=fg;
      $('viewport').insertBefore(node,canvas);fallbackLabels.push({object,node});
      object.material=object.material.clone();object.material.color.set(bg);
    }
    if(object.geometry?.type==='IcosahedronGeometry')object.geometry=new THREE.IcosahedronGeometry(object.geometry.parameters.radius,0);
  });
  floor.visible=false;floor.userData.svgGround=true;
  const boards=new THREE.Group();boards.name='Painted floor tiles';model.add(boards);
  const tileGeometry=new THREE.PlaneGeometry(1.19,1.69),tileMaterials=[0xbda38f,0xbea491,0xbba18e,0xc1a792].map(color=>mat(color));
  for(let ix=0;ix<28;ix++)for(let iz=0;iz<16;iz++){const tile=new THREE.Mesh(tileGeometry,tileMaterials[(ix*7+iz*3)%4]);tile.rotation.x=-Math.PI/2;tile.position.set(-16.2+ix*1.2,-.013,-12.75+iz*1.7);boards.add(tile);}

}
function updateFallbackLabels(){
  const rect=canvas.getBoundingClientRect(),probe=new THREE.Raycaster();
  for(const {object,node} of fallbackLabels){
    const world=object.getWorldPosition(new THREE.Vector3()),projected=world.clone().project(camera);
    const direction=world.clone().sub(camera.position),distance=direction.length();
    let visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.1&&Math.abs(projected.y)<1.1;
    if(visible){probe.set(camera.position,direction.normalize());const block=probe.intersectObjects(walls.children,false).find(hit=>hit.distance<distance-.12);if(block)visible=false;}
    node.hidden=!visible;if(!visible)continue;
    const {width,height}=object.userData.label;
    const px=rect.height/(2*Math.tan(camera.fov*Math.PI/360)*distance);
    node.style.left=`${(projected.x+1)*rect.width/2}px`;node.style.top=`${(1-projected.y)*rect.height/2}px`;
    node.style.width=`${Math.max(20,width*px)}px`;node.style.height=`${Math.max(10,height*px)}px`;
    node.style.fontSize=`${Math.max(7,Math.min(height*px*.52,width*px/(node.textContent.length*.99)))}px`;
  }
}
if(renderer&&!svgFallback){renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;}
if(renderer){
  const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;};new ResizeObserver(resize).observe(canvas);
  reset();resize();status.textContent=(svgFallback?'細部を追加した軽量表示です。':'家具と壁の細部を更新しました。')+'正面に5教室、振り返ると4教室。GLBモデルも保存できます。';
  const tick=time=>{move(Math.min((time-lastTime)/1000,.05)||0);lastTime=time;if(dirty&&!document.hidden){updateCamera();renderer.render(scene,camera);if(svgFallback)updateFallbackLabels();dirty=false;}requestAnimationFrame(tick);};requestAnimationFrame(tick);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('error').hidden=false;$('error').textContent='3D描画が中断されました。ページを再読み込みしてください。';});
  // Read-only diagnostic surface used by the local visual smoke test.
  window.astraCampus={get mode(){return mode;},get roomCount(){return rooms.length;},get renderer(){return renderer;},get camera(){return camera;},get scene(){return scene;}};
}

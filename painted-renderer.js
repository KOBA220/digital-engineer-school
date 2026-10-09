import * as THREE from './vendor/astra-three.js?v=anime-2';

// Texture-capable fallback: renders the actual mesh scene, including imported art.
// This keeps movement and room geometry usable without a GPU.
export class PaintedRenderer {
  constructor(){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');this.width=1;this.height=1;this.patterns=new WeakMap();}
  setSize(w,h){this.width=w;this.height=h;this.domElement.width=w;this.domElement.height=h;}
  setQuality(){}
  setPrecision(){}
  render(scene,camera){
    const ctx=this.ctx,w=this.width,h=this.height;
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    const sky=scene.background?.image;
    if(sky?.width)ctx.drawImage(sky,0,0,w,h);else{const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#819ebd');gradient.addColorStop(.55,'#d4c7d9');gradient.addColorStop(1,'#f7dcad');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);}
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const view=new THREE.Matrix4().copy(camera.matrixWorld).invert(),vp=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,view),triangles=[];
    const sun=new THREE.Vector3(.68,.38,.62).normalize(),frustum=new THREE.Frustum().setFromProjectionMatrix(vp);
    scene.traverseVisible(mesh=>{
      if(!mesh.isMesh||!frustum.intersectsObject(mesh))return;const geometry=mesh.geometry,position=geometry.attributes.position,uv=geometry.attributes.uv,index=geometry.index;
      if(!position)return;const length=index?index.count:position.count,world=[];
      for(let i=0;i<position.count;i++){
        const p=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld),v=p.clone().applyMatrix4(view),projected=p.clone().applyMatrix4(vp);
        world.push({p,z:v.z,x:(projected.x*.5+.5)*w,y:(-.5*projected.y+.5)*h,u:uv?uv.getX(i):0,v:uv?uv.getY(i):0});
      }
      for(let i=0;i<length;i+=3){
        const a=world[index?index.getX(i):i],b=world[index?index.getX(i+1):i+1],c=world[index?index.getX(i+2):i+2];
        if(!a||!b||!c||a.z>-.08||b.z>-.08||c.z>-.08)continue;
        if(Math.max(a.x,b.x,c.x)<0||Math.min(a.x,b.x,c.x)>w||Math.max(a.y,b.y,c.y)<0||Math.min(a.y,b.y,c.y)>h)continue;
        const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
        let material=mesh.material;if(Array.isArray(material)){const group=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count);material=material[group?.materialIndex??0];}
        if(!material||material.visible===false||material.opacity===0)continue;
        if(material.side!==THREE.DoubleSide&&area>=0)continue;
        const normal=new THREE.Vector3().subVectors(b.p,a.p).cross(new THREE.Vector3().subVectors(c.p,a.p)).normalize();
        const light=material.isMeshBasicMaterial?1:.73+.27*Math.max(0,normal.dot(sun));
        triangles.push({a,b,c,z:(a.z+b.z+c.z)/3,material,light});
      }
    });
    triangles.sort((a,b)=>a.z-b.z);
    for(const t of triangles){
      const {a,b,c,material:m,light}=t;ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();ctx.globalAlpha=m.transparent?m.opacity:1;
      const color=m.color??new THREE.Color(1,1,1);ctx.fillStyle=color.getStyle();ctx.fillRect(0,0,w,h);
      const map=m.map,image=map?.image;
      if(image?.width&&image?.height){
        let pattern=this.patterns.get(image);if(!pattern){pattern=ctx.createPattern(image,'repeat');if(pattern)this.patterns.set(image,pattern);}
        const coords=[a,b,c].map(p=>({u:(p.u*(map.repeat?.x??1)+(map.offset?.x??0))*image.width,v:(1-p.v*(map.repeat?.y??1)-(map.offset?.y??0))*image.height}));
        const [p,q,r]=coords,du1=q.u-p.u,dv1=q.v-p.v,du2=r.u-p.u,dv2=r.v-p.v,det=du1*dv2-du2*dv1;
        if(pattern&&Math.abs(det)>.001){
          const ax=((b.x-a.x)*dv2-(c.x-a.x)*dv1)/det,bx=((c.x-a.x)*du1-(b.x-a.x)*du2)/det;
          const ay=((b.y-a.y)*dv2-(c.y-a.y)*dv1)/det,by=((c.y-a.y)*du1-(b.y-a.y)*du2)/det;
          ctx.save();ctx.transform(ax,ay,bx,by,a.x-ax*p.u-bx*p.v,a.y-ay*p.u-by*p.v);ctx.fillStyle=pattern;ctx.fillRect(Math.min(p.u,q.u,r.u)-1,Math.min(p.v,q.v,r.v)-1,Math.max(p.u,q.u,r.u)-Math.min(p.u,q.u,r.u)+2,Math.max(p.v,q.v,r.v)-Math.min(p.v,q.v,r.v)+2);ctx.restore();
          if(!m.isMeshBasicMaterial){ctx.globalCompositeOperation='multiply';ctx.fillStyle=color.getStyle();ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';}
        }
      }
      if(light<.99){ctx.globalAlpha=(1-light)*.55;ctx.fillStyle='#6f7097';ctx.fillRect(0,0,w,h);}
      ctx.restore();
    }
  }
}

import * as THREE from './vendor/astra-three.js?v=anime-4';

// Texture-capable fallback: renders the actual mesh scene, including imported art.
// This keeps movement and room geometry usable without a GPU.
export class PaintedRenderer {
  constructor(){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');this.width=1;this.height=1;this.patterns=new WeakMap();this.texturePixels=new WeakMap();}
  setSize(w,h){this.width=Math.max(1,Math.round(w*.75));this.height=Math.max(1,Math.round(h*.75));this.domElement.width=this.width;this.domElement.height=this.height;}
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
    const frame=ctx.getImageData(0,0,w,h),pixels=frame.data,depth=new Float32Array(w*h);
    for(const t of triangles){
      const {a,b,c,material:m,light}=t,den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
      if(Math.abs(den)<.01)continue;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(w-1,Math.ceil(Math.max(a.x,b.x,c.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(h-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      const za=-1/a.z,zb=-1/b.z,zc=-1/c.z,col=(m.color??new THREE.Color(1,1,1)).clone().convertLinearToSRGB(),base=[col.r,col.g,col.b],map=m.map,image=map?.image;
      let texture;if(image?.width&&image?.height){texture=this.texturePixels.get(image);if(!texture){const scratch=document.createElement('canvas');scratch.width=image.width;scratch.height=image.height;const tc=scratch.getContext('2d');tc.drawImage(image,0,0);texture={width:image.width,height:image.height,data:tc.getImageData(0,0,image.width,image.height).data};this.texturePixels.set(image,texture);}}
      const opacity=m.transparent?m.opacity:1,shade=(1-light)*.55;
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const px=x+.5,py=y+.5,wa=((b.y-c.y)*(px-c.x)+(c.x-b.x)*(py-c.y))/den,wb=((c.y-a.y)*(px-c.x)+(a.x-c.x)*(py-c.y))/den,wc=1-wa-wb;
        if(wa<-.0001||wb<-.0001||wc<-.0001)continue;
        const inv=wa*za+wb*zb+wc*zc,di=y*w+x;if(inv<=depth[di])continue;
        let alpha=opacity,red=base[0]*255,green=base[1]*255,blue=base[2]*255;
        if(texture){
          const u=(wa*a.u*za+wb*b.u*zb+wc*c.u*zc)/inv*(map.repeat?.x??1)+(map.offset?.x??0),v=(wa*a.v*za+wb*b.v*zb+wc*c.v*zc)/inv*(map.repeat?.y??1)+(map.offset?.y??0);
          const uu=((u%1)+1)%1,vv=map.flipY?1-(((v%1)+1)%1):(((v%1)+1)%1),ti=(Math.min(texture.height-1,Math.floor(vv*texture.height))*texture.width+Math.min(texture.width-1,Math.floor(uu*texture.width)))*4;
          red=texture.data[ti]*base[0];green=texture.data[ti+1]*base[1];blue=texture.data[ti+2]*base[2];alpha*=texture.data[ti+3]/255;
        }
        red=red*(1-shade)+111*shade;green=green*(1-shade)+112*shade;blue=blue*(1-shade)+151*shade;
        const pi=di*4;pixels[pi]=red*alpha+pixels[pi]*(1-alpha);pixels[pi+1]=green*alpha+pixels[pi+1]*(1-alpha);pixels[pi+2]=blue*alpha+pixels[pi+2]*(1-alpha);pixels[pi+3]=255;if(alpha>.98)depth[di]=inv;
      }
    }
    ctx.putImageData(frame,0,0);
  }
}

export function campusSceneHTML(){
 return `<section class="campus-walk campus-astra-shell"><div class="campus-walk-toolbar"><div><strong>アニメの校舎を歩く</strong><small>教室の内装を見て、「この部屋で作業をはじめる」から入室できます。</small></div><button data-campus-full>⛶ 大きく表示</button></div><iframe class="campus-astra-frame" title="アニメ背景の3D校舎と9つの教室" src="./astra-3d-preview.html?embedded=1&amp;v=integrated-anime-1" allow="fullscreen"></iframe></section>`;
}
export function bindCampusScene({rooms,onEnter}){
 const frame=document.querySelector('.campus-astra-frame');
 if(!frame)return ()=>{};
 const allowed=new Set(rooms.map(room=>room[0]));
 const receive=event=>{
  if(event.origin!==window.location.origin || event.source!==frame.contentWindow)return;
  if(event.data?.type==='school:enter-room' && allowed.has(event.data.room))onEnter(event.data.room);
 };
 window.addEventListener('message',receive);
 const shell=frame.closest('.campus-astra-shell'),button=shell.querySelector('[data-campus-full]');
 const enlarge=()=>shell.requestFullscreen?.()?.catch(()=>{});
 button.addEventListener('click',enlarge);
 return ()=>{window.removeEventListener('message',receive);button.removeEventListener('click',enlarge);frame.remove();};
}

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x101318);
scene.fog=new THREE.Fog(0x101318,35,180);

const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,300);
camera.position.set(0,1.7,8);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
document.getElementById("game").appendChild(renderer.domElement);

const hemi=new THREE.HemisphereLight(0x9ca9bd,0x252018,2.0);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(30,50,20);sun.castShadow=true;scene.add(sun);

const world=new THREE.Group();scene.add(world);
const colliders=[];
function box(x,y,z,w,h,d,color=0x2a3038){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.88}));
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);
 colliders.push(new THREE.Box3().setFromObject(m));return m;
}
function ground(){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:0x262a2f,roughness:1}));
 m.rotation.x=-Math.PI/2;m.receiveShadow=true;scene.add(m);
}
ground();

// IPA scene evidence translated into a simple 3D city block layout.
box(0,4,-45,100,8,2,0x343a43);
box(-48,4,0,2,8,100,0x343a43);
box(48,4,0,2,8,100,0x343a43);
const buildings=[
 [-32,3,-25,22,6,18,"住宅街"],[-2,3,-25,24,6,18,"中央地区"],
 [28,3,-25,22,6,18,"商業地区"],[-30,3,20,24,6,20,"倉庫"],
 [0,3,20,25,6,20,"製造区"],[30,3,20,24,6,20,"警察地区"]
];
buildings.forEach(([x,y,z,w,h,d])=>box(x,y,z,w,h,d,0x303640));

// road strips
const roadMat=new THREE.MeshStandardMaterial({color:0x171b20});
for(const [x,z,w,d] of [[0,0,110,13],[0,0,13,110]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.04,d),roadMat);m.position.set(x,.02,z);scene.add(m)}

const player={yaw:0,pitch:0,hp:100,maxHp:100,speed:4.8,ammo:12,mag:12,reserve:72,reloading:false,recoil:0};
const keys={};
addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="KeyR")reload();});
addEventListener("keyup",e=>keys[e.code]=false);

let pointerLocked=false;
renderer.domElement.addEventListener("click",()=>{if(innerWidth>900)renderer.domElement.requestPointerLock()});
document.addEventListener("pointerlockchange",()=>pointerLocked=document.pointerLockElement===renderer.domElement);
document.addEventListener("mousemove",e=>{if(pointerLocked){player.yaw-=e.movementX*.0023;player.pitch-=e.movementY*.0023;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch))}});
let touchLook={on:false,x:0,y:0};
renderer.domElement.addEventListener("pointerdown",e=>{if(innerWidth<=900){touchLook={on:true,x:e.clientX,y:e.clientY}}});
renderer.domElement.addEventListener("pointermove",e=>{if(innerWidth<=900&&touchLook.on){player.yaw-=(e.clientX-touchLook.x)*.006;player.pitch-=(e.clientY-touchLook.y)*.006;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch));touchLook.x=e.clientX;touchLook.y=e.clientY}});
renderer.domElement.addEventListener("pointerup",()=>touchLook.on=false);

const gun=new THREE.Group();
const gunBody=new THREE.Mesh(new THREE.BoxGeometry(.22,.18,.85),new THREE.MeshStandardMaterial({color:0x24272b,metalness:.65,roughness:.35}));
gunBody.position.set(.34,-.28,-.7);gunBody.rotation.x=-.08;gun.add(gunBody);
const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.48,12),new THREE.MeshStandardMaterial({color:0x111214,metalness:.8}));
barrel.rotation.x=Math.PI/2;barrel.position.set(.34,-.25,-1.28);gun.add(barrel);
camera.add(gun);scene.add(camera);

const enemies=[];
function spawnEnemy(x,z){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,1.05,5,10),new THREE.MeshStandardMaterial({color:0x8b3434}));
 body.position.y=1;body.castShadow=true;g.add(body);
 g.position.set(x,0,z);scene.add(g);
 enemies.push({g,hp:100,hit:0,alive:true});
}
spawnEnemy(-22,-5);spawnEnemy(20,-4);spawnEnemy(-4,32);spawnEnemy(35,34);

const ray=new THREE.Raycaster();
let lastShot=0;
function shoot(){
 if(player.reloading)return;
 const now=performance.now();
 if(now-lastShot<115)return;
 if(player.ammo<=0){say("弾切れ。Rでリロード");return}
 lastShot=now;player.ammo--;player.recoil=.035;
 camera.rotation.x=player.pitch;camera.rotation.y=player.yaw;
 ray.setFromCamera(new THREE.Vector2(0,0),camera);
 const hits=ray.intersectObjects(enemies.map(e=>e.g),true);
 if(hits.length){
   let obj=hits[0].object;let e=enemies.find(x=>x.g===obj||x.g.children.includes(obj));
   if(e){e.hp-=50;e.hit=.12;if(e.hp<=0){e.alive=false;e.g.visible=false;say("敵を倒した");}}
 }
 updateHud();
}
function reload(){
 if(player.reloading||player.ammo===player.mag||player.reserve<=0)return;
 player.reloading=true;say("リロード中...");
 setTimeout(()=>{const need=player.mag-player.ammo,n=Math.min(need,player.reserve);player.ammo+=n;player.reserve-=n;player.reloading=false;updateHud()},850);
}
addEventListener("mousedown",e=>{if(e.button===0)shoot()});
document.getElementById("fire").addEventListener("pointerdown",shoot);
document.getElementById("reload").addEventListener("pointerdown",reload);

function say(t){const m=document.getElementById("message");m.textContent=t;m.style.display="block";clearTimeout(say.t);say.t=setTimeout(()=>m.style.display="none",1800)}
function updateHud(){document.getElementById("stats").textContent=`HP ${Math.max(0,Math.round(player.hp))}/${player.maxHp}`;document.getElementById("ammo").textContent=`${player.ammo} / ${player.reserve}`}
updateHud();

function blocked(pos){
 const r=new THREE.Box3(new THREE.Vector3(pos.x-.28,.2,pos.z-.28),new THREE.Vector3(pos.x+.28,1.8,pos.z+.28));
 return colliders.some(b=>r.intersectsBox(b));
}
function movement(dt){
 let f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0);
 if(!f&&!s)return;
 const len=Math.hypot(f,s);f/=len;s/=len;
 const dir=new THREE.Vector3(Math.sin(player.yaw)*f+Math.cos(player.yaw)*s,0,Math.cos(player.yaw)*f-Math.sin(player.yaw)*s);
 const next=camera.position.clone().addScaledVector(dir,player.speed*dt);next.y=1.7;
 if(!blocked(next)){camera.position.x=next.x;camera.position.z=next.z}
}
function enemyAI(dt){
 for(const e of enemies)if(e.alive){
  const d=new THREE.Vector3().subVectors(camera.position,e.g.position);d.y=0;const dist=d.length();
  if(dist<28&&dist>1.8){d.normalize();const n=e.g.position.clone().addScaledVector(d,dt*1.0);if(!blocked(n))e.g.position.copy(n)}
  if(dist<2.0){player.hp-=dt*12;if(player.hp<=0){player.hp=100;camera.position.set(0,1.7,8);say("倒されました。安全地帯へ戻ります")}updateHud()}
 }
}
let prev=performance.now();
function loop(){
 const now=performance.now(),dt=Math.min(.05,(now-prev)/1000);prev=now;
 movement(dt);enemyAI(dt);
 camera.rotation.order="YXZ";
 camera.rotation.y=player.yaw;camera.rotation.x=player.pitch-player.recoil;
 player.recoil*=.86;
 for(const e of enemies)if(e.hit>0)e.hit-=dt;
 renderer.render(scene,camera);requestAnimationFrame(loop)
}
loop();

document.querySelectorAll(".touchbtn").forEach(b=>{
 let code=null;
 if(b.id==="up")code="KeyW";if(b.id==="down")code="KeyS";if(b.id==="left")code="KeyA";if(b.id==="right")code="KeyD";
 if(code){b.addEventListener("pointerdown",()=>keys[code]=true);b.addEventListener("pointerup",()=>keys[code]=false);b.addEventListener("pointerleave",()=>keys[code]=false)}
});
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

const C=document.getElementById('game'),ctx=C.getContext('2d');let W,H,dpr;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;C.width=W*dpr;C.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();

const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault()});addEventListener('keyup',e=>keys[e.code]=false);
document.querySelectorAll('.touch button').forEach(b=>{const k=b.dataset.key;['pointerdown','pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();keys[k]=ev==='pointerdown'}))});

let track='city',running=false,last=performance.now(),score=0,combo=1,comboTimer=0,lap=1,lapDist=0;
const tracks={
 city:{name:'NEON CITY',accent:'#00dcff',pts:[[-900,-80],[-760,-430],[-280,-650],[260,-610],[760,-380],[900,20],[720,420],[300,650],[-220,620],[-700,450],[-930,180]]},
 industrial:{name:'INDUSTRIAL DOCKS',accent:'#ff3b8d',pts:[[-1000,0],[-850,-420],[-360,-570],[180,-500],[820,-620],[1080,-160],[920,300],[500,520],[-40,460],[-500,620],[-920,400]]},
 race:{name:'NIGHT CIRCUIT',accent:'#c9ff38',pts:[[-1050,100],[-900,-380],[-420,-650],[100,-620],[760,-480],[1050,-50],[850,430],[300,700],[-300,610],[-760,470],[-1050,250]]}
};
const car={x:-900,y:-80,a:0,vx:0,vy:0,steer:0};
const skid=[],smoke=[],sparks=[];

function pts(){return tracks[track].pts}
function nearestTrack(x,y){
 let best={d:1e9,x:0,y:0,tx:1,ty:0,i:0,t:0};
 const p=pts();
 for(let i=0;i<p.length;i++){
   const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;
   let t=((x-a[0])*dx+(y-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));
   const qx=a[0]+dx*t,qy=a[1]+dy*t,d=Math.hypot(x-qx,y-qy);
   if(d<best.d)best={d,x:qx,y:qy,tx:dx/Math.sqrt(l2),ty:dy/Math.sqrt(l2),i,t};
 }
 return best;
}
function resetCar(){const p=pts()[0],q=pts()[1];car.x=p[0];car.y=p[1];car.a=Math.atan2(q[1]-p[1],q[0]-p[0]);car.vx=car.vy=0;car.steer=0;score=0;combo=1;comboTimer=0;lap=1;lapDist=0;skid.length=smoke.length=sparks.length=0}
function addParticle(arr,x,y,n=1){for(let i=0;i<n;i++)arr.push({x,y,vx:(Math.random()-.5)*90,vy:(Math.random()-.5)*90,life:.4+Math.random()*.5,s:.8+Math.random()*2})}

function update(dt){
 const up=keys.KeyW||keys.ArrowUp,down=keys.KeyS||keys.ArrowDown,left=keys.KeyA||keys.ArrowLeft,right=keys.KeyD||keys.ArrowRight,hb=keys.Space;
 const ca=Math.cos(car.a),sa=Math.sin(car.a);let fx=ca*car.vx+sa*car.vy,side=-sa*car.vx+ca*car.vy;
 if(up)fx+=430*dt;if(down)fx-=420*dt;fx*=Math.pow(.985,dt*60);fx=Math.max(-130,Math.min(540,fx));
 side*=Math.pow(hb?.055:.19,dt*60);
 const steer=(right?1:0)-(left?1:0);car.steer+=(steer-car.steer)*Math.min(1,dt*10);
 car.a+=(.0020+Math.abs(fx)*.0000035)*car.steer*(hb?1.55:1)*fx*dt;
 car.vx=ca*fx-sa*side;car.vy=sa*fx+ca*side;car.x+=car.vx*dt;car.y+=car.vy*dt;
 const nt=nearestTrack(car.x,car.y);
 if(nt.d>190){car.x+= (nt.x-car.x)*Math.min(1,dt*2.8);car.y+=(nt.y-car.y)*Math.min(1,dt*2.8);car.vx*=.75;car.vy*=.75;addParticle(sparks,car.x,car.y,2)}
 const speed=Math.hypot(car.vx,car.vy),drifting=Math.abs(side)>28&&speed>120&&nt.d<145;
 if(drifting){comboTimer=.95;score+=Math.floor((Math.abs(side)*.014+speed*.002)*combo*dt*100);combo=Math.min(99,combo+dt*.22);const rx=car.x-ca*19,ry=car.y-sa*19;skid.push({x:rx+sa*7,y:ry-ca*7,life:1});skid.push({x:rx-sa*7,y:ry+ca*7,life:1});addParticle(smoke,rx,ry,2)}
 else if(speed<65||comboTimer<=0)combo=1;
 comboTimer-=dt;
 // Lap detection: passing the start segment from the outside back to it.
 if(nt.i===0 && nt.t<.18 && speed>80 && lapDist>800){lap++;lapDist=0;score+=2500*combo}
 lapDist+=speed*dt;
 for(const arr of [smoke,sparks])for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*(arr===smoke?1.2:2.2);if(p.life<=0)arr.splice(i,1)}
 skid.forEach(p=>p.life-=dt*.2);while(skid.length>1000)skid.shift();
 document.getElementById('speed').textContent=Math.round(speed*.34);
 document.getElementById('drift').textContent=Math.floor(score).toLocaleString('hu-HU');
 document.getElementById('combo').textContent='x'+Math.max(1,Math.floor(combo));
}

function draw(){
 const s=tracks[track],p=pts();ctx.fillStyle='#05070c';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-car.x,H/2-car.y);
 // Decorative world grid
 ctx.strokeStyle='#ffffff08';ctx.lineWidth=1;
 for(let x=Math.floor((car.x-W/2)/100)*100;x<car.x+W/2+100;x+=100){ctx.beginPath();ctx.moveTo(x,car.y-H/2-100);ctx.lineTo(x,car.y+H/2+100);ctx.stroke()}
 for(let y=Math.floor((car.y-H/2)/100)*100;y<car.y+H/2+100;y+=100){ctx.beginPath();ctx.moveTo(car.x-W/2-100,y);ctx.lineTo(car.x+W/2+100,y);ctx.stroke()}
 // Closed smooth-ish circuit: thick asphalt, curbs and inner grass.
 ctx.lineCap='round';ctx.lineJoin='round';
 function path(){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath()}
 ctx.strokeStyle='#000';ctx.lineWidth=470;path();ctx.stroke();
 ctx.strokeStyle='#252b33';ctx.lineWidth=390;path();ctx.stroke();
 ctx.strokeStyle=s.accent+'77';ctx.lineWidth=406;path();ctx.stroke();
 ctx.strokeStyle='#20262d';ctx.lineWidth=386;path();ctx.stroke();
 // Lane line
 ctx.setLineDash([34,28]);ctx.strokeStyle='#f2f4df99';ctx.lineWidth=3;path();ctx.stroke();ctx.setLineDash([]);
 // red/white curb blocks around the racing line
 ctx.strokeStyle='#ff3b8d55';ctx.lineWidth=416;path();ctx.stroke();
 ctx.strokeStyle='#252b33';ctx.lineWidth=392;path();ctx.stroke();
 // Buildings, barriers and lamps outside track
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;ctx.fillStyle='#0b1118';ctx.fillRect(mx-42,my-42,84,84);ctx.fillStyle=s.accent+'30';ctx.fillRect(mx-35,my-35,70,4)}
 // Start/finish
 const a=p[0],b=p[1],ang=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.save();ctx.translate(a[0],a[1]);ctx.rotate(ang);for(let i=-8;i<9;i++){ctx.fillStyle=i%2?'#f2f2f2':'#101010';ctx.fillRect(i*22,-190,22,38)}ctx.restore();
 // tire marks
 for(const q of skid){ctx.globalAlpha=Math.max(0,q.life)*.5;ctx.fillStyle='#050505';ctx.fillRect(q.x-2,q.y-2,4,4)}ctx.globalAlpha=1;
 for(const q of smoke){ctx.globalAlpha=q.life*.28;ctx.fillStyle='#e8eef2';ctx.beginPath();ctx.arc(q.x,q.y,q.s*(1.6-q.life),0,7);ctx.fill()}
 for(const q of sparks){ctx.globalAlpha=q.life;ctx.fillStyle=s.accent;ctx.fillRect(q.x,q.y,3,3)}ctx.globalAlpha=1;
 // car
 ctx.save();ctx.translate(car.x+7,car.y+8);ctx.rotate(car.a);ctx.fillStyle='#0009';ctx.fillRect(-22,-11,44,23);ctx.restore();
 ctx.save();ctx.translate(car.x,car.y);ctx.rotate(car.a);ctx.shadowBlur=25;ctx.shadowColor=s.accent;ctx.fillStyle='#e4edf2';ctx.beginPath();ctx.roundRect(-21,-10,42,20,6);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#101923';ctx.beginPath();ctx.roundRect(-8,-8,19,16,5);ctx.fill();ctx.fillStyle='#ff3b8d';ctx.fillRect(14,-7,5,5);ctx.fillRect(14,2,5,5);ctx.fillStyle='#111';ctx.fillRect(-14,-12,8,3);ctx.fillRect(8,-12,8,3);ctx.fillRect(-14,9,8,3);ctx.fillRect(8,9,8,3);ctx.restore();
 ctx.restore();
}
function loop(t){const dt=Math.min(.033,(t-last)/1000);last=t;if(running){update(dt);draw()}requestAnimationFrame(loop)}requestAnimationFrame(loop);
function start(){document.getElementById('menu').classList.add('hidden');document.getElementById('hud').classList.remove('hidden');document.getElementById('touch').classList.remove('hidden');document.getElementById('trackName').textContent=tracks[track].name;resetCar();running=true}
document.getElementById('start').onclick=start;document.getElementById('quit').onclick=()=>{running=false;document.getElementById('hud').classList.add('hidden');document.getElementById('touch').classList.add('hidden');document.getElementById('menu').classList.remove('hidden')};
document.getElementById('tracks').onclick=()=>document.getElementById('trackPanel').classList.remove('hidden');document.getElementById('closeTracks').onclick=()=>document.getElementById('trackPanel').classList.add('hidden');
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{track=b.dataset.track;document.getElementById('trackPanel').classList.add('hidden')});
document.getElementById('settings').onclick=()=>document.getElementById('settingsPanel').classList.remove('hidden');document.getElementById('closeSettings').onclick=()=>document.getElementById('settingsPanel').classList.add('hidden');
draw();

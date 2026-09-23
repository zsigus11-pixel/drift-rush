const C=document.getElementById('game'),ctx=C.getContext('2d');let W,H,dpr;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;C.width=W*dpr;C.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();

const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault()});addEventListener('keyup',e=>keys[e.code]=false);
document.querySelectorAll('.touch button').forEach(b=>{const k=b.dataset.key;['pointerdown','pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();keys[k]=ev==='pointerdown'}))});

let track='city',running=false,last=performance.now(),score=0,combo=1,comboTimer=0;
const tracks={city:{name:'NEON CITY',bg:'#080d15',road:'#18202b',accent:'#00dcff'},industrial:{name:'INDUSTRIAL DOCKS',bg:'#0a0b10',road:'#25262a',accent:'#ff3b8d'},race:{name:'NIGHT CIRCUIT',bg:'#050b0d',road:'#172321',accent:'#c9ff38'}};
const car={x:0,y:0,a:0,vx:0,vy:0,steer:0,th:0};
const skid=[],smoke=[],sparks=[];

function worldToScreen(x,y){return [W/2+(x-car.x),H/2+(y-car.y)]}
function roadAt(x,y){const s=tracks[track];const lane=Math.abs((y%900)-450);return lane<210||Math.abs(((x%1100)+1100)%1100-550)<165}
function resetCar(){car.x=0;car.y=0;car.a=0;car.vx=0;car.vy=0;score=0;combo=1;comboTimer=0;skid.length=smoke.length=sparks.length=0}
function addParticle(arr,x,y,n=1){for(let i=0;i<n;i++)arr.push({x,y,vx:(Math.random()-.5)*70,vy:(Math.random()-.5)*70,life:.45+Math.random()*.5,s:.8+Math.random()*2})}

function update(dt){
 const up=keys.KeyW||keys.ArrowUp, down=keys.KeyS||keys.ArrowDown, left=keys.KeyA||keys.ArrowLeft,right=keys.KeyD||keys.ArrowRight, hb=keys.Space;
 const ca=Math.cos(car.a),sa=Math.sin(car.a);
 let fx=ca*car.vx+sa*car.vy, side=-sa*car.vx+ca*car.vy;
 const throttle=up?1:0, brake=down?1:0;
 fx+=throttle*430*dt; if(brake)fx-=420*dt;
 fx*=Math.pow(.985,dt*60); fx=Math.max(-130,Math.min(520,fx));
 const grip=hb?.055:.19; side*=Math.pow(grip,dt*60);
 let steer=(right?1:0)-(left?1:0);car.steer+=(steer-car.steer)*Math.min(1,dt*9);
 const turn=(0.0020+Math.abs(fx)*.0000035)*car.steer*(hb?1.5:1);
 car.a+=turn*fx*dt;
 car.vx=ca*fx-sa*side;car.vy=sa*fx+ca*side;
 car.x+=car.vx*dt;car.y+=car.vy*dt;
 if(!roadAt(car.x,car.y)){car.vx*=.82;car.vy*=.82;if(Math.hypot(car.vx,car.vy)>100){addParticle(sparks,car.x,car.y,3);car.vx*=.8;car.vy*=.8}}
 const speed=Math.hypot(car.vx,car.vy), drifting=Math.abs(side)>28&&speed>130;
 if(drifting){comboTimer=.9;score+=Math.floor((Math.abs(side)*.012+speed*.002)*combo*dt*100);combo=Math.min(99,combo+dt*.25);const rx=car.x-ca*19,ry=car.y-sa*19;skid.push({x:rx+sa*7,y:ry-ca*7,life:1});skid.push({x:rx-sa*7,y:ry+ca*7,life:1});addParticle(smoke,rx,ry,2)}
 else if(speed<70||comboTimer<=0)combo=1;
 comboTimer-=dt;
 function particles(arr,dec){for(let i=arr.length-1;i>=0;i--){let p=arr[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*dec;if(p.life<=0)arr.splice(i,1)}}
 particles(smoke,1.2);particles(sparks,2.2);skid.forEach(p=>p.life-=dt*.22);while(skid.length>900)skid.shift();
 document.getElementById('speed').textContent=Math.round(speed*.34);
 document.getElementById('drift').textContent=Math.floor(score).toLocaleString('hu-HU');
 document.getElementById('combo').textContent='x'+Math.max(1,Math.floor(combo));
}

function draw(){
 const s=tracks[track];ctx.fillStyle=s.bg;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(W/2-car.x,H/2-car.y);
 // Large optimized repeating world
 const minX=Math.floor((car.x-W/2)/550)*550-550,maxX=car.x+W/2+550,minY=Math.floor((car.y-H/2)/450)*450-450,maxY=car.y+H/2+450;
 ctx.fillStyle=s.road;
 for(let x=minX;x<maxX;x+=550)ctx.fillRect(x,minY,330,maxY-minY);
 for(let y=minY;y<maxY;y+=450)ctx.fillRect(minX,y,maxX-minX,330);
 // lane markings
 ctx.setLineDash([28,22]);ctx.lineWidth=3;ctx.strokeStyle='#e8edf033';
 for(let x=minX;x<maxX;x+=550){ctx.beginPath();ctx.moveTo(x+165,minY);ctx.lineTo(x+165,maxY);ctx.stroke()}
 for(let y=minY;y<maxY;y+=450){ctx.beginPath();ctx.moveTo(minX,y+165);ctx.lineTo(maxX,y+165);ctx.stroke()}ctx.setLineDash([]);
 // neon curbs
 ctx.strokeStyle=s.accent+'55';ctx.lineWidth=7;
 for(let x=minX;x<maxX;x+=550){ctx.strokeRect(x+3,minY,324,maxY-minY)}
 for(let y=minY;y<maxY;y+=450){ctx.strokeRect(minX,y+3,maxX-minX,324)}
 // buildings / blocks
 ctx.fillStyle='#05070b';for(let x=minX;x<maxX;x+=550)for(let y=minY;y<maxY;y+=450){ctx.fillRect(x+350,y+20,175,125);ctx.fillRect(x+20,y+350,120,80)}
 // lights
 for(let x=minX;x<maxX;x+=110)for(let y=minY;y<maxY;y+=110){ctx.fillStyle=s.accent+'22';ctx.fillRect(x,y,3,3)}
 // skidmarks
 for(const p of skid){ctx.globalAlpha=Math.max(0,p.life)*.42;ctx.fillStyle='#020205';ctx.fillRect(p.x-2,p.y-2,4,4)}ctx.globalAlpha=1;
 // particles
 for(const p of smoke){ctx.globalAlpha=p.life*.3;ctx.fillStyle='#dfe9ee';ctx.beginPath();ctx.arc(p.x,p.y,p.s*(1.5-p.life),0,7);ctx.fill()}
 for(const p of sparks){ctx.globalAlpha=p.life;ctx.fillStyle=s.accent;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
 // car shadow/body
 ctx.save();ctx.translate(car.x+6,car.y+9);ctx.rotate(car.a);ctx.fillStyle='#00000099';ctx.fillRect(-18,-10,42,22);ctx.restore();
 ctx.save();ctx.translate(car.x,car.y);ctx.rotate(car.a);
 ctx.shadowBlur=22;ctx.shadowColor=s.accent;ctx.fillStyle='#dbe5ec';ctx.beginPath();ctx.roundRect(-21,-10,42,20,6);ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle='#111923';ctx.beginPath();ctx.roundRect(-8,-8,19,16,5);ctx.fill();ctx.fillStyle='#ff3b8d';ctx.fillRect(14,-7,5,5);ctx.fillRect(14,2,5,5);
 ctx.fillStyle='#111';ctx.fillRect(-14,-12,8,3);ctx.fillRect(8,-12,8,3);ctx.fillRect(-14,9,8,3);ctx.fillRect(8,9,8,3);ctx.restore();
 ctx.restore();
}
function loop(t){const dt=Math.min(.033,(t-last)/1000);last=t;if(running){update(dt);draw()}requestAnimationFrame(loop)}requestAnimationFrame(loop);

function start(){document.getElementById('menu').classList.add('hidden');document.getElementById('hud').classList.remove('hidden');document.getElementById('touch').classList.remove('hidden');document.getElementById('trackName').textContent=tracks[track].name;resetCar();running=true}
document.getElementById('start').onclick=start;document.getElementById('quit').onclick=()=>{running=false;document.getElementById('hud').classList.add('hidden');document.getElementById('touch').classList.add('hidden');document.getElementById('menu').classList.remove('hidden')};
document.getElementById('tracks').onclick=()=>document.getElementById('trackPanel').classList.remove('hidden');document.getElementById('closeTracks').onclick=()=>document.getElementById('trackPanel').classList.add('hidden');
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{track=b.dataset.track;document.getElementById('trackPanel').classList.add('hidden')});
document.getElementById('settings').onclick=()=>document.getElementById('settingsPanel').classList.remove('hidden');document.getElementById('closeSettings').onclick=()=>document.getElementById('settingsPanel').classList.add('hidden');
draw();

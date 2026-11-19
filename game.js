'use strict';

const canvas = document.querySelector('#screen');
const ctx = canvas.getContext('2d');
const menu = document.querySelector('#menu');
const roster = document.querySelector('#roster');
const start = document.querySelector('#start');
const pause = document.querySelector('#pause');
const stage = document.querySelector('#stage');
const powers = document.querySelector('#powers');
const title = document.querySelector('#title');
const description = document.querySelector('#description');
const W = 480;
const H = 270;
const keys = new Set();
const pressed = new Set();
const ink = '#130d24';
const skin = '#f7b87e';
const gold = '#ffe376';

const heroes = [
  { name:'The Flash', main:'#e33450', dark:'#931f49', trim:gold, face:skin, speed:205, j:'Lightning jab', k:'Speed burst', l:'Dodge', note:'Outrun the gangs and blitz through them with a lightning burst.' },
  { name:'Spider-Man', main:'#ec4057', dark:'#234d9b', trim:'#dcf5ff', face:'#ef4057', speed:125, j:'Web ball', k:'Web swing', l:'Dodge', note:'Snare enemies with web balls. Hold K near cyan anchors to swing.' },
  { name:'Batman', main:'#5e6e94', dark:'#25243d', trim:gold, face:skin, speed:115, j:'Batarang', k:'Grapple', l:'Cape guard', note:'Throw batarangs and hold K near cyan anchors to cross gaps.' },
  { name:'Captain America', main:'#3685da', dark:'#233d82', trim:'#fff5dc', face:skin, speed:112, j:'Shield throw', k:'Shield bash', l:'Shield block', note:'The shield returns after a throw. Hold L to block every hit while carrying it.' },
  { name:'Wonder Woman', main:'#e34e58', dark:'#294d9b', trim:gold, face:skin, speed:121, j:'Lasso', k:'Amazon strike', l:'Deflect', note:'Tie up enemies with the lasso and hold L to reflect gunfire.' },
  { name:'Black Widow', main:'#484665', dark:'#272139', trim:'#f26c53', face:skin, speed:142, j:'Combo punch', k:'High split kick', l:'Sliding kick', note:'Kick high to hit on both sides, or slide forward to knock down every enemy in your path.' },
  { name:'Scarlet Witch', main:'#ec4784', dark:'#7c2255', trim:'#ff99ca', face:skin, speed:120, j:'Hex bolt', k:'Chaos wave', l:'Hex ward', note:'Fly with WASD, rise with Space, and blast enemies with chaos magic.' },
];

const levels = [
  {name:'DOWNTOWN', boss:'LIVE WIRE', length:2330, groups:[340,880,1400], gaps:[[665,765],[1180,1295]], sky:['#29194d','#d25585'], city:['#4d3068','#32234d','#201b39'], color:'#ecbd54'},
  {name:'ROOFTOP RUN', boss:'NIGHT TALON', length:2520, groups:[310,940,1580], gaps:[[590,718],[1220,1358],[1860,2003]], sky:['#14153b','#6854a0'], city:['#423c70','#292a57','#1d2042'], color:'#8de3f6'},
  {name:'BLACKGLASS TOWER', boss:'DOCTOR BLACKGLASS', length:2400, groups:[370,1000,1540], gaps:[], sky:['#1b1630','#4b284e'], city:['#552948','#361d3e','#241a34'], color:'#fc74c2'},
];
const stairs = [[560,800],[1170,1390],[1690,1930]];
const hpMax = 100;
let selected = 0;
let state = 'menu';
let levelIndex = 0;
let level;
let hero;
let player;
let mobs;
let boss;
let shots;
let sparks;
let squads;
let camera;
let cameraY;
let elapsed = 0;
let notice = '';
let noticeTime = 0;
let checkpoint;
let swing;
let shieldOut;
let flashTimer;
let shake;
let previous;
let backdrop;
let soundOn = true;
let audio;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const between = (x, a, b) => x >= a && x <= b;
const random = (min, max) => min + Math.random() * (max - min);
const hash = n => ((Math.imul(n + 91, 1103515245) >>> 17) % 1000) / 1000;
const down = code => keys.has(code);
const hit = code => pressed.has(code);
const rect = (g, color, x, y, w, h) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function widowSprite(p, stride, pose) {
  const suit='#34354d';
  const light='#6b6886';
  const shadow='#211d32';
  const goldBuckle='#ffc571';
  const red='#ff5f4b';
  const slide=pose==='slide';
  const split=pose==='split';
  const punch=pose==='attack';
  const hips=slide?[-3,-7]:[0,-13];
  const head=slide?[-9,-19]:[1,-34];

  function limb(points, width, color) {
    for (let i=1;i<points.length;i++) {
      const [x,y]=points[i-1];
      const [ex,ey]=points[i];
      const steps=Math.max(Math.abs(ex-x),Math.abs(ey-y));
      for (let step=0;step<=steps;step++) {
        p(color,x+(ex-x)*step/steps-width/2,y+(ey-y)*step/steps-width/2,width,width);
      }
    }
  }
  const legs=slide ? [[[2,-7],[12,-4],[23,-4]], [[-4,-7],[-10,-4],[-16,-4]]]
    : split ? [[[1,-13],[11,-20],[21,-29]], [[-2,-13],[-12,-10],[-21,-6]]]
    : [[[2,-13],[4-stride,-7],[4-stride,-3]], [[-3,-13],[-5+stride,-7],[-5+stride,-3]]];
  legs.forEach((leg,index)=>{
    limb(leg,8,ink);
    limb(leg,5,index===0?suit:shadow);
    const [x,y]=leg[2];
    p(ink,x-3,y-3,8,6);
    p(light,x-2,y-2,6,2);
  });
  const shoulders=[head[0],head[1]+10];
  limb([shoulders,hips],13,ink);
  limb([shoulders,hips],9,suit);
  p(light,shoulders[0]-4,shoulders[1]-3,8,3);
  p(shadow,hips[0]-5,hips[1]-2,11,3);
  p(goldBuckle,hips[0]-1,hips[1]-2,3,3);

  const glove=slide?[-16,-5]:split?[9,-23]:punch?[18,-21]:[9,-15];
  limb([shoulders,glove],6,ink);
  limb([shoulders,glove],4,suit);
  p(goldBuckle,glove[0]-2,glove[1]-2,4,3);
  p('#ffebbc',glove[0],glove[1]-2,2,1);

  const [hx,hy]=head;
  p(ink,hx-8,hy-3,15,13);
  p('#73253c',hx-9,hy+1,7,14);
  p('#ca4139',hx-7,hy-2,12,6);
  p(red,hx-5,hy-2,8,2);
  p('#ee714b',hx-7,hy+2,3,7);
  p('#ffbd8c',hx-3,hy+3,9,5);
  p('#da805f',hx-1,hy+8,6,2);
  p(ink,hx+3,hy+4,2,1);

  if (split) {
    p('#ff795b',21,-36,5,2); p('#ffbe71',25,-33,3,3); p('#fff3c4',27,-29,3,2);
  }
  if (slide) {
    p('#ff9465',-27,-3,9,1); p('#ffe2a1',-22,-1,9,1); p('#bc5a62',-30,-6,7,1);
  }
}

function sprite(g, style, x, y, direction = 1, phase = 0, scale = 1, pose = '', type = '') {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.scale(direction * scale, scale);
  const p = (color, px, py, w, h) => rect(g,color,px,py,w,h);
  const stride = Math.round(Math.sin(phase) * 3);
  const id = style.name;
  if (id === 'Black Widow') {
    widowSprite(p,stride,pose);
    g.restore();
    return;
  }
  const isBat = id === 'Batman';
  const isSpider = id === 'Spider-Man';
  const isCap = id === 'Captain America';
  const isWitch = id === 'Scarlet Witch';
  const isFlash = id === 'The Flash';
  const isWonder = id === 'Wonder Woman';
  const hair = '#302039';
  if (isBat || isWitch || type === 'talon') {
    p(ink,-13,-23,13,22); p(style.dark,-12,-22,10,19);
    p(style.dark,-15,-9,8,6);
  }
  p(ink,-8+stride,-11,7,11); p(ink,1-stride,-11,7,11);
  p(style.dark,-7+stride,-11,5,8); p(style.dark,2-stride,-11,5,8);
  p(style.main,-8+stride,-5,5,3); p(style.main,3-stride,-5,5,3);
  p(ink,-10+stride,-2,9,3); p(ink,1-stride,-2,9,3);
  p(ink,-8,-24,16,15); p(style.main,-6,-23,12,12);
  p(style.dark,-6,-13,12,2); p(style.trim,-3,-21,6,3);
  if (isFlash || isCap) p(style.trim,0,-22,2,6);
  if (isSpider) { p(ink,-1,-22,2,6); p(ink,-3,-20,6,2); }
  p(ink,-11,-22,5,9); p(style.dark,-10,-21,3,6);
  const reach = pose === 'attack' ? 5 : 0;
  p(ink,6,-22,5+reach,9-reach); p(style.main,7,-21,3+reach,6-reach/2);
  p(style.trim,8+reach,-17-reach/2,3,3);
  p(ink,-7,-35,14,13); p(style.dark,-6,-34,12,11);
  p(style.face,-4,-31,10,7); p(style.face,-2,-24,7,2);
  if (isSpider || isFlash || isCap || isBat || type === 'talon') {
    p(style.main,-5,-34,11,4); p(style.main,-6,-32,4,8);
    p(isSpider ? ink : style.dark,-2,-31,8,3);
    p('#eefaff',-2,-30,2,2); p('#eefaff',3,-30,3,2);
    if (isBat || type === 'talon') { p(ink,-6,-38,3,5); p(ink,3,-38,3,5); }
    if (isFlash) p(gold,-7,-32,3,6);
    if (isCap) p('#fff',0,-34,3,2);
    if (isSpider) p(ink,0,-27,1,5);
  } else {
    p(hair,-6,-34,11,4); p(hair,-6,-31,3,8); p(ink,3,-29,2,2);
    if (isWonder || isWitch) { p(style.trim,-5,-32,11,2); p(style.main,0,-34,2,5); }
    if (type === 'bat') { p(ink,10,-24,9,4); p('#bf8155',11,-24,7,2); }
    if (type === 'gun') { p('#9a9fb9',10,-21,8,4); p('#b7bed2',15,-21,4,1); }
    if (type === 'can') { p(ink,9,-24,10,13); p('#718a9b',10,-23,8,11); p('#b0c4cb',9,-24,10,2); p('#46536d',12,-21,1,7); }
  }
  if (isCap && pose !== 'unarmed') {
    p(ink,5,-22,11,14); p('#ce3853',6,-21,9,12);
    p('#f9e9e0',7,-19,7,8); p('#345cba',8,-18,5,6); p('#fff',10,-17,1,4); p('#fff',9,-16,3,1);
  }
  g.restore();
}

function select(index) {
  selected = index;
  [...roster.children].forEach((button, i) => button.setAttribute('aria-pressed', i === index));
  description.textContent = heroes[index].note;
  updatePowers(heroes[index]);
}
function updatePowers(style) {
  powers.innerHTML = '<kbd>J</kbd> ' + style.j + ' <kbd>K</kbd> ' + style.k + ' <kbd>L</kbd> ' + style.l;
}
heroes.forEach((style, i) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hero';
  const portrait = document.createElement('canvas');
  portrait.width = 50;
  portrait.height = 47;
  portrait.setAttribute('aria-hidden','true');
  sprite(portrait.getContext('2d'),style,24,43);
  button.append(portrait, document.createTextNode(style.name));
  button.onclick = () => select(i);
  roster.append(button);
});
select(0);

function floorAt(x) {
  if (levelIndex === 2) {
    return 232 - stairs.reduce((height, [a,b]) => height + clamp(Math.floor((x-a)/(b-a)*10),0,10)*8, 0);
  }
  if (level.gaps.some(([a,b]) => between(x,a,b))) return Infinity;
  if (levelIndex === 1) return 213 - 10 * level.gaps.filter(([,b]) => x>b).length;
  return 228;
}
function anchors() {
  return level.gaps.map(([a,b]) => ({x:(a+b)/2,y:floorAt(a-5)-110}));
}
const bossLooks = [
  {main:'#a34bdb',dark:'#492363',trim:'#ffec80',face:'#f1ac83'},
  {main:'#524c95',dark:'#29224b',trim:'#a6eeff',face:'#bba4b1'},
  {main:'#b73377',dark:'#582253',trim:'#ffb6ec',face:'#a970af'},
];
const thugLooks = {
  bat:{main:'#e57061',dark:'#5f303d',trim:'#f6bd64',face:skin},
  gun:{main:'#3bafa8',dark:'#254f61',trim:'#b9ffdc',face:'#cf8d64'},
  can:{main:'#a280ca',dark:'#543b76',trim:'#ffc2ea',face:'#e9ac80'},
};

function startLevel(index) {
  levelIndex = index;
  level = levels[index];
  hero = heroes[selected];
  player = {x:65,y:floorAt(65),vx:0,vy:0,hp:hpMax,dir:1,ground:true,ifr:0,action:0,j:0,k:0,dodge:0,boost:0,slide:0,slideCooldown:0,split:0};
  camera = 0;
  cameraY = 0;
  checkpoint = 65;
  mobs = [];
  shots = [];
  sparks = [];
  squads = level.groups.map((location, i) => ({x:location+random(-22,22),count:2+(i===2 || index===2 ? 1 : 0),active:false,done:false}));
  boss = {x:level.length-125,y:floorAt(level.length-125),hp:100+index*25,max:100+index*25,dir:-1,active:false,timer:1.2,stun:0,down:0,flash:0,step:0,type:index===1?'talon':'boss',isBoss:true};
  swing = null;
  shieldOut = false;
  flashTimer = 0;
  shake = 0;
  backdrop = null;
  state = 'play';
  stage.textContent = 'STAGE 0' + (index+1) + '  /  ' + level.name;
  menu.hidden = true;
  pause.hidden = false;
  pause.textContent = 'PAUSE';
  updatePowers(hero);
  announce(level.name, 2);
}
function announce(message,time=1.35) { notice=message; noticeTime=time; }
function showMenu(heading='CHOOSE YOUR HERO', button='START MISSION') {
  state = 'menu';
  title.textContent = heading;
  start.textContent = button;
  menu.hidden = false;
  pause.hidden = true;
  stage.textContent = 'HERO SELECT';
}
start.onclick = () => { unlockAudio(); startLevel(0); };
pause.onclick = () => togglePause();
function togglePause() {
  if (state === 'play') {
    state = 'paused';
    pause.textContent = 'RESUME';
  } else if (state === 'paused') {
    state = 'play';
    pause.textContent = 'PAUSE';
  }
}
const controls = new Set(['KeyW','KeyA','KeyS','KeyD','Space','KeyJ','KeyK','KeyL','Escape','Enter','KeyM']);
window.addEventListener('keydown', event => {
  if (!controls.has(event.code)) return;
  if ((event.code==='Space'||event.code==='Enter') && event.target instanceof HTMLButtonElement && state==='menu') return;
  if (event.code==='Space' || state!=='menu') event.preventDefault();
  if (!keys.has(event.code)) {
    pressed.add(event.code);
    if (event.code==='Escape') togglePause();
    if (event.code==='KeyM') soundOn=!soundOn;
    if (event.code==='Enter') {
      if (state==='menu') start.click();
      else if (state==='clear') startLevel(levelIndex+1);
      else if (state==='lose') startLevel(levelIndex);
      else if (state==='win') showMenu();
    }
  }
  keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); pressed.clear(); if (state==='play') togglePause(); });
function unlockAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!audio && Audio) audio=new Audio();
  if (audio?.state==='suspended') audio.resume().catch(()=>{});
}
function tone(freq, length=.08, shape='square', end=freq/2) {
  if (!audio || !soundOn || audio.state!=='running') return;
  const oscillator=audio.createOscillator();
  const gain=audio.createGain();
  const now=audio.currentTime;
  oscillator.type=shape;
  oscillator.frequency.setValueAtTime(freq,now);
  oscillator.frequency.exponentialRampToValueAtTime(end,now+length);
  gain.gain.setValueAtTime(.035,now);
  gain.gain.exponentialRampToValueAtTime(.001,now+length);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now+length);
}
function burst(x,y,color,count=9) {
  for(let i=0;i<count;i++) sparks.push({x,y,vx:random(-85,85),vy:random(-100,30),life:random(.13,.38),color});
}
function enemyHit(enemy, amount, effect='') {
  if (enemy.hp<=0) return;
  enemy.hp-=amount;
  enemy.flash=.13;
  if (effect==='snare') enemy.stun=enemy.isBoss?.75:2.1;
  if (effect==='knock') enemy.down=enemy.isBoss?.25:1.1;
  burst(enemy.x,enemy.y-17,amount>20?gold:'#ffe7ff');
  tone(125,.08,'triangle',55);
  if (enemy.hp<=0) {
    burst(enemy.x,enemy.y-14,enemy.isBoss?level.color:'#ff82bd',enemy.isBoss?38:15);
    shake=enemy.isBoss?.33:.09;
    if (enemy.isBoss) announce('BOSS DEFEATED',2);
  }
}
function defense() {
  if (player.dodge>0) return 'dodge';
  if (!down('KeyL')) return '';
  if (selected===3 && !shieldOut) return 'shield';
  if (selected===4) return 'reflect';
  if (selected===2 || selected===6) return 'guard';
  return '';
}
function hurt(amount, source) {
  if (player.ifr>0) return;
  const guard=defense();
  if (guard==='dodge' || guard==='shield' || guard==='reflect' || guard==='guard') {
    burst(player.x,player.y-16,guard==='shield'||guard==='reflect'?gold:hero.trim,5);
    if (guard==='guard') { amount=Math.ceil(amount*.3); }
    else { tone(510,.08,'triangle',810); return; }
  }
  player.hp=Math.max(0,player.hp-amount);
  player.ifr=.72;
  player.vx=Math.sign(player.x-source)*120;
  shake=.17;
  burst(player.x,player.y-16,'#ff557f');
  tone(95,.21,'sawtooth',42);
  if (!player.hp) finish('lose');
}
function targets() { return boss.active ? [...mobs,boss] : mobs; }
function melee(range, amount, effect='', both=false) {
  for (const enemy of targets()) {
    const dx=enemy.x-player.x;
    if ((both || dx*player.dir>=-7) && Math.abs(dx)<range && Math.abs(enemy.y-player.y)<34) enemyHit(enemy,amount,effect);
  }
}
function shoot(kind, speed, damage, life, effect='', vy=0) {
  const shot={x:player.x+player.dir*13,y:player.y-18,vx:speed*player.dir,vy,damage,life,kind,effect,friendly:true,hits:new Set()};
  shots.push(shot);
  tone(kind==='hex'?365:220,.16,'triangle',kind==='web'?650:115);
  return shot;
}
function actions(dt, move) {
  player.j=Math.max(0,player.j-dt);
  player.k=Math.max(0,player.k-dt);
  player.action=Math.max(0,player.action-dt);
  player.dodge=Math.max(0,player.dodge-dt);
  player.boost=Math.max(0,player.boost-dt);
  player.ifr=Math.max(0,player.ifr-dt);
  player.slide=Math.max(0,player.slide-dt);
  player.slideCooldown=Math.max(0,player.slideCooldown-dt);
  player.split=Math.max(0,player.split-dt);
  if (selected===5) {
    if (player.slide || player.split) return;
    if (hit('KeyL') && player.ground && !player.slideCooldown) {
      player.slide=.39;
      player.slideCooldown=.68;
      player.slideHits=new Set();
      tone(155,.18,'triangle',75);
      return;
    }
    if (hit('KeyK') && !player.k) {
      player.k=.65;
      player.split=.3;
      melee(49,38,'knock',true);
      burst(player.x+player.dir*22,player.y-29,hero.trim,10);
      tone(310,.15,'triangle',105);
      return;
    }
  }
  if (hit('KeyL') && [0,1].includes(selected) && player.k<.45) {
    player.dodge=.25;
    player.vx=(move||player.dir)*220;
    player.k=Math.max(player.k,.32);
  }
  if (down('KeyJ') && !player.j && !(selected===3 && shieldOut)) {
    player.j=.27;
    player.action=.18;
    switch(selected) {
      case 0: melee(43,22); break;
      case 1: shoot('web',280,17,1,'snare'); player.j=.32; break;
      case 2: shoot('rang',360,23,.78); break;
      case 3: shieldOut=true; shoot('shield',325,32,2); player.j=.42; break;
      case 4: shoot('lasso',360,25,.39,'snare'); player.j=.37; break;
      case 5: melee(47,29,'knock'); break;
      case 6: shoot('hex',340,24,.88); break;
    }
    if (selected===0 || selected===5) { burst(player.x+player.dir*20,player.y-18,hero.trim,4); tone(160,.07); }
  }
  if (hit('KeyK') && !player.k && selected!==1 && selected!==2) {
    player.k=.65;
    player.action=.25;
    switch(selected) {
      case 0: player.boost=.34; player.boostHits=new Set(); player.k=.85; break;
      case 3: melee(48,shieldOut?20:38,'knock'); break;
      case 4: melee(53,39,'knock',true); break;
      case 6: shoot('hex',245,37,1,'knock',-55); shoot('hex',285,37,1,'knock'); shoot('hex',245,37,1,'knock',55); player.k=1.15; break;
    }
    burst(player.x,player.y-16,hero.trim,7);
    tone(280,.13,'triangle',95);
  }
}

function movePlayer(dt, gate) {
  const move=Number(down('KeyD'))-Number(down('KeyA'));
  if (move && !player.slide) player.dir=move;
  actions(dt,move);
  const oldX=player.x;
  const oldY=player.y;
  if ([1,2].includes(selected) && down('KeyK') && !swing && !player.k) {
    const anchor=anchors().find(point=>Math.abs(point.x-player.x)<170 && player.x<point.x+30 && player.y>point.y);
    if (anchor) {
      const angle=Math.atan2(player.x-anchor.x,player.y-anchor.y);
      swing={anchor,angle,length:Math.hypot(player.x-anchor.x,player.y-anchor.y),omega:2.5};
      player.ground=false;
      tone(390,.18,'triangle',720);
    }
  }
  if (swing) {
    if (!down('KeyK') || swing.angle>1.04 || hit('Space')) {
      player.vx=Math.max(190,player.vx);
      player.vy=Math.min(-95,player.vy);
      player.k=.48;
      swing=null;
    } else {
      const {anchor,length}=swing;
      swing.omega+=(-2.2*Math.sin(swing.angle)+move*.85)*dt;
      swing.angle+=swing.omega*dt;
      player.x=anchor.x+Math.sin(swing.angle)*length;
      player.y=anchor.y+Math.cos(swing.angle)*length;
      player.vx=(player.x-oldX)/dt;
      player.vy=(player.y-oldY)/dt;
    }
  }
  if (!swing) {
    const speed=hero.speed*(defense() && !player.dodge?.58:1);
    const desired=player.boost ? 365*player.dir : move*(player.ground || selected===6 ? speed : Math.max(speed, 193)*(selected===5?1.31:1));
    if (player.slide) player.vx=330*player.dir;
    else if (!player.dodge) player.vx+=(desired-player.vx)*Math.min(1,dt*(player.ground?15:5));
    if (selected===6) {
      const climb=Number(down('KeyS'))-Number(down('KeyW')||down('Space'));
      player.vy+=(climb*124-player.vy)*Math.min(1,dt*12);
      player.ground=false;
    } else {
      if (hit('Space') && player.ground && !player.slide) {
        player.vy=selected===5?-295:-263;
        if (move) player.vx=Math.max(speed, selected===5?245:193)*move;
        player.ground=false;
        tone(180,.15,'square',385);
      }
      player.vy+=650*dt;
    }
    player.x+=player.vx*dt;
    player.y+=player.vy*dt;
  }
  player.x=clamp(player.x,15,gate);
  if (player.boost) {
    for (const enemy of targets()) {
      if (Math.abs(enemy.x-player.x)<33 && Math.abs(enemy.y-player.y)<34 && !player.boostHits.has(enemy)) {
        player.boostHits.add(enemy);
        enemyHit(enemy,32,'knock');
      }
    }
  }
  const floor=floorAt(player.x);
  if (selected===6) {
    const lowest=Number.isFinite(floor)?floor-13:218;
    const ceiling=levelIndex===2?Math.min(42,floor-150):42;
    player.y=clamp(player.y,ceiling,lowest);
  } else if (player.y>=floor && !swing && player.vy>=0) {
    const canClimb=levelIndex!==2 || player.ground || oldY<=floor+14 || floor===floorAt(oldX);
    if (canClimb) { player.y=floor; player.vy=0; player.ground=true; }
  } else if (!swing) player.ground=false;
  if (player.slide) {
    if (!player.ground) player.slide=0;
    else {
      for (const enemy of targets()) {
        const distance=(enemy.x-player.x)*player.dir;
        if (distance>=-12 && distance<=29 && Math.abs(enemy.y-player.y)<25 && !player.slideHits.has(enemy)) {
          player.slideHits.add(enemy);
          enemyHit(enemy,34,'knock');
        }
      }
    }
  }
  if (levelIndex===2 && selected!==6 && player.ground && !player.slide && (down('KeyW')||down('KeyS')) && !move && stairs.some(([a,b])=>between(player.x,a-8,b+8))) {
    player.x=clamp(player.x+(down('KeyW')?1:-1)*hero.speed*dt,15,gate);
    player.y=floorAt(player.x);
  }
  if (player.y>H+48) {
    player.hp=Math.max(0,player.hp-18);
    if (!player.hp) { finish('lose'); return; }
    player.x=checkpoint;
    player.y=floorAt(checkpoint)-(selected===6?13:0);
    player.vx=0;
    player.vy=0;
    player.ground=true;
    player.ifr=1.2;
    swing=null;
    announce('BACK TO CHECKPOINT');
  }
  if (Math.abs(player.y-floor)<26 && !level.gaps.some(([a,b])=>between(player.x,a-12,b+13))) checkpoint=player.x;
}

function spawn(group) {
  group.active=true;
  const types=['bat','gun','can'];
  const first=Math.floor(random(0,types.length));
  for (let i=0;i<group.count;i++) {
    const x=group.x+32+i*32+random(-9,9);
    mobs.push({x,y:floorAt(x),hp:types[(first+i)%3]==='can'?60:47,dir:-1,type:types[(first+i)%3],group,timer:random(.3,.9),stun:0,down:0,flash:0,step:0});
  }
  announce('CLEAR THE BLOCK');
}
function enemyShot(x,y,vx,vy,kind,damage) {
  shots.push({x,y,vx,vy,kind,damage,life:2.5,friendly:false,hits:new Set()});
}
function aim(enemy,speed,kind,damage,offset=0) {
  const angle=Math.atan2(player.y-18-(enemy.y-21),player.x-enemy.x)+offset;
  enemyShot(enemy.x,enemy.y-21,Math.cos(angle)*speed,Math.sin(angle)*speed,kind,damage);
}
function updateEnemy(enemy, dt) {
  if (enemy.hp<=0) return;
  enemy.stun=Math.max(0,enemy.stun-dt);
  enemy.down=Math.max(0,enemy.down-dt);
  enemy.flash=Math.max(0,enemy.flash-dt);
  if (enemy.stun || enemy.down) return;
  const dx=player.x-enemy.x;
  enemy.dir=dx>=0?1:-1;
  enemy.timer-=dt;
  const distance=Math.abs(dx);
  if (enemy.isBoss) {
    const speed=levelIndex===1?110:levelIndex===2?60:82;
    const boundary=level.length-440;
    if (distance>(levelIndex===2?94:34)) {
      enemy.x=clamp(enemy.x+enemy.dir*speed*dt,boundary,level.length-32);
      enemy.step+=dt*12;
    }
    enemy.y=floorAt(enemy.x);
    if (levelIndex===1) enemy.y-=Math.max(0,Math.sin(elapsed*3))*27;
    if (enemy.timer<=0) {
      enemy.timer=enemy.hp<enemy.max/2?.72:1.25;
      if (distance<39 && Math.abs(enemy.y-player.y)<47) hurt(17,enemy.x);
      if (levelIndex===0) {
        aim(enemy,190,'bolt',13);
        enemyShot(enemy.x,enemy.y-4,enemy.dir*220,0,'bolt',13);
      } else if (levelIndex===1) {
        aim(enemy,240,'blade',14,-.16);
        aim(enemy,240,'blade',14,.16);
      } else {
        for (const offset of [-.36,0,.36]) aim(enemy,215,'orb',16,offset);
      }
      burst(enemy.x,enemy.y-20,level.color,5);
    }
    return;
  }
  const reach=enemy.type==='gun'?128:enemy.type==='can'?50:24;
  if (distance>reach) {
    const n=enemy.x+enemy.dir*(enemy.type==='bat'?76:56)*dt;
    if (Number.isFinite(floorAt(n))) { enemy.x=n; enemy.step+=dt*13; }
  }
  enemy.y=floorAt(enemy.x);
  if (enemy.timer>0 || distance>reach+4) return;
  enemy.timer=enemy.type==='gun'?1.5:enemy.type==='can'?1.75:.85;
  if (enemy.type==='gun') aim(enemy,200,'bullet',10);
  else if (enemy.type==='can') aim(enemy,165,'junk',13);
  else if (Math.abs(enemy.y-player.y)<33) hurt(10,enemy.x);
}
function updateShots(dt) {
  for (const shot of shots) {
    shot.life-=dt;
    if (shot.kind==='shield' && shot.life<1.68) {
      if (!shot.returning) { shot.returning=true; shot.hits.clear(); }
      const dx=player.x-shot.x;
      const dy=player.y-18-shot.y;
      const distance=Math.hypot(dx,dy);
      if (distance<13 || shot.life<=0) { shot.life=0; shieldOut=false; continue; }
      shot.vx=dx/distance*365;
      shot.vy=dy/distance*365;
    }
    shot.x+=shot.vx*dt;
    shot.y+=shot.vy*dt;
    if (shot.life<=0) continue;
    if (shot.friendly) {
      for (const enemy of targets()) {
        const radius=enemy.isBoss?19:12;
        if (enemy.hp<=0 || shot.hits.has(enemy) || Math.abs(enemy.x-shot.x)>radius || Math.abs(enemy.y-(enemy.isBoss?24:17)-shot.y)>radius+7) continue;
        shot.hits.add(enemy);
        enemyHit(enemy,shot.damage,shot.effect);
        if (shot.kind!=='shield') { shot.life=0; break; }
      }
    } else if (Math.abs(player.x-shot.x)<11 && Math.abs(player.y-18-shot.y)<18) {
      if (defense()==='reflect') {
        shot.friendly=true;
        shot.vx=-shot.vx*1.4;
        shot.vy=-shot.vy*1.4;
        shot.damage=31;
        burst(shot.x,shot.y,gold,8);
        tone(620,.1,'triangle',980);
      } else {
        hurt(shot.damage,shot.x);
        shot.life=0;
      }
    }
  }
  shots=shots.filter(shot=>shot.life>0);
}
function finish(result) {
  state=result;
  pause.hidden=true;
  keys.clear();
  if (result==='clear'||result==='win') tone(510,.45,'triangle',920);
}
function update(dt) {
  elapsed+=dt;
  noticeTime=Math.max(0,noticeTime-dt);
  shake=Math.max(0,shake-dt);
  let gate=level.length-15;
  const group=squads.find(item=>!item.done);
  if (group) {
    if (!group.active && player.x>group.x-135) spawn(group);
    if (group.active) gate=group.x+155;
  } else if (player.x>level.length-440 && !boss.active) {
    boss.active=true;
    announce(level.boss,2);
    tone(72,.4,'sawtooth',51);
  }
  movePlayer(dt,gate);
  if (state!=='play') return;
  for (const enemy of targets()) updateEnemy(enemy,dt);
  updateShots(dt);
  if (state!=='play') return;
  mobs=mobs.filter(enemy=>enemy.hp>0);
  if (group?.active && !mobs.some(enemy=>enemy.group===group)) {
    group.done=true;
    announce('BLOCK CLEARED');
    player.hp=Math.min(hpMax,player.hp+16);
  }
  for (const particle of sparks) {
    particle.x+=particle.vx*dt;
    particle.y+=particle.vy*dt;
    particle.vy+=175*dt;
    particle.life-=dt;
  }
  sparks=sparks.filter(particle=>particle.life>0);
  if (boss.active && boss.hp<=0 && noticeTime<1.35) finish(levelIndex===2?'win':'clear');
  const follow=Math.min(1,dt*8);
  camera+=(clamp(player.x-150,0,level.length-W)-camera)*follow;
  if (levelIndex===2) {
    const targetY=Math.min(0,floorAt(player.x)-222,player.y-96);
    cameraY+=(targetY-cameraY)*follow;
  }
}

function text(label,x,y,color='#fff1f9',size=10,align='left') {
  ctx.font='bold '+size+'px monospace';
  ctx.textAlign=align;
  ctx.fillStyle=ink;
  ctx.fillText(label,Math.round(x)+1,Math.round(y)+1);
  ctx.fillStyle=color;
  ctx.fillText(label,Math.round(x),Math.round(y));
}
function sceneBase(config,index) {
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,config.sky[0]);
  grad.addColorStop(1,config.sky[1]);
  rect(ctx,grad,0,0,W,H);
  if (index===2) return;
  for(let i=0;i<54;i++) {
    rect(ctx,i%5===0?'#f8b3dd':'#8f739e',hash(i*3)*W,hash(i*7+1)*166,i%5===0?2:1,1);
  }
  const moonX=index===0?367:330;
  const moonY=index===0?73:54;
  for(let y=-25;y<=25;y++) {
    const span=Math.floor(Math.sqrt(625-y*y));
    rect(ctx,y>9?'#f3a7bd':'#ffced6',moonX-span,moonY+y,span*2,1);
    if (y>0 && y%6===0) rect(ctx,config.sky[0],moonX-span,moonY+y,span*2,1);
  }
}
function skyline(config,index,scroll) {
  sceneBase(config,index);
  if (index===2) {
    for(let i=Math.floor(scroll/120)*2-1;i<scroll/60+10;i++) {
      const x=i*122-scroll*1.9;
      rect(ctx,'#1e152c',x,18,116,225);
      rect(ctx,'#3a2448',x+3,23,111,204);
      rect(ctx,'#271e3c',x+12,32,92,175);
      rect(ctx,'#684365',x+12,32,92,2);
      for(let j=0;j<6;j++) {
        rect(ctx,'#7e4669',x+16+j*14,40,8,2);
        rect(ctx,'#41304f',x+16+j*14,44,8,74);
      }
      rect(ctx,'#1a122a',x+55,23,3,204);
    }
    return;
  }
  for(let layer=0;layer<3;layer++) {
    const shift=scroll*[.18,.34,.58][layer];
    const step=42+layer*12;
    for(let i=Math.floor(shift/step)-1;i<(shift+W)/step+1;i++) {
      const x=i*step-shift;
      const span=step-4-hash(i+4)*9;
      const h=35+hash(i*3+layer*17)*(95+layer*7);
      const top=(index===0?228:194)-h+layer*13;
      const row=8+layer*3;
      rect(ctx,config.city[layer],x,top,span,H-top);
      rect(ctx,config.city[layer],x+7,top-5,span/2,5);
      if (i%4===0) {
        rect(ctx,config.city[layer],x+12,top-20,2,17);
        rect(ctx,'#de699b',x+12,top-20,2,2);
      }
      for(let y=top+8;y<H;y+=row) for(let col=5;col<span-4;col+=10) {
        if (hash(i*113+Math.round(y-top)*11+col*3)>.48) rect(ctx,layer===2?'#765277':'#a46b9a',x+col,y,layer+2,layer+2);
      }
    }
  }
}
function foreground(scroll) {
  const left=Math.max(0,Math.floor(scroll/8)*8);
  for(let x=left;x<scroll+W+8;x+=8) {
    const y=floorAt(x+4);
    if (!Number.isFinite(y)) continue;
    const sx=x-scroll;
    if (levelIndex===0) {
      rect(ctx,'#262134',sx,y,8,H-y);
      rect(ctx,'#b98a99',sx,y,8,2);
      rect(ctx,'#585065',sx,y+2,8,8);
      rect(ctx,'#1e192b',sx,y+10,8,2);
      if (x%64<32) rect(ctx,'#b2926f',sx,y+26,8,2);
    } else if (levelIndex===1) {
      rect(ctx,'#2a203d',sx,y,8,H-y);
      rect(ctx,'#ba85a8',sx,y,8,2);
      rect(ctx,'#55405d',sx,y+2,8,7);
      if (x%32<16) rect(ctx,'#65496b',sx,y+18,8,13);
    } else {
      rect(ctx,'#2b203d',sx,y,8,H-y);
      rect(ctx,'#bd7195',sx,y,8,2);
      rect(ctx,'#594263',sx,y+2,8,5);
      if (x%32<16) rect(ctx,'#392946',sx,y+16,8,2);
    }
  }
  if (levelIndex===0) {
    for(let x=110;x<level.length;x+=160) {
      if (Math.abs(x-scroll-240)>275 || !Number.isFinite(floorAt(x))) continue;
      const sx=x-scroll;
      const y=floorAt(x);
      rect(ctx,'#201329',sx,y-90,4,90);
      rect(ctx,'#8d557d',sx+1,y-89,1,88);
      rect(ctx,'#201329',sx-12,y-92,16,4);
      rect(ctx,'#fbc795',sx-13,y-88,11,2);
      ctx.fillStyle='#ffbf8016';
      ctx.beginPath(); ctx.moveTo(sx-13,y-86); ctx.lineTo(sx-2,y-86); ctx.lineTo(sx+24,y); ctx.lineTo(sx-39,y); ctx.fill();
    }
  }
  if (levelIndex===2) {
    const x=level.length-97-scroll;
    const y=floorAt(level.length-97);
    rect(ctx,'#190e24',x-20,y-73,58,73);
    rect(ctx,'#724567',x-16,y-69,50,69);
    rect(ctx,'#251331',x-12,y-64,42,64);
    rect(ctx,'#ff83ce',x-12,y-65,42,2);
    rect(ctx,'#6c3d68',x+8,y-62,2,62);
  }
}
function bar(x,y,w,h,value,max,color) {
  rect(ctx,'#130d24',x-1,y-1,w+2,h+2);
  rect(ctx,'#382c4c',x,y,w,h);
  if (value>0) rect(ctx,color,x,y,w*value/max,h);
  if (value>0) rect(ctx,'#fff3',x,y,w*value/max,1);
}
function drawShot(shot,scroll) {
  const x=shot.x-scroll;
  const y=shot.y;
  const colors={web:'#ecfaff',rang:'#d5e3ff',shield:'#fa476a',lasso:gold,hex:'#ff5ab0',bolt:gold,blade:'#83f4ff',orb:'#f078ff',bullet:'#fff2a3',junk:'#b0b9ce'};
  const color=colors[shot.kind];
  if (shot.kind==='shield'||shot.kind==='junk') {
    rect(ctx,ink,x-6,y-5,12,10);
    rect(ctx,color,x-5,y-4,10,8);
    rect(ctx,'#fff4ef',x-3,y-3,6,6);
    rect(ctx,shot.kind==='shield'?'#4d73d7':'#627083',x-2,y-2,4,4);
  } else {
    const sz=['orb','hex','web','bolt'].includes(shot.kind)?6:3;
    rect(ctx,color,x-sz/2,y-sz/2,sz,sz);
    rect(ctx,'#fff7fc',x-1,y-1,2,2);
    rect(ctx,color+'66',x-shot.vx*.024,y-shot.vy*.024,5,2);
  }
}
function render() {
  if (state==='menu') {
    skyline(levels[0],0,(performance.now()/90)%3000);
    return;
  }
  let viewX=camera;
  if (levelIndex===2 && boss.active && Math.abs(player.x-boss.x)<W-80) {
    // Keep both fighters inside the viewport as the boss enters the arena.
    viewX=clamp(viewX,Math.max(player.x,boss.x)-W+36,Math.min(player.x,boss.x)-36);
  }
  const scroll=Math.round(viewX+(shake?random(-2,2):0));
  skyline(level,levelIndex,scroll);
  // Translate world objects together and leave the HUD in screen coordinates.
  const viewY=Math.round(Math.min(cameraY,levelIndex===2?player.y-76:0));
  ctx.save();
  ctx.translate(0,-viewY);
  foreground(scroll);
  const group=squads.find(item=>item.active&&!item.done);
  if (group) {
    const x=group.x+155-scroll;
    const floor=floorAt(group.x+155);
    if (Number.isFinite(floor)) {
      for(let y=floor-48;y<floor;y+=5) rect(ctx,y%2?'#ff6ea6':'#f6aa82',x,y,2,2);
      text('LOCKED',x,floor-51,'#ffadc4',6,'center');
    }
  }
  for (const point of anchors()) {
    rect(ctx,'#447d9e',point.x-scroll-4,point.y-3,9,7);
    rect(ctx,'#91f8ff',point.x-scroll-2,point.y-1,5,3);
  }
  for (const enemy of targets()) {
    if (enemy.hp<=0) continue;
    const x=enemy.x-scroll;
    const look=enemy.isBoss?bossLooks[levelIndex]:thugLooks[enemy.type];
    ctx.save();
    ctx.globalAlpha=enemy.flash>0?.55:1;
    if (enemy.down) {
      ctx.translate(x,enemy.y-4);
      ctx.rotate(-enemy.dir*Math.PI/2);
      sprite(ctx,look,0,0,enemy.dir,0,enemy.isBoss?1.45:1,'',enemy.type);
    } else sprite(ctx,look,x,enemy.y,enemy.dir,enemy.step,enemy.isBoss?1.45:1,enemy.timer<.15?'attack':'',enemy.type);
    ctx.restore();
    if (enemy.stun) {
      for(let line=0;line<4;line++) rect(ctx,'#e5edffc8',x-9+(line%2)*3,enemy.y-8-line*6,18-line,1);
    }
  }
  for (const shot of shots) drawShot(shot,scroll);
  for (const particle of sparks) rect(ctx,particle.color,particle.x-scroll,particle.y,2,2);
  const x=player.x-scroll;
  const y=player.y;
  if (swing) {
    ctx.strokeStyle=selected===1?'#f3f5ff':'#b4d2e7';
    ctx.beginPath(); ctx.moveTo(swing.anchor.x-scroll,swing.anchor.y); ctx.lineTo(x,y-17); ctx.stroke();
  }
  if (player.boost || selected===6) {
    const hue=selected===6?'#ff77c2':'#ffdd70';
    for(let i=0;i<6;i++) rect(ctx,hue+(i%2?'88':'bb'),x-player.dir*(7+i*4),y-4+hash(i*19+Math.floor(elapsed*25))*12,3,2);
  }
  if (!player.ifr || Math.floor(player.ifr*16)%2===0) {
    const pose=player.slide?'slide':player.split?'split':selected===3&&shieldOut?'unarmed':player.action?'attack':'';
    sprite(ctx,hero,x,y,player.dir,player.ground?elapsed*Math.abs(player.vx)*.19:1,1,pose);
  }
  if (defense() && defense()!=='dodge') {
    const bx=x+player.dir*14;
    for(let i=0;i<5;i++) rect(ctx,i%2?hero.trim:'#fff',bx+player.dir*(2-Math.abs(i-2)),y-31+i*5,2,3);
  }
  ctx.restore();
  rect(ctx,'#140e24e8',0,0,W,32);
  text(hero.name.toUpperCase(),12,12,gold,9);
  bar(12,18,106,6,player.hp,hpMax,'#f34e83');
  if (boss.active && boss.hp>0) {
    text(level.boss,W-12,12,level.color,9,'right');
    bar(W-144,18,132,6,boss.hp,boss.max,level.color);
  } else {
    text(level.name,W-12,12,level.color,9,'right');
    bar(W-90,18,78,4,player.x,level.length,level.color);
  }
  if (noticeTime && state==='play') {
    rect(ctx,'#1d142edc',115,43,250,24);
    text(notice,W/2,59,gold,13,'center');
  }
  if (state==='play') return;
  const overlays = {
    paused:['PAUSED','Escape or Resume to continue'],
    lose:['MISSION FAILED','Enter to retry this stage'],
    clear:['STAGE CLEAR','Enter to continue'],
    win:['CITY SAVED','Enter to return to hero select'],
  };
  const [heading,prompt]=overlays[state];
  rect(ctx,'#160d25d9',0,32,W,H-32);
  text(heading,W/2,130,gold,30,'center');
  text(prompt,W/2,156,'#f9d8ff',11,'center');
}
function frame(time) {
  const dt=Math.min(.025,(time-(previous??time))/1000);
  previous=time;
  if (state==='play') update(dt);
  render();
  pressed.clear();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

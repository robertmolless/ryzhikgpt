import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

class TelegramBridge{
  constructor(){this.tg=window.Telegram?.WebApp||null}
  init(){if(!this.tg)return;this.tg.ready();this.tg.expand();this.tg.BackButton.onClick(()=>game.ui.showMenu(true))}
  vibrate(ms=35){if(navigator.vibrate)navigator.vibrate(ms)}
}

class Music{
  constructor(){this.ctx=null;this.enabled=true;this.started=false;this.step=0;this.next=0}
  init(){this.ctx ||= new (window.AudioContext||window.webkitAudioContext)()}
  tone(freq,dur=.3,type='sine',vol=.035,when=0){
    if(!this.enabled)return;this.init();
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,this.ctx.currentTime+when);
    g.gain.setValueAtTime(0.0001,this.ctx.currentTime+when);
    g.gain.exponentialRampToValueAtTime(vol,this.ctx.currentTime+when+.03);
    g.gain.exponentialRampToValueAtTime(0.0001,this.ctx.currentTime+when+dur);
    o.connect(g);g.connect(this.ctx.destination);o.start(this.ctx.currentTime+when);o.stop(this.ctx.currentTime+when+dur+.05);
  }
  noise(dur=.08,vol=.02){
    if(!this.enabled)return;this.init();
    const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*dur,this.ctx.sampleRate);
    const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const src=this.ctx.createBufferSource(), g=this.ctx.createGain();src.buffer=buffer;g.gain.value=vol;src.connect(g);g.connect(this.ctx.destination);src.start();
  }
  meow(){this.tone(650,.08,'sine',.08);setTimeout(()=>this.tone(470,.16,'triangle',.06),70)}
  pickup(){[880,1175,1568].forEach((f,i)=>this.tone(f,.16,'triangle',.035,i*.06))}
  quest(){[523,659,784,1046].forEach((f,i)=>this.tone(f,.32,'triangle',.035,i*.08))}
  bad(){this.tone(150,.18,'sawtooth',.025)}
  stepSound(){this.noise(.025,.006)}
  start(){if(this.started)return;this.started=true;this.init();this.loop()}
  loop(){
    if(!this.enabled){setTimeout(()=>this.loop(),500);return}
    const t=game?.time||'day';
    const chords={
      morning:[[392,493,659],[440,523,659],[349,523,698],[392,587,784]],
      day:[[440,554,659],[392,493,659],[523,659,784],[349,440,587]],
      evening:[[349,440,523],[392,493,659],[329,392,493],[293,440,587]],
      night:[[261,392,523],[293,440,523],[246,369,493],[220,329,440]]
    }[t]||[[392,523,659]];
    const chord=chords[this.step%chords.length];
    chord.forEach((f,i)=>this.tone(f,2.4,'triangle',.012,i*.03));
    this.tone(chord[0]/2,1.4,'sine',.018,.02);
    const melody=[chord[1],chord[2],chord[1]*1.125,chord[2]*1.125];
    melody.forEach((f,i)=>this.tone(f,.18,'sine',.012,.45+i*.42));
    if(t==='morning'||t==='day'){setTimeout(()=>{this.tone(1450,.05,'triangle',.018);this.tone(1750,.04,'triangle',.014,.06)},900)}
    this.step++;setTimeout(()=>this.loop(),3200);
  }
}

class MobileControls{
  constructor(){
    this.vec={x:0,z:0};this.active=false;this.pid=null;
    this.zone=$('stickZone');this.stick=$('stick');this.bind();
  }
  bind(){
    const move=e=>{
      if(!this.active||e.pointerId!==this.pid)return;
      const r=this.zone.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      let dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),max=r.width*.33;
      if(len>max){dx=dx/len*max;dy=dy/len*max}
      this.vec={x:dx/max,z:dy/max};this.stick.style.transform=`translate(${dx}px,${dy}px)`;
    };
    this.zone.addEventListener('pointerdown',e=>{this.active=true;this.pid=e.pointerId;this.zone.setPointerCapture(e.pointerId);move(e)});
    this.zone.addEventListener('pointermove',move);
    this.zone.addEventListener('pointerup',()=>this.reset());
    this.zone.addEventListener('pointercancel',()=>this.reset());
    $('btnAction').onclick=()=>game.interact();
    $('btnMeow').onclick=()=>game.meow();
    $('btnInv').onclick=()=>game.ui.inventory();
    $('btnQuest').onclick=()=>game.ui.quests();
    $('btnMenu').onclick=()=>game.ui.showMenu(true);
  }
  reset(){this.active=false;this.pid=null;this.vec={x:0,z:0};this.stick.style.transform='translate(0,0)'}
}

class Input{
  constructor(){this.keys={};addEventListener('keydown',e=>this.keys[e.key.toLowerCase()]=true);addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false)}
  vector(){let x=0,z=0,k=this.keys;if(k.a||k.arrowleft)x--;if(k.d||k.arrowright)x++;if(k.w||k.arrowup)z--;if(k.s||k.arrowdown)z++;const l=Math.hypot(x,z)||1;return{x:x/l,z:z/l}}
}

class UI{
  constructor(){this.bind()}
  bind(){
    $('newGame').onclick=()=>game.start(true);
    $('continueGame').onclick=()=>game.start(false);
    $('saveGame').onclick=()=>game.save();
    $('inventoryBtn').onclick=()=>this.inventory();
    $('questsBtn').onclick=()=>this.quests();
    $('musicBtn').onclick=()=>{game.music.enabled=!game.music.enabled;$('musicBtn').textContent='Музыка: '+(game.music.enabled?'вкл':'выкл')};
    $('closeModal').onclick=()=>this.closeModal();
    $('dialogue').onclick=()=>this.closeDialogue();
  }
  showMenu(p=false){$('menu').classList.remove('hidden');if(p)game.paused=true}
  hideMenu(){$('menu').classList.add('hidden')}
  modal(t,html){$('modalTitle').textContent=t;$('modalContent').innerHTML=html;$('modal').classList.remove('hidden');game.paused=true}
  closeModal(){$('modal').classList.add('hidden');game.paused=false}
  toast(t){const el=$('toast');el.textContent=t;el.classList.remove('hidden');clearTimeout(this.tt);this.tt=setTimeout(()=>el.classList.add('hidden'),1800)}
  dialogue(n,text){$('speaker').textContent=n.name;$('dialogueText').textContent=text;$('portrait').innerHTML=this.portrait(n);$('dialogue').classList.remove('hidden');game.paused=true}
  closeDialogue(){$('dialogue').classList.add('hidden');game.paused=false}
  portrait(n){
    const hair=n.hair, cloth=n.color;
    const hat=n.hat?`<path d="M18 34 L43 6 L68 34 Z" fill="#22142d"/><ellipse cx="43" cy="35" rx="34" ry="8" fill="#160d20"/>`:'';
    const glasses=n.glasses?`<circle cx="34" cy="46" r="7" fill="none" stroke="${n.name==='Даня'?'#e22':'#111'}" stroke-width="2"/><circle cx="52" cy="46" r="7" fill="none" stroke="${n.name==='Даня'?'#e22':'#111'}" stroke-width="2"/>`:'';
    return `<svg viewBox="0 0 86 86"><rect width="86" height="86" rx="18" fill="rgba(255,255,255,.18)"/><ellipse cx="43" cy="78" rx="28" ry="8" fill="rgba(0,0,0,.24)"/><path d="M19 84 Q25 58 43 58 Q62 58 68 84 Z" fill="${cloth}"/><circle cx="43" cy="43" r="22" fill="#f1bb8d"/><path d="M22 39 Q26 18 44 18 Q62 18 66 39 Q48 30 22 39 Z" fill="${hair}"/>${hat}<circle cx="35" cy="46" r="2.6"/><circle cx="51" cy="46" r="2.6"/>${glasses}<path d="M35 58 Q43 64 52 58" stroke="#783838" stroke-width="2" fill="none"/></svg>`;
  }
  inventory(){
    const html=game.inventory.length?`<div class="invGrid">${game.inventory.map(i=>`<button class="invCard" onclick="game.useItem('${i.id}');game.ui.inventory()"><span class="invBig">${i.emoji}</span><b>${i.name}</b><small>${i.use}</small></button>`).join('')}</div>`:'<p>Пока пусто.</p>';
    this.modal('🎒 Инвентарь',html);
  }
  quests(){this.modal('📜 Квесты',game.quests.map(q=>`<div class="card">${q.done?'✅':'⬜'} <b>${q.title}</b><br><small>${q.hint}</small></div>`).join(''))}
  update(){
    $('satiety').textContent=game.stats.satiety|0;$('energy').textContent=game.stats.energy|0;$('mood').textContent=game.stats.mood|0;$('fame').textContent=game.stats.fame|0;
    $('timeWeather').textContent=`${game.timeRu()} • ${game.weather}`;
    const q=game.quests.find(q=>!q.done)||game.quests.at(-1);$('questTitle').textContent=q.title;$('questHint').textContent=q.hint;
    $('actionHint').textContent=game.actionHint();
  }
}

class Game3D{
  constructor(){
    window.game=this;
    this.tg=new TelegramBridge();this.tg.init();
    this.music=new Music();this.input=new Input();this.mobile=new MobileControls();this.ui=new UI();
    this.stats={satiety:100,energy:100,mood:100,fame:0};
    this.inventory=[];this.paused=true;this.clock=0;this.time='morning';this.weather='солнце';this.stepTimer=0;
    this.quests=[
      {id:'q1',title:'Миска Рыжика',hint:'Найди миску и поставь её в кошачьем уголке',item:'bowl',done:false},
      {id:'q2',title:'Старая кассета',hint:'Найди кассету в сарае и отдай Лёхе',item:'cassette',npc:'Лёха',done:false},
      {id:'q3',title:'Пропавший медиатор',hint:'Найди медиатор у пруда и отдай Игорю',item:'pick',npc:'Игорь',done:false},
      {id:'q4',title:'Фото со светлячками',hint:'Поговори с Настей вечером у поляны',npc:'Настя',done:false},
      {id:'q5',title:'Потерянные наклейки',hint:'Отдай Лизе наклейки',item:'stickers',npc:'Лиза',done:false},
      {id:'q6',title:'Колокольчик луны',hint:'Отдай Магу лунный колокольчик ночью',item:'moonbell',npc:'Маг',done:false},
      {id:'q7',title:'Лесная тропа',hint:'Отдай Соне редкий лист',item:'leaf',npc:'Соня',done:false},
      {id:'q8',title:'Странные записи',hint:'Отдай Нэне страницы дневника',item:'pages',npc:'Нэна',done:false},
      {id:'q9',title:'Сломанный фонарик',hint:'Отдай Кристине детали фонаря',item:'parts',npc:'Кристина',done:false},
      {id:'q10',title:'Коробка сокровищ',hint:'Отдай Дане пуговицу',item:'button',npc:'Даня',done:false},
      {id:'q11',title:'Старый забор',hint:'Поговори с Прохором у забора',npc:'Прохор',done:false},
      {id:'q20',title:'Солнечный колокольчик',hint:'Открой теплицу и найди Солнечный колокольчик',item:'sunbell',done:false},
    ];
    this.items=[
      {id:'bowl',name:'миска',emoji:'🥣',use:'Поставить в кошачьем уголке',x:-4,z:2,target:'zone:corner'},
      {id:'cassette',name:'старая кассета',emoji:'📼',use:'Отдать Лёхе',x:-12,z:9,target:'npc:Лёха'},
      {id:'pick',name:'медиатор',emoji:'🎸',use:'Отдать Игорю',x:13,z:13,target:'npc:Игорь'},
      {id:'stickers',name:'наклейки',emoji:'⭐',use:'Отдать Лизе',x:2,z:6,target:'npc:Лиза'},
      {id:'moonbell',name:'лунный колокольчик',emoji:'🔔',use:'Отдать Магу ночью',x:-7,z:11,target:'npc:Маг'},
      {id:'leaf',name:'редкий лист',emoji:'🍃',use:'Отдать Соне',x:16,z:-6,target:'npc:Соня'},
      {id:'pages',name:'страницы дневника',emoji:'📜',use:'Отдать Нэне',x:4,z:-5,target:'npc:Нэна'},
      {id:'parts',name:'детали фонаря',emoji:'🔩',use:'Отдать Кристине',x:-13,z:8,target:'npc:Кристина'},
      {id:'button',name:'пуговица',emoji:'🔘',use:'Отдать Дане',x:-6,z:6,target:'npc:Даня'},
      {id:'sunbell',name:'солнечный колокольчик',emoji:'🌞',use:'Завершить тайну',x:-15,z:-11,target:'zone:greenhouse'},
    ];
    this.init3D();
    this.createWorld();
    this.npcs=this.createNPCs();
    this.createCat();
    this.last=performance.now();
    requestAnimationFrame(t=>this.loop(t));
  }
  init3D(){
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.Fog(0x96c4ff,18,70);
    this.camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,200);
    this.camera.position.set(0,18,20);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    $('gameRoot').appendChild(this.renderer.domElement);
    addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)});
    this.sun=new THREE.DirectionalLight(0xffe4b0,2.6);this.sun.position.set(-12,24,10);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.scene.add(this.sun);
    this.amb=new THREE.HemisphereLight(0xbde7ff,0x6b4b32,1.6);this.scene.add(this.amb);
  }
  mat(c,rough=.85){return new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:0})}
  mesh(g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;this.scene.add(o);return o}
  createWorld(){
    this.ground=this.mesh(new THREE.PlaneGeometry(80,80,80,80),this.mat(0x6fb85a),0,0,0);this.ground.rotation.x=-Math.PI/2;this.ground.receiveShadow=true;
    // paths
    const pathMat=this.mat(0xb98552);
    [[0,0,7,20,.2],[-8,6,4,13,.25],[11,9,4,14,-.45],[14,-2,3,16,.25],[-14,-8,4,10,.2]].forEach(p=>{
      const m=this.mesh(new THREE.BoxGeometry(p[2],.035,p[3]),pathMat,p[0],.02,p[1]);m.rotation.y=p[4];
    });
    this.house=this.groupHouse(-1,-10);
    this.barn=this.groupBarn(-14,8);
    this.greenhouse=this.groupGreenhouse(-15,-12);
    this.pond=this.groupPond(13,12);
    this.catCorner=this.groupCatCorner(3,3);
    this.groupFence(16,4);
    this.groupWell(-7,9);
    this.groupCampfire(15,-8);
    this.createTrees();
    this.createFlowers();
    this.createItems();
    this.createFireflies();
  }
  groupHouse(x,z){
    const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
    const wall=this.mat(0xb96a3a), roof=this.mat(0x7d3228), wood=this.mat(0x5b331f), glow=this.mat(0xffd56b);
    const base=new THREE.Mesh(new THREE.BoxGeometry(7,4,5),wall);base.position.y=2;base.castShadow=base.receiveShadow=true;g.add(base);
    const r=new THREE.Mesh(new THREE.ConeGeometry(5.4,2.7,4),roof);r.rotation.y=Math.PI/4;r.position.y=5.35;r.castShadow=true;g.add(r);
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.4,.12),wood);door.position.set(0,1.2,2.57);g.add(door);
    for(let i=-1;i<=1;i+=2){const w=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,.14),glow);w.position.set(i*2.1,2.5,2.58);g.add(w)}
    const porch=new THREE.Mesh(new THREE.BoxGeometry(5,.25,1.8),this.mat(0xd49a5a));porch.position.set(0,.15,3.2);g.add(porch);
    return g;
  }
  groupBarn(x,z){
    const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
    const base=new THREE.Mesh(new THREE.BoxGeometry(5,3.5,5),this.mat(0x9b3d2c));base.position.y=1.75;base.castShadow=base.receiveShadow=true;g.add(base);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(4.2,2,4),this.mat(0x68271f));roof.rotation.y=Math.PI/4;roof.position.y=4.4;roof.castShadow=true;g.add(roof);
    return g;
  }
  groupGreenhouse(x,z){
    const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
    const glass=new THREE.MeshStandardMaterial({color:0x9ee8c6,transparent:true,opacity:.48,roughness:.2});
    const base=new THREE.Mesh(new THREE.BoxGeometry(5,2.8,4),glass);base.position.y=1.4;base.castShadow=base.receiveShadow=true;g.add(base);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(3.7,1.7,4),glass);roof.rotation.y=Math.PI/4;roof.position.y=3.65;g.add(roof);
    return g;
  }
  groupPond(x,z){
    const g=new THREE.Group();g.position.set(x,.03,z);this.scene.add(g);
    const water=new THREE.Mesh(new THREE.CircleGeometry(4.3,64),new THREE.MeshStandardMaterial({color:0x3fa6c8,roughness:.2,metalness:.05,transparent:true,opacity:.86}));
    water.rotation.x=-Math.PI/2;water.scale.z=.6;water.receiveShadow=true;g.add(water);
    return g;
  }
  groupCatCorner(x,z){
    const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
    const mat=this.mat(0xffc46b);
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.4,.25,32),mat);pad.position.y=.14;pad.castShadow=pad.receiveShadow=true;g.add(pad);
    const bowl=new THREE.Mesh(new THREE.TorusGeometry(.45,.12,12,24),this.mat(0xffe6a0));bowl.position.set(1.2,.3,.2);bowl.rotation.x=Math.PI/2;g.add(bowl);
    return g;
  }
  groupFence(x,z){const wood=this.mat(0x8b5a32);for(let i=0;i<9;i++){const p=this.mesh(new THREE.BoxGeometry(.25,2.2,.25),wood,x+i*.8,1.1,z);const a=this.mesh(new THREE.BoxGeometry(.75,.18,.18),wood,x+i*.8,1.2,z);}}
  groupWell(x,z){const mat=this.mat(0x7f776e);const w=this.mesh(new THREE.CylinderGeometry(1,1,.8,24),mat,x,.4,z);const hole=this.mesh(new THREE.CylinderGeometry(.65,.65,.82,24),this.mat(0x1b1715),x,.43,z)}
  groupCampfire(x,z){const logs=this.mat(0x6b3b20);const a=this.mesh(new THREE.BoxGeometry(2,.18,.25),logs,x,.15,z);a.rotation.y=.5;const b=this.mesh(new THREE.BoxGeometry(2,.18,.25),logs,x,.18,z);b.rotation.y=-.5;this.fire=this.mesh(new THREE.ConeGeometry(.7,1.5,8),this.mat(0xff7a2b),x,.85,z)}
  createTrees(){
    for(let i=0;i<42;i++){
      const x=-35+Math.random()*70,z=-35+Math.random()*70;
      if(Math.hypot(x,z)<8)continue;
      const trunk=this.mesh(new THREE.CylinderGeometry(.25,.34,2.2,8),this.mat(0x6a3d21),x,1.1,z);
      const crown=this.mesh(new THREE.SphereGeometry(1.6+Math.random()*.8,12,10),this.mat(Math.random()>.5?0x3e9147:0x4fa85d),x,3,z);
      crown.scale.y=.9;crown.userData.sway=Math.random()*10;
    }
  }
  createFlowers(){
    for(let i=0;i<160;i++){
      const x=-32+Math.random()*64,z=-30+Math.random()*62;
      const c=[0xff6699,0xffdd55,0x9c6bff,0xff6d4d][i%4];
      const f=this.mesh(new THREE.SphereGeometry(.12,8,6),this.mat(c),x,.14,z);
      f.scale.y=.45;
    }
  }
  createItems(){
    this.itemObjects=[];
    const mats={bowl:0xffe0a0,cassette:0x333333,pick:0xfff1a6,stickers:0xff79c6,moonbell:0xd7d7ff,leaf:0x55bb55,pages:0xfff0c0,parts:0xaaaaaa,button:0xe33b3b,sunbell:0xffd34d};
    for(const it of this.items){
      const group=new THREE.Group();group.position.set(it.x,.55,it.z);group.userData.item=it;this.scene.add(group);
      const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),this.mat(mats[it.id]||0xffffff));mesh.castShadow=true;group.add(mesh);
      const halo=new THREE.Mesh(new THREE.TorusGeometry(.62,.04,8,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5}));halo.rotation.x=Math.PI/2;group.add(halo);
      this.itemObjects.push(group);
    }
  }
  createFireflies(){
    this.fireflies=[];
    const mat=new THREE.MeshBasicMaterial({color:0xffe36e});
    for(let i=0;i<45;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),mat);s.position.set(12+Math.random()*9,1.2+Math.random()*2,-11+Math.random()*7);this.scene.add(s);this.fireflies.push(s)}
  }
  createNPCs(){
    const data=[
      ['Лёха',-1,-4,0xe9dcc5,0xf2d77b,false,false,false,'Кассета где-то в сарае. Я помню звук старого лета.'],
      ['Игорь',12,9,0x222222,0x151515,false,false,false,'Медиатор у пруда, а без него рок-мяу не выйдет.'],
      ['Настя',7,-2,0xb44452,0x6b3a22,false,false,false,'Вечером светлячки выглядят как маленькие звёзды.'],
      ['Лиза',3,5,0xff7cc6,0xff8bd6,false,false,true,'Наклейки спасут кошачий уголок от скуки!'],
      ['Маг',-7,8,0x4a295f,0x111111,true,false,false,'Лунный колокольчик слышен только ночью.'],
      ['Соня',16,-3,0x6aa36f,0xead58a,false,false,false,'Редкий лист покажет безопасную тропу.'],
      ['Нэна',5,-5,0x6b6fb2,0x241a1a,false,true,false,'Страницы дневника ведут к теплице.'],
      ['Кристина',-12,7,0x2b2f3a,0x72402a,false,false,true,'Детали фонаря — и ночь станет красивой.'],
      ['Даня',-5,5,0x5863cc,0x3b2720,false,true,false,'Пуговица? Из неё можно сделать шедевр.'],
      ['Прохор',15,3,0x8b4534,0x2b1b10,false,false,true,'Забор починить? Рыжик, ты в деле.'],
    ];
    return data.map(d=>this.makeHuman(...d));
  }
  makeHuman(name,x,z,color,hair,hat,glasses,tattoo,line){
    const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.25,6,12),this.mat(color));body.position.y=1.45;body.castShadow=true;g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),this.mat(0xf0ba8e));head.position.y=2.55;head.castShadow=true;g.add(head);
    const hairM=new THREE.Mesh(new THREE.SphereGeometry(.46,16,8,0,Math.PI*2,0,Math.PI/2),this.mat(hair));hairM.position.y=2.75;hairM.castShadow=true;g.add(hairM);
    if(hat){const h=new THREE.Mesh(new THREE.ConeGeometry(.55,.9,16),this.mat(0x23142d));h.position.y=3.3;g.add(h);const brim=new THREE.Mesh(new THREE.CylinderGeometry(.78,.78,.08,24),this.mat(0x160d20));brim.position.y=2.95;g.add(brim)}
    if(glasses){const gl=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,8,18),this.mat(name==='Даня'?0xff2222:0x111111));gl.position.set(-.16,2.57,.36);g.add(gl);const gr=gl.clone();gr.position.x=.16;g.add(gr)}
    if(tattoo){const arm1=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.75,8),this.mat(0xf0ba8e));arm1.position.set(-.55,1.35,.05);arm1.rotation.z=.25;g.add(arm1);const arm2=arm1.clone();arm2.position.x=.55;arm2.rotation.z=-.25;g.add(arm2)}
    g.userData={name,color,hair,hat,glasses,tattoo,line,friend:0};
    return g;
  }
  createCat(){
    const g=new THREE.Group();g.position.set(0,.05,2);this.scene.add(g);this.cat=g;
    const orange=this.mat(0xf1842d);
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.45,.95,8,16),orange);body.rotation.z=Math.PI/2;body.position.y=.55;body.castShadow=true;g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.42,18,14),orange);head.position.set(.55,.82,0);head.castShadow=true;g.add(head);
    for(const sx of [.42,.72]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.16,.34,3),orange);ear.position.set(sx,1.22,.18*(sx>.5?1:-1));ear.rotation.x=Math.PI;g.add(ear)}
    const tail=new THREE.Mesh(new THREE.TorusGeometry(.38,.07,8,24,Math.PI*1.2),orange);tail.position.set(-.65,.8,0);tail.rotation.set(Math.PI/2,0,Math.PI/2);g.add(tail);
    for(let i=0;i<4;i++){const paw=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),orange);paw.position.set(-.25+i*.22,.18,i<2?.28:-.28);g.add(paw)}
    const eyeMat=this.mat(0x65ff80);for(const z of [-.15,.15]){const e=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),eyeMat);e.position.set(.92,.9,z);g.add(e)}
  }
  timeRu(){return {morning:'Утро',day:'День',evening:'Вечер',night:'Ночь'}[this.time]}
  start(fresh=false){if(fresh)this.reset();else this.load();this.paused=false;this.ui.hideMenu();this.music.start();this.ui.toast('Рыжик вышел во двор')}
  reset(){localStorage.removeItem('ryzhik3d-save');this.inventory=[];this.quests.forEach(q=>q.done=false);this.cat.position.set(0,.05,2)}
  loop(t){const dt=Math.min(.05,(t-(this.last||t))/1000);this.last=t;if(!this.paused)this.update(dt);this.render();this.ui.update();requestAnimationFrame(x=>this.loop(x))}
  update(dt){
    this.clock+=dt;if(this.clock>45){this.clock=0;const arr=['morning','day','evening','night'];this.time=arr[(arr.indexOf(this.time)+1)%4];if(this.time==='morning')this.weather=['солнце','облачно','дождь','туман'][Math.floor(Math.random()*4)]}
    let v=this.mobile.vec;if(Math.hypot(v.x,v.z)<.05)v=this.input.vector();
    const len=Math.hypot(v.x,v.z);
    if(len>.05){
      this.cat.position.x+=v.x*dt*5;this.cat.position.z+=v.z*dt*5;
      this.cat.rotation.y=Math.atan2(v.x,v.z);
      this.stepTimer+=dt;if(this.stepTimer>.22){this.stepTimer=0;this.music.stepSound()}
    }
    this.cat.position.x=clamp(this.cat.position.x,-34,34);this.cat.position.z=clamp(this.cat.position.z,-34,34);
    this.stats.satiety=clamp(this.stats.satiety-dt*.15,0,100);this.stats.energy=clamp(this.stats.energy-dt*.1+(len<.05?dt*.25:0),0,100);this.stats.mood=clamp(this.stats.mood+dt*.03,0,100);
    for(const obj of this.itemObjects){obj.rotation.y+=dt;obj.position.y=.55+Math.sin(performance.now()/400+obj.position.x)*.12}
    for(const f of this.fireflies){f.position.y+=Math.sin(performance.now()/600+f.position.x)*.002;f.visible=this.time==='evening'||this.time==='night'}
    for(const n of this.npcs)n.lookAt(this.cat.position.x,n.position.y,this.cat.position.z);
    this.camera.position.lerp(new THREE.Vector3(this.cat.position.x,16,this.cat.position.z+18),.07);this.camera.lookAt(this.cat.position.x,0,this.cat.position.z);
  }
  render(){
    const sky={morning:0x9bd7ff,day:0x83cfff,evening:0xff9a6b,night:0x141c48}[this.time];this.scene.background=new THREE.Color(sky);
    this.sun.intensity=this.time==='night'?.55:this.time==='evening'?1.4:2.7;this.amb.intensity=this.time==='night'?.8:1.55;
    this.fire.material.emissive?.setHex?.(0xff5b22);this.fire.scale.setScalar(1+Math.sin(performance.now()/120)*.08);
    this.renderer.render(this.scene,this.camera);
  }
  nearestNPC(){return this.npcs.map(n=>({n,d:dist2(this.cat.position,n.position)})).sort((a,b)=>a.d-b.d)[0]}
  nearestItem(){return this.itemObjects.map(o=>({o,it:o.userData.item,d:dist2(this.cat.position,o.position)})).filter(x=>!this.inventory.some(i=>i.id===x.it.id)).sort((a,b)=>a.d-b.d)[0]}
  zone(){
    const p=this.cat.position;
    if(p.distanceTo(new THREE.Vector3(3,0,3))<3)return'corner';
    if(p.distanceTo(new THREE.Vector3(-15,0,-12))<4)return'greenhouse';
    return'yard';
  }
  actionHint(){
    const it=this.nearestItem();if(it&&it.d<1.6)return'Можно поднять предмет';
    const npc=this.nearestNPC();if(npc&&npc.d<2.2)return'Можно поговорить';
    const z=this.zone();const item=this.inventory.find(i=>i.target===`zone:${z}`);if(item)return`Можно применить: ${item.name}`;
    return'Исследуй двор';
  }
  interact(){
    const it=this.nearestItem();if(it&&it.d<1.6){this.pickup(it);return}
    const npc=this.nearestNPC();if(npc&&npc.d<2.2){this.talk(npc.n);return}
    const z=this.zone();const item=this.inventory.find(i=>i.target===`zone:${z}`);if(item){this.useItem(item.id);return}
    this.ui.toast('Рядом ничего нет');this.music.bad();
  }
  pickup(x){this.inventory.push(x.it);this.scene.remove(x.o);this.itemObjects=this.itemObjects.filter(o=>o!==x.o);this.music.pickup();this.ui.toast(`${x.it.emoji} ${x.it.name}`)}
  talk(n){
    const name=n.userData.name;const q=this.quests.find(q=>q.npc===name&&!q.done);
    if(q&&q.item){
      if(this.inventory.some(i=>i.id===q.item)){this.complete(q.id);this.inventory=this.inventory.filter(i=>i.id!==q.item);n.userData.friend++;this.ui.dialogue(n.userData,`Спасибо, Рыжик! ${n.userData.line}`);return}
      this.ui.dialogue(n.userData,`Мне нужен предмет для задания. ${n.userData.line}`);return
    }
    if(q&&!q.item){this.complete(q.id);n.userData.friend++;this.ui.dialogue(n.userData,`Ты помог мне. ${n.userData.line}`);return}
    this.ui.dialogue(n.userData,n.userData.line);
  }
  useItem(id){
    const item=this.inventory.find(i=>i.id===id);if(!item)return;
    if(item.target?.startsWith('npc:')){
      const name=item.target.split(':')[1];const n=this.nearestNPC();
      if(n&&n.d<2.4&&n.n.userData.name===name){this.talk(n.n);return}
      this.ui.toast(`Подойди к ${name}`);this.music.bad();return;
    }
    if(item.target?.startsWith('zone:')){
      const z=item.target.split(':')[1];
      if(this.zone()!==z){this.ui.toast('Нужно другое место');this.music.bad();return}
      if(id==='bowl'){this.complete('q1');this.inventory=this.inventory.filter(i=>i.id!==id);this.ui.toast('Миска стоит в уютном уголке');return}
      if(id==='sunbell'){this.complete('q20');this.ui.toast('Финал: двор снова стал тёплым');return}
    }
  }
  complete(id){const q=this.quests.find(q=>q.id===id);if(q&&!q.done){q.done=true;this.stats.fame+=8;this.music.quest();this.ui.toast(`Квест выполнен: ${q.title}`)}}
  meow(){this.music.meow();this.ui.toast('Мяу!')}
  save(){localStorage.setItem('ryzhik3d-save',JSON.stringify({pos:this.cat.position.toArray(),inventory:this.inventory,quests:this.quests.map(q=>q.done),stats:this.stats,time:this.time,weather:this.weather}));this.ui.toast('Сохранено')}
  load(){const s=localStorage.getItem('ryzhik3d-save');if(!s)return;const d=JSON.parse(s);this.cat.position.fromArray(d.pos);this.inventory=d.inventory||[];d.quests?.forEach((v,i)=>this.quests[i].done=v);this.stats=d.stats||this.stats;this.time=d.time||this.time;this.weather=d.weather||this.weather}
}

new Game3D();

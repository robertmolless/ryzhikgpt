(() => {
'use strict';

const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pick=a=>a[Math.floor(Math.random()*a.length)];

class TelegramBridge{
  constructor(){this.tg=window.Telegram?.WebApp||null}
  init(){
    if(!this.tg)return;
    this.tg.ready(); this.tg.expand();
    this.tg.BackButton.onClick(()=>game.ui.showMenu(true));
    document.body.style.background=this.tg.themeParams?.bg_color||'#162315';
  }
  main(text,fn){
    if(!this.tg)return;
    this.tg.MainButton.setText(text); this.tg.MainButton.show();
    this.tg.MainButton.onClick(fn);
  }
  hideMain(){this.tg?.MainButton?.hide()}
  vibrate(ms=35){if(navigator.vibrate)navigator.vibrate(ms)}
}

class AudioSystem{
  constructor(){
    this.ctx=null;
    this.enabled=true;
    this.musicStarted=false;
    this.ambienceTimer=0;
  }
  init(){
    this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();
  }
  tone(freq=440,dur=.08,type='sine',vol=.03){
    if(!this.enabled)return;
    this.init();
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    o.type=type;
    o.frequency.value=freq;
    g.gain.value=vol;
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+dur);
    o.stop(this.ctx.currentTime+dur);
  }
  chord(notes=[440,660],dur=.3,type='triangle',vol=.015){
    notes.forEach((n,i)=>setTimeout(()=>this.tone(n,dur,type,vol),i*40));
  }
  meow(){
    this.tone(620,.08,'sine',.06);
    setTimeout(()=>this.tone(470,.13,'triangle',.05),70);
  }
  pickup(){
    this.chord([880,1174],.14,'triangle',.03);
  }
  quest(){
    this.chord([523,659,784],.25,'triangle',.03);
    setTimeout(()=>this.chord([784,1046],.4,'sine',.02),180);
  }
  bad(){
    this.tone(180,.18,'sawtooth',.02);
  }
  footstep(){
    this.tone(120,.03,'square',.008);
  }
  ui(){
    this.tone(720,.04,'triangle',.02);
  }
  rain(){
    this.tone(240,.05,'sawtooth',.004);
  }
  birds(){
    this.tone(1400,.05,'triangle',.012);
    setTimeout(()=>this.tone(1700,.04,'triangle',.01),50);
  }
  fireflies(){
    this.tone(980,.03,'sine',.006);
  }
  startMusic(){
    if(this.musicStarted)return;
    this.musicStarted=true;
    const loop=()=>{
      if(!this.enabled)return;
      const t=game.world?.time || 'день';
      if(t==='утро'){
        this.chord([392,523,659],1.8,'triangle',.012);
      }else if(t==='день'){
        this.chord([440,587,784],2,'sine',.01);
      }else if(t==='вечер'){
        this.chord([349,523,698],2.6,'triangle',.012);
      }else{
        this.chord([261,392,523],3.4,'sine',.008);
      }
      setTimeout(loop,4000);
    };
    loop();
  }
  update(dt){
    this.ambienceTimer+=dt;
    if(this.ambienceTimer>6){
      this.ambienceTimer=0;
      const w=game.world?.weather;
      const t=game.world?.time;
      if(w==='дождь')this.rain();
      else if(t==='утро'||t==='день')this.birds();
      else if(t==='вечер'||t==='ночь')this.fireflies();
    }
  }
}
class Input{
  constructor(){this.keys={};this.meow=false;
    addEventListener('keydown',e=>{this.keys[e.key.toLowerCase()]=true;if(e.key===' ')this.meow=true});
    addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false);
  }
  vector(){
    let x=0,y=0,k=this.keys;
    if(k.a||k.arrowleft)x--; if(k.d||k.arrowright)x++;
    if(k.w||k.arrowup)y--; if(k.s||k.arrowdown)y++;
    const l=Math.hypot(x,y)||1; return {x:x/l,y:y/l};
  }
}

class MobileControls{
  constructor(){
    this.root=$('mobileControls'); this.zone=$('stickZone'); this.stick=$('stick');
    this.vec={x:0,y:0}; this.active=false; this.pid=null;
    this.bindStick(); this.bindButtons();
  }
  show(){this.root.classList.remove('hidden')} hide(){this.root.classList.add('hidden')}
  bindStick(){
    const move=e=>{
      if(!this.active||e.pointerId!==this.pid)return;
      const r=this.zone.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
      let dx=e.clientX-cx, dy=e.clientY-cy, len=Math.hypot(dx,dy), max=r.width*.33;
      if(len>max){dx=dx/len*max;dy=dy/len*max;len=max}
      this.vec={x:dx/max,y:dy/max}; this.stick.style.transform=`translate(${dx}px,${dy}px)`;
    };
    this.zone.addEventListener('pointerdown',e=>{this.active=true;this.pid=e.pointerId;this.zone.setPointerCapture(e.pointerId);move(e)});
    this.zone.addEventListener('pointermove',move);
    this.zone.addEventListener('pointerup',()=>this.reset());
    this.zone.addEventListener('pointercancel',()=>this.reset());
  }
  reset(){this.active=false;this.pid=null;this.vec={x:0,y:0};this.stick.style.transform='translate(0,0)'}
  bindButtons(){
    $('btnAction').onclick=()=>game.tryInteract();
    $('btnMeow').onclick=()=>game.meow();
    $('btnInv').onclick=()=>game.ui.showInventory();
    $('btnMap').onclick=()=>game.ui.showMap();
    $('btnQuests').onclick=()=>game.ui.showQuests();
    $('btnPause').onclick=()=>game.ui.showMenu(true);
  }
}

class Player{
  constructor(){this.x=820;this.y=780;this.r=22;this.speed=178;this.dir=1;this.walk=0;this.meowTimer=0;
    this.stats={satiety:100,energy:100,mood:100,curiosity:50,clean:90,fame:0};
  }
  update(dt,v){
    const len=Math.hypot(v.x,v.y), low=this.stats.energy<25?.65:1;
    if(len>.05){
      this.x+=v.x*this.speed*low*dt;
      this.y+=v.y*this.speed*low*dt;
      this.dir=v.x<0?-1:v.x>0?1:this.dir;
      this.walk+=dt*10;
      if(Math.floor(this.walk)%7===0 && game?.audio)game.audio.footstep();
    }
    this.x=clamp(this.x,75,2260);this.y=clamp(this.y,110,1705);
    this.meowTimer=Math.max(0,this.meowTimer-dt);
    this.stats.satiety=clamp(this.stats.satiety-dt*.22,0,100);
    this.stats.energy=clamp(this.stats.energy-dt*.13+(len<.05?dt*.35:0),0,100);
    this.stats.mood=clamp(this.stats.mood+(this.stats.satiety<25?-dt*.35:dt*.04),0,100);
  }
}

class NPC{constructor(d){Object.assign(this,d);this.friend=0} active(time){return !this.times||this.times.includes(time)}}

class World{
  constructor(){
    this.w=2400;this.h=1800;this.time='утро';this.day=1;this.clock=0;this.weather='солнце';
    this.unlockedZones=['Двор','Крыльцо','Сад','Сарай','Пруд','Кошачий уголок'];
    this.zones=[
      {name:'Двор',x:610,y:610,w:600,h:450},{name:'Крыльцо',x:890,y:420,w:400,h:190},{name:'Сад',x:1320,y:500,w:540,h:430},
      {name:'Сарай',x:300,y:1080,w:390,h:290},{name:'Старый забор',x:1660,y:1020,w:500,h:270,lockedBy:'q11'},
      {name:'Пруд',x:1440,y:1210,w:580,h:390},{name:'Колодец',x:690,y:1160,w:250,h:250,lockedBy:'q6'},
      {name:'Лесная тропа',x:1850,y:500,w:370,h:520,lockedBy:'q7'},{name:'Поляна',x:1800,y:220,w:460,h:300,lockedBy:'q7'},
      {name:'Теплица',x:300,y:220,w:380,h:270,lockedBy:'q19'},{name:'Кошачий уголок',x:1040,y:790,w:250,h:190},
      {name:'Чердак',x:960,y:300,w:150,h:80,lockedBy:'q15'},{name:'Подвал',x:830,y:560,w:180,h:85,lockedBy:'q16'},
      {name:'Крыша',x:890,y:260,w:410,h:115,lockedBy:'q17'},{name:'Тайная тропа',x:470,y:650,w:220,h:520,lockedBy:'q17'}
    ];
    this.items=[
      {id:'bowl',name:'миска',x:760,y:710,emoji:'🥣',quest:'q1'},
      {id:'cassette',name:'старая кассета',x:430,y:1190,emoji:'📼',quest:'q2'},
      {id:'pick',name:'медиатор',x:1585,y:1325,emoji:'🎸',quest:'q3'},
      {id:'stickers',name:'наклейки',x:1180,y:930,emoji:'⭐',quest:'q5'},
      {id:'moonbell',name:'лунный колокольчик',x:770,y:1250,emoji:'🔔',quest:'q6',night:true},
      {id:'leaf',name:'редкий лист',x:1980,y:610,emoji:'🍃',quest:'q7'},
      {id:'pages',name:'страницы дневника',x:1030,y:330,emoji:'📜',quest:'q8'},
      {id:'parts',name:'детали фонаря',x:525,y:1230,emoji:'🔩',quest:'q9'},
      {id:'button',name:'пуговица',x:650,y:980,emoji:'🔘',quest:'q10'},
      {id:'greenhouseKey',name:'ключ от теплицы',x:1100,y:840,emoji:'🗝️',quest:'q19',locked:true},
      {id:'sunbell',name:'солнечный колокольчик',x:460,y:320,emoji:'🌞',quest:'q20',final:true,locked:true},
    ];
    this.fireflies=Array.from({length:50},()=>({x:1780+Math.random()*420,y:230+Math.random()*280,a:Math.random()*6}));
    this.clouds=Array.from({length:9},()=>({x:Math.random()*2400,y:80+Math.random()*350,s:.5+Math.random()*1.2}));
  }
  update(dt){
    this.clock+=dt;
    if(this.clock>50){
      this.clock=0;
      const order=['утро','день','вечер','ночь']; this.time=order[(order.indexOf(this.time)+1)%4];
      if(this.time==='утро'){this.day++; this.weather=pick(['солнце','облачно','дождь','ветер','туман']); game.toast(`День ${this.day}: ${this.event()}`)}
    }
    for(const f of this.fireflies)f.a+=dt*2;
    for(const c of this.clouds){c.x+=dt*8*c.s;if(c.x>2500)c.x=-200}
  }
  event(){return pick(['новая коробка во дворе','дождливый вечер','сильный ветер','светлячки на поляне','музыка на крыльце','странный звук в сарае','редкий закат','ночной туман'])}
  zoneAt(p){return this.zones.find(z=>p.x>z.x&&p.x<z.x+z.w&&p.y>z.y&&p.y<z.y+z.h)?.name||'Двор'}
}

class QuestSystem{
  constructor(){
    const qs=[
      ['q1','Миска Рыжика','Найди миску у крыльца','bowl',null],
      ['q2','Старая кассета','Отдай Лёхе кассету из сарая','cassette','Лёха'],
      ['q3','Пропавший медиатор','Отдай Игорю медиатор у пруда','pick','Игорь'],
      ['q4','Фото со светлячками','Ночью поговори с Настей на поляне',null,'Настя'],
      ['q5','Потерянные наклейки','Собери наклейки для Лизы','stickers','Лиза'],
      ['q6','Колокольчик луны','Найди лунный колокольчик ночью','moonbell','Маг'],
      ['q7','Лесная тропа','Принеси Соне редкий лист','leaf','Соня'],
      ['q8','Странные записи','Отдай Нэне страницы дневника','pages','Нэна'],
      ['q9','Сломанный фонарик','Принеси Кристине детали фонаря','parts','Кристина'],
      ['q10','Коробка сокровищ','Принеси Дане пуговицу','button','Даня'],
      ['q11','Старый забор','Поговори с Прохором у забора',null,'Прохор'],
      ['q12','Первый уютный уголок','Купи первое улучшение в кошачий уголок',null,null],
      ['q13','Прудовая мелодия','Сыграй мини-игру с Игорем у пруда',null,'Игорь'],
      ['q14','Ночная прогулка','Поговори с Магом ночью у колодца',null,'Маг'],
      ['q15','Тайна чердака','Осмотри чердак после записей Нэны',null,null],
      ['q16','Подвальная находка','Осмотри подвал после фонаря',null,null],
      ['q17','Кошачья крыша','Поднимись на крышу после ремонта забора',null,null],
      ['q18','Вечер у костра','Собери 6 друзей и поговори с Лёхой вечером',null,'Лёха'],
      ['q19','Ключ от теплицы','Получи доверие 10 друзей и возьми ключ','greenhouseKey',null],
      ['q20','Солнечный колокольчик','Открой теплицу и найди Солнечный колокольчик','sunbell',null],
      ['q21','Ночной чай','Вечером поговори с Лёхой на крыльце',null,'Лёха'],
      ['q22','Дождливый вечер','Поговори с Настей во время дождя',null,'Настя'],
      ['q23','Музыкальный двор','Сыграй концерт с Игорем 2 раза',null,'Игорь'],
      ['q24','Свет фонаря','Посети двор ночью после ремонта фонаря',null,'Кристина'],
      ['q25','Большой уют','Купи 4 улучшения кошачьего уголка',null,null],
    ];
    this.quests=qs.map((q,i)=>({id:q[0],title:q[1],hint:q[2],item:q[3],npc:q[4],done:false,order:i+1}));
  }
  active(){return this.quests.find(q=>!q.done)||this.quests.at(-1)}
  done(id){return !!this.quests.find(q=>q.id===id)?.done}
  progress(){return this.quests.filter(q=>q.done).length/this.quests.length}
  complete(id){
    const q=this.quests.find(q=>q.id===id);
    if(q&&!q.done){q.done=true; game.player.stats.fame+=6; game.audio.quest(); game.ach.check(); game.unlockByQuest(id); game.toast(`Квест выполнен: ${q.title}`); return true}
    return false
  }
}

class Inventory{
  constructor(){this.items=[]}
  normalize(){
    this.items=this.items.map(x=>typeof x==='string'?{id:x,name:x,emoji:'🎒'}:x);
  }
  add(it){
    this.normalize();
    if(!this.items.some(x=>x.id===it.id||x.name===it.name)){
      this.items.push({id:it.id,name:it.name,emoji:it.emoji||'🎒'});
      game.audio.pickup();
      game.toast(`Найдено: ${it.name}`);
    }
  }
  hasId(id){this.normalize();return this.items.some(x=>x.id===id)}
  hasName(name){this.normalize();return this.items.some(x=>x.name===name)}
  has(x){return this.hasId(x)||this.hasName(x)}
  removeById(id){
    this.normalize();
    const before=this.items.length;
    this.items=this.items.filter(x=>x.id!==id);
    return this.items.length!==before;
  }
  useNearest(){
    const n=game.nearestNPC();
    if(n&&n.d<120){
      game.talk(n.n, true);
      return;
    }
    const q=game.quest.active();
    if(q?.item && this.hasId(q.item)){
      game.toast('Подойди к нужному персонажу, чтобы отдать предмет');
    } else {
      game.toast('Сейчас нечего использовать');
    }
  }
}

class UpgradeSystem{
  constructor(){this.list=[
    {id:'bowl',name:'Миска',cost:0,emoji:'🥣'},
    {id:'pillow',name:'Подушка',cost:8,emoji:'🛏️'},
    {id:'box',name:'Коробка',cost:10,emoji:'📦'},
    {id:'toy',name:'Игрушечная мышь',cost:12,emoji:'🐁'},
    {id:'lamp',name:'Фонарик',cost:16,emoji:'🏮'},
    {id:'flowers',name:'Цветы',cost:18,emoji:'🌸'},
    {id:'roof',name:'Навес',cost:22,emoji:'⛱️'},
    {id:'house',name:'Мини-домик',cost:30,emoji:'🏠'},
  ];this.bought=[]}
  buy(id){
    const u=this.list.find(x=>x.id===id); if(!u||this.bought.includes(id))return;
    if(game.player.stats.fame<u.cost){game.toast('Не хватает кошачьей славы');game.audio.bad();return}
    game.player.stats.fame-=u.cost; this.bought.push(id); game.toast(`Улучшение: ${u.name}`);
    if(id==='bowl')game.quest.complete('q12');
    if(this.bought.length>=4)game.quest.complete('q25');
  }
}

class MiniGameSystem{
  constructor(){
    this.box=$('minigame'); this.area=$('miniArea'); $('miniExit').onclick=()=>this.close();
  }
  open(title,text){game.paused=true;this.box.classList.remove('hidden');$('miniTitle').textContent=title;$('miniText').textContent=text;this.area.innerHTML=''}
  close(){this.box.classList.add('hidden');game.paused=false}
  fishing(){
    this.open('🎣 Рыбалка','Тапни по рыбке 5 раз.');
    let score=0;
    const spawn=()=>{
      this.area.innerHTML=''; const el=document.createElement('div'); el.className='target'; el.textContent='🐟';
      el.style.left=Math.random()*80+'%'; el.style.top=Math.random()*65+'%';
      el.onclick=()=>{score++;game.audio.pickup(); if(score>=5){game.toast('Прудовая мелодия готова');game.quest.complete('q13');this.close()} else spawn()};
      this.area.appendChild(el);
    }; spawn();
  }
  fireflies(){
    this.open('✨ Светлячки','Поймай 7 светлячков для фото Насти.');
    let score=0;
    for(let i=0;i<7;i++){
      const el=document.createElement('div'); el.className='target'; el.textContent='✨';
      el.style.left=Math.random()*82+'%'; el.style.top=Math.random()*65+'%';
      el.onclick=()=>{el.remove();score++;game.audio.pickup(); if(score>=7){game.quest.complete('q4');this.close()}};
      this.area.appendChild(el);
    }
  }
  concert(){
    this.open('🎵 Мяу-концерт','Тапай по нотам, пока они не исчезли.');
    let score=0, total=0;
    const timer=setInterval(()=>{
      if(this.box.classList.contains('hidden')){clearInterval(timer);return}
      total++; const el=document.createElement('div'); el.className='note';
      el.style.left=Math.random()*85+'%'; el.style.top=Math.random()*70+'%';
      el.onclick=()=>{score++;game.audio.meow();el.remove()};
      this.area.appendChild(el); setTimeout(()=>el.remove(),1200);
      if(total>=12){clearInterval(timer);setTimeout(()=>{if(score>=7){
          game.quest.complete('q13');
          game.gameConcerts=(game.gameConcerts||0)+1;
          if(game.gameConcerts>=2)game.quest.complete('q23');
          game.toast('Игорь доволен концертом!')
        }else game.toast('Попробуй концерт ещё раз');this.close()},1400)}
    },420);
  }
}

class AchievementSystem{
  constructor(){this.list=['Первый мяу','Первый друг','Рыбак','Исследователь','Ночной кот','Мастер прыжков','Музыкальный кот','Друг Лёхи','Друг Игоря','Друг Насти','Друг Лизы','Друг Мага','Друг Сони','Друг Нэны','Друг Кристины','Друг Дани','Друг Прохора','Все друзья рядом','Тайна теплицы','Настоящий хозяин двора','Музыкант двора','Король светлячков','Хранитель уюта'];this.unlocked=[]}
  unlock(a){if(!this.unlocked.includes(a)){this.unlocked.push(a);game.toast(`🏆 ${a}`)}}
  check(){
    const c=game.quest.quests.filter(q=>q.done).length;
    if(c>=5)this.unlock('Исследователь');
    if(game.world.time==='ночь')this.unlock('Ночной кот');
    if(game.quest.done('q20')){this.unlock('Тайна теплицы');this.unlock('Настоящий хозяин двора')}
    if(game.quest.done('q23'))this.unlock('Музыкант двора');
    if(game.quest.done('q4'))this.unlock('Король светлячков');
    if(game.quest.done('q25'))this.unlock('Хранитель уюта')
    if(game.npcs.every(n=>n.friend>=1))this.unlock('Все друзья рядом');
  }
}

class SaveSystem{
  save(){
    const data={p:{x:game.player.x,y:game.player.y,stats:game.player.stats},inv:game.inv.items,quests:game.quest.quests.map(q=>q.done),ach:game.ach.unlocked,npc:game.npcs.map(n=>n.friend),world:{time:game.world.time,day:game.world.day,weather:game.world.weather,unlockedZones:game.world.unlockedZones},upgrades:game.upgrades.bought};
    localStorage.setItem('ryzhik-v2-save',JSON.stringify(data)); game.toast('Сохранено');
  }
  load(){
    const s=localStorage.getItem('ryzhik-v2-save')||localStorage.getItem('ryzhik-save'); if(!s)return false;
    const d=JSON.parse(s); if(d.p){game.player.x=d.p.x;game.player.y=d.p.y;game.player.stats=d.p.stats}
    game.inv.items=d.inv||[]; game.inv.normalize(); d.quests?.forEach((v,i)=>game.quest.quests[i]&&(game.quest.quests[i].done=v));
    game.ach.unlocked=d.ach||[]; d.npc?.forEach((v,i)=>game.npcs[i]&&(game.npcs[i].friend=v));
    Object.assign(game.world,d.world||{}); game.upgrades.bought=d.upgrades||[]; return true
  }
}

class UIManager{
  constructor(){this.bind()}
  bind(){
    $('newGameBtn').onclick=()=>{localStorage.removeItem('ryzhik-v2-save');game.start(false,true)};
    $('continueBtn').onclick=()=>game.start(true);
    $('saveBtn').onclick=()=>game.save.save();
    $('achBtn').onclick=()=>this.showAchievements();
    $('upgradesBtn').onclick=()=>this.showUpgrades();
    $('aboutBtn').onclick=()=>this.modal('Об игре','<p>Версия 2: добавлены мини-игры, улучшения, цепочка квестов, более живая графика и прогресс.</p>');
    $('closeModal').onclick=()=>this.closeModal();
    $('dialogue').onclick=()=>this.closeDialogue();
  }
  showMenu(pause=false){$('menu').classList.remove('hidden');if(pause)game.paused=true}
  hideMenu(){$('menu').classList.add('hidden')}
  modal(t,html){$('modalTitle').textContent=t;$('modalContent').innerHTML=html;$('modal').classList.remove('hidden');game.paused=true}
  closeModal(){$('modal').classList.add('hidden');game.paused=false}
  update(){
    const s=game.player.stats; $('satiety').textContent=s.satiety|0;$('energy').textContent=s.energy|0;$('mood').textContent=s.mood|0;$('fame').textContent=s.fame|0;
    $('timeWeather').textContent=`${game.world.time} • ${game.world.weather} • ${game.world.zoneAt(game.player)}`;
    const q=game.quest.active(); $('questTitle').textContent=`${q.order}. ${q.title}`;$('questHint').textContent=q.hint;$('questProgress').style.width=(game.quest.progress()*100)+'%';
  }
  showInventory(){
    game.inv.normalize();
    const html = game.inv.items.length
      ? game.inv.items.map(i=>`<div class="card invItem"><span class="invEmoji">${i.emoji||'🎒'}</span><b>${i.name}</b><br><small>ID: ${i.id}</small></div>`).join('') + `<button onclick="game.inv.useNearest();game.ui.closeModal()">Использовать рядом</button>`
      : '<p>Пока пусто.</p>';
    this.modal('🎒 Инвентарь', html);
  }
  showQuests(){this.modal('📜 Квесты',game.quest.quests.map(q=>`<div class="card ${q.done?'done':''}">${q.done?'✅':'⬜'} <b>${q.order}. ${q.title}</b><br><small>${q.hint}</small></div>`).join(''))}
  showMap(){this.modal('🗺️ Карта',`<p>Текущая зона: <b>${game.world.zoneAt(game.player)}</b></p>`+game.world.zones.map(z=>`<div class="card">${game.world.unlockedZones.includes(z.name)?'🔓':'🔒'} ${z.name}</div>`).join(''))}
  showAchievements(){this.modal('🏆 Достижения',game.ach.list.map(a=>`<div class="card">${game.ach.unlocked.includes(a)?'✅':'⬜'} ${a}</div>`).join(''))}
  showUpgrades(){
    this.modal('🐾 Кошачий уголок',`<p>Кошачья слава: <b>${game.player.stats.fame|0}</b></p>`+game.upgrades.list.map(u=>`<div class="card upgrade"><span>${u.emoji} <b>${u.name}</b><br><small>Цена: ${u.cost} славы</small></span><button onclick="game.upgrades.buy('${u.id}');game.ui.showUpgrades()">${game.upgrades.bought.includes(u.id)?'Есть':'Купить'}</button></div>`).join(''))
  }
  dialogue(n,text){$('speaker').textContent=n.name;$('dialogueText').textContent=text;$('portrait').style.background=n.color;$('dialogue').classList.remove('hidden');game.paused=true}
  closeDialogue(){$('dialogue').classList.add('hidden');game.paused=false}
}

class Renderer{
  constructor(c){this.c=c;this.ctx=c.getContext('2d');this.resize();addEventListener('resize',()=>this.resize())}
  resize(){this.c.width=innerWidth*devicePixelRatio;this.c.height=innerHeight*devicePixelRatio;this.ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
  render(){
    const ctx=this.ctx,p=game.player,cam={x:clamp(p.x-innerWidth/2,0,game.world.w-innerWidth),y:clamp(p.y-innerHeight/2,0,game.world.h-innerHeight)};
    ctx.clearRect(0,0,innerWidth,innerHeight);ctx.save();ctx.translate(-cam.x,-cam.y);
    this.drawGrass(ctx);this.drawPaths(ctx);this.drawCloudShadows(ctx);this.drawWorld(ctx);this.drawItems(ctx);game.npcs.forEach(n=>this.drawHumanNPC(ctx,n));this.drawCat(ctx,p);this.drawFireflies(ctx);ctx.restore();
    this.drawLightingOverlay(ctx);this.drawMiniMap(ctx);
  }
  round(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke()}
  drawGrass(ctx){
    const g=ctx.createLinearGradient(0,0,0,game.world.h);g.addColorStop(0,'#8fd36d');g.addColorStop(1,'#5ea64c');ctx.fillStyle=g;ctx.fillRect(0,0,game.world.w,game.world.h);
    for(let i=0;i<950;i++){const x=(i*137)%game.world.w,y=(i*277)%game.world.h;ctx.fillStyle=i%3?'#74ad59':'#a1db80';ctx.fillRect(x,y,2+(i%3),8+(i%7))}
  }
  drawPaths(ctx){
    ctx.save();
    ctx.strokeStyle='rgba(183,132,74,.55)';
    ctx.lineWidth=54; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath();
    ctx.moveTo(1030,720); ctx.lineTo(1030,540); ctx.lineTo(520,1210); ctx.moveTo(1030,720); ctx.lineTo(1600,1330);
    ctx.moveTo(1030,720); ctx.lineTo(1420,650); ctx.lineTo(1980,650); ctx.lineTo(2010,360);
    ctx.moveTo(1030,720); ctx.lineTo(1780,1120);
    ctx.stroke();
    ctx.strokeStyle='rgba(255,235,170,.25)'; ctx.lineWidth=18; ctx.stroke();
    ctx.restore();
  }
  drawCloudShadows(ctx){ctx.fillStyle='rgba(255,255,255,.12)';for(const c of game.world.clouds){ctx.beginPath();ctx.ellipse(c.x,c.y,90*c.s,30*c.s,0,0,7);ctx.fill()}}
  drawWorld(ctx){this.drawDecor(ctx);this.drawHouse(ctx,820,250);this.drawBarn(ctx,300,1080);this.drawGreenhouse(ctx,300,230);this.drawPond(ctx,1460,1230);this.drawFence(ctx,1680,1040);this.drawTrees(ctx);this.drawFlowers(ctx);this.drawWell(ctx,720,1190);this.drawCatCorner(ctx,1050,800);this.drawCampfire(ctx,1900,360)}
  drawDecor(ctx){
    ctx.save();
    for(let i=0;i<38;i++){
      const x=180+(i*229)%2080, y=210+(i*317)%1430;
      ctx.fillStyle='rgba(80,55,35,.18)';
      ctx.beginPath(); ctx.ellipse(x,y,34+(i%5)*8,10+(i%3)*4,(i%7)*.4,0,7); ctx.fill();
      if(i%4===0){ctx.fillStyle='#d99a4a';ctx.fillRect(x-18,y-18,36,24);ctx.strokeStyle='#6b3b20';ctx.strokeRect(x-18,y-18,36,24)}
      if(i%5===0){ctx.fillStyle='#fff3';ctx.beginPath();ctx.arc(x+20,y-20,8,0,7);ctx.fill()}
    }
    // string lights
    ctx.strokeStyle='rgba(80,45,25,.65)'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(850,610); ctx.quadraticCurveTo(1250,520,1600,650); ctx.stroke();
    for(let i=0;i<9;i++){const x=880+i*88,y=600-Math.sin(i*.8)*35;ctx.fillStyle='#ffd66b';ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.fill()}
    ctx.restore();
  }
  drawHouse(ctx,x,y){ctx.save();ctx.shadowColor='#0005';ctx.shadowBlur=22;ctx.shadowOffsetY=16;ctx.fillStyle='#a85c36';ctx.strokeStyle='#5b2b1b';ctx.lineWidth=5;this.round(ctx,x,y+130,420,280,18);ctx.fillStyle='#73351f';ctx.beginPath();ctx.moveTo(x-30,y+145);ctx.lineTo(x+210,y);ctx.lineTo(x+450,y+145);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=game.world.time==='ночь'?'#ffd36d':'#aee0ff';for(let i=0;i<3;i++){ctx.fillRect(x+70+i*120,y+190,58,70);ctx.strokeRect(x+70+i*120,y+190,58,70)}ctx.fillStyle='#5d3724';ctx.fillRect(x+180,y+280,80,130);ctx.restore()}
  drawBarn(ctx,x,y){ctx.save();ctx.shadowColor='#0004';ctx.shadowBlur=18;ctx.fillStyle='#8f3f2d';ctx.strokeStyle='#522';ctx.lineWidth=4;this.round(ctx,x,y,360,250,14);ctx.fillStyle='#c85d42';ctx.fillRect(x+130,y+90,100,160);ctx.strokeRect(x+130,y+90,100,160);ctx.restore()}
  drawGreenhouse(ctx,x,y){ctx.save();ctx.fillStyle='#9de0bf88';ctx.strokeStyle='#3b7661';ctx.lineWidth=5;this.round(ctx,x,y,330,230,28);for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x+i*70,y);ctx.lineTo(x+i*70,y+230);ctx.stroke()}ctx.restore()}
  drawPond(ctx,x,y){ctx.save();ctx.fillStyle='#4fa8c8';ctx.shadowColor='#b9ffff';ctx.shadowBlur=20;ctx.beginPath();ctx.ellipse(x+250,y+160,270,155,0,0,7);ctx.fill();ctx.strokeStyle='#2c6d82';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.35)';for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(x+210+i*22,y+145+i*9,90,14,0,0,7);ctx.stroke()}ctx.restore()}
  drawFence(ctx,x,y){ctx.fillStyle='#8b5b33';ctx.strokeStyle='#4d2d19';for(let i=0;i<14;i++){ctx.fillRect(x+i*34,y+(i%2)*8,18,180);ctx.strokeRect(x+i*34,y+(i%2)*8,18,180)}ctx.fillRect(x-10,y+60,500,18);ctx.fillRect(x-10,y+130,500,18)}
  drawTrees(ctx){for(let i=0;i<34;i++){const x=90+(i*311)%2220,y=120+(i*197)%1570;ctx.fillStyle='#6b3e22';ctx.fillRect(x,y+52,30,75);ctx.fillStyle=i%2?'#3f8f4a':'#4da65a';ctx.beginPath();ctx.ellipse(x+14,y+45,65,56,0,0,7);ctx.fill();ctx.fillStyle='#ffffff18';ctx.beginPath();ctx.ellipse(x-8,y+28,28,18,0,0,7);ctx.fill()}}
  drawFlowers(ctx){for(let i=0;i<170;i++){const x=90+(i*173)%2200,y=180+(i*83)%1500;ctx.fillStyle=['#ff7aa8','#ffe66e','#f66','#b87cff'][i%4];ctx.beginPath();ctx.arc(x,y,4,0,7);ctx.fill()}}
  drawWell(ctx,x,y){ctx.fillStyle='#8a7667';ctx.beginPath();ctx.arc(x+60,y+60,55,0,7);ctx.fill();ctx.strokeStyle='#493a31';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#32251f';ctx.beginPath();ctx.arc(x+60,y+60,32,0,7);ctx.fill()}
  drawCampfire(ctx,x,y){ctx.fillStyle='#6b3b20';ctx.fillRect(x-45,y+24,90,12);if(game.world.time==='вечер'||game.world.time==='ночь'){ctx.fillStyle='#ffb13b';ctx.beginPath();ctx.arc(x,y,30+Math.sin(performance.now()/120)*4,0,7);ctx.fill();ctx.fillStyle='#ff553b';ctx.beginPath();ctx.arc(x,y+5,18,0,7);ctx.fill()}}
  drawCatCorner(ctx,x,y){ctx.fillStyle='#ffe0a0';ctx.strokeStyle='#86511f';ctx.lineWidth=4;this.round(ctx,x,y,220,160,22);ctx.font='26px serif';let xx=x+20;for(const id of game.upgrades.bought){const u=game.upgrades.list.find(a=>a.id===id);ctx.fillText(u?.emoji||'🐾',xx,y+95);xx+=28}}
  drawItems(ctx){for(const it of game.world.items){if(game.inv.hasId(it.id)||game.inv.hasName(it.name))continue;if(it.night&&game.world.time!=='ночь')continue;if(it.locked&&!game.canSeeLockedItem(it))continue;ctx.font='30px serif';ctx.fillText(it.emoji,it.x,it.y)}}
  drawHumanNPC(ctx,n){if(!n.active(game.world.time))return;ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(0,38,30,10,0,0,7);ctx.fill();ctx.fillStyle=n.color;ctx.fillRect(-20,-18,40,58);ctx.fillStyle=n.skin||'#f0ba8e';ctx.beginPath();ctx.arc(0,-38,23,0,7);ctx.fill();ctx.fillStyle=n.hair;ctx.beginPath();ctx.arc(0,-50,25,Math.PI,0);ctx.fill();if(n.hat){ctx.fillStyle='#2b1b35';ctx.beginPath();ctx.moveTo(-32,-58);ctx.lineTo(0,-102);ctx.lineTo(32,-58);ctx.closePath();ctx.fill()}if(n.glasses){ctx.strokeStyle=n.name==='Даня'?'#f33':'#111';ctx.lineWidth=3;ctx.strokeRect(-18,-43,14,10);ctx.strokeRect(4,-43,14,10)}if(n.tattoo){ctx.strokeStyle='#28314b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-27,-5);ctx.lineTo(-37,26);ctx.moveTo(27,-5);ctx.lineTo(37,26);ctx.stroke()}ctx.fillStyle='#111';ctx.fillRect(-8,-37,4,4);ctx.fillRect(8,-37,4,4);ctx.fillStyle='#fff';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText(n.name,0,66);ctx.restore()}
  drawCat(ctx,p){ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.dir,1);let w=Math.sin(p.walk)*4;ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(0,24,34,12,0,0,7);ctx.fill();ctx.fillStyle='#f1842d';ctx.strokeStyle='#7a3b16';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,35,24,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(28,-18,24,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(12,-36);ctx.lineTo(18,-62);ctx.lineTo(30,-36);ctx.moveTo(36,-36);ctx.lineTo(50,-60);ctx.lineTo(52,-30);ctx.fill();ctx.stroke();ctx.strokeStyle='#7a3b16';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-30,-2);ctx.quadraticCurveTo(-62,-38,-34,-54+w);ctx.stroke();ctx.fillStyle='#6cff93';ctx.beginPath();ctx.arc(22,-21,4,0,7);ctx.arc(38,-21,4,0,7);ctx.fill();ctx.strokeStyle='#7a3b16';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(8+i*10,-4);ctx.lineTo(18+i*8,5);ctx.stroke()}if(p.meowTimer>0){ctx.fillStyle='#fff8';ctx.font='22px system-ui';ctx.fillText('Мяу!',44,-54)}ctx.restore()}
  drawFireflies(ctx){if(game.world.time!=='вечер'&&game.world.time!=='ночь')return;for(const f of game.world.fireflies){ctx.fillStyle=`rgba(255,230,120,${.35+.45*Math.sin(f.a)})`;ctx.beginPath();ctx.arc(f.x,f.y,3+Math.sin(f.a)*2,0,7);ctx.fill()}}
  drawLightingOverlay(ctx){if(game.world.time==='вечер'){this.overlay(ctx,'rgba(255,130,45,.14)')}if(game.world.time==='ночь'){this.overlay(ctx,'rgba(20,35,90,.35)')}if(game.world.weather==='туман'){this.overlay(ctx,'rgba(230,240,230,.18)')}if(game.world.weather==='дождь'){ctx.strokeStyle='rgba(190,220,255,.45)';for(let i=0;i<90;i++){let x=(i*47+performance.now()/8)%innerWidth,y=(i*91+performance.now()/5)%innerHeight;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-8,y+18);ctx.stroke()}}}
  overlay(ctx,c){ctx.fillStyle=c;ctx.fillRect(0,0,innerWidth,innerHeight)}
  drawMiniMap(ctx){ctx.save();ctx.globalAlpha=.85;ctx.fillStyle='#1b160fcc';ctx.fillRect(innerWidth-118,82,100,76);ctx.fillStyle='#80bd63';ctx.fillRect(innerWidth-112,88,88,64);ctx.fillStyle='#f1842d';ctx.beginPath();ctx.arc(innerWidth-112+game.player.x/game.world.w*88,88+game.player.y/game.world.h*64,4,0,7);ctx.fill();ctx.restore()}
}

class Game{
  constructor(){
    window.game=this;this.tg=new TelegramBridge();this.tg.init();this.canvas=$('game');this.renderer=new Renderer(this.canvas);
    this.input=new Input();this.mobile=new MobileControls();this.audio=new AudioSystem();this.world=new World();this.player=new Player();
    this.quest=new QuestSystem();this.inv=new Inventory();this.upgrades=new UpgradeSystem();this.mini=new MiniGameSystem();this.ach=new AchievementSystem();this.save=new SaveSystem();this.ui=new UIManager();
    this.npcs=this.makeNPCs();this.paused=true;this.last=performance.now();requestAnimationFrame(t=>this.loop(t));
  }
  makeNPCs(){return[
    new NPC({name:'Лёха',x:970,y:620,color:'#e9dcc5',hair:'#f2d77b',times:['утро','день','вечер'],quest:'q2',item:'старая кассета',line:'У этого дома память как старая плёнка. Найдёшь кассету — расскажу больше.'}),
    new NPC({name:'Игорь',x:1600,y:1190,color:'#222',hair:'#151515',times:['день','вечер','ночь'],quest:'q3',item:'медиатор',line:'Без медиатора рок-мяу не звучит. У пруда я его точно ронял.'}),
    new NPC({name:'Настя',x:1440,y:620,color:'#b44452',hair:'#6b3a22',times:['день','вечер','ночь'],quest:'q4',line:'Светлячки лучше всего видны ночью на поляне. Хочу фото с Рыжиком.'}),
    new NPC({name:'Лиза',x:1160,y:840,color:'#ff7cc6',hair:'#ff8bd6',times:['утро','день','вечер'],quest:'q5',item:'наклейки',line:'Надо сделать уголок Рыжика самым милым местом во дворе!'}),
    new NPC({name:'Маг',x:790,y:1150,color:'#4a295f',hair:'#111',hat:true,times:['вечер','ночь'],quest:'q6',item:'лунный колокольчик',line:'Колодец слышит то, что днём прячется.'}),
    new NPC({name:'Соня',x:1940,y:650,color:'#6aa36f',hair:'#ead58a',times:['утро','день'],quest:'q7',item:'редкий лист',line:'Тропа откроется, если найти лист с дальней стороны леса.'}),
    new NPC({name:'Нэна',x:1320,y:650,color:'#6b6fb2',hair:'#241a1a',glasses:true,times:['утро','день','вечер'],quest:'q8',item:'страницы дневника',line:'В записях есть схема старой теплицы.'}),
    new NPC({name:'Кристина',x:560,y:1120,color:'#2b2f3a',hair:'#72402a',tattoo:true,times:['день','вечер'],quest:'q9',item:'детали фонаря',line:'Фонарь починим — ночью станет не страшно, а красиво.'}),
    new NPC({name:'Даня',x:650,y:920,color:'#5863cc',hair:'#3b2720',glasses:true,times:['утро','день','вечер'],quest:'q10',item:'пуговица',line:'Пуговица? Из неё можно сделать игрушку, отвечаю.'}),
    new NPC({name:'Прохор',x:1750,y:1030,color:'#8b4534',hair:'#2b1b10',tattoo:true,times:['утро','день','вечер'],quest:'q11',line:'Забор сам себя не починит. Но кот с характером — уже полдела.'})
  ]}
  start(load=false,fresh=false){if(load)this.save.load();this.paused=false;this.ui.hideMenu();this.mobile.show();$('topHud').classList.remove('hidden');$('questHud').classList.remove('hidden');this.audio.startMusic();this.toast(fresh?'Новая игра началась':'Добро пожаловать обратно')}
  loop(t){const dt=Math.min(.05,(t-this.last)/1000);this.last=t;if(!this.paused)this.update(dt);this.renderer.render();this.ui.update();requestAnimationFrame(tt=>this.loop(tt))}
  update(dt){
    let v=this.input.vector();if(Math.hypot(this.mobile.vec.x,this.mobile.vec.y)>.05)v=this.mobile.vec;
    this.player.update(dt,v);this.world.update(dt);this.audio.update(dt);this.ach.check();
    if(this.input.meow){this.meow();this.input.meow=false}
    if(this.input.keys.e){this.tryInteract();this.input.keys.e=false}
    if(this.input.keys.i){this.ui.showInventory();this.input.keys.i=false}
    if(this.input.keys.m){this.ui.showMap();this.input.keys.m=false}
    if(this.input.keys.q){this.ui.showQuests();this.input.keys.q=false}
    if(this.input.keys.escape){this.ui.showMenu(true);this.input.keys.escape=false}
  }
  canSeeLockedItem(it){if(it.id==='greenhouseKey')return this.npcs.every(n=>n.friend>=1);if(it.id==='sunbell')return this.inv.hasId('greenhouseKey')||this.inv.hasName('ключ от теплицы');return true}
  unlockByQuest(id){
    if(id==='q7'){this.world.unlockedZones.push('Лесная тропа','Поляна');this.toast('Открыта поляна')}
    if(id==='q11'){this.world.unlockedZones.push('Старый забор','Крыша','Тайная тропа')}
    if(id==='q9'){this.world.unlockedZones.push('Подвал','Колодец')}
    if(id==='q8'){this.world.unlockedZones.push('Чердак')}
    if(id==='q19'){this.world.unlockedZones.push('Теплица')}
  }
  nearestNPC(){return this.npcs.filter(n=>n.active(this.world.time)).map(n=>({n,d:d2(this.player,n)})).sort((a,b)=>a.d-b.d)[0]}
  nearestItem(){return this.world.items.filter(it=>!this.inv.hasId(it.id)&&!this.inv.hasName(it.name)&&(!it.night||this.world.time==='ночь')&&(!it.locked||this.canSeeLockedItem(it))).map(it=>({it,d:d2(this.player,it)})).sort((a,b)=>a.d-b.d)[0]}
  tryInteract(){
    const zone=this.world.zoneAt(this.player);
    if(zone==='Пруд' && d2(this.player,{x:1600,y:1330})<160){this.mini.fishing();return}
    if(zone==='Поляна' && (this.world.time==='ночь'||this.world.time==='вечер')){this.mini.fireflies();return}
    const ni=this.nearestItem(); if(ni&&ni.d<72){this.inv.add(ni.it); if(ni.it.id==='bowl')this.quest.complete('q1'); if(ni.it.id==='greenhouseKey')this.quest.complete('q19'); if(ni.it.id==='sunbell')this.quest.complete('q20'); this.tg.vibrate(); return}
    const nn=this.nearestNPC(); if(nn&&nn.d<96){this.talk(nn.n);this.tg.vibrate();return}
    if(zone==='Кошачий уголок'){this.ui.showUpgrades();return}
    this.toast('Рядом ничего нет')
  }
  talk(n, fromInventory=false){
    if(n.name==='Игорь'&&this.world.time==='вечер'&&this.quest.done('q3')){this.mini.concert();return}
    if(n.name==='Настя'&&(this.world.time==='вечер'||this.world.time==='ночь')&&this.world.zoneAt(this.player)==='Поляна'){this.mini.fireflies();return}
    const q=this.quest.quests.find(q=>q.id===n.quest);
    if(q&&!q.done){
      if(q.item&&(this.inv.hasId(q.item)||this.inv.hasName(q.item)||this.inv.hasName(n.item))){this.quest.complete(q.id);this.inv.removeById(q.item);n.friend=clamp(n.friend+1,0,3);this.ach.unlock('Друг '+n.name);this.ui.dialogue(n,`Спасибо, Рыжик! Ты отдал нужный предмет. Теперь я тебе доверяю. ${n.line}`);return}
      if(!q.item){this.quest.complete(q.id);n.friend=clamp(n.friend+1,0,3);this.ach.unlock('Друг '+n.name);this.ui.dialogue(n,`Ты справился. ${n.line}`);return}
      this.ui.dialogue(n,`Мне нужен предмет: ${n.item||q.item}. Найди его и вернись ко мне.`);return
    }
    if(n.name==='Лёха'&&this.world.time==='вечер'&&this.npcs.filter(x=>x.friend>=1).length>=6){this.quest.complete('q18')}
    if(n.name==='Лёха'&&game.world.time==='вечер'){this.quest.complete('q21')}
    if(n.name==='Настя'&&game.world.weather==='дождь'){this.quest.complete('q22')}
    if(n.name==='Кристина'&&game.world.time==='ночь'&&game.quest.done('q9')){this.quest.complete('q24')}
    this.ui.dialogue(n,n.line)
  }
  meow(){this.player.meowTimer=.9;this.audio.meow();this.ach.unlock('Первый мяу');this.player.stats.mood=clamp(this.player.stats.mood+2,0,100)}
  toast(m){const el=$('toast');el.textContent=m;el.classList.remove('hidden');clearTimeout(this.toastT);this.toastT=setTimeout(()=>el.classList.add('hidden'),1900)}
}
new Game();
})();
const $ = id => document.getElementById(id);
const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const UI = {
    story: $('story-screen'), diag: $('dialogue-screen'), fade: $('fade-overlay'), shop: $('shop-screen'),
    craft: $('craft-screen'), train: $('training-screen'), inv: $('inventory-screen'), hud: $('hud'),
    obj: $('objective'), spkr: $('speaker-name'), text: $('dialogue-text'), hpFill: $('hp-bar-fill'),
    xp: $('xp-text'), invTxt: $('inventory-text'), over: $('game-over-screen'), spCount: $('sp-count'),
    mob: $('mobile-controls')
};

let currentState = 'STORY', dialogueLines = [], currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

const WORLD_W = 2400, WORLD_H = 1500, SCALE = 0.6;
let camera = { x: 0, y: 0 };

function updateCamera() {
    camera.x = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD_W - canvas.width));
    camera.y = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD_H - canvas.height));
}

function loadFrames(prefix, count) {
    let frames = [];
    for (let i = 1; i <= count; i++) { let img = new Image(); img.src = `${prefix}_${i}.png`; frames.push(img); }
    return frames;
}

const tarnSprites = {
    idle_no_weapon: loadFrames('img/GG_idle_None', 1), idle_weapon: loadFrames('img/GG_idle', 1),
    walk_no_weapon: loadFrames('img/GG_idle_None', 6), walk_weapon: loadFrames('img/GG_idle', 6),       
    attack1_no_weapon: loadFrames('img/GG_Attack_ryka', 6), attack1_weapon: loadFrames('img/GG_Attack_Axe', 6),       
    attack2_no_weapon: loadFrames('img/GG_Attack_superRyka', 6), attack2_weapon: loadFrames('img/GG_Attack_SuperAxe', 6),       
    roll: loadFrames('img/GG_perevorot', 5)                            
};
const npcSprites = { merchant_idle: loadFrames('img/frog_idle', 3), uncle_idle: loadFrames('img/dad_idle', 3), orc_idle: loadFrames('img/techer_idle', 3) };
const buildingSprites = { shed: loadFrames('img/Home', 1), dummy: loadFrames('img/dummy_idle', 1) };
const enemySprites = {
    walk: loadFrames('img/hroshevik_walk', 4), preAttack: loadFrames('img/hroshevik_Pre-Attack', 3),
    attack: loadFrames('img/hroshevik_Attack', 3), hurt: loadFrames('img/hroshevik_Hurt', 3), death: loadFrames('img/hroshevik_Death', 5)
};
const undeadSprites = {
    walk: loadFrames('img/undead_walk', 4), preAttack: loadFrames('img/undead_Pre-Attack', 3),
    attack: loadFrames('img/undead_Attack', 3), hurt: loadFrames('img/undead_Hurt', 3), death: loadFrames('img/undead_Death', 5)
};

const bgImages = {
    villageGround: new Image(), fieldGround: new Image(), graveyardGround: new Image()
};
bgImages.villageGround.src = 'img/zemly_1.png'; bgImages.fieldGround.src = 'img/BG2_1.png'; bgImages.graveyardGround.src = 'img/zemly_2.png';

let globalNpcTimer = 0, globalNpcFrame = 0;
const animConfig = {
    w_frame: 96, h_frame: 96, 
    animations: {
        'idle_no_weapon': { frames: tarnSprites.idle_no_weapon, speed: 12 }, 'idle_weapon': { frames: tarnSprites.idle_weapon, speed: 12 },
        'walk_no_weapon': { frames: tarnSprites.walk_no_weapon, speed: 8 }, 'walk_weapon': { frames: tarnSprites.walk_weapon, speed: 8 }, 
        'attack1_no_weapon': { frames: tarnSprites.attack1_no_weapon, speed: 6, onComplete: 'idle' }, 'attack1_weapon': { frames: tarnSprites.attack1_weapon, speed: 6, onComplete: 'idle' },
        'attack2_no_weapon': { frames: tarnSprites.attack2_no_weapon, speed: 5, onComplete: 'idle' }, 'attack2_weapon': { frames: tarnSprites.attack2_weapon, speed: 5, onComplete: 'idle' },
        'roll': { frames: tarnSprites.roll, speed: 4, onComplete: 'idle' },
        'enemy_walk': { frames: enemySprites.walk, speed: 10 }, 'enemy_preAttack': { frames: enemySprites.preAttack, speed: 12, onComplete: 'attack' }, 
        'enemy_attack': { frames: enemySprites.attack, speed: 5, onComplete: 'walk' }, 'enemy_hurt': { frames: enemySprites.hurt, speed: 6, onComplete: 'walk' },
        'enemy_death': { frames: enemySprites.death, speed: 8, onComplete: 'dead' },
        'undead_walk': { frames: undeadSprites.walk, speed: 14 }, 'undead_preAttack': { frames: undeadSprites.preAttack, speed: 15, onComplete: 'attack' }, 
        'undead_attack': { frames: undeadSprites.attack, speed: 6, onComplete: 'walk' }, 'undead_hurt': { frames: undeadSprites.hurt, speed: 6, onComplete: 'walk' },
        'undead_death': { frames: undeadSprites.death, speed: 10, onComplete: 'dead' }
    }
};

const player = {
    x: 400, y: 750, width: 25, height: 40, speed: 4.5, state: 'idle', facingRight: true, rollTimer: 0, rollSpeedMult: 2.2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, baseDamage: 10, bonusDamage: 0, bonusDefense: 0, bonusHp: 0, level: 0, skillPoints: 0,
    coins: 0, seeds: 0, potions: 0, shell: 0, bones: 0, questStatus: 'get_weapon', orcUnlocked: false, dummyUnlocked: false, 
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,
    equipment: { head: null, chest: { name: 'Рубаха фермера', def: 0 }, hands: null, legs: { name: 'Штаны фермера', def: 0 }, feet: { name: 'Лапти', def: 0 }, weapon: null }, defense: 0
};

let environment = [], enemies = [], lootItems = []; 

function buildWorld() {
    environment = [
        { x: 500, y: 650, width: 140, height: 100, interactable: !player.hasWeapon, type: 'shed' },
        { x: 300, y: 700, width: 30, height: 50, interactable: true, type: 'uncle' },
        { x: 450, y: 850, width: 30, height: 50, interactable: true, type: 'merchant' }
    ];
    if (player.orcUnlocked) environment.push({ x: 380, y: 700, width: 30, height: 50, interactable: true, type: 'orc' });
    if (player.dummyUnlocked) environment.push({ x: 430, y: 650, width: 20, height: 40, interactable: true, type: 'dummy' });

    enemies = []; lootItems = [];
    if (!['return', 'talk_merchant', 'gather_seeds', 'return_merchant', 'talk_uncle_2', 'go_graveyard', 'kill_undead', 'return_graveyard', 'reach_level_2', 'talk_uncle_3', 'talk_orc', 'orc_test', 'return_orc', 'done'].includes(player.questStatus)) {
        enemies.push(createEnemy('hroshevik', 1000, 600, 'field'), createEnemy('hroshevik', 1200, 800, 'field'), createEnemy('hroshevik', 1100, 500, 'field'), createEnemy('hroshevik', 1300, 900, 'field'));
    }
    if (['go_graveyard', 'kill_undead'].includes(player.questStatus)) {
        player.questStatus = 'kill_undead';
        enemies.push(createEnemy('undead', 1800, 500, 'graveyard'), createEnemy('undead', 2000, 800, 'graveyard'), createEnemy('undead', 2100, 600, 'graveyard'), createEnemy('undead', 1900, 750, 'graveyard'));
    }
    updateHUD();
}

function createEnemy(type, x, y, region) { 
    let base = { x, y, state: 'chase', hurtTimer: 0, attackTimer: 0, frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false, region };
    if (type === 'hroshevik') return { ...base, type, baseAnim: 'enemy', width: 20, height: 40, speed: 1.2, hp: 30, aggroRange: 300, damage: 15, currentAnim: 'enemy_walk', revives: 0 }; 
    else return { ...base, type, baseAnim: 'undead', width: 25, height: 45, speed: 0.7, hp: 50, aggroRange: 350, damage: 25, currentAnim: 'undead_walk', revives: 1, reviveTimer: 0 }; 
}

setTimeout(() => UI.fade.classList.add('hidden'), 500);
buildWorld();

function uObj(txt) { UI.obj.innerText = txt; }
function updateHUD() { 
    UI.hpFill.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%'; 
    UI.xp.innerText = `Опыт: ${player.xp} (Ур.${player.level})`; 
    UI.invTxt.innerText = `Монеты: ${player.coins} | Семена: ${player.seeds}`;
    let q = player.questStatus;
    if (q === 'get_weapon') uObj("Цель: Забери топор у сарая (F)");
    else if (q === 'kill_monsters') uObj("Цель: Иди на восток и зачисти Поле ->");
    else if (q === 'return') uObj("Цель: Вернись к дядюшке в деревню <-");
    else if (q === 'talk_merchant') uObj("Цель: Поговори с торговцем Снагом (F)");
    else if (q === 'gather_seeds') uObj(`Цель: Собери семена (${player.seeds}/10)`);
    else if (q === 'return_merchant') uObj("Цель: Отнеси семена Снагу (F)");
    else if (q === 'talk_uncle_2') uObj("Цель: Выслушай дядюшку (F)");
    else if (['go_graveyard', 'kill_undead'].includes(q)) uObj("Цель: Иди на восток на Погост ->");
    else if (q === 'return_graveyard') uObj("Цель: Возвращайся к дядюшке! <-");
    else if (q === 'reach_level_2') uObj(`Цель: Набери 1500 Опыта (${player.xp}/1500)`);
    else if (q === 'talk_uncle_3') uObj("Цель: Поговори с дядюшкой об учителе (F)");
    else if (q === 'talk_orc') uObj("Цель: Поговори с Орком-ветераном (F)");
    else if (q === 'orc_test') uObj(`Цель: Принеси кости с Погоста (${player.bones}/5)`);
    else if (q === 'return_orc') uObj("Цель: Отдай кости Орку (F)");
    else if (q === 'done') uObj(`Свободная игра: Уровень ${player.level}/3`);
}

function updateInv() {
    $('slot-head').innerHTML = `Шлем: <span>${player.equipment.head ? player.equipment.head.name : 'Нет'}</span>`;
    $('slot-chest').innerHTML = `Грудь: <span style="color: ${player.equipment.chest.def > 0 ? '#4fc3f7' : '#fff'}">${player.equipment.chest.name || 'Нет'} ${player.equipment.chest.def>0?`(+${player.equipment.chest.def})`:''}</span>`;
    $('slot-hands').innerHTML = `Перчатки: <span>${player.equipment.hands ? player.equipment.hands.name : 'Нет'}</span>`;
    $('slot-legs').innerHTML = `Штаны: <span>${player.equipment.legs ? player.equipment.legs.name : 'Нет'}</span>`;
    $('slot-feet').innerHTML = `Обувь: <span>${player.equipment.feet ? player.equipment.feet.name : 'Нет'}</span>`;
    $('slot-weapon').innerHTML = `Оружие: <span style="color:#ffb300">${player.equipment.weapon ? player.equipment.weapon.name + ` (+${player.baseDamage})` : 'Нет'}</span>`;

    player.defense = (player.equipment.chest?.def || 0) + player.bonusDefense;
    let tDmg = player.baseDamage + player.bonusDamage;
    $('stat-hp').innerText = `${Math.floor(player.hp)}/${player.maxHp}`;
    $('stat-def').innerHTML = `${player.defense} <span style="font-size:10px; color:#aaa;">(Тело: ${player.bonusDefense})</span>`; 
    $('stat-dmg').innerHTML = `${tDmg} <span style="font-size:10px; color:#aaa;">(Сила: ${player.bonusDamage})</span>`;

    const bg = $('bag-grid'); bg.innerHTML = ''; let idx = 0;
    const add = (ico, t, c) => { if(c>0 && idx<12) { bg.innerHTML += `<div class="bag-item" style="position:relative;display:flex;justify-content:center;align-items:center;" title="${t}">${ico}<div style="position:absolute;bottom:2px;right:4px;font-size:10px;color:#fff;">${c}</div></div>`; idx++; } };
    add('<div style="font-size:24px;">🧪</div>', 'Зелье', player.potions);
    add('<div style="width:15px;height:15px;background:#4fc3f7;border:1px solid #000;"></div>', 'Панцирь', player.shell);
    add('<div style="width:15px;height:15px;background:#fff;border:1px solid #000;"></div>', 'Кость', player.bones);
    while(idx++ < 12) bg.innerHTML += `<div class="bag-item"></div>`;
}

function sDiag(name, text) { dialogueLines = [{name, text}]; currentLine = 0; currentState = 'DIALOGUE'; UI.hud.classList.add('hidden'); UI.mob.classList.add('hidden'); UI.diag.classList.remove('hidden'); updateDialogueUI(); }
function updateDialogueUI() { 
    UI.spkr.innerText = dialogueLines[currentLine].name; UI.text.innerText = dialogueLines[currentLine].text; 
    UI.spkr.style.color = UI.spkr.innerText === "Тарн" ? "#a1887f" : (UI.spkr.innerText.includes("Орк") || UI.spkr.innerText.includes("Система") ? "#4caf50" : "#ffb300"); 
}
function advanceDialogue() {
    if (currentState === 'STORY') { UI.story.classList.add('hidden'); dialogueLines = [{name:"Вейланд",text:"Земля гниет, лезут Хвощевики."}, {name:"Вейланд",text:"Возьми топор у сарая на востоке деревни."}]; currentLine = 0; currentState = 'DIALOGUE'; updateDialogueUI(); }
    else { currentLine++; if (currentLine >= dialogueLines.length) { currentState = 'PLAY'; UI.diag.classList.add('hidden'); UI.hud.classList.remove('hidden'); UI.mob.classList.toggle('hidden', !('ontouchstart' in window)); } else updateDialogueUI(); }
}

const addEv = (id, ev, fn) => $(id) && $(id).addEventListener(ev, fn);
addEv('btn-inventory', 'click', () => { if(currentState==='PLAY'){ if(enemies.some(e=>e.state!=='dead'&&e.state!=='resurrecting'&&Math.hypot(player.x-e.x,player.y-e.y)<300)) return alert("Враги рядом!"); currentState='INVENTORY'; keys.w=keys.a=keys.s=keys.d=false; UI.mob.classList.add('hidden'); UI.inv.classList.remove('hidden'); updateInv(); } else if(currentState==='INVENTORY'){ currentState='PLAY'; UI.inv.classList.add('hidden'); UI.mob.classList.toggle('hidden', !('ontouchstart' in window)); } });
addEv('btn-close-inventory', 'click', () => $('btn-inventory').click());

addEv('btn-buy-potion', 'click', () => { if(player.coins>=2){ player.coins-=2; player.potions++; updateHUD(); updateInv(); } else alert("Нет монет!"); });
addEv('btn-close-shop', 'click', () => { currentState = 'PLAY'; UI.shop.classList.add('hidden'); });
addEv('btn-craft-chest', 'click', () => { if(player.shell>=15 && player.coins>=10){ player.shell-=15; player.coins-=10; player.equipment.chest={name:"Нагрудник", def:5}; $('btn-craft-chest').disabled=true; updateHUD(); updateInv(); alert("Скрафчен Нагрудник!"); } else alert("Нужно 15 панцирей и 10 монет!"); });
addEv('btn-close-craft', 'click', () => { currentState = 'PLAY'; UI.craft.classList.add('hidden'); });

function updateTrain() { UI.spCount.innerText=player.skillPoints; [UI.btnTrainStr, UI.btnTrainDef, UI.btnTrainHp].forEach(b => { b.disabled=player.skillPoints<=0; b.style.opacity=player.skillPoints<=0?'0.5':'1'; }); }
addEv('btn-train-str', 'click', () => { if(player.skillPoints>0){ player.skillPoints--; player.bonusDamage+=5; updateTrain(); updateHUD(); updateInv(); }});
addEv('btn-train-def', 'click', () => { if(player.skillPoints>0){ player.skillPoints--; player.bonusDefense+=2; updateTrain(); updateHUD(); updateInv(); }});
addEv('btn-train-hp', 'click', () => { if(player.skillPoints>0){ player.skillPoints--; player.maxHp+=20; player.hp+=20; updateTrain(); updateHUD(); updateInv(); }});
addEv('btn-close-training', 'click', () => { currentState = 'PLAY'; UI.train.classList.add('hidden'); });

function usePotion() { if(player.potions>0 && player.hp<player.maxHp){ player.potions--; player.hp=Math.min(player.maxHp, player.hp+50); updateHUD(); updateInv(); } }

window.addEventListener('pointerdown', e => { if(!e.target.closest('.mob-btn')&&!e.target.closest('.shop-btn')&&!e.target.closest('.top-btn')&&!e.target.closest('.inventory-box')){ if(currentState==='STORY'||currentState==='DIALOGUE') advanceDialogue(); }});
window.addEventListener('keydown', e => {
    if(currentState==='DIALOGUE' && (e.code==='Space'||e.code==='Enter')) advanceDialogue();
    if(e.code==='KeyI' && (currentState==='PLAY'||currentState==='INVENTORY')) $('btn-inventory').click();
    if(currentState==='PLAY'){
        if(e.code==='KeyW'||e.code==='ArrowUp') keys.w=true; if(e.code==='KeyA'||e.code==='ArrowLeft') keys.a=true;
        if(e.code==='KeyS'||e.code==='ArrowDown') keys.s=true; if(e.code==='KeyD'||e.code==='ArrowRight') keys.d=true;
        if(e.code==='KeyJ') pAct('attackLight'); if(e.code==='KeyK') pAct('attackHeavy');
        if(e.code==='KeyL') pAct('roll'); if(e.code==='KeyF') checkInteraction(); if(e.code==='KeyE') usePotion();
    }
});
window.addEventListener('keyup', e => { if(e.code==='KeyW'||e.code==='ArrowUp') keys.w=false; if(e.code==='KeyA'||e.code==='ArrowLeft') keys.a=false; if(e.code==='KeyS'||e.code==='ArrowDown') keys.s=false; if(e.code==='KeyD'||e.code==='ArrowRight') keys.d=false; });

function bindTouch(id, k, fn) { let b=$(id); if(!b)return; b.addEventListener('touchstart',e=>{e.preventDefault(); if(k)keys[k]=true; if(fn&&currentState==='PLAY')fn();},{passive:false}); b.addEventListener('touchend',e=>{e.preventDefault();if(k)keys[k]=false;}); b.addEventListener('touchcancel',e=>{e.preventDefault();if(k)keys[k]=false;}); }
bindTouch('btn-up','w'); bindTouch('btn-down','s'); bindTouch('btn-left','a'); bindTouch('btn-right','d');
bindTouch('btn-j',null,()=>pAct('attackLight')); bindTouch('btn-k',null,()=>pAct('attackHeavy')); bindTouch('btn-l',null,()=>pAct('roll')); bindTouch('btn-f',null,checkInteraction); bindTouch('btn-e',null,usePotion);

function setAnim(name) { if(player.isLockAnim || player.currentAnim===name) return; player.currentAnim=name; player.frameIndex=0; player.animTimer=0; }
function setEAnim(e, name) { if(e.isLockAnim || e.currentAnim===name) return; e.currentAnim=name; e.frameIndex=0; e.animTimer=0; }
function pAct(a) {
    if(player.state!=='idle' && player.state!=='walk') return; if(player.isLockAnim) return;
    if(a==='roll'){ player.state='roll'; player.rollTimer=20; setAnim('roll'); player.isLockAnim=true; }
    else { player.state=a; player.attackHitboxActive=true; setAnim(player.hasWeapon?(a==='attackLight'?'attack1_weapon':'attack2_weapon'):(a==='attackLight'?'attack1_no_weapon':'attack2_no_weapon')); player.isLockAnim=true; }
}

function checkInteraction() {
    for (let obj of environment) {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) > 80 * SCALE || !obj.interactable) continue;
        let q = player.questStatus;
        if (obj.type === 'shed' && q === 'get_weapon') { player.hasWeapon=true; obj.interactable=false; player.equipment.weapon={

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- ИНТЕРФЕЙС ---
const ui = {
    story: document.getElementById('story-screen'),
    dialogue: document.getElementById('dialogue-screen'),
    fade: document.getElementById('fade-overlay'),
    shop: document.getElementById('shop-screen'),
    craft: document.getElementById('craft-screen'),
    training: document.getElementById('training-screen'),
    inventory: document.getElementById('inventory-screen'),
    hud: document.getElementById('hud'),
    objective: document.getElementById('objective'),
    speaker: document.getElementById('speaker-name'),
    text: document.getElementById('dialogue-text'),
    hpFill: document.getElementById('hp-bar-fill'),
    xpText: document.getElementById('xp-text'),
    invText: document.getElementById('inventory-text'),
    gameOver: document.getElementById('game-over-screen'),
    spCount: document.getElementById('sp-count'),
    mobile: document.getElementById('mobile-controls')
};

let currentState = 'STORY';
let dialogueLines = [];
let currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

// --- НАСТРОЙКИ МИРА ---
const WORLD_W = 2400;
const WORLD_H = 1500;
const SCALE = 0.6; 
let camera = { x: 0, y: 0 };

function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x > WORLD_W - canvas.width) camera.x = WORLD_W - canvas.width;
    if (camera.y > WORLD_H - canvas.height) camera.y = WORLD_H - canvas.height;
}

// --- ЗАГРУЗКА КАРТИНОК ---
function loadFrames(prefix, count) {
    let frames = [];
    for (let i = 1; i <= count; i++) {
        let img = new Image();
        img.src = `${prefix}_${i}.png`;
        frames.push(img);
    }
    return frames;
}

const tarnSprites = {
    idle_no_weapon: loadFrames('img/GG_idle_None', 1), idle_weapon: loadFrames('img/GG_idle', 1),
    walk_no_weapon: loadFrames('img/GG_idle_None', 6), walk_weapon: loadFrames('img/GG_idle', 6),       
    attack1_no_weapon: loadFrames('img/GG_Attack_ryka', 6), attack1_weapon: loadFrames('img/GG_Attack_Axe', 6),       
    attack2_no_weapon: loadFrames('img/GG_Attack_superRyka', 6), attack2_weapon: loadFrames('img/GG_Attack_SuperAxe', 6),       
    roll: loadFrames('img/GG_perevorot', 5)                            
};

const npcSprites = {
    merchant_idle: loadFrames('img/frog_idle', 3),
    uncle_idle: loadFrames('img/dad_idle', 3),
    orc_idle: loadFrames('img/techer_idle', 3)
};

const buildingSprites = {
    shed: loadFrames('img/Home', 1),
    dummy: loadFrames('img/dummy_idle', 1)
};

const enemySprites = {
    walk: loadFrames('img/hroshevik_walk', 4), preAttack: loadFrames('img/hroshevik_Pre-Attack', 3),
    attack: loadFrames('img/hroshevik_Attack', 3), hurt: loadFrames('img/hroshevik_Hurt', 3), death: loadFrames('img/hroshevik_Death', 5)
};

const undeadSprites = {
    walk: loadFrames('img/undead_walk', 4), preAttack: loadFrames('img/undead_Pre-Attack', 3),
    attack: loadFrames('img/undead_Attack', 3), hurt: loadFrames('img/undead_Hurt', 3), death: loadFrames('img/undead_Death', 5)
};

let globalNpcTimer = 0;
let globalNpcFrame = 0;
const npcAnimSpeed = 12;

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

// --- ИГРОК И МИР ---
const player = {
    x: 400, y: 750, width: 25, height: 40, speed: 4.5, state: 'idle', facingRight: true, 
    rollTimer: 0, rollSpeedMult: 2.2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, baseDamage: 10, bonusDamage: 0, bonusDefense: 0, bonusHp: 0,
    level: 0, skillPoints: 0, coins: 0, seeds: 0, potions: 0, shell: 0, bones: 0,
    questStatus: 'get_weapon', orcUnlocked: false, dummyUnlocked: false, 
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,
    equipment: { head: null, chest: { name: 'Рубаха', def: 0 }, hands: null, legs: { name: 'Штаны', def: 0 }, feet: { name: 'Лапти', def: 0 }, weapon: null }, 
    defense: 0
};

let environment = [];
let enemies = [];
let lootItems = []; 

function buildWorld() {
    environment = [
        { x: 500, y: 650, width: 140, height: 100, interactable: !player.hasWeapon, type: 'shed' },
        { x: 300, y: 700, width: 30, height: 50, interactable: true, type: 'uncle' },
        { x: 450, y: 850, width: 30, height: 50, interactable: true, type: 'merchant' }
    ];
    
    if (player.orcUnlocked) environment.push({ x: 380, y: 700, width: 30, height: 50, interactable: true, type: 'orc' });
    if (player.dummyUnlocked) environment.push({ x: 430, y: 650, width: 20, height: 40, interactable: true, type: 'dummy' });

    enemies = [];
    lootItems = [];
    
    // Спавн врагов на Поле
    if (!['return', 'talk_merchant', 'gather_seeds', 'return_merchant', 'talk_uncle_2', 'go_graveyard', 'kill_undead', 'return_graveyard', 'reach_level_2', 'talk_uncle_3', 'talk_orc', 'orc_test', 'return_orc', 'done'].includes(player.questStatus)) {
        enemies.push(createEnemy('hroshevik', 1000, 600, 'field'));
        enemies.push(createEnemy('hroshevik', 1200, 800, 'field'));
        enemies.push(createEnemy('hroshevik', 1100, 500, 'field'));
        enemies.push(createEnemy('hroshevik', 1300, 900, 'field'));
    }
    // Спавн врагов на Погосте
    if (['go_graveyard', 'kill_undead'].includes(player.questStatus)) {
        player.questStatus = 'kill_undead';
        enemies.push(createEnemy('undead', 1800, 500, 'graveyard'));
        enemies.push(createEnemy('undead', 2000, 800, 'graveyard'));
        enemies.push(createEnemy('undead', 2100, 600, 'graveyard'));
        enemies.push(createEnemy('undead', 1900, 750, 'graveyard'));
    }
    updateHUD();
}

function createEnemy(type, x, y, region) { 
    // ИСПРАВЛЕНИЕ: Враги рождаются в состоянии 'idle' (сон), а не 'chase'
    let base = { x: x, y: y, state: 'idle', hurtTimer: 0, attackTimer: 0, frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false, region: region };
    if (type === 'hroshevik') {
        return { ...base, type: type, baseAnim: 'enemy', width: 20, height: 40, speed: 1.2, hp: 30, aggroRange: 300, damage: 15, currentAnim: 'enemy_walk', revives: 0 }; 
    } else {
        return { ...base, type: type, baseAnim: 'undead', width: 25, height: 45, speed: 0.7, hp: 50, aggroRange: 350, damage: 25, currentAnim: 'undead_walk', revives: 1, reviveTimer: 0 }; 
    }
}

// Запуск
setTimeout(() => ui.fade.classList.add('hidden'), 500);
buildWorld();

// --- ИНТЕРФЕЙС ---
function updateHUD() { 
    ui.hpFill.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%'; 
    ui.xpText.innerText = `Опыт: ${player.xp} (Ур.${player.level})`; 
    ui.invText.innerText = `Монеты: ${player.coins} | Семена: ${player.seeds}`;
    
    let q = player.questStatus;
    if (q === 'get_weapon') ui.objective.innerText = "Цель: Забери топор у сарая (F)";
    else if (q === 'kill_monsters') ui.objective.innerText = "Цель: Иди на восток и зачисти Поле ->";
    else if (q === 'return') ui.objective.innerText = "Цель: Вернись к дядюшке в деревню <-";
    else if (q === 'talk_merchant') ui.objective.innerText = "Цель: Поговори с торговцем Снагом (F)";
    else if (q === 'gather_seeds') ui.objective.innerText = `Цель: Собери семена (${player.seeds}/10)`;
    else if (q === 'return_merchant') ui.objective.innerText = "Цель: Отнеси семена Снагу (F)";
    else if (q === 'talk_uncle_2') ui.objective.innerText = "Цель: Выслушай дядюшку (F)";
    else if (['go_graveyard', 'kill_undead'].includes(q)) ui.objective.innerText = "Цель: Иди на восток на Погост ->";
    else if (q === 'return_graveyard') ui.objective.innerText = "Цель: Возвращайся к дядюшке! <-";
    else if (q === 'reach_level_2') ui.objective.innerText = `Цель: Набери 1500 Опыта (${player.xp}/1500)`;
    else if (q === 'talk_uncle_3') ui.objective.innerText = "Цель: Поговори с дядюшкой об учителе (F)";
    else if (q === 'talk_orc') ui.objective.innerText = "Цель: Поговори с Орком-ветераном (F)";
    else if (q === 'orc_test') ui.objective.innerText = `Цель: Принеси кости с Погоста (${player.bones}/5)`;
    else if (q === 'return_orc') ui.objective.innerText = "Цель: Отдай кости Орку (F)";
    else if (q === 'done') ui.objective.innerText = `Свободная игра: Уровень ${player.level}/3`;
}

function updateInventoryUI() {
    document.getElementById('slot-head').innerHTML = `Шлем: <span>${player.equipment.head ? player.equipment.head.name : 'Нет'}</span>`;
    document.getElementById('slot-chest').innerHTML = `Грудь: <span style="color: ${player.equipment.chest.def > 0 ? '#4fc3f7' : '#fff'}">${player.equipment.chest.name || 'Нет'} ${player.equipment.chest.def>0?`(+${player.equipment.chest.def})`:''}</span>`;
    document.getElementById('slot-hands').innerHTML = `Перчатки: <span>${player.equipment.hands ? player.equipment.hands.name : 'Нет'}</span>`;
    document.getElementById('slot-legs').innerHTML = `Штаны: <span>${player.equipment.legs ? player.equipment.legs.name : 'Нет'}</span>`;
    document.getElementById('slot-feet').innerHTML = `Обувь: <span>${player.equipment.feet ? player.equipment.feet.name : 'Нет'}</span>`;
    document.getElementById('slot-weapon').innerHTML = `Оружие: <span style="color:#ffb300">${player.equipment.weapon ? player.equipment.weapon.name + ` (+${player.baseDamage})` : 'Нет'}</span>`;

    player.defense = (player.equipment.chest?.def || 0) + player.bonusDefense;
    let totalDmg = player.baseDamage + player.bonusDamage;
    document.getElementById('stat-hp').innerText = `${Math.floor(player.hp)}/${player.maxHp}`;
    document.getElementById('stat-def').innerHTML = `${player.defense} <span style="font-size:10px; color:#aaa;">(Тело: ${player.bonusDefense})</span>`; 
    document.getElementById('stat-dmg').innerHTML = `${totalDmg} <span style="font-size:10px; color:#aaa;">(Сила: ${player.bonusDamage})</span>`;

    const bg = document.getElementById('bag-grid'); 
    bg.innerHTML = ''; 
    let idx = 0;
    
    function add(icon, title, count) {
        if(count > 0 && idx < 12) { 
            bg.innerHTML += `<div class="bag-item" style="position:relative;display:flex;justify-content:center;align-items:center;" title="${title}">${icon}<div style="position:absolute;bottom:2px;right:4px;font-size:10px;color:#fff;">${count}</div></div>`; 
            idx++; 
        }
    }
    
    add('<div style="font-size:24px;">🧪</div>', 'Зелье', player.potions);
    add('<div style="width:15px;height:15px;background:#4fc3f7;border:1px solid #000;"></div>', 'Панцирь', player.shell);
    add('<div style="width:15px;height:15px;background:#fff;border:1px solid #000;"></div>', 'Кость', player.bones);
    
    while(idx++ < 12) bg.innerHTML += `<div class="bag-item"></div>`;
}

// --- ДИАЛОГИ ---
function startDialogue(name, text) { 
    dialogueLines = [{name: name, text: text}]; 
    currentLine = 0; 
    currentState = 'DIALOGUE'; 
    ui.hud.classList.add('hidden'); 
    ui.mobile.classList.add('hidden'); 
    ui.dialogue.classList.remove('hidden'); 
    updateDialogueUI(); 
}

function updateDialogueUI() { 
    ui.speaker.innerText = dialogueLines[currentLine].name; 
    ui.text.innerText = dialogueLines[currentLine].text; 
    ui.speaker.style.color = ui.speaker.innerText === "Тарн" ? "#a1887f" : (ui.speaker.innerText.includes("Орк") || ui.speaker.innerText.includes("Система") ? "#4caf50" : "#ffb300"); 
}

function advanceDialogue() {
    if (currentState === 'STORY') { 
        ui.story.classList.add('hidden'); 
        dialogueLines = [
            {name:"Вейланд", text:"Земля гниет, лезут Хвощевики."}, 
            {name:"Вейланд", text:"Возьми топор у сарая на востоке деревни и очисти поле."}
        ]; 
        currentLine = 0; 
        currentState = 'DIALOGUE'; 
        updateDialogueUI(); 
    }
    else { 
        currentLine++; 
        if (currentLine >= dialogueLines.length) { 
            currentState = 'PLAY'; 
            ui.dialogue.classList.add('hidden'); 
            ui.hud.classList.remove('hidden'); 
            ui.mobile.classList.toggle('hidden', !('ontouchstart' in window)); 
        } else {
            updateDialogueUI(); 
        }
    }
}

// --- КНОПКИ И МЕНЮ ---
document.getElementById('btn-inventory').addEventListener('click', () => { 
    if (currentState === 'PLAY') { 
        let isNearEnemy = enemies.some(e => e.state !== 'dead' && e.state !== 'resurrecting' && Math.hypot(player.x - e.x, player.y - e.y) < 300);
        if (isNearEnemy) return alert("Враги рядом! Нельзя открыть инвентарь."); 
        currentState = 'INVENTORY'; keys.w = false; keys.a = false; keys.s = false; keys.d = false; 
        ui.mobile.classList.add('hidden'); 
        ui.inventory.classList.remove('hidden'); 
        updateInventoryUI(); 
    } else if (currentState === 'INVENTORY') { 
        currentState = 'PLAY'; 
        ui.inventory.classList.add('hidden'); 
        ui.mobile.classList.toggle('hidden', !('ontouchstart' in window)); 
    } 
});
document.getElementById('btn-close-inventory').addEventListener('click', () => document.getElementById('btn-inventory').click());

document.getElementById('btn-buy-potion').addEventListener('click', () => { if(player.coins >= 2){ player.coins -= 2; player.potions++; updateHUD(); updateInventoryUI(); } else alert("Нет монет!"); });
document.getElementById('btn-close-shop').addEventListener('click', () => { currentState = 'PLAY'; ui.shop.classList.add('hidden'); });

document.getElementById('btn-craft-chest').addEventListener('click', () => { 
    if(player.shell >= 15 && player.coins >= 10){ 
        player.shell -= 15; player.coins -= 10; 
        player.equipment.chest = {name: "Нагрудник", def: 5}; 
        document.getElementById('btn-craft-chest').disabled = true; 
        updateHUD(); updateInventoryUI(); alert("Скрафчен Нагрудник!"); 
    } else {
        alert("Нужно 15 панцирей и 10 монет!"); 
    }
});
document.getElementById('btn-close-craft').addEventListener('click', () => { currentState = 'PLAY'; ui.craft.classList.add('hidden'); });

function openTraining() {
    currentState = 'SHOP'; keys.w = false; keys.a = false; keys.s = false; keys.d = false; 
    ui.training.classList.remove('hidden'); 
    ui.mobile.classList.add('hidden'); 
    updateTrainingUI();
}

function updateTrainingUI() { 
    ui.spCount.innerText = player.skillPoints; 
    let btns = [document.getElementById('btn-train-str'), document.getElementById('btn-train-def'), document.getElementById('btn-train-hp')];
    btns.forEach(b => { 
        b.disabled = player.skillPoints <= 0; 
        b.style.opacity = player.skillPoints <= 0 ? '0.5' : '1'; 
    }); 
}

document.getElementById('btn-train-str').addEventListener('click', () => { if(player.skillPoints > 0){ player.skillPoints--; player.bonusDamage += 5; updateTrainingUI(); updateHUD(); updateInventoryUI(); }});
document.getElementById('btn-train-def').addEventListener('click', () => { if(player.skillPoints > 0){ player.skillPoints--; player.bonusDefense += 2; updateTrainingUI(); updateHUD(); updateInventoryUI(); }});
document.getElementById('btn-train-hp').addEventListener('click', () => { if(player.skillPoints > 0){ player.skillPoints--; player.maxHp += 20; player.hp += 20; updateTrainingUI(); updateHUD(); updateInventoryUI(); }});
document.getElementById('btn-close-training').addEventListener('click', () => { currentState = 'PLAY'; ui.training.classList.add('hidden'); checkMobile(); });

function usePotion() { 
    if (player.potions > 0 && player.hp < player.maxHp) { 
        player.potions--; player.hp = Math.min(player.maxHp, player.hp + 50); updateHUD(); updateInventoryUI(); 
    } 
}

// --- УПРАВЛЕНИЕ ---
window.addEventListener('pointerdown', e => { 
    if (!e.target.closest('.mob-btn') && !e.target.closest('.shop-btn') && !e.target.closest('.top-btn') && !e.target.closest('.inventory-box')) { 
        if (currentState === 'STORY' || currentState === 'DIALOGUE') advanceDialogue(); 
    }
});

window.addEventListener('keydown', e => {
    if (currentState === 'DIALOGUE' && (e.code === 'Space' || e.code === 'Enter')) advanceDialogue();
    if (e.code === 'KeyI' && (currentState === 'PLAY' || currentState === 'INVENTORY')) document.getElementById('btn-inventory').click();
    
    if (currentState === 'PLAY') {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = true; 
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = true; 
        if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
        if (e.code === 'KeyJ') performAction('attackLight'); 
        if (e.code === 'KeyK') performAction('attackHeavy');
        if (e.code === 'KeyL') performAction('roll'); 
        if (e.code === 'KeyF') checkInteraction(); 
        if (e.code === 'KeyE') usePotion();
    }
});

window.addEventListener('keyup', e => { 
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false; 
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false; 
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false; 
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false; 
});

function bindTouch(id, k, fn) { 
    let b = document.getElementById(id); 
    if (!b) return; 
    b.addEventListener('touchstart', e => { e.preventDefault(); if (k) keys[k] = true; if (fn && currentState === 'PLAY') fn(); }, { passive: false }); 
    b.addEventListener('touchend', e => { e.preventDefault(); if (k) keys[k] = false; }); 
    b.addEventListener('touchcancel', e => { e.preventDefault(); if (k) keys[k] = false; }); 
}
bindTouch('btn-up', 'w'); bindTouch('btn-down', 's'); bindTouch('btn-left', 'a'); bindTouch('btn-right', 'd');
bindTouch('btn-j', null, () => performAction('attackLight')); bindTouch('btn-k', null, () => performAction('attackHeavy')); 
bindTouch('btn-l', null, () => performAction('roll')); bindTouch('btn-f', null, checkInteraction); bindTouch('btn-e', null, usePotion);

function checkMobile() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice && currentState === 'PLAY') ui.mobile.classList.remove('hidden');
    else ui.mobile.classList.add('hidden');
}

// --- ДЕЙСТВИЯ И АНИМАЦИИ ---
function setAnim(name) { 
    if (player.isLockAnim || player.currentAnim === name) return; 
    player.currentAnim = name; player.frameIndex = 0; player.animTimer = 0; 
}

function setEntityAnim(entity, name) { 
    if (entity.isLockAnim || entity.currentAnim === name) return; 
    entity.currentAnim = name; entity.frameIndex = 0; entity.animTimer = 0; 
}

function performAction(action) {
    if (player.state !== 'idle' && player.state !== 'walk') return; 
    if (player.isLockAnim) return;
    
    if (action === 'roll') { 
        player.state = 'roll'; player.rollTimer = 20; setAnim('roll'); player.isLockAnim = true; 
    } else { 
        player.state = action; player.attackHitboxActive = true; 
        setAnim(player.hasWeapon ? (action === 'attackLight' ? 'attack1_weapon' : 'attack2_weapon') : (action === 'attackLight' ? 'attack1_no_weapon' : 'attack2_no_weapon')); 
        player.isLockAnim = true; 
    }
}

// --- ВЗАИМОДЕЙСТВИЯ С NPC И ОБЪЕКТАМИ ---
function checkInteraction() {
    for (let obj of environment) {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 80 * SCALE && obj.interactable) {
            
            let q = player.questStatus;

            if (obj.type === 'shed') {
                if (q === 'get_weapon') { 
                    player.hasWeapon = true; obj.interactable = false; 
                    player.equipment.weapon = { name: "Топор", dmg: 10 }; 
                    player.questStatus = 'kill_monsters'; updateHUD(); setAnim('idle_weapon'); 
                }
                return;
            }
            
            else if (obj.type === 'uncle') {
                if (['get_weapon','kill_monsters'].includes(q)) {
                    startDialogue("Вейланд", "Очисти поле на востоке!");
                }
                else if (q === 'return') { 
                    player.questStatus = 'talk_merchant'; player.xp += 100; updateHUD(); 
                    startDialogue("Вейланд", "Отлично! (+100 XP). Ступай к Снагу, пусть подлатает топор."); 
                }
                else if (q === 'talk_uncle_2') { 
                    player.questStatus = 'go_graveyard'; updateHUD(); buildWorld(); 
                    startDialogue("Вейланд", "Гниль ползет с Погоста на востоке. Упокой мертвецов!"); 
                }
                else if (q === 'return_graveyard') { 
                    player.xp += 300; updateHUD(); 
                    if (player.xp >= 1500) { 
                        player.questStatus = 'talk_orc'; player.orcUnlocked = true; buildWorld(); 
                        startDialogue("Вейланд", "Ты выжил! (+300 XP). Учитель ждет справа."); 
                    } 
                    else { 
                        player.questStatus = 'reach_level_2'; updateHUD(); 
                        startDialogue("Вейланд", "Ты выжил! (+300 XP). Набери 1500 опыта для учителя."); 
                    } 
                }
                else if (q === 'reach_level_2') {
                    startDialogue("Вейланд", "Тебе нужно больше опыта. Фармись на Поле или Погосте.");
                }
                else if (q === 'talk_uncle_3') { 
                    player.questStatus = 'talk_orc'; player.orcUnlocked = true; buildWorld(); 
                    startDialogue("Вейланд", "Уровень достигнут! Орк готов говорить."); 
                }
                else if (['done','talk_orc','orc_test','return_orc'].includes(q)) { 
                    currentState = 'SHOP'; keys.w = false; keys.a = false; keys.s = false; keys.d = false; 
                    ui.craft.classList.remove('hidden'); 
                }
                else {
                    startDialogue("Вейланд", "Будь осторожен, Тарн.");
                }
                return;
            }
            
            else if (obj.type === 'orc') {
                if (q === 'talk_orc') { 
                    player.questStatus = 'orc_test'; updateHUD(); 
                    startDialogue("Грум", "Хочешь стать сильнее? Принеси 5 костей с Погоста."); 
                }
                else if (q === 'orc_test') {
                    startDialogue("Грум", `Принеси 5 костей! У тебя пока ${player.bones}.`);
                }
                else if (q === 'return_orc') { 
                    player.bones -= 5; player.questStatus = 'done'; player.dummyUnlocked = true; 
                    buildWorld(); updateHUD(); updateInventoryUI(); 
                    startDialogue("Грум", "Отлично. Я поставил манекен. Копи опыт и бей его!"); 
                }
                else if (q === 'done') {
                    startDialogue("Грум", "Бей манекен!");
                }
                return;
            }
            
            else if (obj.type === 'dummy') {
                const thresholds = [1500, 5000, 10000];
                if (player.level >= 3 && player.skillPoints === 0) {
                    startDialogue("Тарн", "Я достиг предела.");
                }
                else if (player.level < 3 && player.xp >= thresholds[player.level]) { 
                    player.level++; player.skillPoints++; updateHUD(); 
                    startDialogue("Система", `УРОВЕНЬ ПОВЫШЕН! (Уровень ${player.level}/3)\nВы получили 1 Очко Навыков.`); 
                }
                else if (player.skillPoints > 0 || player.level > 0) { 
                    openTraining(); 
                }
                else { 
                    startDialogue("Тарн", `Нужно накопить ${thresholds[player.level]} опыта.`); 
                }
                return;
            }
            
            else if (obj.type === 'merchant') {
                if (q === 'talk_merchant') { 
                    player.questStatus = player.seeds >= 10 ? 'return_merchant' : 'gather_seeds'; updateHUD(); 
                    startDialogue("Снаг", "Наточу топор за 10 семян гнили!"); 
                }
                else if (q === 'gather_seeds') {
                    startDialogue("Снаг", `Нужно 10 семян. У тебя ${player.seeds}.`);
                }
                else if (q === 'return_merchant') { 
                    player.seeds -= 10; player.baseDamage += 2; player.equipment.weapon.name = "Наточенный топор"; 
                    player.questStatus = 'talk_uncle_2'; updateHUD(); 
                    startDialogue("Снаг", "Твой топор готов (+2 УРОНА). Дядюшка звал тебя."); 
                }
                else if (['talk_uncle_2','go_graveyard','kill_undead','return_graveyard','reach_level_2','talk_uncle_3','talk_orc','orc_test','return_orc','done'].includes(q)) { 
                    currentState = 'SHOP'; keys.w = false; keys.a = false; keys.s = false; keys.d = false; 
                    ui.shop.classList.remove('hidden'); 
                }
                else {
                    startDialogue("Снаг", "Поговори с дядюшкой.");
                }
                return;
            }
        }
    }
}

// --- ЛОГИКА КАДРА ---
function checkQuestProgress() {
    if (player.questStatus === 'kill_monsters') {
        let fEnemies = enemies.filter(e => e.region === 'field');
        if (fEnemies.length > 0 && fEnemies.every(e => e.state === 'dead')) { player.questStatus = 'return'; updateHUD(); }
    }
    if (player.questStatus === 'kill_undead') {
        let gEnemies = enemies.filter(e => e.region === 'graveyard');
        if (gEnemies.length > 0 && gEnemies.every(e => e.state === 'dead')) { player.questStatus = 'return_graveyard'; updateHUD(); }
    }
}

function update() {
    if (currentState !== 'PLAY') return;
    if (player.hurtTimer > 0) player.hurtTimer--;

    let pCfg = animConfig.animations[player.currentAnim];
    if (pCfg) { 
        player.animTimer++; 
        if (player.animTimer >= pCfg.speed) { 
            player.animTimer = 0; player.frameIndex++; 
            if (player.frameIndex >= pCfg.frames.length) { 
                if (pCfg.onComplete) { player.isLockAnim = false; player.state = 'idle'; player.currentAnim = player.hasWeapon ? 'idle_weapon' : 'idle_no_weapon'; } 
                player.frameIndex = 0; 
            } 
        } 
    }
    
    globalNpcTimer++; 
    if (globalNpcTimer >= npcAnimSpeed) { globalNpcTimer = 0; globalNpcFrame++; }

    let spd = player.state === 'roll' ? player.speed * player.rollSpeedMult : player.speed;
    
    if (player.state === 'roll') { 
        player.rollTimer--; 
        if (player.rollTimer <= 0) { player.state = 'idle'; player.isLockAnim = false; } 
    }
    else if (player.state === 'idle' || player.state === 'walk') { 
        if (keys.w || keys.a || keys.s || keys.d) { player.state = 'walk'; setAnim(player.hasWeapon ? 'walk_weapon' : 'walk_no_weapon'); } 
        else { player.state = 'idle'; setAnim(player.hasWeapon ? 'idle_weapon' : 'idle_no_weapon'); } 
    }

    if (['walk', 'roll'].includes(player.state)) {
        let dx = 0, dy = 0; 
        if (keys.w) dy -= spd; if (keys.s) dy += spd; 
        if (keys.a) { dx -= spd; player.facingRight = false; } 
        if (keys.d) { dx += spd; player.facingRight = true; }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; } 
        player.x += dx; player.y += dy;
        player.x = Math.max(20, Math.min(player.x, WORLD_W - 20)); 
        player.y = Math.max(20, Math.min(player.y, WORLD_H - 20));
    }
    
    updateCamera();

    for (let i = lootItems.length - 1; i >= 0; i--) { 
        let it = lootItems[i]; 
        if (Math.hypot(player.x - it.x, player.y - it.y) < 30) { 
            if (it.type === 'coin') player.coins++; 
            else if (it.type === 'seed') { player.seeds++; if (player.questStatus === 'gather_seeds' && player.seeds >= 10) { player.questStatus = 'return_merchant'; updateHUD(); } } 
            else if (it.type === 'shell') player.shell++; 
            else if (it.type === 'bone') { player.bones++; if (player.questStatus === 'orc_test' && player.bones >= 5) { player.questStatus = 'return_orc'; updateHUD(); } }
            lootItems.splice(i, 1); updateHUD(); 
        } 
    }
    
    if (['attackLight','attackHeavy'].includes(player.state) && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = (player.state === 'attackLight' ? 45 : 60) * SCALE; 
        let dmg = (player.baseDamage + player.bonusDamage) * (player.state === 'attackLight' ? 1 : 2);
        
        enemies.forEach(e => {
            if (['dead','resurrecting'].includes(e.state)) return;
            let hitX = player.facingRight ? (e.x > player.x && e.x - player.x < reach) : (e.x < player.x && player.x - e.x < reach);
            if (hitX && Math.abs(player.y - e.y) < 40) {
                e.hp -= dmg; 
                if (player.state === 'attackHeavy') e.x += player.facingRight ? 20 : -20;
                
                if (e.hp <= 0) { 
                    if (e.revives > 0) { 
                        e.state = 'resurrecting'; e.revives--; e.reviveTimer = 150; e.isLockAnim = false; setEntityAnim(e, e.baseAnim + '_death'); e.isLockAnim = true; 
                    } 
                    else { 
                        e.state = 'dead'; player.xp += (e.type === 'undead' ? 40 : 20); 
                        if (player.questStatus === 'reach_level_2' && player.xp >= 1500) { player.questStatus = 'talk_uncle_3'; updateHUD(); }
                        let r = Math.random(), dt = r < 0.4 ? 'coin' : (r < 0.7 ? 'seed' : (r < 1.0 ? (e.type === 'hroshevik' ? 'shell' : 'bone') : null)); 
                        if (dt) lootItems.push({x: e.x, y: e.y, type: dt}); 
                        checkQuestProgress(); updateHUD(); 
                        e.isLockAnim = false; setEntityAnim(e, e.baseAnim + '_death'); e.isLockAnim = true; 
                    }
                } else { 
                    e.state = 'hurt'; e.hurtTimer = 15; e.x += player.facingRight ? 10 : -10; e.isLockAnim = false; setEntityAnim(e, e.baseAnim + '_hurt'); e.isLockAnim = true; 
                }
            }
        });
    }

    enemies.forEach(e => {
        let ecfg = animConfig.animations[e.currentAnim];
        if (ecfg) { 
            e.animTimer++; 
            if (e.animTimer >= ecfg.speed) { 
                e.animTimer = 0; e.frameIndex++; 
                if (e.frameIndex >= ecfg.frames.length) { 
                    if (ecfg.onComplete) { 
                        e.isLockAnim = false; 
                        if (ecfg.onComplete === 'attack') { 
                            setEntityAnim(e, e.baseAnim + '_attack'); e.isLockAnim = true; 
                            if (Math.hypot(player.x - e.x, player.y - e.y) < 55 * SCALE && player.state !== 'roll') { 
                                player.hp -= Math.max(1, e.damage - player.defense); player.hurtTimer = 40; updateHUD(); 
                                if (player.hp <= 0) { player.state = 'dead'; currentState = 'GAMEOVER'; ui.mobile.classList.add('hidden'); ui.gameOver.classList.remove('hidden'); } 
                            } 
                        } else if (ecfg.onComplete === 'walk') { 
                            if (!['resurrecting','dead','idle'].includes(e.state)) { e.state = 'chase'; setEntityAnim(e, e.baseAnim + '_walk'); } 
                        } else if (ecfg.onComplete === 'dead') { 
                            e.frameIndex = ecfg.frames.length - 1; return; 
                        } else {
                            e.frameIndex = 0; 
                        }
                    } else { 
                        e.frameIndex = ['dead','resurrecting','idle'].includes(e.state) ? ecfg.frames.length - 1 : 0; 
                    } 
                } 
            } 
        }
        
        if (e.state === 'dead') return;
        if (e.state === 'resurrecting') { 
            e.reviveTimer--; 
            if (e.reviveTimer <= 0) { e.hp = 25; e.state = 'chase'; e.isLockAnim = false; setEntityAnim(e, e.baseAnim + '_walk'); } 
            return; 
        }
        
        e.facingRight = player.x > e.x; 
        if (e.attackTimer > 0) e.attackTimer--;
        
        let dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
        
        // ОПТИМИЗАЦИЯ: Если враг за экраном - он спит
        if (e.x < camera.x - 200 || e.x > camera.x + canvas.width + 200 || e.y < camera.y - 200 || e.y > camera.y + canvas.height + 200) return;

        // ИСПРАВЛЕНИЕ: Враги ждут, пока ты не подойдешь
        if (e.state === 'idle') {
            setEntityAnim(e, e.baseAnim + '_walk'); // Используем кадр ходьбы как стойку
            e.frameIndex = 0; // Замораживаем анимацию
            if (dist < e.aggroRange) {
                e.state = 'chase';
            }
        }
        else if (e.state === 'chase' && !e.isLockAnim) {
            if (dist > e.aggroRange * 1.5) {
                e.state = 'idle'; // Игрок убежал
            }
            else if (dist > 40 * SCALE) { 
                e.x += (dx / dist) * e.speed; e.y += (dy / dist) * e.speed; setEntityAnim(e, e.baseAnim + '_walk'); 
            } else if (e.attackTimer <= 0 && !['dead','roll'].includes(player.state)) { 
                e.state = 'attack'; e.attackTimer = 100; setEntityAnim(e, e.baseAnim + '_preAttack'); e.isLockAnim = true; 
            } else {
                setEntityAnim(e, e.baseAnim + '_walk');
            }
        }
    });
}

// --- ОТРИСОВКА МИРА ---
function drawMark(x, y, str, c = '#ffb300') { 
    ctx.save(); ctx.fillStyle = c; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; 
    ctx.fillText(str, x, y + Math.sin(Date.now() / 200) * 5); ctx.restore(); 
}

function drawEntity(obj, sprArr, fallbackCol, markObj) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    let img = (sprArr && sprArr.length > 0) ? sprArr[globalNpcFrame % sprArr.length] : null;
    
    if (img && img.complete && img.naturalWidth > 0) { 
        ctx.save(); ctx.translate(obj.x, obj.y); 
        ctx.drawImage(img, -(animConfig.w_frame * SCALE) / 2, -(animConfig.h_frame * SCALE) + 10, animConfig.w_frame * SCALE, animConfig.h_frame * SCALE); 
        ctx.restore(); 
    } else { 
        ctx.fillStyle = fallbackCol; ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height, obj.width, obj.height); 
    }
    
    if (markObj) drawMark(obj.x, obj.y - obj.height - 10, markObj.s, markObj.c);
}

function draw() {
    ctx.fillStyle = '#4e5e3d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); 
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));
    
    ctx.fillStyle = 'rgba(93, 64, 55, 0.5)'; ctx.fillRect(200, 500, 600, 500);
    ctx.fillStyle = 'rgba(38, 50, 56, 0.6)'; ctx.fillRect(1700, 300, 600, 800);

    if (['PLAY', 'GAMEOVER', 'SHOP', 'INVENTORY'].includes(currentState)) {
        
        lootItems.forEach(it => { 
            ctx.beginPath(); 
            ctx.fillStyle = it.type === 'coin' ? '#ffca28' : (it.type === 'seed' ? '#69f0ae' : (it.type === 'shell' ? '#4fc3f7' : '#fff')); 
            if (['shell', 'bone'].includes(it.type)) ctx.rect(it.x - 4, it.y - 4, 8, 8); 
            else ctx.arc(it.x, it.y, 4, 0, Math.PI * 2); 
            ctx.fill(); ctx.stroke(); 
        });

        let renderQueue = [player, ...environment, ...enemies].sort((a, b) => a.y - b.y);
        
        for (let o of renderQueue) {
            if (o.x < camera.x - 150 || o.x > camera.x + canvas.width + 150 || o.y < camera.y - 150 || o.y > camera.y + canvas.height + 150) continue;
            
            if (o === player) {
                if (player.state === 'dead') { ctx.fillStyle = '#4a0000'; ctx.fillRect(player.x - 15, player.y - 5, 30, 10); continue; }
                
                ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(player.x, player.y, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
                if (player.hurtTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) continue;
                
                let img = animConfig.animations[player.currentAnim].frames[player.frameIndex];
                if (img && img.complete && img.naturalWidth > 0) { 
                    ctx.save(); ctx.translate(player.x, player.y); if (!player.facingRight) ctx.scale(-1, 1); 
                    ctx.drawImage(img, -(animConfig.w_frame * SCALE) / 2, -(animConfig.h_frame * SCALE) + 10, animConfig.w_frame * SCALE, animConfig.h_frame * SCALE); 
                    ctx.restore(); 
                }
            } else if (enemies.includes(o)) {
                if (!['dead', 'resurrecting'].includes(o.state)) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); }
                
                let img = animConfig.animations[o.currentAnim].frames[o.frameIndex];
                if (img && img.complete && img.naturalWidth > 0) { 
                    ctx.save(); ctx.translate(o.x, o.y); if (!o.facingRight) ctx.scale(-1, 1); 
                    ctx.drawImage(img, -(animConfig.w_frame * SCALE) / 2, -(animConfig.h_frame * SCALE) + 10, animConfig.w_frame * SCALE, animConfig.h_frame * SCALE); 
                    ctx.restore(); 
                }
            } else if (o.type === 'shed') {
                let img = buildingSprites.shed[0]; 
                if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, o.x - o.width / 2, o.y - o.height, o.width, o.height); 
                else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(o.x - o.width / 2, o.y - o.height, o.width, o.height); }
                if (player.questStatus === 'get_weapon') drawMark(o.x, o.y - o.height - 10, '!');
            } else if (o.type === 'dummy') {
                let img = buildingSprites.dummy[0]; 
                if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, o.x - o.width / 2, o.y - o.height, o.width, o.height); 
                else { ctx.fillStyle = '#8d6e63'; ctx.fillRect(o.x - o.width / 2, o.y - o.height, o.width, o.height); }
                if ((player.level < 3 && player.xp >= [1500, 5000, 10000][player.level]) || player.skillPoints > 0) drawMark(o.x, o.y - o.height - 10, '⬆', '#69f0ae');
            } else {
                let mark = null, qs = player.questStatus;
                if (o.type === 'uncle') { 
                    if (['return', 'return_graveyard', 'talk_uncle_2', 'talk_uncle_3'].includes(qs)) mark = {s: '!', c: '#ffb300'}; 
                    else if (['done', 'talk_orc', 'orc_test', 'return_orc'].includes(qs)) mark = {s: '⚒', c: '#4fc3f7'}; 
                    drawEntity(o, npcSprites.uncle_idle, '#ff00ff', mark); 
                }
                else if (o.type === 'merchant') { 
                    if (['talk_merchant', 'return_merchant'].includes(qs)) mark = {s: '!', c: '#ffb300'}; 
                    else if (qs === 'gather_seeds') mark = {s: '?', c: '#ccc'}; 
                    drawEntity(o, npcSprites.merchant_idle, '#ff00ff', mark); 
                }
                else if (o.type === 'orc') { 
                    if (['talk_orc', 'return_orc'].includes(qs)) mark = {s: '!', c: '#ffb300'}; 
                    else if (qs === 'orc_test') mark = {s: '?', c: '#ccc'}; 
                    drawEntity(o, npcSprites.orc_idle, '#4caf50', mark); 
                }
            }
        }
    }
    ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

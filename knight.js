const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const storyScreen = document.getElementById('story-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
const fadeOverlay = document.getElementById('fade-overlay');
const shopScreen = document.getElementById('shop-screen');
const inventoryScreen = document.getElementById('inventory-screen'); 
const hud = document.getElementById('hud');
const objectiveText = document.getElementById('objective');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');
const hpBarFill = document.getElementById('hp-bar-fill');
const xpText = document.getElementById('xp-text');
const inventoryText = document.getElementById('inventory-text');
const gameOverScreen = document.getElementById('game-over-screen');

const btnPotion = document.getElementById('btn-buy-potion');
const btnCloseShop = document.getElementById('btn-close-shop');
const mobileControls = document.getElementById('mobile-controls');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnInventory = document.getElementById('btn-inventory'); 
const btnCloseInventory = document.getElementById('btn-close-inventory'); 
const gameContainer = document.getElementById('game-container');

let currentState = 'STORY'; 
let currentLocation = 'village'; 
let dialogueLines = [];
let currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

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
    idle_no_weapon: loadFrames('img/GG_idle_None', 1),
    idle_weapon: loadFrames('img/GG_idle', 1),
    walk_no_weapon: loadFrames('img/GG_idle_None', 6), 
    walk_weapon: loadFrames('img/GG_idle', 6),       
    attack1_no_weapon: loadFrames('img/GG_Attack_ryka', 6), 
    attack1_weapon: loadFrames('img/GG_Attack_Axe', 6),       
    attack2_no_weapon: loadFrames('img/GG_Attack_superRyka', 6), 
    attack2_weapon: loadFrames('img/GG_Attack_SuperAxe', 6),       
    roll: loadFrames('img/GG_perevorot', 5)                            
};

const npcSprites = { merchant_idle: loadFrames('img/frog_idle', 3), uncle_idle: loadFrames('img/dad_idle', 3) };
const buildingSprites = { shed: loadFrames('img/Home', 1) };

// --- СПРАЙТЫ ВРАГОВ ---
const enemySprites = {
    walk: loadFrames('img/hroshevik_walk', 4),
    preAttack: loadFrames('img/hroshevik_Pre-Attack', 3),
    attack: loadFrames('img/hroshevik_Attack', 3),
    hurt: loadFrames('img/hroshevik_Hurt', 3),
    death: loadFrames('img/hroshevik_Death', 5)
};

// НОВОЕ: СПРАЙТЫ НЕЖИТИ
const undeadSprites = {
    walk: loadFrames('img/undead_walk', 4),
    preAttack: loadFrames('img/undead_Pre-Attack', 3),
    attack: loadFrames('img/undead_Attack', 3),
    hurt: loadFrames('img/undead_Hurt', 3),
    death: loadFrames('img/undead_Death', 5)
};

// --- ФОНЫ ЛОКАЦИЙ ---
const backgroundImages = {
    horizon: new Image(), villageGround: new Image(), fieldGround: new Image(),
    graveyardHorizon: new Image(), graveyardGround: new Image()
};
backgroundImages.horizon.src = 'img/BG_farm.png'; 
backgroundImages.villageGround.src = 'img/zemly_1.png'; 
backgroundImages.fieldGround.src = 'img/BG2_1.png'; 
backgroundImages.graveyardHorizon.src = 'img/BG3_1.png'; // Фон погоста
backgroundImages.graveyardGround.src = 'img/zemly_2.png'; // Земля погоста

let globalNpcTimer = 0; let globalNpcFrame = 0; const npcAnimSpeed = 12;

const animConfig = {
    w_frame: 96, h_frame: 96, 
    animations: {
        'idle_no_weapon':   { frames: tarnSprites.idle_no_weapon, speed: 12 },
        'idle_weapon':      { frames: tarnSprites.idle_weapon,    speed: 12 },
        'walk_no_weapon':   { frames: tarnSprites.walk_no_weapon, speed: 8 }, 
        'walk_weapon':      { frames: tarnSprites.walk_weapon,    speed: 8 }, 
        'attack1_no_weapon':{ frames: tarnSprites.attack1_no_weapon, speed: 6, onComplete: 'idle' },
        'attack1_weapon':   { frames: tarnSprites.attack1_weapon, speed: 6, onComplete: 'idle' },
        'attack2_no_weapon':{ frames: tarnSprites.attack2_no_weapon, speed: 5, onComplete: 'idle' },
        'attack2_weapon':   { frames: tarnSprites.attack2_weapon, speed: 5, onComplete: 'idle' },
        'roll':             { frames: tarnSprites.roll,           speed: 4, onComplete: 'idle' },
        
        'enemy_walk':       { frames: enemySprites.walk,      speed: 10 },
        'enemy_preAttack':  { frames: enemySprites.preAttack, speed: 12, onComplete: 'attack' }, 
        'enemy_attack':     { frames: enemySprites.attack,    speed: 5,  onComplete: 'walk' },   
        'enemy_hurt':       { frames: enemySprites.hurt,      speed: 6,  onComplete: 'walk' },
        'enemy_death':      { frames: enemySprites.death,     speed: 8,  onComplete: 'dead' },

        'undead_walk':      { frames: undeadSprites.walk,      speed: 14 }, // Медленнее идут
        'undead_preAttack': { frames: undeadSprites.preAttack, speed: 15, onComplete: 'attack' }, 
        'undead_attack':    { frames: undeadSprites.attack,    speed: 6,  onComplete: 'walk' },   
        'undead_hurt':      { frames: undeadSprites.hurt,      speed: 6,  onComplete: 'walk' },
        'undead_death':     { frames: undeadSprites.death,     speed: 10, onComplete: 'dead' }
    }
};

const player = {
    x: 300, y: 300, width: 30, height: 70, speed: 3.5, color: '#8D6E63',
    state: 'idle', facingRight: true, rollTimer: 0, rollDuration: 0, rollSpeedMult: 2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, coins: 0, seeds: 0, potions: 0, baseDamage: 10, 
    questStatus: 'get_weapon', // Новые статусы: go_graveyard, kill_undead, return_graveyard
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,

    equipment: {
        head: null, chest: { name: 'Рубаха фермера', def: 0 }, hands: null,
        legs: { name: 'Штаны фермера', def: 0 }, feet: { name: 'Лапти', def: 0 }, weapon: null
    }, defense: 0
};

let environment = []; let enemies = []; let lootItems = []; 

function updateObjectiveText() {
    if (player.questStatus === 'get_weapon') objectiveText.innerText = "Цель: Забери топор у сарая (F)";
    else if (player.questStatus === 'kill_monsters') objectiveText.innerText = currentLocation === 'village' ? "Цель: Иди направо, на дальнее поле ->" : "Цель: Выживи и выкорчуй нечисть!";
    else if (player.questStatus === 'return') objectiveText.innerText = currentLocation === 'field' ? "Цель: Вернись к дядюшке (Иди влево <-)" : "Цель: Поговори с дядюшкой (F)";
    else if (player.questStatus === 'talk_merchant') objectiveText.innerText = currentLocation === 'field' ? "Цель: Вернись в деревню (Иди влево <-)" : "Цель: Поговори с торговцем Снагом (F)";
    else if (player.questStatus === 'gather_seeds') objectiveText.innerText = `Цель: Собери 10 семян для Снага (${player.seeds}/10)`;
    else if (player.questStatus === 'return_merchant') objectiveText.innerText = currentLocation === 'field' ? "Цель: Вернись к торговцу (Иди влево <-)" : "Цель: Отнеси семена Снагу (F)";
    // НОВОЕ
    else if (player.questStatus === 'go_graveyard') objectiveText.innerText = "Цель: Иди дальше на восток, на Погост ->";
    else if (player.questStatus === 'kill_undead') objectiveText.innerText = "Цель: Упокой нежить на старом Погосте!";
    else if (player.questStatus === 'return_graveyard') objectiveText.innerText = "Цель: Возвращайся к дядюшке!";
    
    else if (player.questStatus === 'done') objectiveText.innerText = "Свободная игра: охоться и торгуй!";
}

const locations = {
    village: {
        bgColor: '#5d4037', horizonColor: '#1b1b1b', groundImage: backgroundImages.villageGround, horizonImage: backgroundImages.horizon,
        setup: () => {
            environment = [
                { x: 600, y: 230, width: 240, height: 180, color: player.hasWeapon ? '#271714' : '#3E2723', interactable: !player.hasWeapon, type: 'shed' },
                { x: 200, y: 280, width: 40, height: 80, color: '#ffb300', interactable: true, type: 'uncle' },
                { x: 450, y: 240, width: 45, height: 60, interactable: true, type: 'merchant' }
            ];
            enemies = []; lootItems = []; updateObjectiveText();
        }
    },
    field: {
        bgColor: '#4e5e3d', horizonColor: '#0a1a0f', groundImage: backgroundImages.fieldGround, horizonImage: backgroundImages.horizon,
        setup: () => {
            environment = []; lootItems = [];
            // Хвощевики
            enemies = [createEnemy('hroshevik', 400, 300), createEnemy('hroshevik', 600, 250), createEnemy('hroshevik', 750, 380)];
            updateObjectiveText();
        }
    },
    graveyard: {
        bgColor: '#263238', horizonColor: '#111', groundImage: backgroundImages.graveyardGround, horizonImage: backgroundImages.graveyardHorizon,
        setup: () => {
            environment = []; lootItems = [];
            // Нежить (больше, сильнее, воскресают)
            enemies = [createEnemy('undead', 300, 280), createEnemy('undead', 500, 350), createEnemy('undead', 650, 250), createEnemy('undead', 800, 320)];
            if (player.questStatus === 'go_graveyard') player.questStatus = 'kill_undead';
            updateObjectiveText();
        }
    }
};

// Фабрика врагов: теперь создает разных монстров
function createEnemy(type, x, y) { 
    if (type === 'hroshevik') {
        return { 
            type: 'hroshevik', baseAnim: 'enemy', x: x, y: y, width: 35, height: 60, speed: 1.2, hp: 30, color: '#689f38', 
            state: 'chase', hurtTimer: 0, damage: 15, attackTimer: 0, currentAnim: 'enemy_walk', frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false,
            revives: 0 // Хвощевик умирает сразу
        }; 
    } else if (type === 'undead') {
        return { 
            type: 'undead', baseAnim: 'undead', x: x, y: y, width: 40, height: 65, speed: 0.6, hp: 50, color: '#9e9e9e', 
            state: 'chase', hurtTimer: 0, damage: 25, attackTimer: 0, currentAnim: 'undead_walk', frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false,
            revives: 1, reviveTimer: 0 // Нежить один раз воскресает!
        }; 
    }
}

setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
locations.village.setup();
updateHUD();

// ==========================================
// --- ИНВЕНТАРЬ И ИНТЕРФЕЙС ---
// ==========================================
function updateInventoryUI() {
    document.getElementById('slot-head').innerHTML = `Шлем: <span>${player.equipment.head ? player.equipment.head.name : 'Нет'}</span>`;
    document.getElementById('slot-chest').innerHTML = `Грудь: <span>${player.equipment.chest ? player.equipment.chest.name + ' (+'+player.equipment.chest.def+')' : 'Нет'}</span>`;
    document.getElementById('slot-hands').innerHTML = `Перчатки: <span>${player.equipment.hands ? player.equipment.hands.name : 'Нет'}</span>`;
    document.getElementById('slot-legs').innerHTML = `Штаны: <span>${player.equipment.legs ? player.equipment.legs.name + ' (+'+player.equipment.legs.def+')' : 'Нет'}</span>`;
    document.getElementById('slot-feet').innerHTML = `Обувь: <span>${player.equipment.feet ? player.equipment.feet.name + ' (+'+player.equipment.feet.def+')' : 'Нет'}</span>`;
    let wpnText = player.equipment.weapon ? player.equipment.weapon.name + ' (+'+player.baseDamage+')' : 'Нет';
    document.getElementById('slot-weapon').innerHTML = `Оружие: <span style="color:#ffb300">${wpnText}</span>`;

    player.defense = (player.equipment.chest?.def || 0) + (player.equipment.legs?.def || 0) + (player.equipment.feet?.def || 0);
    document.getElementById('stat-def').innerText = player.defense; document.getElementById('stat-dmg').innerText = player.baseDamage;

    const bagGrid = document.getElementById('bag-grid'); bagGrid.innerHTML = ''; 
    for (let i = 0; i < 12; i++) {
        const slot = document.createElement('div'); slot.className = 'bag-item';
        slot.style.display = 'flex'; slot.style.justifyContent = 'center'; slot.style.alignItems = 'center'; slot.style.fontSize = 'clamp(16px, 3vw, 24px)';
        if (i < player.potions) { slot.innerHTML = '🧪'; slot.title = 'Зелье лечения (+50 HP)'; slot.style.cursor = 'help'; }
        bagGrid.appendChild(slot);
    }
}

function toggleInventory() {
    if (currentState === 'PLAY') {
        if ((currentLocation === 'field' || currentLocation === 'graveyard') && enemies.some(e => e.state !== 'dead' && e.state !== 'resurrecting')) {
            alert("Вы не можете копаться в рюкзаке во время боя!"); return;
        }
        currentState = 'INVENTORY'; keys.w = keys.a = keys.s = keys.d = false; mobileControls.classList.add('hidden'); inventoryScreen.classList.remove('hidden'); updateInventoryUI();
    } else if (currentState === 'INVENTORY') {
        currentState = 'PLAY'; inventoryScreen.classList.add('hidden'); checkMobile();
    }
}

btnInventory.addEventListener('click', toggleInventory); btnCloseInventory.addEventListener('click', toggleInventory);
btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (gameContainer.requestFullscreen) { gameContainer.requestFullscreen(); } else if (gameContainer.webkitRequestFullscreen) { gameContainer.webkitRequestFullscreen(); }
        btnFullscreen.innerText = '✖';
    } else {
        if (document.exitFullscreen) { document.exitFullscreen(); } else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
        btnFullscreen.innerText = '⛶';
    }
});
document.addEventListener('fullscreenchange', updateFullscreenBtn); document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
function updateFullscreenBtn() { btnFullscreen.innerText = (!document.fullscreenElement && !document.webkitFullscreenElement) ? '⛶' : '✖'; }

// ==========================================
// --- АНИМАЦИИ ---
// ==========================================
function setAnimation(animName) {
    if (player.isLockAnim || player.currentAnim === animName) return;
    if (!animConfig.animations[animName]) return;
    player.currentAnim = animName; player.frameIndex = 0; player.animTimer = 0;
}

function setEntityAnimation(entity, animName) {
    if (entity.isLockAnim || entity.currentAnim === animName) return;
    if (!animConfig.animations[animName]) return;
    entity.currentAnim = animName; entity.frameIndex = 0; entity.animTimer = 0;
}

function updateAnimation() {
    const config = animConfig.animations[player.currentAnim];
    if (!config) return;
    player.animTimer++;
    if (player.animTimer >= config.speed) {
        player.animTimer = 0; player.frameIndex++;
        if (player.frameIndex >= config.frames.length) {
            if (config.onComplete) {
                player.isLockAnim = false; player.state = 'idle'; 
                player.currentAnim = player.hasWeapon ? 'idle_weapon' : 'idle_no_weapon'; player.frameIndex = 0;
            } else { player.frameIndex = 0; }
        }
    }
}

function updateEnemyAnimation(entity) {
    const config = animConfig.animations[entity.currentAnim];
    if (!config) return;
    entity.animTimer++;
    if (entity.animTimer >= config.speed) {
        entity.animTimer = 0; entity.frameIndex++;
        if (entity.frameIndex >= config.frames.length) {
            if (config.onComplete) {
                entity.isLockAnim = false;
                if (config.onComplete === 'attack') {
                    setEntityAnimation(entity, entity.baseAnim + '_attack'); entity.isLockAnim = true; 
                    if (Math.hypot(player.x - entity.x, player.y - entity.y) < 65 && player.state !== 'roll') {
                        let finalDamage = Math.max(1, entity.damage - player.defense);
                        player.hp -= finalDamage; player.hurtTimer = 40; updateHUD();
                        if (player.hp <= 0) { player.state = 'dead'; currentState = 'GAMEOVER'; mobileControls.classList.add('hidden'); gameOverScreen.classList.remove('hidden'); }
                    }
                } else if (config.onComplete === 'walk') {
                    if (entity.state !== 'resurrecting' && entity.state !== 'dead') {
                        entity.state = 'chase'; setEntityAnimation(entity, entity.baseAnim + '_walk');
                    }
                } else if (config.onComplete === 'dead') {
                    entity.frameIndex = config.frames.length - 1; return; 
                } else { entity.frameIndex = 0; }
            } else {
                if (entity.state === 'dead' || entity.state === 'resurrecting') entity.frameIndex = config.frames.length - 1; else entity.frameIndex = 0; 
            }
        }
    }
}

// --- ДИАЛОГИ И МАГАЗИН ---
function startDialogue(lines) { dialogueLines = lines; currentLine = 0; currentState = 'DIALOGUE'; hud.classList.add('hidden'); mobileControls.classList.add('hidden'); dialogueScreen.classList.remove('hidden'); updateDialogueUI(); }
function advanceDialogue() {
    if (currentState === 'STORY') {
        storyScreen.classList.add('hidden');
        startDialogue([
            { name: "Вейланд", text: "Тарн, мальчик мой. На дальнем поле опять неспокойно. Земля гниет, и из нее лезут Хвощевики." },
            { name: "Тарн", text: "Снова они? В прошлый раз я сломал о них любимые вилы." },
            { name: "Вейланд", text: "Возьми старый топор у сарая. Очисти поле, пока эта дрянь не добралась до амбаров." }
        ]);
    } else if (currentState === 'DIALOGUE') {
        currentLine++;
        if (currentLine >= dialogueLines.length) { currentState = 'PLAY'; dialogueScreen.classList.add('hidden'); hud.classList.remove('hidden'); checkMobile();
        } else updateDialogueUI();
    }
}
function updateDialogueUI() { speakerName.innerText = dialogueLines[currentLine].name; dialogueText.innerText = dialogueLines[currentLine].text; speakerName.style.color = dialogueLines[currentLine].name === "Тарн" ? "#a1887f" : "#ffb300"; }
function openShop() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; shopScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); }
function closeShop() { currentState = 'PLAY'; shopScreen.classList.add('hidden'); checkMobile(); }

btnPotion.addEventListener('click', () => { if (player.coins >= 2) { player.coins -= 2; player.potions++; updateHUD(); updateInventoryUI(); } else alert("Не хватает монет!"); });
btnCloseShop.addEventListener('click', closeShop);

function usePotion() { if (player.potions > 0 && player.hp < player.maxHp) { player.potions--; player.hp = Math.min(player.maxHp, player.hp + 50); updateHUD(); updateInventoryUI(); } }
function updateHUD() { let hpPercent = Math.max(0, (player.hp / player.maxHp) * 100); hpBarFill.style.width = hpPercent + '%'; xpText.innerText = 'Опыт: ' + player.xp; inventoryText.innerText = `Монеты: ${player.coins} | Семена: ${player.seeds} | Зелья (E): ${player.potions}`; }

function checkMobile() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice && currentState === 'PLAY') mobileControls.classList.remove('hidden');
    else mobileControls.classList.add('hidden');
}

window.addEventListener('pointerdown', (e) => { 
    if (e.target.closest('.mob-btn') || e.target.closest('.shop-btn') || e.target.closest('.top-btn') || e.target.closest('.inventory-box')) return; 
    if (currentState === 'STORY' || currentState === 'DIALOGUE') advanceDialogue(); 
});

window.addEventListener('keydown', (e) => {
    if (currentState === 'GAMEOVER' || currentState === 'SHOP') return;
    if (currentState === 'STORY' || currentState === 'DIALOGUE') { if (e.code === 'Space' || e.code === 'Enter') advanceDialogue(); return; }
    if (e.code === 'KeyI' && (currentState === 'PLAY' || currentState === 'INVENTORY')) { toggleInventory(); return; }

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

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
});

function bindTouch(id, keyProp, actionFunc) {
    const btn = document.getElementById(id); if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); if (keyProp) keys[keyProp] = true; if (actionFunc && currentState === 'PLAY') actionFunc(); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); if (keyProp) keys[keyProp] = false; }, { passive: false });
    btn.addEventListener('touchcancel', (e) => { e.preventDefault(); if (keyProp) keys[keyProp] = false; }, { passive: false });
}
bindTouch('btn-up', 'w', null); bindTouch('btn-down', 's', null); bindTouch('btn-left', 'a', null); bindTouch('btn-right', 'd', null);
bindTouch('btn-j', null, () => performAction('attackLight')); bindTouch('btn-k', null, () => performAction('attackHeavy'));
bindTouch('btn-l', null, () => performAction('roll')); bindTouch('btn-f', null, () => checkInteraction()); bindTouch('btn-e', null, () => usePotion());

function performAction(action) {
    if (player.state !== 'idle' && player.state !== 'walk') return;
    if (player.isLockAnim) return;

    if (action === 'roll') {
        player.state = 'roll'; player.rollTimer = animConfig.animations.roll.frames.length * animConfig.animations.roll.speed;
        setAnimation('roll'); player.isLockAnim = true;
    } else if (action === 'attackLight') {
        player.state = 'attackLight'; player.attackHitboxActive = true; 
        setAnimation(player.hasWeapon ? 'attack1_weapon' : 'attack1_no_weapon'); player.isLockAnim = true; 
    } else if (action === 'attackHeavy') {
        player.state = 'attackHeavy'; player.attackHitboxActive = true; 
        setAnimation(player.hasWeapon ? 'attack2_weapon' : 'attack2_no_weapon'); player.isLockAnim = true; 
    }
}

function checkInteraction() {
    for (let obj of environment) {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 80 && obj.interactable) {
            
            if (obj.type === 'shed' && player.questStatus === 'get_weapon') {
                player.hasWeapon = true; obj.interactable = false;
                player.equipment.weapon = { name: "Старый топор", dmg: 10 };
                player.questStatus = 'kill_monsters'; updateObjectiveText(); setAnimation('idle_weapon');
            }
            else if (obj.type === 'uncle') {
                if (player.questStatus === 'get_weapon' || player.questStatus === 'kill_monsters') {
                    startDialogue([{ name: "Вейланд", text: "Очисти поле!" }]);
                } else if (player.questStatus === 'return') { 
                    player.questStatus = 'talk_merchant'; player.xp += 100; updateHUD(); updateObjectiveText();
                    startDialogue([
                        { name: "Вейланд", text: "Хорошая работа, Тарн. (+100 ОПЫТА)" },
                        { name: "Вейланд", text: "Но твой топор совсем затупился о панцири этих тварей. Ступай к Снагу, пусть подлатает." }
                    ]); 
                } else if (player.questStatus === 'return_graveyard') {
                    player.questStatus = 'done'; player.xp += 300; updateHUD(); updateObjectiveText();
                    startDialogue([
                        { name: "Вейланд", text: "Ты упокоил мертвецов... Невероятно! Ты стал настоящим воином. (+300 ОПЫТА)" }
                    ]); 
                } else {
                    startDialogue([{ name: "Вейланд", text: "Ступай к Снагу." }]);
                }
            }
            else if (obj.type === 'merchant') {
                if (player.questStatus === 'talk_merchant') {
                    player.questStatus = player.seeds >= 10 ? 'return_merchant' : 'gather_seeds'; updateObjectiveText();
                    startDialogue([
                        { name: "Снаг", text: "Ква! Твой дядюшка прав, топор никуда не годится. Я наточу его и он даст +2 к урону." },
                        { name: "Снаг", text: "Но мне нужны 10 семян гнили для моей тетушки на ферме." }
                    ]);
                } else if (player.questStatus === 'gather_seeds') {
                    startDialogue([{ name: "Снаг", text: `Ква... Мне нужно 10 семян. У тебя пока только ${player.seeds}.` }]);
                } else if (player.questStatus === 'return_merchant') {
                    player.seeds -= 10; player.baseDamage += 2;
                    if (player.equipment.weapon) player.equipment.weapon.name = "Наточенный топор";
                    player.questStatus = 'go_graveyard'; updateHUD(); updateInventoryUI(); updateObjectiveText();
                    startDialogue([
                        { name: "Снаг", text: "Отлично! Держи свой топор. Теперь он рубит как надо! (+2 УРОНА)" },
                        { name: "Снаг", text: "Но есть проблема похуже. Гниль ползет со старого Погоста на востоке. Сходи туда и проверь, что происходит." }
                    ]);
                } else if (player.questStatus === 'go_graveyard' || player.questStatus === 'kill_undead') {
                    startDialogue([{ name: "Снаг", text: "Ква! Осторожнее на Погосте, мертвецы там не всегда лежат смирно." }]);
                } else if (player.questStatus === 'done' || player.questStatus === 'return_graveyard') {
                    openShop();
                } else {
                    startDialogue([{ name: "Снаг", text: "Ква-а-а... Я пока занят, фермер. Поговори с дядюшкой." }]);
                }
            }
        }
    }
}

function checkQuestProgress() { 
    if (player.questStatus === 'kill_monsters' && currentLocation === 'field') { 
        if (enemies.every(e => e.state === 'dead')) { player.questStatus = 'return'; updateObjectiveText(); } 
    }
    if (player.questStatus === 'kill_undead' && currentLocation === 'graveyard') {
        if (enemies.every(e => e.state === 'dead')) { player.questStatus = 'return_graveyard'; updateObjectiveText(); } 
    }
}

function transitionLocation(newLoc, spawnSide = 'left') { 
    currentState = 'TRANSITION'; fadeOverlay.classList.remove('hidden'); mobileControls.classList.add('hidden'); 
    setTimeout(() => { 
        currentLocation = newLoc; locations[newLoc].setup(); 
        player.x = spawnSide === 'left' ? 50 : canvas.width - 50; 
        fadeOverlay.classList.add('hidden'); currentState = 'PLAY'; checkMobile(); 
    }, 600); 
}

// --- ИГРОВОЙ ЦИКЛ ---
function update() {
    if (currentState !== 'PLAY') return;
    if (player.hurtTimer > 0) player.hurtTimer--;

    updateAnimation();
    globalNpcTimer++; if (globalNpcTimer >= npcAnimSpeed) { globalNpcTimer = 0; globalNpcFrame++; }

    let currentSpeed = player.speed;

    if (player.state === 'roll') { currentSpeed *= player.rollSpeedMult; player.rollTimer--; } 
    else if (player.state === 'idle' || player.state === 'walk') {
        if (keys.w || keys.a || keys.s || keys.d) { player.state = 'walk'; setAnimation(player.hasWeapon ? 'walk_weapon' : 'walk_no_weapon'); } 
        else { player.state = 'idle'; setAnimation(player.hasWeapon ? 'idle_weapon' : 'idle_no_weapon'); }
    }

    if (player.state === 'walk' || player.state === 'roll') {
        let dx = 0; let dy = 0;
        if (keys.w) dy -= currentSpeed; if (keys.s) dy += currentSpeed;
        if (keys.a) { dx -= currentSpeed; player.facingRight = false; }
        if (keys.d) { dx += currentSpeed; player.facingRight = true; }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        player.x += dx; player.y += dy;
        
        const horizon = 200; if (player.y < horizon) player.y = horizon; if (player.y > canvas.height) player.y = canvas.height;
        
        // ПЕРЕХОДЫ МЕЖДУ ЛОКАЦИЯМИ
        if (player.x > canvas.width + 20) { 
            if (currentLocation === 'village' && player.hasWeapon) transitionLocation('field', 'left'); 
            else if (currentLocation === 'field' && (player.questStatus === 'go_graveyard' || player.questStatus === 'kill_undead' || player.questStatus === 'return_graveyard' || player.questStatus === 'done')) {
                transitionLocation('graveyard', 'left');
            }
            else player.x = canvas.width - player.width/2; 
        }
        if (player.x < -20) { 
            if (currentLocation === 'field') transitionLocation('village', 'right'); 
            else if (currentLocation === 'graveyard') transitionLocation('field', 'right');
            else player.x = player.width/2; 
        }
    }

    for (let i = lootItems.length - 1; i >= 0; i--) { 
        let item = lootItems[i]; 
        if (Math.hypot(player.x - item.x, player.y - item.y) < 30) { 
            if (item.type === 'coin') player.coins++; 
            else if (item.type === 'seed') {
                player.seeds++; 
                if (player.questStatus === 'gather_seeds' && player.seeds >= 10) { player.questStatus = 'return_merchant'; updateObjectiveText(); }
            }
            lootItems.splice(i, 1); updateHUD(); 
        } 
    }
    
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = player.state === 'attackLight' ? 50 : 70;
        let attackDamage = player.baseDamage * (player.state === 'attackLight' ? 1 : 2);
        
        enemies.forEach(enemy => {
            // Если враг мертв ИЛИ воскрешается на земле, его нельзя бить
            if (enemy.state === 'dead' || enemy.state === 'resurrecting') return;
            
            let inRangeX = player.facingRight ? (enemy.x > player.x && enemy.x - player.x < reach) : (enemy.x < player.x && player.x - enemy.x < reach);
            let inRangeY = Math.abs(player.y - enemy.y) < 30;
            
            if (inRangeX && inRangeY) {
                enemy.hp -= attackDamage; 
                
                if (enemy.hp <= 0) { 
                    if (enemy.revives > 0) {
                        // ВОСКРЕШЕНИЕ: Падает на землю, но не умирает насовсем
                        enemy.state = 'resurrecting';
                        enemy.revives--;
                        enemy.reviveTimer = 150; // Лежит 2.5 секунды
                        setEntityAnimation(enemy, enemy.baseAnim + '_death'); enemy.isLockAnim = true;
                    } else {
                        // ОКОНЧАТЕЛЬНАЯ СМЕРТЬ
                        enemy.state = 'dead'; player.xp += (enemy.type === 'undead' ? 40 : 20); 
                        let dropType = Math.random() > 0.5 ? 'coin' : 'seed'; lootItems.push({ x: enemy.x, y: enemy.y, type: dropType }); 
                        updateHUD(); checkQuestProgress(); 
                        setEntityAnimation(enemy, enemy.baseAnim + '_death'); enemy.isLockAnim = true;
                    }
                } else {
                    enemy.state = 'hurt'; enemy.hurtTimer = 15; enemy.x += player.facingRight ? 20 : -20;
                    setEntityAnimation(enemy, enemy.baseAnim + '_hurt'); enemy.isLockAnim = true;
                }
            }
        });
    }

    enemies.forEach(enemy => {
        if (enemy.state === 'dead') { updateEnemyAnimation(enemy); return; }
        
        // Логика таймера воскрешения
        if (enemy.state === 'resurrecting') {
            updateEnemyAnimation(enemy);
            enemy.reviveTimer--;
            if (enemy.reviveTimer <= 0) {
                // Встает с половиной ХП
                enemy.hp = 25;
                enemy.state = 'chase';
                enemy.isLockAnim = false;
                setEntityAnimation(enemy, enemy.baseAnim + '_walk');
            }
            return; // Больше ничего не делает, пока лежит
        }

        updateEnemyAnimation(enemy); 
        enemy.facingRight = player.x > enemy.x; 

        if (enemy.attackTimer > 0) enemy.attackTimer--;
        
        if (enemy.state === 'chase' && !enemy.isLockAnim) {
            let dx = player.x - enemy.x; let dy = player.y - enemy.y; let dist = Math.hypot(dx, dy);
            if (dist > 45) { 
                enemy.x += (dx / dist) * enemy.speed; enemy.y += (dy / dist) * enemy.speed; setEntityAnimation(enemy, enemy.baseAnim + '_walk');
            } else {
                if (enemy.attackTimer <= 0 && player.state !== 'dead' && player.state !== 'roll') {
                    enemy.state = 'attack'; enemy.attackTimer = 100; setEntityAnimation(enemy, enemy.baseAnim + '_preAttack'); enemy.isLockAnim = true;
                } else { setEntityAnimation(enemy, enemy.baseAnim + '_walk'); }
            }
        }
    });
}

function drawQuestMark(x, y, markStr, color = '#ffb300') {
    ctx.save(); let floatOffset = Math.sin(Date.now() / 200) * 5; ctx.fillStyle = color;
    ctx.font = 'bold 24px "Russo One", Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    ctx.fillText(markStr, x, y + floatOffset); ctx.restore();
}

function draw() {
    const loc = locations[currentLocation];
    ctx.fillStyle = loc.bgColor || '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (loc.groundImage && loc.groundImage.complete && loc.groundImage.naturalWidth > 0) { ctx.drawImage(loc.groundImage, 0, 180, canvas.width, canvas.height - 180); }
    if (loc.horizonImage && loc.horizonImage.complete && loc.horizonImage.naturalWidth > 0) { ctx.drawImage(loc.horizonImage, 0, 0, canvas.width, 180);
    } else if (loc.horizonColor) { ctx.fillStyle = loc.horizonColor; ctx.fillRect(0, 0, canvas.width, 180); }

    if (currentState === 'PLAY' || currentState === 'GAMEOVER' || currentState === 'SHOP' || currentState === 'INVENTORY') {
        lootItems.forEach(item => { ctx.fillStyle = item.type === 'coin' ? '#ffca28' : '#69f0ae'; ctx.beginPath(); ctx.arc(item.x, item.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); });

        let renderQueue = [player, ...environment, ...enemies];
        renderQueue.sort((a, b) => a.y - b.y);

        for (let obj of renderQueue) {
            if (obj === player) drawPlayer();
            else if (enemies.includes(obj)) drawEnemy(obj);
            else {
                if (obj.type === 'shed') {
                    const frames = buildingSprites.shed;
                    if (frames && frames.length > 0 && frames[0].complete && frames[0].naturalWidth > 0) { ctx.drawImage(frames[0], obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height);
                    } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    if (player.questStatus === 'get_weapon') { drawQuestMark(obj.x, obj.y - obj.height - 20, '!'); }
                }
                else if (obj.type === 'merchant') {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
                    const frames = npcSprites.merchant_idle;
                    if (frames && frames.length > 0 && frames[0].complete) {
                        ctx.save(); ctx.translate(obj.x, obj.y); const dX = -animConfig.w_frame / 2; const dY = -animConfig.h_frame + 10;
                        ctx.drawImage(frames[globalNpcFrame % frames.length], dX, dY, animConfig.w_frame, animConfig.h_frame); ctx.restore();
                    } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    
                    if (player.questStatus === 'talk_merchant' || player.questStatus === 'return_merchant') { drawQuestMark(obj.x, obj.y - obj.height - 20, '!'); }
                    else if (player.questStatus === 'gather_seeds') { drawQuestMark(obj.x, obj.y - obj.height - 20, '?', '#ccc'); } 
                } 
                else if (obj.type === 'uncle') {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
                    const frames = npcSprites.uncle_idle;
                    if (frames && frames.length > 0 && frames[0].complete) {
                        ctx.save(); ctx.translate(obj.x, obj.y); const dX = -animConfig.w_frame / 2; const dY = -animConfig.h_frame + 10;
                        ctx.drawImage(frames[globalNpcFrame % frames.length], dX, dY, animConfig.w_frame, animConfig.h_frame); ctx.restore();
                    } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    
                    if (player.questStatus === 'return' || player.questStatus === 'return_graveyard') { drawQuestMark(obj.x, obj.y - obj.height - 20, '!'); }
                }
            }
        }
    }
}

function drawPlayer() {
    if (player.state === 'dead') { ctx.fillStyle = '#4a0000'; ctx.fillRect(player.x - player.width/2, player.y - 10, player.width, 15); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(player.x, player.y, player.width / 1.2, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (player.hurtTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
    const anim = animConfig.animations[player.currentAnim]; const currentFrameImg = anim.frames[player.frameIndex];
    if (!currentFrameImg || !currentFrameImg.complete || currentFrameImg.naturalWidth === 0) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(player.x - player.width/2, player.y - player.height, player.width, player.height); return; }
    ctx.save(); ctx.translate(player.x, player.y); if (!player.facingRight) ctx.scale(-1, 1);
    ctx.drawImage(currentFrameImg, -animConfig.w_frame / 2, -animConfig.h_frame + 10, animConfig.w_frame, animConfig.h_frame); ctx.restore();
}

function drawEnemy(enemy) {
    if (enemy.state !== 'dead' && enemy.state !== 'resurrecting') { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y, enemy.width/1.5, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    const anim = animConfig.animations[enemy.currentAnim];
    if (!anim || !anim.frames[enemy.frameIndex] || !anim.frames[enemy.frameIndex].complete || anim.frames[enemy.frameIndex].naturalWidth === 0) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height, enemy.width, enemy.height); return; }
    ctx.save(); ctx.translate(enemy.x, enemy.y); if (!enemy.facingRight) ctx.scale(-1, 1);
    ctx.drawImage(anim.frames[enemy.frameIndex], -animConfig.w_frame / 2, -animConfig.h_frame + 10, animConfig.w_frame, animConfig.h_frame); ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Отключаем сглаживание для четких пикселей
ctx.imageSmoothingEnabled = false;

const storyScreen = document.getElementById('story-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
const fadeOverlay = document.getElementById('fade-overlay');
const shopScreen = document.getElementById('shop-screen');
const hud = document.getElementById('hud');
const objectiveText = document.getElementById('objective');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');
const hpBarFill = document.getElementById('hp-bar-fill');
const xpText = document.getElementById('xp-text');
const inventoryText = document.getElementById('inventory-text');
const gameOverScreen = document.getElementById('game-over-screen');
const btnPotion = document.getElementById('btn-buy-potion');
const btnUpgrade = document.getElementById('btn-buy-upgrade');
const btnCloseShop = document.getElementById('btn-close-shop');
const mobileControls = document.getElementById('mobile-controls');

let currentState = 'STORY'; 
let currentLocation = 'village'; 
let dialogueLines = [];
let currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

// ==========================================
// --- ЗАГРУЗКА ОТДЕЛЬНЫХ КАДРОВ ---
// ==========================================
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

const npcSprites = {
    merchant_idle: loadFrames('img/frog_idle', 3), 
    uncle_idle: loadFrames('img/dad_idle', 3) 
};

const buildingSprites = {
    shed: loadFrames('img/Home', 1) 
};

// --- ЗАГРУЗКА ФОНОВ ---
const backgroundImages = {
    horizon: new Image(),
    villageGround: new Image() // НОВОЕ: Картинка земли для деревни
};
backgroundImages.horizon.src = 'img/BG_farm.png'; 
backgroundImages.villageGround.src = 'img/zemly_1.png'; // Убедись, что файл называется именно так

let globalNpcTimer = 0;
let globalNpcFrame = 0;
const npcAnimSpeed = 12;

// ==========================================
// --- КОНФИГУРАЦИЯ АНИМАЦИЙ ---
// ==========================================
const animConfig = {
    w_frame: 96, 
    h_frame: 96, 
    animations: {
        'idle_no_weapon':   { frames: tarnSprites.idle_no_weapon, speed: 12 },
        'idle_weapon':      { frames: tarnSprites.idle_weapon,    speed: 12 },
        'walk_no_weapon':   { frames: tarnSprites.walk_no_weapon, speed: 8 }, 
        'walk_weapon':      { frames: tarnSprites.walk_weapon,    speed: 8 }, 
        'attack1_no_weapon':{ frames: tarnSprites.attack1_no_weapon, speed: 6, onComplete: 'idle' },
        'attack1_weapon':   { frames: tarnSprites.attack1_weapon, speed: 6, onComplete: 'idle' },
        'attack2_no_weapon':{ frames: tarnSprites.attack2_no_weapon, speed: 5, onComplete: 'idle' },
        'attack2_weapon':   { frames: tarnSprites.attack2_weapon, speed: 5, onComplete: 'idle' },
        'roll':             { frames: tarnSprites.roll,           speed: 4, onComplete: 'idle' }
    }
};

const player = {
    x: 300, y: 300, width: 30, height: 70, 
    speed: 3.5, color: '#8D6E63',
    state: 'idle', facingRight: true,
    rollTimer: 0, rollDuration: 0, 
    rollSpeedMult: 2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, coins: 0, seeds: 0, potions: 0, baseDamage: 10, questStatus: 'get_weapon',
    
    currentAnim: 'idle_no_weapon',
    frameIndex: 0,
    animTimer: 0,
    isLockAnim: false
};

let environment = [];
let enemies = [];
let lootItems = []; 

const locations = {
    village: {
        bgColor: '#5d4037', horizonColor: '#1b1b1b',
        groundImage: backgroundImages.villageGround, // НОВОЕ: Подключаем картинку земли
        setup: () => {
            environment = [
                { x: 600, y: 230, width: 240, height: 180, color: player.hasWeapon ? '#271714' : '#3E2723', interactable: !player.hasWeapon, type: 'shed' },
                { x: 200, y: 280, width: 40, height: 80, color: '#ffb300', interactable: true, type: 'uncle' },
                { x: 450, y: 240, width: 45, height: 60, interactable: true, type: 'merchant' }
            ];
            enemies = []; lootItems = [];
            if (player.questStatus === 'get_weapon') objectiveText.innerText = "Цель: Забери цеп у сарая (F)";
            else if (player.questStatus === 'return') objectiveText.innerText = "Цель: Поговори с дядюшкой (F)";
            else if (player.questStatus === 'done') objectiveText.innerText = "Свободная игра: охоться и торгуй!";
        }
    },
    field: {
        bgColor: '#4e5e3d', horizonColor: '#0a1a0f',
        // У поля пока нет своей картинки земли, будет заливка зеленым цветом (#4e5e3d)
        setup: () => {
            environment = []; lootItems = [];
            enemies = [createEnemy(500, 300), createEnemy(650, 250), createEnemy(750, 380)];
            if (player.questStatus === 'kill_monsters') objectiveText.innerText = "Цель: Выживи и выкорчуй нечисть!";
            else objectiveText.innerText = "Охота на Хвощевиков продолжается...";
        }
    }
};

function createEnemy(x, y) { return { x: x, y: y, width: 35, height: 60, speed: 1.2, hp: 30, color: '#689f38', state: 'chase', hurtTimer: 0, damage: 15, attackTimer: 0 }; }

setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
locations.village.setup();
updateHUD();

// --- СИСТЕМА АНИМАЦИЙ ---
function setAnimation(animName) {
    if (player.isLockAnim || player.currentAnim === animName) return;
    if (!animConfig.animations[animName]) return;

    player.currentAnim = animName;
    player.frameIndex = 0;
    player.animTimer = 0;
}

function updateAnimation() {
    const config = animConfig.animations[player.currentAnim];
    if (!config) return;

    player.animTimer++;
    if (player.animTimer >= config.speed) {
        player.animTimer = 0;
        player.frameIndex++;

        if (player.frameIndex >= config.frames.length) {
            if (config.onComplete) {
                player.isLockAnim = false;
                player.state = 'idle'; 
                let nextIdle = player.hasWeapon ? 'idle_weapon' : 'idle_no_weapon';
                player.currentAnim = nextIdle;
                player.frameIndex = 0;
            } else {
                player.frameIndex = 0; 
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
            { name: "Вейланд", text: "Возьми старый цеп у сарая. Очисти поле, пока эта дрянь не добралась до амбаров." }
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
btnPotion.addEventListener('click', () => { if (player.coins >= 2) { player.coins -= 2; player.potions++; updateHUD(); } else alert("Не хватает монет!"); });
btnUpgrade.addEventListener('click', () => { if (player.seeds >= 5) { player.seeds -= 5; player.baseDamage += 10; updateHUD(); alert("Оружие улучшено!"); } else alert("Не хватает семян!"); });
btnCloseShop.addEventListener('click', closeShop);
function usePotion() { if (player.potions > 0 && player.hp < player.maxHp) { player.potions--; player.hp = Math.min(player.maxHp, player.hp + 50); updateHUD(); } }
function updateHUD() { let hpPercent = Math.max(0, (player.hp / player.maxHp) * 100); hpBarFill.style.width = hpPercent + '%'; xpText.innerText = 'Опыт: ' + player.xp; inventoryText.innerText = `Монеты: ${player.coins} | Семена: ${player.seeds} | Зелья (E): ${player.potions}`; }

// --- УПРАВЛЕНИЕ ---
function checkMobile() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice && currentState === 'PLAY') mobileControls.classList.remove('hidden');
    else mobileControls.classList.add('hidden');
}

window.addEventListener('pointerdown', (e) => { 
    if (e.target.closest('.mob-btn') || e.target.closest('.shop-btn')) return; 
    if (currentState === 'STORY' || currentState === 'DIALOGUE') advanceDialogue(); 
});

window.addEventListener('keydown', (e) => {
    if (currentState === 'GAMEOVER' || currentState === 'SHOP') return;
    if (currentState === 'STORY' || currentState === 'DIALOGUE') { if (e.code === 'Space' || e.code === 'Enter') advanceDialogue(); return; }
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
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        if (keyProp) keys[keyProp] = true;
        if (actionFunc && currentState === 'PLAY') actionFunc();
    }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); if (keyProp) keys[keyProp] = false; }, { passive: false });
    btn.addEventListener('touchcancel', (e) => { e.preventDefault(); if (keyProp) keys[keyProp] = false; }, { passive: false });
}

bindTouch('btn-up', 'w', null);
bindTouch('btn-down', 's', null);
bindTouch('btn-left', 'a', null);
bindTouch('btn-right', 'd', null);
bindTouch('btn-j', null, () => performAction('attackLight'));
bindTouch('btn-k', null, () => performAction('attackHeavy'));
bindTouch('btn-l', null, () => performAction('roll'));
bindTouch('btn-f', null, () => checkInteraction());
bindTouch('btn-e', null, () => usePotion());

function performAction(action) {
    if (player.state !== 'idle' && player.state !== 'walk') return;
    if (player.isLockAnim) return;

    if (action === 'roll') {
        player.state = 'roll'; 
        let config = animConfig.animations.roll;
        player.rollTimer = config.frames.length * config.speed;
        setAnimation('roll');
        player.isLockAnim = true;
    } else if (action === 'attackLight') {
        player.state = 'attackLight'; 
        player.attackHitboxActive = true; 
        let attackAnim = player.hasWeapon ? 'attack1_weapon' : 'attack1_no_weapon';
        setAnimation(attackAnim);
        player.isLockAnim = true; 
    } else if (action === 'attackHeavy') {
        player.state = 'attackHeavy'; 
        player.attackHitboxActive = true; 
        let attackAnim = player.hasWeapon ? 'attack2_weapon' : 'attack2_no_weapon';
        setAnimation(attackAnim);
        player.isLockAnim = true; 
    }
}

function checkInteraction() {
    for (let obj of environment) {
        let dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist < 80 && obj.interactable) {
            if (obj.type === 'shed' && player.questStatus === 'get_weapon') {
                player.hasWeapon = true; obj.interactable = false;
                player.questStatus = 'kill_monsters'; objectiveText.innerText = "Цель: Иди направо, на дальнее поле ->";
                setAnimation('idle_weapon');
            }
            else if (obj.type === 'uncle') {
                if (player.questStatus === 'get_weapon' || player.questStatus === 'kill_monsters') startDialogue([{ name: "Вейланд", text: "Очисти поле!" }]);
                else if (player.questStatus === 'return') { player.questStatus = 'done'; player.xp += 100; updateHUD(); startDialogue([{ name: "Вейланд", text: "Хорошая работа, Тарн. (+100 ОПЫТА)" }]); objectiveText.innerText = "Фарми лут!"; }
                else startDialogue([{ name: "Вейланд", text: "Поговори со Снагом." }]);
            }
            else if (obj.type === 'merchant') openShop();
        }
    }
}

function checkQuestProgress() { if (player.questStatus === 'kill_monsters') { let allDead = enemies.every(e => e.state === 'dead'); if (allDead) { player.questStatus = '

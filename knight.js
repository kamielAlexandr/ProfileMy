const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Отключаем сглаживание для четких пикселей
ctx.imageSmoothingEnabled = false;

const storyScreen = document.getElementById('story-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
const fadeOverlay = document.getElementById('fade-overlay');
const shopScreen = document.getElementById('shop-screen');
const inventoryScreen = document.getElementById('inventory-screen'); // НОВОЕ: экран инвентаря
const hud = document.getElementById('hud');
const objectiveText = document.getElementById('objective');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');
const hpBarFill = document.getElementById('hp-bar-fill');
const xpText = document.getElementById('xp-text');
const inventoryText = document.getElementById('inventory-text');
const gameOverScreen = document.getElementById('game-over-screen');

// Кнопки интерфейса
const btnPotion = document.getElementById('btn-buy-potion');
const btnUpgrade = document.getElementById('btn-buy-upgrade');
const btnCloseShop = document.getElementById('btn-close-shop');
const mobileControls = document.getElementById('mobile-controls');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnInventory = document.getElementById('btn-inventory'); // НОВОЕ: кнопка рюкзака
const btnCloseInventory = document.getElementById('btn-close-inventory'); // НОВОЕ: кнопка закрыть рюкзак
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

const npcSprites = {
    merchant_idle: loadFrames('img/frog_idle', 3), 
    uncle_idle: loadFrames('img/dad_idle', 3) 
};

const buildingSprites = {
    shed: loadFrames('img/Home', 1) 
};

const enemySprites = {
    walk: loadFrames('img/hroshevik_walk', 4),
    preAttack: loadFrames('img/hroshevik_Pre-Attack', 3),
    attack: loadFrames('img/hroshevik_Attack', 3),
    hurt: loadFrames('img/hroshevik_Hurt', 3),
    death: loadFrames('img/hroshevik_Death', 5)
};

const backgroundImages = {
    horizon: new Image(),
    villageGround: new Image(), 
    fieldGround: new Image() 
};
backgroundImages.horizon.src = 'img/BG_farm.png'; 
backgroundImages.villageGround.src = 'img/zemly_1.png'; 
backgroundImages.fieldGround.src = 'img/BG2_1.png'; 

let globalNpcTimer = 0;
let globalNpcFrame = 0;
const npcAnimSpeed = 12;

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
        'enemy_death':      { frames: enemySprites.death,     speed: 8,  onComplete: 'dead' }
    }
};

const player = {
    x: 300, y: 300, width: 30, height: 70, 
    speed: 3.5, color: '#8D6E63',
    state: 'idle', facingRight: true,
    rollTimer: 0, rollDuration: 0, 
    rollSpeedMult: 2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, coins: 0, seeds: 0, potions: 0, baseDamage: 10, questStatus: 'get_weapon',
    
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,

    // --- НОВОЕ: ЭКИПИРОВКА ---
    equipment: {
        head: null,
        chest: { name: 'Рубаха фермера', def: 0 },
        hands: null,
        legs: { name: 'Штаны фермера', def: 0 },
        feet: { name: 'Лапти', def: 0 },
        weapon: null
    },
    defense: 0 // Считается динамически
};

let environment = [];
let enemies = [];
let lootItems = []; 

const locations = {
    village: {
        bgColor: '#5d4037', horizonColor: '#1b1b1b',
        groundImage: backgroundImages.villageGround,
        setup: () => {
            environment = [
                { x: 600, y: 230, width: 240, height: 180, color: player.hasWeapon ? '#271714' : '#3E2723', interactable: !player.hasWeapon, type: 'shed' },
                { x: 200, y: 280, width: 40, height: 80, color: '#ffb300', interactable: true, type: 'uncle' },
                { x: 450, y: 240, width: 45, height: 60, interactable: true, type: 'merchant' }
            ];
            enemies = []; lootItems = [];
            if (player.questStatus === 'get_weapon') objectiveText.innerText = "Цель: Забери топор у сарая (F)";
            else if (player.questStatus === 'return') objectiveText.innerText = "Цель: Поговори с дядюшкой (F)";
            else if (player.questStatus === 'done') objectiveText.innerText = "Свободная игра: охоться и торгуй!";
        }
    },
    field: {
        bgColor: '#4e5e3d', horizonColor: '#0a1a0f',
        groundImage: backgroundImages.fieldGround, 
        setup: () => {
            environment = []; lootItems = [];
            enemies = [createEnemy(500, 300), createEnemy(650, 250), createEnemy(750, 380)];
            if (player.questStatus === 'kill_monsters') objectiveText.innerText = "Цель: Выживи и выкорчуй нечисть!";
            else objectiveText.innerText = "Охота на Хвощевиков продолжается...";
        }
    }
};

function createEnemy(x, y) { 
    return { 
        x: x, y: y, width: 35, height: 60, speed: 1.2, hp: 30, color: '#689f38', 
        state: 'chase', hurtTimer: 0, damage: 15, attackTimer: 0,
        currentAnim: 'enemy_walk', frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false
    }; 
}

setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
locations.village.setup();
updateHUD();

// ==========================================
// --- ИНВЕНТАРЬ ---
// ==========================================
function updateInventoryUI() {
    // Обновляем текст в слотах
    document.getElementById('slot-head').innerHTML = `Шлем: <span>${player.equipment.head ? player.equipment.head.name : 'Нет'}</span>`;
    document.getElementById('slot-chest').innerHTML = `Грудь: <span>${player.equipment.chest ? player.equipment.chest.name + ' (+'+player.equipment.chest.def+')' : 'Нет'}</span>`;
    document.getElementById('slot-hands').innerHTML = `Перчатки: <span>${player.equipment.hands ? player.equipment.hands.name : 'Нет'}</span>`;
    document.getElementById('slot-legs').innerHTML = `Штаны: <span>${player.equipment.legs ? player.equipment.legs.name + ' (+'+player.equipment.legs.def+')' : 'Нет'}</span>`;
    document.getElementById('slot-feet').innerHTML = `Обувь: <span>${player.equipment.feet ? player.equipment.feet.name + ' (+'+player.equipment.feet.def+')' : 'Нет'}</span>`;
    
    let wpnText = player.equipment.weapon ? player.equipment.weapon.name + ' (+'+player.baseDamage+')' : 'Нет';
    document.getElementById('slot-weapon').innerHTML = `Оружие: <span style="color:#ffb300">${wpnText}</span>`;

    // Обновляем статы
    player.defense = (player.equipment.chest?.def || 0) + (player.equipment.legs?.def || 0) + (player.equipment.feet?.def || 0);
    document.getElementById('stat-def').innerText = player.defense;
    document.getElementById('stat-dmg').innerText = player.baseDamage;
}

function toggleInventory() {
    if (currentState === 'PLAY') {
        // Проверка на наличие живых врагов рядом
        if (currentLocation === 'field' && enemies.some(e => e.state !== 'dead')) {
            alert("Вы не можете копаться в рюкзаке во время боя!");
            return;
        }
        currentState = 'INVENTORY';
        keys.w = keys.a = keys.s = keys.d = false;
        mobileControls.classList.add('hidden');
        inventoryScreen.classList.remove('hidden');
        updateInventoryUI();
    } else if (currentState === 'INVENTORY') {
        currentState = 'PLAY';
        inventoryScreen.classList.add('hidden');
        checkMobile();
    }
}

btnInventory.addEventListener('click', toggleInventory);
btnCloseInventory.addEventListener('click', toggleInventory);

// ==========================================
// --- ПОЛНОЭКРАННЫЙ РЕЖИМ ---
// ==========================================
btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (gameContainer.requestFullscreen) { gameContainer.requestFullscreen(); } 
        else if (gameContainer.webkitRequestFullscreen) { gameContainer.webkitRequestFullscreen(); }
        btnFullscreen.innerText = '✖';
    } else {
        if (document.exitFullscreen) { document.exitFullscreen(); } 
        else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
        btnFullscreen.innerText = '⛶';
    }
});

document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
function updateFullscreenBtn() {
    btnFullscreen.innerText = (!document.fullscreenElement && !document.webkitFullscreenElement) ? '⛶' : '✖';
}

// ==========================================
// --- СИСТЕМА АНИМАЦИЙ ---
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
                let nextIdle = player.hasWeapon ? 'idle_weapon' : 'idle_no_weapon';
                player.currentAnim = nextIdle; player.frameIndex = 0;
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
                    setEntityAnimation(entity, 'enemy_attack'); entity.isLockAnim = true; 
                    if (Math.hypot(player.x - entity.x, player.y - entity.y) < 60 && player.state !== 'roll') {
                        // Урон снижается за счет защиты (минимум 1 урон)
                        let finalDamage = Math.max(1, entity.damage - player.defense);
                        player.hp -= finalDamage; player.hurtTimer = 40; updateHUD();
                        if (player.hp <= 0) { player.state = 'dead'; currentState = 'GAMEOVER'; mobileControls.classList.add('hidden'); gameOverScreen.classList.remove('hidden'); }
                    }
                } else if (config.onComplete === 'walk') {
                    entity.state = 'chase'; setEntityAnimation(entity, 'enemy_walk');
                } else if (config.onComplete === 'dead') {
                    entity.frameIndex = config.frames.length - 1; return; 
                } else { entity.frameIndex = 0; }
            } else {
                if (entity.state === 'dead') entity.frameIndex = config.frames.length - 1; else entity.frameIndex = 0; 
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
btnPotion.addEventListener('click', () => { if (player.coins >= 2) { player.coins -= 2; player.potions++; updateHUD(); } else alert("Не хватает монет!"); });
btnUpgrade.addEventListener('click', () => { 
    if (player.seeds >= 5) { 
        player.seeds -= 5; player.baseDamage += 10; 
        if (player.equipment.weapon) player.equipment.weapon.name = "Заточенный топор";
        updateHUD(); alert("Оружие улучшено!"); 
    } else alert("Не хватает семян!"); 
});
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
    if (e.target.closest('.mob-btn') || e.target.closest('.shop-btn') || e.target.closest('.top-btn') || e.target.closest('.inventory-box')) return; 
    if (currentState === 'STORY' || currentState === 'DIALOGUE') advanceDialogue(); 
});

window.addEventListener('keydown', (e) => {
    if (currentState === 'GAMEOVER' || currentState === 'SHOP') return;
    if (currentState === 'STORY' || currentState === 'DIALOGUE') { if (e.code === 'Space' || e.code === 'Enter') advanceDialogue(); return; }
    
    // Хоткей Инвентаря
    if (e.code === 'KeyI' && (currentState === 'PLAY' || currentState === 'INVENTORY')) {
        toggleInventory(); return;
    }

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
                
                // ИЗМЕНЕНИЕ: Даем оружие в инвентарь!
                player.equipment.weapon = { name: "Старый топор", dmg: 10 };

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

function checkQuestProgress() { if (player.questStatus === 'kill_monsters') { let allDead = enemies.every(e => e.state === 'dead'); if (allDead) { player.questStatus = 'return'; objectiveText.innerText = "Цель: Вернись к дядюшке (Иди влево <-)"; } } }
function transitionLocation(newLoc, spawnSide = 'left') { currentState = 'TRANSITION'; fadeOverlay.classList.remove('hidden'); mobileControls.classList.add('hidden'); setTimeout(() => { currentLocation = newLoc; locations[newLoc].setup(); player.x = spawnSide === 'left' ? 50 : canvas.width - 50; fadeOverlay.classList.add('hidden'); currentState = 'PLAY'; checkMobile(); }, 600); }

// --- ИГРОВОЙ ЦИКЛ ---
function update() {
    if (currentState !== 'PLAY') return;
    if (player.hurtTimer > 0) player.hurtTimer--;

    updateAnimation();

    globalNpcTimer++;
    if (globalNpcTimer >= npcAnimSpeed) {
        globalNpcTimer = 0;
        globalNpcFrame++;
    }

    let currentSpeed = player.speed;

    if (player.state === 'roll') {
        currentSpeed *= player.rollSpeedMult; player.rollTimer--;
    } else if (player.state === 'idle' || player.state === 'walk') {
        if (keys.w || keys.a || keys.s || keys.d) {
            player.state = 'walk';
            let walkAnim = player.hasWeapon ? 'walk_weapon' : 'walk_no_weapon';
            setAnimation(walkAnim);
        } else {
            player.state = 'idle';
            let idleAnim = player.hasWeapon ? 'idle_weapon' : 'idle_no_weapon';
            setAnimation(idleAnim);
        }
    }

    if (player.state === 'walk' || player.state === 'roll') {
        let dx = 0; let dy = 0;
        if (keys.w) dy -= currentSpeed; if (keys.s) dy += currentSpeed;
        if (keys.a) { dx -= currentSpeed; player.facingRight = false; }
        if (keys.d) { dx += currentSpeed; player.facingRight = true; }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        player.x += dx; player.y += dy;
        
        const horizon = 200; if (player.y < horizon) player.y = horizon; if (player.y > canvas.height) player.y = canvas.height;
        
        if (player.x > canvas.width + 20) { 
            if (currentLocation === 'village' && player.hasWeapon) transitionLocation('field', 'left'); 
            else player.x = canvas.width - player.width/2; 
        }
        if (player.x < -20) { 
            if (currentLocation === 'field') transitionLocation('village', 'right'); 
            else player.x = player.width/2; 
        }
    }

    for (let i = lootItems.length - 1; i >= 0; i--) { let item = lootItems[i]; let dist = Math.hypot(player.x - item.x, player.y - item.y); if (dist < 30) { if (item.type === 'coin') player.coins++; else if (item.type === 'seed') player.seeds++; lootItems.splice(i, 1); updateHUD(); } }
    
    // --- ОБРАБОТКА ПОПАДАНИЙ ПО ВРАГУ ---
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = player.state === 'attackLight' ? 50 : 70;
        let attackDamage = player.baseDamage * (player.state === 'attackLight' ? 1 : 2);
        
        enemies.forEach(enemy => {
            if (enemy.state === 'dead') return;
            let inRangeX = player.facingRight ? (enemy.x > player.x && enemy.x - player.x < reach) : (enemy.x < player.x && player.x - enemy.x < reach);
            let inRangeY = Math.abs(player.y - enemy.y) < 30;
            
            if (inRangeX && inRangeY) {
                enemy.hp -= attackDamage; 
                
                if (enemy.hp <= 0) { 
                    enemy.state = 'dead'; 
                    player.xp += 20; 
                    let dropType = Math.random() > 0.5 ? 'coin' : 'seed'; lootItems.push({ x: enemy.x, y: enemy.y, type: dropType }); 
                    updateHUD(); checkQuestProgress(); 
                    
                    setEntityAnimation(enemy, 'enemy_death');
                    enemy.isLockAnim = true;
                } else {
                    enemy.state = 'hurt'; 
                    enemy.hurtTimer = 15; 
                    enemy.x += player.facingRight ? 20 : -20;
                    
                    setEntityAnimation(enemy, 'enemy_hurt');
                    enemy.isLockAnim = true;
                }
            }
        });
    }

    // --- ЛОГИКА ВРАГОВ ---
    enemies.forEach(enemy => {
        if (enemy.state === 'dead') {
            updateEnemyAnimation(enemy);
            return;
        }
        
        updateEnemyAnimation(enemy);
        enemy.facingRight = player.x > enemy.x; 

        if (enemy.attackTimer > 0) enemy.attackTimer--;
        
        if (enemy.state === 'chase' && !enemy.isLockAnim) {
            let dx = player.x - enemy.x; let dy = player.y - enemy.y; let dist = Math.hypot(dx, dy);
            if (dist > 45) { 
                enemy.x += (dx / dist) * enemy.speed; enemy.y += (dy / dist) * enemy.speed;
                setEntityAnimation(enemy, 'enemy_walk');
            } else {
                if (enemy.attackTimer <= 0 && player.state !== 'dead' && player.state !== 'roll') {
                    enemy.state = 'attack';
                    enemy.attackTimer = 100; 
                    
                    setEntityAnimation(enemy, 'enemy_preAttack'); 
                    enemy.isLockAnim = true;
                } else {
                    setEntityAnimation(enemy, 'enemy_walk');
                }
            }
        }
    });
}

function drawQuestMark(x, y, markStr) {
    ctx.save();
    let floatOffset = Math.sin(Date.now() / 200) * 5;
    ctx.fillStyle = '#ffb300';
    ctx.font = 'bold 24px "Russo One", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    ctx.fillText(markStr, x, y + floatOffset);
    ctx.restore();
}

// --- ОТРИСОВКА ---
function draw() {
    const loc = locations[currentLocation];
    
    ctx.fillStyle = loc.bgColor || '#000'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (loc.groundImage && loc.groundImage.complete && loc.groundImage.naturalWidth > 0) {
        ctx.drawImage(loc.groundImage, 0, 180, canvas.width, canvas.height - 180);
    }

    if (backgroundImages.horizon && backgroundImages.horizon.complete && backgroundImages.horizon.naturalWidth > 0) {
        ctx.drawImage(backgroundImages.horizon, 0, 0, canvas.width, 180);
    } else if (loc.horizonColor) {
        ctx.fillStyle = loc.horizonColor; 
        ctx.fillRect(0, 0, canvas.width, 180);
    }

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
                    if (frames && frames.length > 0 && frames[0].complete && frames[0].naturalWidth > 0) {
                        ctx.drawImage(frames[0], obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height);
                    } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    if (player.questStatus === 'get_weapon') { drawQuestMark(obj.x, obj.y - obj.height - 20, '!'); }
                }
                else if (obj.type === 'merchant') {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
                    const frames = npcSprites.merchant_idle;
                    if (frames && frames.length > 0) {
                        const currentFrame = frames[globalNpcFrame % frames.length]; 
                        if (currentFrame && currentFrame.complete && currentFrame.naturalWidth > 0) {
                            ctx.save(); ctx.translate(obj.x, obj.y);
                            const dX = -animConfig.w_frame / 2; const dY = -animConfig.h_frame + 10;
                            ctx.drawImage(currentFrame, dX, dY, animConfig.w_frame, animConfig.h_frame);
                            ctx.restore();
                        } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    }
                } 
                else if (obj.type === 'uncle') {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
                    const frames = npcSprites.uncle_idle;
                    if (frames && frames.length > 0) {
                        const currentFrame = frames[globalNpcFrame % frames.length]; 
                        if (currentFrame && currentFrame.complete && currentFrame.naturalWidth > 0) {
                            ctx.save(); ctx.translate(obj.x, obj.y);
                            const dX = -animConfig.w_frame / 2; const dY = -animConfig.h_frame + 10;
                            ctx.drawImage(currentFrame, dX, dY, animConfig.w_frame, animConfig.h_frame);
                            ctx.restore();
                        } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    }
                    if (player.questStatus === 'return') { drawQuestMark(obj.x, obj.y - obj.height - 20, '!'); }
                    else if (player.questStatus === 'done') { drawQuestMark(obj.x, obj.y - obj.height - 20, '?'); }
                }
            }
        }
    }
}

function drawPlayer() {
    if (player.state === 'dead') { ctx.fillStyle = '#4a0000'; ctx.fillRect(player.x - player.width/2, player.y - 10, player.width, 15); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(player.x, player.y, player.width / 1.2, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (player.hurtTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

    const anim = animConfig.animations[player.currentAnim];
    const currentFrameImg = anim.frames[player.frameIndex];

    if (!currentFrameImg || !currentFrameImg.complete || currentFrameImg.naturalWidth === 0) {
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(player.x - player.width/2, player.y - player.height, player.width, player.height);
        ctx.fillStyle = '#fff'; ctx.font = '10px Arial'; ctx.fillText("IMG ERR", player.x - 20, player.y - player.height/2); return;
    }

    ctx.save(); ctx.translate(player.x, player.y);
    if (!player.facingRight) ctx.scale(-1, 1);
    const dX = -animConfig.w_frame / 2; const dY = -animConfig.h_frame + 10; 
    ctx.drawImage(currentFrameImg, dX, dY, animConfig.w_frame, animConfig.h_frame);
    ctx.restore();
}

function drawEnemy(enemy) {
    if (enemy.state !== 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y, enemy.width/1.5, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    
    const anim = animConfig.animations[enemy.currentAnim];
    
    if (!anim || !anim.frames[enemy.frameIndex] || !anim.frames[enemy.frameIndex].complete || anim.frames[enemy.frameIndex].naturalWidth === 0) {
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height, enemy.width, enemy.height);
        ctx.fillStyle = '#fff'; ctx.font = '10px Arial'; ctx.fillText("ERR", enemy.x - 10, enemy.y - enemy.height/2);
        return;
    }

    const currentFrameImg = anim.frames[enemy.frameIndex];

    ctx.save(); ctx.translate(enemy.x, enemy.y);
    if (!enemy.facingRight) ctx.scale(-1, 1);
    const dX = -animConfig.w_frame / 2; const dY = -animConfig.h_frame + 10; 
    ctx.drawImage(currentFrameImg, dX, dY, animConfig.w_frame, animConfig.h_frame);
    ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

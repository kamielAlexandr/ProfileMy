const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const storyScreen = document.getElementById('story-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
const fadeOverlay = document.getElementById('fade-overlay');
const shopScreen = document.getElementById('shop-screen');
const craftScreen = document.getElementById('craft-screen'); 
const trainingScreen = document.getElementById('training-screen');
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
const btnCraftChest = document.getElementById('btn-craft-chest'); 
const btnCloseCraft = document.getElementById('btn-close-craft'); 

const btnTrainStr = document.getElementById('btn-train-str');
const btnTrainDef = document.getElementById('btn-train-def');
const btnTrainHp = document.getElementById('btn-train-hp');
const btnCloseTraining = document.getElementById('btn-close-training');
const spCount = document.getElementById('sp-count');

const mobileControls = document.getElementById('mobile-controls');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnInventory = document.getElementById('btn-inventory'); 
const btnCloseInventory = document.getElementById('btn-close-inventory'); 

let currentState = 'STORY'; 
let dialogueLines = [];
let currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

// ==========================================
// --- НАСТРОЙКИ МИРА И КАМЕРЫ (НОВОЕ) ---
// ==========================================
const WORLD_WIDTH = 2400; // Ширина всего бесшовного мира
const HORIZON_Y = 180;
const DRAW_SCALE = 0.65; // УМЕНЬШАЕМ МАСШТАБ ДЛЯ КРАСОТЫ

const camera = { x: 0, y: 0 };
let currentMaxX = 800; // Граница мира, которая раздвигается по сюжету

function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    if (camera.x < 0) camera.x = 0;
    if (camera.x > WORLD_WIDTH - canvas.width) camera.x = WORLD_WIDTH - canvas.width;
}

function updateWorldBounds() {
    if (['kill_monsters', 'return', 'talk_merchant', 'gather_seeds', 'return_merchant'].includes(player.questStatus)) {
        currentMaxX = 1600; // Открыто Поле
    } else if (['talk_uncle_2', 'go_graveyard', 'kill_undead', 'return_graveyard', 'reach_level_2', 'talk_uncle_3', 'talk_orc', 'orc_test', 'return_orc', 'done'].includes(player.questStatus)) {
        currentMaxX = 2400; // Открыт Погост
    } else {
        currentMaxX = 800; // Только деревня
    }
}

// ==========================================
// --- ЗАГРУЗКА ---
// ==========================================
function loadFrames(prefix, count) {
    let frames = [];
    for (let i = 1; i <= count; i++) {
        let img = new Image(); img.src = `${prefix}_${i}.png`; frames.push(img);
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
    merchant_idle: loadFrames('img/frog_idle', 3), uncle_idle: loadFrames('img/dad_idle', 3), orc_idle: loadFrames('img/techer_idle', 3) 
};
const buildingSprites = { 
    shed: loadFrames('img/Home', 1), dummy: loadFrames('img/dummy_idle', 1) 
};

const enemySprites = {
    walk: loadFrames('img/hroshevik_walk', 4), preAttack: loadFrames('img/hroshevik_Pre-Attack', 3),
    attack: loadFrames('img/hroshevik_Attack', 3), hurt: loadFrames('img/hroshevik_Hurt', 3), death: loadFrames('img/hroshevik_Death', 5)
};

const undeadSprites = {
    walk: loadFrames('img/undead_walk', 4), preAttack: loadFrames('img/undead_Pre-Attack', 3),
    attack: loadFrames('img/undead_Attack', 3), hurt: loadFrames('img/undead_Hurt', 3), death: loadFrames('img/undead_Death', 5)
};

const bgImages = {
    villageSky: new Image(), villageGround: new Image(),
    fieldSky: new Image(), fieldGround: new Image(),
    graveSky: new Image(), graveGround: new Image()
};
bgImages.villageSky.src = 'img/BG_farm.png'; bgImages.villageGround.src = 'img/zemly_1.png'; 
bgImages.fieldSky.src = 'img/BG_farm.png'; bgImages.fieldGround.src = 'img/BG2_1.png'; 
bgImages.graveSky.src = 'img/BG3_1.png'; bgImages.graveGround.src = 'img/zemly_2.png'; 

let globalNpcTimer = 0; let globalNpcFrame = 0; const npcAnimSpeed = 12;

const animConfig = {
    w_frame: 96, h_frame: 96, 
    animations: {
        'idle_no_weapon':   { frames: tarnSprites.idle_no_weapon, speed: 12 }, 'idle_weapon':      { frames: tarnSprites.idle_weapon,    speed: 12 },
        'walk_no_weapon':   { frames: tarnSprites.walk_no_weapon, speed: 8 }, 'walk_weapon':      { frames: tarnSprites.walk_weapon,    speed: 8 }, 
        'attack1_no_weapon':{ frames: tarnSprites.attack1_no_weapon, speed: 6, onComplete: 'idle' }, 'attack1_weapon':   { frames: tarnSprites.attack1_weapon, speed: 6, onComplete: 'idle' },
        'attack2_no_weapon':{ frames: tarnSprites.attack2_no_weapon, speed: 5, onComplete: 'idle' }, 'attack2_weapon':   { frames: tarnSprites.attack2_weapon, speed: 5, onComplete: 'idle' },
        'roll':             { frames: tarnSprites.roll,           speed: 4, onComplete: 'idle' },
        
        'enemy_walk':       { frames: enemySprites.walk,      speed: 10 }, 'enemy_preAttack':  { frames: enemySprites.preAttack, speed: 12, onComplete: 'attack' }, 
        'enemy_attack':     { frames: enemySprites.attack,    speed: 5,  onComplete: 'walk' }, 'enemy_hurt':       { frames: enemySprites.hurt,      speed: 6,  onComplete: 'walk' },
        'enemy_death':      { frames: enemySprites.death,     speed: 8,  onComplete: 'dead' },

        'undead_walk':      { frames: undeadSprites.walk,      speed: 14 }, 'undead_preAttack': { frames: undeadSprites.preAttack, speed: 15, onComplete: 'attack' }, 
        'undead_attack':    { frames: undeadSprites.attack,    speed: 6,  onComplete: 'walk' }, 'undead_hurt':      { frames: undeadSprites.hurt,      speed: 6,  onComplete: 'walk' },
        'undead_death':     { frames: undeadSprites.death,     speed: 10, onComplete: 'dead' }
    }
};

// ==========================================
// --- ОБЪЕКТЫ МИРА ---
// ==========================================
const player = {
    x: 100, y: 300, width: 20, height: 45, speed: 2.5, // УМЕНЬШЕННЫЙ ИГРОК
    state: 'idle', facingRight: true, rollTimer: 0, rollDuration: 0, rollSpeedMult: 2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, baseDamage: 10, bonusDamage: 0, bonusDefense: 0, bonusHp: 0,
    level: 0, skillPoints: 0, coins: 0, seeds: 0, potions: 0, shell: 0, bones: 0,
    questStatus: 'get_weapon', orcUnlocked: false, dummyUnlocked: false, 
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,
    equipment: { head: null, chest: { name: 'Рубаха фермера', def: 0 }, hands: null, legs: { name: 'Штаны фермера', def: 0 }, feet: { name: 'Лапти', def: 0 }, weapon: null },
    defense: 0
};

let environment = []; let enemies = []; let lootItems = []; 

function initWorld() {
    // Спавним NPC по всему миру сразу
    environment = [
        { x: 500, y: 250, width: 140, height: 100, interactable: true, type: 'shed' }, // Сарай
        { x: 150, y: 280, width: 25, height: 45, interactable: true, type: 'uncle' },
        { x: 300, y: 240, width: 25, height: 40, interactable: true, type: 'merchant' }
    ];

    enemies = [
        createEnemy('hroshevik', 1000, 300, 'field'),
        createEnemy('hroshevik', 1200, 250, 'field'),
        createEnemy('hroshevik', 1400, 320, 'field'),
        createEnemy('undead', 1800, 280, 'graveyard'),
        createEnemy('undead', 2000, 350, 'graveyard'),
        createEnemy('undead', 2200, 260, 'graveyard')
    ];
}

function createEnemy(type, x, y, region) { 
    if (type === 'hroshevik') {
        return { 
            type: 'hroshevik', baseAnim: 'enemy', region: region, x: x, y: y, width: 22, height: 40, speed: 1.0, hp: 30, 
            state: 'chase', hurtTimer: 0, damage: 15, attackTimer: 0, currentAnim: 'enemy_walk', frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false, revives: 0 
        }; 
    } else if (type === 'undead') {
        return { 
            type: 'undead', baseAnim: 'undead', region: region, x: x, y: y, width: 26, height: 45, speed: 0.5, hp: 50, 
            state: 'chase', hurtTimer: 0, damage: 25, attackTimer: 0, currentAnim: 'undead_walk', frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false, revives: 1, reviveTimer: 0 
        }; 
    }
}

// Запуск игры
setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
initWorld();
updateHUD();


// ==========================================
// --- ТЕКСТЫ И ИНТЕРФЕЙС ---
// ==========================================
function updateObjectiveText() {
    updateWorldBounds(); // Динамически обновляем границы при смене квеста

    if (player.questStatus === 'get_weapon') objectiveText.innerText = "Цель: Забери топор у сарая (F)";
    else if (player.questStatus === 'kill_monsters') objectiveText.innerText = "Цель: Иди направо и зачисти Поле ->";
    else if (player.questStatus === 'return') objectiveText.innerText = "Цель: Вернись к дядюшке в деревню <-";
    else if (player.questStatus === 'talk_merchant') objectiveText.innerText = "Цель: Поговори с торговцем Снагом (F)";
    else if (player.questStatus === 'gather_seeds') objectiveText.innerText = `Цель: Собери семена на поле (${player.seeds}/10)`;
    else if (player.questStatus === 'return_merchant') objectiveText.innerText = "Цель: Отнеси семена Снагу (F)";
    else if (player.questStatus === 'talk_uncle_2') objectiveText.innerText = "Цель: Выслушай дядюшку (F)";
    else if (player.questStatus === 'go_graveyard' || player.questStatus === 'kill_undead') objectiveText.innerText = "Цель: Иди далеко на восток и упокой Погост ->";
    else if (player.questStatus === 'return_graveyard') objectiveText.innerText = "Цель: Возвращайся к дядюшке! <-";
    else if (player.questStatus === 'reach_level_2') objectiveText.innerText = `Цель: Набери 1500 Опыта (${player.xp}/1500)`;
    else if (player.questStatus === 'talk_uncle_3') objectiveText.innerText = "Цель: Поговори с дядюшкой об учителе (F)";
    else if (player.questStatus === 'talk_orc') objectiveText.innerText = "Цель: Поговори с Орком-ветераном (F)";
    else if (player.questStatus === 'orc_test') objectiveText.innerText = `Цель: Принеси кости с Погоста (${player.bones}/5)`;
    else if (player.questStatus === 'return_orc') objectiveText.innerText = "Цель: Отдай кости Орку (F)";
    else if (player.questStatus === 'done') objectiveText.innerText = `Свободная игра: Уровень ${player.level}/3`;
}

function updateInventoryUI() {
    document.getElementById('slot-head').innerHTML = `Шлем: <span>${player.equipment.head ? player.equipment.head.name : 'Нет'}</span>`;
    document.getElementById('slot-chest').innerHTML = `Грудь: <span style="color: ${player.equipment.chest.def > 0 ? '#4fc3f7' : '#fff'}">${player.equipment.chest ? player.equipment.chest.name + ' (+'+player.equipment.chest.def+')' : 'Нет'}</span>`;
    document.getElementById('slot-hands').innerHTML = `Перчатки: <span>${player.equipment.hands ? player.equipment.hands.name : 'Нет'}</span>`;
    document.getElementById('slot-legs').innerHTML = `Штаны: <span>${player.equipment.legs ? player.equipment.legs.name + ' (+'+player.equipment.legs.def+')' : 'Нет'}</span>`;
    document.getElementById('slot-feet').innerHTML = `Обувь: <span>${player.equipment.feet ? player.equipment.feet.name + ' (+'+player.equipment.feet.def+')' : 'Нет'}</span>`;
    let wpnText = player.equipment.weapon ? player.equipment.weapon.name + ' (+'+player.baseDamage+')' : 'Нет';
    document.getElementById('slot-weapon').innerHTML = `Оружие: <span style="color:#ffb300">${wpnText}</span>`;

    player.defense = (player.equipment.chest?.def || 0) + (player.equipment.legs?.def || 0) + (player.equipment.feet?.def || 0) + player.bonusDefense;
    let totalDmg = player.baseDamage + player.bonusDamage;
    
    document.getElementById('stat-hp').innerText = `${Math.floor(player.hp)}/${player.maxHp}`;
    document.getElementById('stat-def').innerHTML = `${player.defense} <span style="font-size:10px; color:#aaa;">(Броня: ${player.defense - player.bonusDefense} + Тело: ${player.bonusDefense})</span>`; 
    document.getElementById('stat-dmg').innerHTML = `${totalDmg} <span style="font-size:10px; color:#aaa;">(Оружие: ${player.baseDamage} + Сила: ${player.bonusDamage})</span>`;

    const bagGrid = document.getElementById('bag-grid'); bagGrid.innerHTML = ''; 
    let slotIndex = 0;
    
    function addStackedItem(iconHTML, title, count) {
        if (count <= 0 || slotIndex >= 12) return;
        let slot = document.createElement('div'); slot.className = 'bag-item';
        slot.style.position = 'relative'; slot.style.display = 'flex'; slot.style.justifyContent = 'center'; slot.style.alignItems = 'center'; 
        slot.title = title; slot.innerHTML = iconHTML;
        let countText = document.createElement('div'); countText.innerText = count; countText.style.position = 'absolute'; countText.style.bottom = '2px'; countText.style.right = '4px'; countText.style.fontSize = '10px'; countText.style.color = '#fff'; countText.style.textShadow = '1px 1px 0 #000'; countText.style.fontFamily = 'monospace';
        slot.appendChild(countText); bagGrid.appendChild(slot); slotIndex++;
    }

    addStackedItem('<div style="font-size: 24px; cursor: help;">🧪</div>', 'Зелье лечения', player.potions);
    addStackedItem('<div style="width:15px; height:15px; background:#4fc3f7; border: 1px solid #000;"></div>', 'Панцирь Хвощевика', player.shell);
    addStackedItem('<div style="width:15px; height:15px; background:#fff; border: 1px solid #000;"></div>', 'Старая кость', player.bones);

    for (; slotIndex < 12; slotIndex++) {
        let slot = document.createElement('div'); slot.className = 'bag-item'; bagGrid.appendChild(slot);
    }
}

function updateHUD() { 
    let hpPercent = Math.max(0, (player.hp / player.maxHp) * 100); hpBarFill.style.width = hpPercent + '%'; 
    xpText.innerText = `Опыт: ${player.xp} (Ур.${player.level})`; 
    inventoryText.innerText = `Монеты: ${player.coins} | Семена: ${player.seeds}`;
    updateObjectiveText();
}


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
                    if (Math.hypot(player.x - entity.x, player.y - entity.y) < 45 && player.state !== 'roll') {
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

// --- ДИАЛОГИ И МЕНЮ ---
function startDialogue(lines) { dialogueLines = lines; currentLine = 0; currentState = 'DIALOGUE'; hud.classList.add('hidden'); mobileControls.classList.add('hidden'); dialogueScreen.classList.remove('hidden'); updateDialogueUI(); }
function advanceDialogue() {
    if (currentState === 'STORY') {
        storyScreen.classList.add('hidden');
        startDialogue([
            { name: "Вейланд", text: "Тарн, мальчик мой. На дальнем поле опять неспокойно. Земля гниет, и из нее лезут Хвощевики." },
            { name: "Тарн", text: "Снова они? В прошлый раз я сломал о них любимые вилы." },
            { name: "Вейланд", text: "Возьми старый топор у сарая. Очисти поле на востоке, пока эта дрянь не добралась до амбаров." }
        ]);
    } else if (currentState === 'DIALOGUE') {
        currentLine++;
        if (currentLine >= dialogueLines.length) { currentState = 'PLAY'; dialogueScreen.classList.add('hidden'); hud.classList.remove('hidden'); checkMobile();
        } else updateDialogueUI();
    }
}
function updateDialogueUI() { speakerName.innerText = dialogueLines[currentLine].name; dialogueText.innerText = dialogueLines[currentLine].text; speakerName.style.color = dialogueLines[currentLine].name === "Тарн" ? "#a1887f" : (dialogueLines[currentLine].name.includes("Орк") || dialogueLines[currentLine].name === "Система" ? "#4caf50" : "#ffb300"); }

function toggleInventory() {
    if (currentState === 'PLAY') {
        // Запрет инвентаря если враг ближе 300 пикселей (чтобы не абузили в бою)
        let nearEnemy = enemies.find(e => e.state !== 'dead' && e.state !== 'resurrecting' && Math.hypot(player.x - e.x, player.y - e.y) < 300);
        if (nearEnemy) { alert("Вы не можете копаться в рюкзаке, когда враги близко!"); return; }
        currentState = 'INVENTORY'; keys.w = keys.a = keys.s = keys.d = false; mobileControls.classList.add('hidden'); inventoryScreen.classList.remove('hidden'); updateInventoryUI();
    } else if (currentState === 'INVENTORY') { currentState = 'PLAY'; inventoryScreen.classList.add('hidden'); checkMobile(); }
}

function openShop() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; shopScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); }
function closeShop() { currentState = 'PLAY'; shopScreen.classList.add('hidden'); checkMobile(); }
function openCraft() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; craftScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); }
function closeCraft() { currentState = 'PLAY'; craftScreen.classList.add('hidden'); checkMobile(); }
function openTraining() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; trainingScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); updateTrainingUI(); }
function closeTraining() { currentState = 'PLAY'; trainingScreen.classList.add('hidden'); checkMobile(); }

function updateTrainingUI() {
    spCount.innerText = player.skillPoints;
    [btnTrainStr, btnTrainDef, btnTrainHp].forEach(btn => {
        btn.disabled = player.skillPoints <= 0;
        btn.style.opacity = player.skillPoints <= 0 ? '0.5' : '1';
        btn.style.cursor = player.skillPoints <= 0 ? 'not-allowed' : 'pointer';
    });
}

btnTrainStr.addEventListener('click', () => { if(player.skillPoints > 0) { player.skillPoints--; player.bonusDamage += 5; updateTrainingUI(); updateHUD(); updateInventoryUI(); } });
btnTrainDef.addEventListener('click', () => { if(player.skillPoints > 0) { player.skillPoints--; player.bonusDefense += 2; updateTrainingUI(); updateHUD(); updateInventoryUI(); } });
btnTrainHp.addEventListener('click', () => { if(player.skillPoints > 0) { player.skillPoints--; player.maxHp += 20; player.hp += 20; updateTrainingUI(); updateHUD(); updateInventoryUI(); } });
btnCloseTraining.addEventListener('click', closeTraining);
btnPotion.addEventListener('click', () => { if (player.coins >= 2) { player.coins -= 2; player.potions++; updateHUD(); updateInventoryUI(); } else alert("Не хватает монет!"); });
btnCloseShop.addEventListener('click', closeShop);
btnCraftChest.addEventListener('click', () => { 
    if (player.shell >= 15 && player.coins >= 10) { 
        player.shell -= 15; player.coins -= 10; player.equipment.chest = { name: "Нагрудник из панциря", def: 5 };
        btnCraftChest.innerText = "ПРОДАНО"; btnCraftChest.disabled = true; updateHUD(); updateInventoryUI(); alert("Скрафчен Нагрудник из панциря (+5 Защиты)!"); 
    } else alert("Не хватает материалов (15 панцирей и 10 монет)!"); 
});
btnCloseCraft.addEventListener('click', closeCraft);
function usePotion() { if (player.potions > 0 && player.hp < player.maxHp) { player.potions--; player.hp = Math.min(player.maxHp, player.hp + 50); updateHUD(); updateInventoryUI(); } }

btnInventory.addEventListener('click', toggleInventory); btnCloseInventory.addEventListener('click', toggleInventory);

// ==========================================
// --- УПРАВЛЕНИЕ ---
// ==========================================
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

// --- ЛОГИКА ВЗАИМОДЕЙСТВИЯ (ОБНОВЛЕННАЯ ДИСТАНЦИЯ) ---
function checkInteraction() {
    for (let obj of environment) {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 50 && obj.interactable) {
            
            if (obj.type === 'shed' && player.questStatus === 'get_weapon') {
                player.hasWeapon = true; obj.interactable = false;
                player.equipment.weapon = { name: "Старый топор", dmg: 10 };
                player.questStatus = 'kill_monsters'; updateObjectiveText(); setAnimation('idle_weapon');
                return; 
            }
            else if (obj.type === 'uncle') {
                if (player.questStatus === 'get_weapon' || player.questStatus === 'kill_monsters') {
                    startDialogue([{ name: "Вейланд", text: "Очисти поле на востоке!" }]);
                } 
                else if (player.questStatus === 'return') { 
                    player.questStatus = 'talk_merchant'; player.xp += 100; updateHUD(); updateObjectiveText();
                    startDialogue([
                        { name: "Вейланд", text: "Хорошая работа, Тарн. (+100 ОПЫТА)" },
                        { name: "Вейланд", text: "Но твой топор совсем затупился. Ступай к Снагу, пусть подлатает." }
                    ]); 
                }
                else if (player.questStatus === 'talk_uncle_2') {
                    player.questStatus = 'go_graveyard'; updateObjectiveText();
                    startDialogue([
                        { name: "Вейланд", text: "Тарн! Хвощевики были только началом. Гниль ползет со старого Погоста еще дальше на востоке." },
                        { name: "Вейланд", text: "Ступай туда и упокой мертвецов! Твой новый топор как раз пригодится." }
                    ]);
                }
                else if (player.questStatus === 'return_graveyard') {
                    player.xp += 300; updateHUD(); 
                    if (player.xp >= 1500) {
                        player.questStatus = 'talk_orc'; player.orcUnlocked = true; environment.push({ x: 230, y: 280, width: 25, height: 40, interactable: true, type: 'orc' });
                        startDialogue([
                            { name: "Вейланд", text: "Ты выжил на Погосте! И стал гораздо сильнее. (+300 ОПЫТА)" },
                            { name: "Вейланд", text: "Я вижу в тебе большой потенциал, поэтому нашел для тебя учителя. Он стоит справа." },
                            { name: "Грум (Орк)", text: "Хррр... Пацан вроде крепкий. Подойди-ка ко мне." }
                        ]); 
                        return; 
                    } else {
                        player.questStatus = 'reach_level_2'; updateObjectiveText();
                        startDialogue([
                            { name: "Вейланд", text: "Ты выжил на Погосте! Отличная работа. (+300 ОПЫТА)" },
                            { name: "Вейланд", text: "Я нашел для тебя учителя — старого орка-ветерана. Но он слишком горд." },
                            { name: "Вейланд", text: "Он начнет тренировать тебя, только когда ты наберешь 1500 опыта. Фармись на поле или погосте!" }
                        ]); 
                    }
                } 
                else if (player.questStatus === 'reach_level_2') {
                    startDialogue([{ name: "Вейланд", text: "Тебе нужно больше опыта. Возвращайся на Погост или Поле." }]);
                }
                else if (player.questStatus === 'talk_uncle_3') {
                    player.questStatus = 'talk_orc'; player.orcUnlocked = true; environment.push({ x: 230, y: 280, width: 25, height: 40, interactable: true, type: 'orc' });
                    startDialogue([
                        { name: "Вейланд", text: "Ты достиг нужного уровня! Теперь орк готов с тобой поговорить." },
                        { name: "Вейланд", text: "Его зовут Грум. Он стоит справа от меня." }
                    ]);
                    return; 
                }
                else if (player.questStatus === 'done' || player.questStatus === 'talk_orc' || player.questStatus === 'orc_test' || player.questStatus === 'return_orc') {
                    openCraft();
                }
                else {
                    startDialogue([{ name: "Вейланд", text: "Будь осторожен, Тарн." }]);
                }
                return; 
            }
            
            else if (obj.type === 'orc') {
                if (player.questStatus === 'talk_orc') {
                    player.questStatus = 'orc_test'; updateObjectiveText();
                    startDialogue([
                        { name: "Грум (Орк)", text: "Слушай сюда, щенок. Битва — это не просто махание железкой." },
                        { name: "Грум (Орк)", text: "Сила делает удары смертельными. Защита спасает шкуру. Здоровье позволяет пережить ошибку." },
                        { name: "Грум (Орк)", text: "Иди на Погост и принеси мне 5 костей мертвецов. Я сделаю из них тренировочный манекен." }
                    ]);
                }
                else if (player.questStatus === 'orc_test') {
                    startDialogue([{ name: "Грум (Орк)", text: `Хррр... Принеси 5 костей! У тебя пока ${player.bones}.` }]);
                }
                else if (player.questStatus === 'return_orc') {
                    player.bones -= 5; player.questStatus = 'done'; player.dummyUnlocked = true; 
                    environment.push({ x: 270, y: 280, width: 20, height: 35, interactable: true, type: 'dummy' });
                    updateHUD(); updateInventoryUI(); updateObjectiveText();
                    startDialogue([
                        { name: "Грум (Орк)", text: "А ты не трус, фермер. Ладно, начнем тренировки." },
                        { name: "Грум (Орк)", text: "Я поставил манекен. Как только накопишь опыта — бей его изо всех сил!" }
                    ]);
                    return; 
                }
                else if (player.questStatus === 'done') {
                    startDialogue([{ name: "Грум (Орк)", text: "Чего уставился? Бей манекен, когда будешь готов! Хррр!" }]);
                }
                return; 
            }
            
            else if (obj.type === 'dummy') {
                const thresholds = [1500, 5000, 10000];
                if (player.level >= 3 && player.skillPoints === 0) {
                    startDialogue([{ name: "Тарн", text: "Я выжал из этого манекена всё, что мог. Я достиг предела своих сил... пока что." }]);
                } 
                else if (player.level < 3 && player.xp >= thresholds[player.level]) {
                    player.level++; player.skillPoints++; 
                    updateHUD(); updateInventoryUI(); updateObjectiveText();
                    startDialogue([
                        { name: "Система", text: `УРОВЕНЬ ПОВЫШЕН! (Уровень ${player.level}/3)\nВы получили 1 Очко Навыков.` },
                        { name: "Грум (Орк)", text: "Неплохо! Подойди к манекену еще раз, чтобы распределить силы." }
                    ]);
                } 
                else if (player.skillPoints > 0 || player.level > 0) {
                    openTraining();
                }
                else {
                    let neededXp = thresholds[player.level];
                    startDialogue([
                        { name: "Тарн", text: `Мне еще рано тренироваться. Нужно набраться опыта в бою.` },
                        { name: "Грум (Орк)", text: `Хррр... Рано машешь! Возвращайся, когда накопишь ${neededXp} опыта.` }
                    ]);
                }
                return; 
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
                } 
                else if (player.questStatus === 'return_merchant') {
                    player.seeds -= 10; player.baseDamage += 2;
                    if (player.equipment.weapon) player.equipment.weapon.name = "Наточенный топор";
                    player.questStatus = 'talk_uncle_2'; updateHUD(); updateInventoryUI(); updateObjectiveText();
                    startDialogue([
                        { name: "Снаг", text: "Отлично! Держи свой топор. Теперь он рубит как надо! (+2 УРОНА)" },
                        { name: "Снаг", text: "Ква... Мой магазин теперь открыт. Кстати, твой дядюшка только что звал тебя." }
                    ]);
                } 
                else if (['talk_uncle_2', 'go_graveyard', 'kill_undead', 'return_graveyard', 'reach_level_2', 'talk_uncle_3', 'talk_orc', 'orc_test', 'return_orc', 'done'].includes(player.questStatus)) {
                    openShop();
                } else {
                    startDialogue([{ name: "Снаг", text: "Ква-а-а... Я пока занят, фермер. Поговори с дядюшкой." }]);
                }
                return; 
            }
        }
    }
}

function checkQuestProgress() { 
    if (player.questStatus === 'kill_monsters' && player.x >= 800 && player.x < 1600) { 
        if (enemies.filter(e => e.region === 'field').every(e => e.state === 'dead')) { player.questStatus = 'return'; updateObjectiveText(); } 
    }
    if (player.questStatus === 'kill_undead' && player.x >= 1600) {
        if (enemies.filter(e => e.region === 'graveyard').every(e => e.state === 'dead')) { player.questStatus = 'return_graveyard'; updateObjectiveText(); } 
    }
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
        
        // ОГРАНИЧЕНИЯ ПЕРЕМЕЩЕНИЯ (БЕСШОВНЫЙ МИР)
        const horizon = 200; if (player.y < horizon) player.y = horizon; if (player.y > canvas.height) player.y = canvas.height;
        if (player.x < 10) player.x = 10;
        if (player.x > currentMaxX) player.x = currentMaxX; 
    }

    updateCamera(); // СЛЕДЯЩАЯ КАМЕРА

    for (let i = lootItems.length - 1; i >= 0; i--) { 
        let item = lootItems[i]; 
        if (Math.hypot(player.x - item.x, player.y - item.y) < 30) { 
            if (item.type === 'coin') player.coins++; 
            else if (item.type === 'seed') {
                player.seeds++; 
                if (player.questStatus === 'gather_seeds' && player.seeds >= 10) { player.questStatus = 'return_merchant'; updateObjectiveText(); }
            }
            else if (item.type === 'shell') player.shell++;
            else if (item.type === 'bone') {
                player.bones++;
                if (player.questStatus === 'orc_test' && player.bones >= 5) { player.questStatus = 'return_orc'; updateObjectiveText(); }
            }
            lootItems.splice(i, 1); updateHUD(); 
        } 
    }
    
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = player.state === 'attackLight' ? 35 : 50; // МАСШТАБ УРОНА
        
        let totalDmg = player.baseDamage + player.bonusDamage;
        let attackDamage = totalDmg * (player.state === 'attackLight' ? 1 : 2);
        
        enemies.forEach(enemy => {
            if (enemy.state === 'dead' || enemy.state === 'resurrecting') return;
            let inRangeX = player.facingRight ? (enemy.x > player.x && enemy.x - player.x < reach) : (enemy.x < player.x && player.x - enemy.x < reach);
            let inRangeY = Math.abs(player.y - enemy.y) < 30;
            
            if (inRangeX && inRangeY) {
                enemy.hp -= attackDamage; 
                
                // СОЧНОСТЬ: ОТБРАСЫВАНИЕ (Knockback) ПРИ ТЯЖЕЛОЙ АТАКЕ
                if (player.state === 'attackHeavy') { enemy.x += player.facingRight ? 15 : -15; }

                if (enemy.hp <= 0) { 
                    if (enemy.revives > 0) {
                        enemy.state = 'resurrecting'; enemy.revives--; enemy.reviveTimer = 150; enemy.isLockAnim = false; 
                        setEntityAnimation(enemy, enemy.baseAnim + '_death'); enemy.isLockAnim = true;
                    } else {
                        enemy.state = 'dead'; player.xp += (enemy.type === 'undead' ? 40 : 20); 
                        if (player.questStatus === 'reach_level_2' && player.xp >= 1500) { player.questStatus = 'talk_uncle_3'; updateObjectiveText(); }
                        
                        let rand = Math.random(); let dropType = null;
                        if (rand < 0.4) dropType = 'coin'; else if (rand < 0.7) dropType = 'seed'; else if (rand < 1.0) { dropType = enemy.type === 'hroshevik' ? 'shell' : 'bone'; }
                        if(dropType) lootItems.push({ x: enemy.x, y: enemy.y, type: dropType }); 
                        
                        updateHUD(); checkQuestProgress(); enemy.isLockAnim = false; 
                        setEntityAnimation(enemy, enemy.baseAnim + '_death'); enemy.isLockAnim = true;
                    }
                } else {
                    enemy.state = 'hurt'; enemy.hurtTimer = 15; enemy.x += player.facingRight ? 10 : -10;
                    enemy.isLockAnim = false; setEntityAnimation(enemy, enemy.baseAnim + '_hurt'); enemy.isLockAnim = true;
                }
            }
        });
    }

    enemies.forEach(enemy => {
        if (enemy.state === 'dead') { updateEnemyAnimation(enemy); return; }
        if (enemy.state === 'resurrecting') {
            updateEnemyAnimation(enemy); enemy.reviveTimer--;
            if (enemy.reviveTimer <= 0) { enemy.hp = 25; enemy.state = 'chase'; enemy.isLockAnim = false; setEntityAnimation(enemy, enemy.baseAnim + '_walk'); }
            return; 
        }

        updateEnemyAnimation(enemy); enemy.facingRight = player.x > enemy.x; 
        if (enemy.attackTimer > 0) enemy.attackTimer--;
        
        if (enemy.state === 'chase' && !enemy.isLockAnim) {
            let dx = player.x - enemy.x; let dy = player.y - enemy.y; let dist = Math.hypot(dx, dy);
            
            // Если враг слишком далеко от камеры, он спит (ОПТИМИЗАЦИЯ)
            if (enemy.x < camera.x - 200 || enemy.x > camera.x + canvas.width + 200) return;

            if (dist > 40) { 
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
    ctx.font = 'bold 16px "Russo One", Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    ctx.fillText(markStr, x, y + floatOffset); ctx.restore();
}

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, 0); // МАГИЯ СКРОЛЛИНГА!

    // ОТРИСОВКА ФОНОВ (Рендерим кусками по 800px)
    if (bgImages.villageSky.complete && bgImages.villageGround.complete) {
        ctx.drawImage(bgImages.villageSky, 0, 0, 800, 180);
        ctx.drawImage(bgImages.villageGround, 0, 180, 800, canvas.height - 180);
    }
    if (bgImages.fieldSky.complete && bgImages.fieldGround.complete) {
        ctx.drawImage(bgImages.fieldSky, 800, 0, 800, 180);
        ctx.drawImage(bgImages.fieldGround, 800, 180, 800, canvas.height - 180);
    }
    if (bgImages.graveSky.complete && bgImages.graveGround.complete) {
        ctx.drawImage(bgImages.graveSky, 1600, 0, 800, 180);
        ctx.drawImage(bgImages.graveGround, 1600, 180, 800, canvas.height - 180);
    }

    if (currentState === 'PLAY' || currentState === 'GAMEOVER' || currentState === 'SHOP' || currentState === 'INVENTORY') {
        
        lootItems.forEach(item => { 
            ctx.beginPath(); 
            if (item.type === 'coin') { ctx.fillStyle = '#ffca28'; ctx.arc(item.x, item.y, 4, 0, Math.PI * 2); ctx.fill(); }
            else if (item.type === 'seed') { ctx.fillStyle = '#69f0ae'; ctx.arc(item.x, item.y, 4, 0, Math.PI * 2); ctx.fill(); }
            else if (item.type === 'shell') { ctx.fillStyle = '#4fc3f7'; ctx.rect(item.x-4, item.y-4, 8, 8); ctx.fill(); }
            else if (item.type === 'bone') { ctx.fillStyle = '#fff'; ctx.rect(item.x-4, item.y-4, 8, 8); ctx.fill(); }
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); 
        });

        let renderQueue = [player, ...environment, ...enemies];
        renderQueue.sort((a, b) => a.y - b.y);

        for (let obj of renderQueue) {
            // ОПТИМИЗАЦИЯ: Не рисуем то, что за экраном
            if (obj.x < camera.x - 100 || obj.x > camera.x + canvas.width + 100) continue;

            if (obj === player) drawPlayer();
            else if (enemies.includes(obj)) drawEnemy(obj);
            else {
                if (obj.type === 'shed') {
                    const frames = buildingSprites.shed;
                    if (frames && frames.length > 0 && frames[0] && frames[0].complete && frames[0].naturalWidth > 0) { 
                        ctx.drawImage(frames[0], obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height);
                    } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    if (player.questStatus === 'get_weapon') { drawQuestMark(obj.x, obj.y - obj.height - 10, '!'); }
                }
                else if (obj.type === 'merchant') {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
                    const frames = npcSprites.merchant_idle;
                    let currentImg = frames && frames.length > 0 ? frames[globalNpcFrame % frames.length] : null;
                    if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
                        ctx.save(); ctx.translate(obj.x, obj.y); const w = animConfig.w_frame * DRAW_SCALE; const h = animConfig.h_frame * DRAW_SCALE;
                        ctx.drawImage(currentImg, -w/2, -h + 10, w, h); ctx.restore();
                    } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    if (player.questStatus === 'talk_merchant' || player.questStatus === 'return_merchant') { drawQuestMark(obj.x, obj.y - obj.height - 10, '!'); }
                    else if (player.questStatus === 'gather_seeds') { drawQuestMark(obj.x, obj.y - obj.height - 10, '?', '#ccc'); } 
                } 
                else if (obj.type === 'uncle') {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
                    const frames = npcSprites.uncle_idle;
                    let currentImg = frames && frames.length > 0 ? frames[globalNpcFrame % frames.length] : null;
                    if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
                        ctx.save(); ctx.translate(obj.x, obj.y); const w = animConfig.w_frame * DRAW_SCALE; const h = animConfig.h_frame * DRAW_SCALE;
                        ctx.drawImage(currentImg, -w/2, -h + 10, w, h); ctx.restore();
                    } else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    if (['return', 'return_graveyard', 'talk_uncle_2', 'talk_uncle_3'].includes(player.questStatus)) { drawQuestMark(obj.x, obj.y - obj.height - 10, '!'); }
                    else if (['done', 'talk_orc', 'orc_test', 'return_orc'].includes(player.questStatus)) { drawQuestMark(obj.x, obj.y - obj.height - 10, '⚒', '#4fc3f7'); } 
                }
                else if (obj.type === 'orc') {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
                    const frames = npcSprites.orc_idle;
                    let currentImg = frames && frames.length > 0 ? frames[globalNpcFrame % frames.length] : null;
                    if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
                        ctx.save(); ctx.translate(obj.x, obj.y); const w = animConfig.w_frame * DRAW_SCALE; const h = animConfig.h_frame * DRAW_SCALE;
                        ctx.drawImage(currentImg, -w/2, -h + 10, w, h); ctx.restore();
                    } else { ctx.fillStyle = '#4caf50'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    if (['talk_orc', 'return_orc'].includes(player.questStatus)) { drawQuestMark(obj.x, obj.y - obj.height - 10, '!'); }
                    else if (player.questStatus === 'orc_test') { drawQuestMark(obj.x, obj.y - obj.height - 10, '?', '#ccc'); } 
                }
                else if (obj.type === 'dummy') {
                    const frames = buildingSprites.dummy;
                    if (frames && frames.length > 0 && frames[0] && frames[0].complete && frames[0].naturalWidth > 0) {
                        ctx.drawImage(frames[0], obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height);
                    } else { ctx.fillStyle = '#8d6e63'; ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height); }
                    const thresholds = [1500, 5000, 10000];
                    if (player.level < 3 && player.xp >= thresholds[player.level]) { drawQuestMark(obj.x, obj.y - obj.height - 10, '⬆', '#69f0ae'); 
                    } else if (player.skillPoints > 0) { drawQuestMark(obj.x, obj.y - obj.height - 10, '⬆', '#69f0ae'); }
                }
            }
        }
    }
    ctx.restore(); // Сброс смещения камеры перед отрисовкой интерфейса поверх экрана
}

function drawPlayer() {
    if (player.state === 'dead') { ctx.fillStyle = '#4a0000'; ctx.fillRect(player.x - player.width/2, player.y - 5, player.width, 10); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(player.x, player.y, player.width / 1.2, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (player.hurtTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
    const anim = animConfig.animations[player.currentAnim]; const currentFrameImg = anim.frames[player.frameIndex];
    if (!currentFrameImg || !currentFrameImg.complete || currentFrameImg.naturalWidth === 0) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(player.x - player.width/2, player.y - player.height, player.width, player.height); return; }
    ctx.save(); ctx.translate(player.x, player.y); if (!player.facingRight) ctx.scale(-1, 1);
    
    // МАСШТАБИРОВАННАЯ ОТРИСОВКА ПЕРСОНАЖА
    const w = animConfig.w_frame * DRAW_SCALE; const h = animConfig.h_frame * DRAW_SCALE;
    ctx.drawImage(currentFrameImg, -w / 2, -h + 10, w, h); ctx.restore();
}

function drawEnemy(enemy) {
    if (enemy.state !== 'dead' && enemy.state !== 'resurrecting') { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y, enemy.width/1.5, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    const anim = animConfig.animations[enemy.currentAnim];
    if (!anim || !anim.frames[enemy.frameIndex] || !anim.frames[enemy.frameIndex].complete || anim.frames[enemy.frameIndex].naturalWidth === 0) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height, enemy.width, enemy.height); return; }
    ctx.save(); ctx.translate(enemy.x, enemy.y); if (!enemy.facingRight) ctx.scale(-1, 1);
    
    const w = animConfig.w_frame * DRAW_SCALE; const h = animConfig.h_frame * DRAW_SCALE;
    ctx.drawImage(anim.frames[enemy.frameIndex], -w / 2, -h + 10, w, h); ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

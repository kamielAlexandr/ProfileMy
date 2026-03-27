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
const btnInventory = document.getElementById('btn-inventory'); 
const btnCloseInventory = document.getElementById('btn-close-inventory'); 

let currentState = 'STORY'; 
let dialogueLines = [];
let currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

// --- НАСТРОЙКИ БЕСШОВНОГО МИРА ---
const WORLD_W = 2400; 
const WORLD_H = 1500; 
const SCALE = 0.6; // Уменьшенный масштаб для персонажей
let camera = { x: 0, y: 0 };

function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    if (camera.x < 0) camera.x = 0; if (camera.y < 0) camera.y = 0;
    if (camera.x > WORLD_W - canvas.width) camera.x = WORLD_W - canvas.width;
    if (camera.y > WORLD_H - canvas.height) camera.y = WORLD_H - canvas.height;
}

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

let globalNpcTimer = 0; let globalNpcFrame = 0; const npcAnimSpeed = 12;

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
    x: 400, y: 750, width: 25, height: 40, speed: 4.5, color: '#8D6E63',
    state: 'idle', facingRight: true, rollTimer: 0, rollSpeedMult: 2.2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, baseDamage: 10, bonusDamage: 0, bonusDefense: 0, bonusHp: 0,
    level: 0, skillPoints: 0, coins: 0, seeds: 0, potions: 0, shell: 0, bones: 0,
    questStatus: 'get_weapon', orcUnlocked: false, dummyUnlocked: false, 
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,
    equipment: { head: null, chest: { name: 'Рубаха фермера', def: 0 }, hands: null, legs: { name: 'Штаны фермера', def: 0 }, feet: { name: 'Лапти', def: 0 }, weapon: null }, defense: 0
};

let environment = []; let enemies = []; let lootItems = []; 

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
        enemies.push(createEnemy('hroshevik', 1000, 600, 'field'), createEnemy('hroshevik', 1200, 800, 'field'));
        enemies.push(createEnemy('hroshevik', 1100, 500, 'field'), createEnemy('hroshevik', 1300, 900, 'field'));
    }
    if (['go_graveyard', 'kill_undead'].includes(player.questStatus)) {
        player.questStatus = 'kill_undead';
        enemies.push(createEnemy('undead', 1800, 500, 'graveyard'), createEnemy('undead', 2000, 800, 'graveyard'));
        enemies.push(createEnemy('undead', 2100, 600, 'graveyard'), createEnemy('undead', 1900, 750, 'graveyard'));
    }
    updateObjectiveText();
}

function createEnemy(type, x, y, region) { 
    if (type === 'hroshevik') {
        return { type: 'hroshevik', baseAnim: 'enemy', region: region, x: x, y: y, width: 20, height: 40, speed: 1.2, hp: 30, state: 'chase', aggroRange: 300, hurtTimer: 0, damage: 15, attackTimer: 0, currentAnim: 'enemy_walk', frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false, revives: 0 }; 
    } else if (type === 'undead') {
        return { type: 'undead', baseAnim: 'undead', region: region, x: x, y: y, width: 25, height: 45, speed: 0.7, hp: 50, state: 'chase', aggroRange: 350, hurtTimer: 0, damage: 25, attackTimer: 0, currentAnim: 'undead_walk', frameIndex: 0, animTimer: 0, isLockAnim: false, facingRight: false, revives: 1, reviveTimer: 0 }; 
    }
}

setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
buildWorld();
updateHUD();

function updateObjectiveText() {
    if (player.questStatus === 'get_weapon') objectiveText.innerText = "Цель: Забери топор у сарая (F)";
    else if (player.questStatus === 'kill_monsters') objectiveText.innerText = "Цель: Иди на восток и зачисти Поле ->";
    else if (player.questStatus === 'return') objectiveText.innerText = "Цель: Вернись к дядюшке в деревню <-";
    else if (player.questStatus === 'talk_merchant') objectiveText.innerText = "Цель: Поговори с торговцем Снагом (F)";
    else if (player.questStatus === 'gather_seeds') objectiveText.innerText = `Цель: Собери семена (${player.seeds}/10)`;
    else if (player.questStatus === 'return_merchant') objectiveText.innerText = "Цель: Отнеси семена Снагу (F)";
    else if (player.questStatus === 'talk_uncle_2') objectiveText.innerText = "Цель: Выслушай дядюшку (F)";
    else if (player.questStatus === 'go_graveyard' || player.questStatus === 'kill_undead') objectiveText.innerText = "Цель: Иди далеко на восток на Погост ->";
    else if (player.questStatus === 'return_graveyard') objectiveText.innerText = "Цель: Возвращайся к дядюшке! <-";
    else if (player.questStatus === 'reach_level_2') objectiveText.innerText = `Цель: Набери 1500 Опыта (${player.xp}/1500)`;
    else if (player.questStatus === 'talk_uncle_3') objectiveText.innerText = "Цель: Поговори с дядюшкой об учителе (F)";
    else if (player.questStatus === 'talk_orc') objectiveText.innerText = "Цель: Поговори с Орком-ветераном (F)";
    else if (player.questStatus === 'orc_test') objectiveText.innerText = `Цель: Принеси кости с Погоста (${player.bones}/5)`;
    else if (player.questStatus === 'return_orc') objectiveText.innerText = "Цель: Отдай кости Орку (F)";
    else if (player.questStatus === 'done') objectiveText.innerText = `Свободная игра: Уровень ${player.level}/3`;
}

function updateHUD() { 
    let hpPercent = Math.max(0, (player.hp / player.maxHp) * 100); hpBarFill.style.width = hpPercent + '%'; 
    xpText.innerText = `Опыт: ${player.xp} (Ур.${player.level})`; 
    inventoryText.innerText = `Монеты: ${player.coins} | Семена: ${player.seeds}`;
    updateObjectiveText();
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

    const bagGrid = document.getElementById('bag-grid'); bagGrid.innerHTML = ''; let slotIndex = 0;
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
    for (; slotIndex < 12; slotIndex++) { let slot = document.createElement('div'); slot.className = 'bag-item'; bagGrid.appendChild(slot); }
}

function toggleInventory() {
    if (currentState === 'PLAY') {
        let nearEnemy = enemies.find(e => e.state !== 'dead' && e.state !== 'resurrecting' && Math.hypot(player.x - e.x, player.y - e.y) < 300);
        if (nearEnemy) { alert("Вы не можете копаться в рюкзаке во время боя!"); return; }
        currentState = 'INVENTORY'; keys.w = keys.a = keys.s = keys.d = false; mobileControls.classList.add('hidden'); inventoryScreen.classList.remove('hidden'); updateInventoryUI();
    } else if (currentState === 'INVENTORY') { currentState = 'PLAY'; inventoryScreen.classList.add('hidden'); checkMobile(); }
}

btnInventory.addEventListener('click', toggleInventory); btnCloseInventory.addEventListener('click', toggleInventory);

// --- СИСТЕМА АНИМАЦИЙ ---
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
                    if (Math.hypot(player.x - entity.x, player.y - entity.y) < 65 * SCALE && player.state !== 'roll') {
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
            { name: "Вейланд", text: "Возьми старый топор у сарая (на востоке деревни). Очисти поле, пока эта дрянь не добралась до нас." }
        ]);
    } else if (currentState === 'DIALOGUE') {
        currentLine++;
        if (currentLine >= dialogueLines.length) { currentState = 'PLAY'; dialogueScreen.classList.add('hidden'); hud.classList.remove('hidden'); checkMobile();
        } else updateDialogueUI();
    }
}
function updateDialogueUI() { speakerName.innerText = dialogueLines[currentLine].name; dialogueText.innerText = dialogueLines[currentLine].text; speakerName.style.color = dialogueLines[currentLine].name === "Тарн" ? "#a1887f" : (dialogueLines[currentLine].name.includes("Орк") || dialogueLines[currentLine].name === "Система" ? "#4caf50" : "#ffb300"); }
function openShop() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; shopScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); }
function closeShop() { currentState = 'PLAY'; shopScreen.classList.add('hidden'); checkMobile(); }
function openCraft() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; craftScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); }
function closeCraft() { currentState = 'PLAY'; craftScreen.classList.add('hidden'); checkMobile(); }
function openTraining() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; trainingScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); updateTrainingUI(); }
function closeTraining() { currentState = 'PLAY'; trainingScreen.classList.add('hidden'); checkMobile(); }

function updateTrainingUI() {
    spCount.innerText = player.skillPoints;
    [btnTrainStr, btnTrainDef, btnTrainHp].forEach(btn => { btn.disabled = player.skillPoints <= 0; btn.style.opacity = player.skillPoints <= 0 ? '0.5' : '1'; btn.style.cursor = player.skillPoints <= 0 ? 'not-allowed' : 'pointer'; });
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
    } else alert("Не хватает материалов (нужно 15 панцирей и 10 монет)!"); 
});
btnCloseCraft.addEventListener('click', closeCraft);
function usePotion() { if (player.potions > 0 && player.hp < player.maxHp) { player.potions--; player.hp = Math.min(player.maxHp, player.hp + 50); updateHUD(); updateInventoryUI(); } }

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

// --- ЛОГИКА ВЗАИМОДЕЙСТВИЯ (ОБНОВЛЕННАЯ) ---
function checkInteraction() {
    for (let obj of environment) {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 80 && obj.interactable) {
            
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
                    startDialogue([{ name: "Вейланд", text: "Хорошая работа, Тарн. (+100 ОПЫТА)" }, { name: "Вейланд", text: "Но твой топор совсем затупился. Ступай к Снагу, пусть подлатает." }]); 
                }
                else if (player.questStatus === 'talk_uncle_2') {
                    player.questStatus = 'go_graveyard'; updateObjectiveText(); buildWorld();
                    startDialogue([{ name: "Вейланд", text: "Тарн! Гниль ползет со старого Погоста еще дальше на востоке. Упокой мертвецов!" }]);
                }
                else if (player.questStatus === 'return_graveyard') {
                    player.xp += 300; updateHUD(); 
                    if (player.xp >= 1500) {
                        player.questStatus = 'talk_orc'; player.orcUnlocked = true; buildWorld();
                        startDialogue([{ name: "Вейланд", text: "Ты выжил! (+300 ОПЫТА). Я нашел для тебя учителя. Он стоит справа." }]); return; 
                    } else {
                        player.questStatus = 'reach_level_2'; updateObjectiveText();
                        startDialogue([{ name: "Вейланд", text: "Ты выжил! (+300 ОПЫТА). Тебе нужно 1500 опыта, чтобы учитель заговорил с тобой. Фармись!" }]); 
                    }
                } 
                else if (player.questStatus === 'reach_level_2') { startDialogue([{ name: "Вейланд", text: "Тебе нужно больше опыта. Фармись на Поле или Погосте." }]); }
                else if (player.questStatus === 'talk_uncle_3') {
                    player.questStatus = 'talk_orc'; player.orcUnlocked = true; buildWorld();
                    startDialogue([{ name: "Вейланд", text: "Уровень достигнут! Орк справа готов говорить." }]); return; 
                }
                else if (['done', 'talk_orc', 'orc_test', 'return_orc'].includes(player.questStatus)) { openCraft(); }
                else { startDialogue([{ name: "Вейланд", text: "Будь осторожен, Тарн." }]); }
                return; 
            }
            
            else if (obj.type === 'orc') {
                if (player.questStatus === 'talk_orc') {
                    player.questStatus = 'orc_test'; updateObjectiveText();
                    startDialogue([{ name: "Грум (Орк)", text: "Хочешь, чтобы я научил тебя бить? Иди на Погост и принеси мне 5 костей." }]);
                }
                else if (player.questStatus === 'orc_test') { startDialogue([{ name: "Грум (Орк)", text: `Принеси 5 костей! У тебя пока ${player.bones}.` }]); }
                else if (player.questStatus === 'return_orc') {
                    player.bones -= 5; player.questStatus = 'done'; player.dummyUnlocked = true; buildWorld();
                    updateHUD(); updateInventoryUI(); updateObjectiveText();
                    startDialogue([{ name: "Грум (Орк)", text: "Отлично. Я поставил манекен. Копи опыт и бей его, чтобы качаться!" }]); return; 
                }
                else if (player.questStatus === 'done') { startDialogue([{ name: "Грум (Орк)", text: "Чего уставился? Бей манекен!" }]); }
                return; 
            }
            
            else if (obj.type === 'dummy') {
                const thresholds = [1500, 5000, 10000];
                if (player.level >= 3 && player.skillPoints === 0) { startDialogue([{ name: "Тарн", text: "Я выжал из этого манекена всё, что мог." }]); } 
                else if (player.level < 3 && player.xp >= thresholds[player.level]) {
                    player.level++; player.skillPoints++; updateHUD(); updateInventoryUI(); updateObjectiveText();
                    startDialogue([{ name: "Система", text: `УРОВЕНЬ ПОВЫШЕН!\nВы получили 1 Очко Навыков.` }]);
                } 
                else if (player.skillPoints > 0 || player.level > 0) { openTraining(); }
                else { startDialogue([{ name: "Тарн", text: `Мне еще рано. Нужно накопить ${thresholds[player.level]} опыта.` }]); }
                return; 
            }

            else if (obj.type === 'merchant') {
                if (player.questStatus === 'talk_merchant') {
                    player.questStatus = player.seeds >= 10 ? 'return_merchant' : 'gather_seeds'; updateObjectiveText();
                    startDialogue([{ name: "Снаг", text: "Я наточу твой топор, но принеси 10 семян гнили с поля!" }]);
                } else if (player.questStatus === 'gather_seeds') { startDialogue([{ name: "Снаг", text: `Ква... Нужно 10 семян. У тебя ${player.seeds}.` }]); } 
                else if (player.questStatus === 'return_merchant') {
                    player.seeds -= 10; player.baseDamage += 2;
                    if (player.equipment.weapon) player.equipment.weapon.name = "Наточенный топор";
                    player.questStatus = 'talk_uncle_2'; updateHUD(); updateInventoryUI(); updateObjectiveText();
                    startDialogue([{ name: "Снаг", text: "Держи свой топор. Мой магазин теперь открыт. Твой дядюшка звал тебя." }]);
                } 
                else if (['talk_uncle_2', 'go_graveyard', 'kill_undead', 'return_graveyard', 'reach_level_2', 'talk_uncle_3', 'talk_orc', 'orc_test', 'return_orc', 'done'].includes(player.questStatus)) {
                    openShop();
                } else { startDialogue([{ name: "Снаг", text: "Поговори с дядюшкой." }]); }
                return; 
            }
        }
    }
}

// --- БЕСШОВНЫЙ ЦИКЛ ОБНОВЛЕНИЯ ---
function checkQuestProgress() { 
    if (player.questStatus === 'kill_monsters') { 
        let fieldEnemies = enemies.filter(e => e.type === 'hroshevik');
        if (fieldEnemies.length > 0 && fieldEnemies.every(e => e.state === 'dead')) { player.questStatus = 'return'; updateObjectiveText(); } 
    }
    if (player.questStatus === 'kill_undead') {
        let graveEnemies = enemies.filter(e => e.type === 'undead');
        if (graveEnemies.length > 0 && graveEnemies.every(e => e.state === 'dead')) { player.questStatus = 'return_graveyard'; updateObjectiveText(); } 
    }
}

function update() {
    if (currentState !== 'PLAY') return;
    if (player.hurtTimer > 0) player.hurtTimer--;

    updateAnimation();
    globalNpcTimer++; if (globalNpcTimer >= npcAnimSpeed) { globalNpcTimer = 0; globalNpcFrame++; }

    let currentSpeed = player.speed;

    if (player.state === 'roll') { 
        currentSpeed *= player.rollSpeedMult; player.rollTimer--; 
        if (player.rollTimer <= 0) { player.state = 'idle'; player.isLockAnim = false; }
    } 
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
        
        // Свобода по всем направлениям внутри границ мира!
        player.x = Math.max(20, Math.min(player.x, WORLD_W - 20));
        player.y = Math.max(20, Math.min(player.y, WORLD_H - 20));
    }

    updateCamera(); 

    for (let i = lootItems.length - 1; i >= 0; i--) { 
        let item = lootItems[i]; 
        if (Math.hypot(player.x - item.x, player.y - item.y) < 30) { 
            if (item.type === 'coin') player.coins++; 
            else if (item.type === 'seed') { player.seeds++; if (player.questStatus === 'gather_seeds' && player.seeds >= 10) { player.questStatus = 'return_merchant'; updateObjectiveText(); } }
            else if (item.type === 'shell') player.shell++;
            else if (item.type === 'bone') { player.bones++; if (player.questStatus === 'orc_test' && player.bones >= 5) { player.questStatus = 'return_orc'; updateObjectiveText(); } }
            lootItems.splice(i, 1); updateHUD(); 
        } 
    }
    
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = (player.state === 'attackLight' ? 45 : 60) * SCALE;
        let totalDmg = player.baseDamage + player.bonusDamage;
        let attackDamage = totalDmg * (player.state === 'attackLight' ? 1 : 2);
        
        enemies.forEach(enemy => {
            if (enemy.state === 'dead' || enemy.state === 'resurrecting') return;
            
            // Радиус атаки во все стороны
            let inRangeX = player.facingRight ? (enemy.x > player.x && enemy.x - player.x < reach) : (enemy.x < player.x && player.x - enemy.x < reach);
            let inRangeY = Math.abs(player.y - enemy.y) < 40;
            
            if (inRangeX && inRangeY) {
                enemy.hp -= attackDamage; 
                if (player.state === 'attackHeavy') { enemy.x += player.facingRight ? 20 : -20; }
                
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
            
            if (enemy.x < camera.x - 200 || enemy.x > camera.x + canvas.width + 200 || enemy.y < camera.y - 200 || enemy.y > camera.y + canvas.height + 200) return;

            if (dist > 40 * SCALE) { 
                enemy.x += (dx / dist) * enemy.speed; enemy.y += (dy / dist) * enemy.speed; setEntityAnimation(enemy, enemy.baseAnim + '_walk');
            } else {
                if (enemy.attackTimer <= 0 && player.state !== 'dead' && player.state !== 'roll') {
                    enemy.state = 'attack'; enemy.attackTimer = 100; setEntityAnimation(enemy, enemy.baseAnim + '_preAttack'); enemy.isLockAnim = true;
                    let finalDamage = Math.max(1, enemy.damage - player.defense);
                    player.hp -= finalDamage; player.hurtTimer = 40; updateHUD();
                    if (player.hp <= 0) { player.state = 'dead'; currentState = 'GAMEOVER'; mobileControls.classList.add('hidden'); gameOverScreen.classList.remove('hidden'); }
                } else { setEntityAnimation(enemy, enemy.baseAnim + '_walk'); }
            }
        }
    });
}

function drawQuestMark(x, y, markStr, color = '#ffb300') {
    ctx.save(); let floatOffset = Math.sin(Date.now() / 200) * 5; ctx.fillStyle = color;
    ctx.font = 'bold 20px "Russo One", Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    ctx.fillText(markStr, x, y + floatOffset); ctx.restore();
}

function draw() {
    // ЗАЛИВКА ФОНА ЦВЕТОМ ТРАВЫ
    ctx.fillStyle = '#4e5e3d'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // СХЕМАТИЧНЫЕ ЗОНЫ
    ctx.fillStyle = 'rgba(93, 64, 55, 0.5)'; // Деревня (коричневая)
    ctx.fillRect(200, 500, 600, 500);
    
    ctx.fillStyle = 'rgba(38, 50, 56, 0.6)'; // Погост (серый)
    ctx.fillRect(1700, 300, 600, 800);

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
            if (obj.x < camera.x - 150 || obj.x > camera.x + canvas.width + 150 || obj.y < camera.y - 150 || obj.y > camera.y + canvas.height + 150) continue;

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
                        ctx.save(); ctx.translate(obj.x, obj.y); const w = animConfig.w_frame * SCALE; const h = animConfig.h_frame * SCALE;
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
                        ctx.save(); ctx.translate(obj.x, obj.y); const w = animConfig.w_frame * SCALE; const h = animConfig.h_frame * SCALE;
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
                        ctx.save(); ctx.translate(obj.x, obj.y); const w = animConfig.w_frame * SCALE; const h = animConfig.h_frame * SCALE;
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
                    if (player.level < 3 && player.xp >= thresholds[player.level]) {
                        drawQuestMark(obj.x, obj.y - obj.height - 10, '⬆', '#69f0ae'); 
                    } else if (player.skillPoints > 0) {
                        drawQuestMark(obj.x, obj.y - obj.height - 10, '⬆', '#69f0ae');
                    }
                }
            }
        }
    }
    ctx.restore();
}

function drawPlayer() {
    if (player.state === 'dead') { ctx.fillStyle = '#4a0000'; ctx.fillRect(player.x - player.width/2, player.y - 5, player.width, 10); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(player.x, player.y, player.width / 1.2, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (player.hurtTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
    const anim = animConfig

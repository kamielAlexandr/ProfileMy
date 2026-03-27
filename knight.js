const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Отключаем сглаживание для четкости цветных блоков
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
// --- КОНФИГУРАЦИЯ НОВОГО МИРА (ТОП-ДАУН) ---
// ==========================================
// Делаем мир квадратным и огромным
const WORLD_WIDTH = 3000; 
const WORLD_HEIGHT = 3000; 

// Уменьшаем масштаб Тарна еще сильнее (был 0.65, стал 0.4)
// Маленькие фигурки на большом поле выглядят стильнее и "дороже"
const DRAW_SCALE = 0.4; 

const camera = { x: 0, y: 0 };
let currentMaxX = WORLD_WIDTH; // Пока разрешаем бегать везде для теста

function updateCamera() {
    // Камера центрируется на Тарне по обеим осям
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // Зажимаем камеру в границах мира
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x > WORLD_WIDTH - canvas.width) camera.x = WORLD_WIDTH - canvas.width;
    if (camera.y > WORLD_HEIGHT - canvas.height) camera.y = WORLD_HEIGHT - canvas.height;
}

// Утилита для получения рандомного числа
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ==========================================
// --- ОБЪЕКТЫ МИРА И ИНИЦИАЛИЗАЦИЯ ---
// ==========================================
const player = {
    // Спавнимся в центре "деревни"
    x: 400, y: 400, width: 15, height: 35, speed: 3.0,
    state: 'idle', facingRight: true, rollTimer: 0, rollSpeedMult: 2.2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, baseDamage: 10, bonusDamage: 0, bonusDefense: 0, bonusHp: 0,
    level: 0, skillPoints: 0, coins: 0, seeds: 0, potions: 0, shell: 0, bones: 0,
    questStatus: 'get_weapon', orcUnlocked: false, dummyUnlocked: false, 
    // Анимации пока оставляем, но рисовать будем блоки
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,
    equipment: { head: null, chest: { name: 'Рубаха фермера', def: 0 }, hands: null, legs: { name: 'Штаны фермера', def: 0 }, feet: { name: 'Лапти', def: 0 }, weapon: null },
    defense: 0
};

let npcs = []; let enemies = []; let staticObjects = []; let lootItems = [];

function initWorldPrototyping() {
    // 1. ОЧЕРТАНИЯ ДЕРЕВНИ (Spawn zone)
    staticObjects.push({ x: 100, y: 100, width: 600, height: 600, type: 'village_outline', color: 'rgba(121, 85, 72, 0.3)' }); // Глина/Земля
    
    // Дома (схемы)
    staticObjects.push({ x: 200, y: 200, width: 100, height: 80, type: 'building', color: '#5D4037', interactable: true, npcType: 'uncle' }); // Дом дядюшки
    staticObjects.push({ x: 500, y: 150, width: 150, height: 120, type: 'building', color: '#3E2723', interactable: true, npcType: 'shed' }); // Сарай
    staticObjects.push({ x: 350, y: 450, width: 80, height: 60, type: 'building', color: '#795548', interactable: true, npcType: 'merchant' }); // Лавка Снага

    // Заборы (схемы - линии)
    staticObjects.push({ x: 100, y: 100, width: 600, height: 5, type: 'fence', color: '#A1887F' });
    staticObjects.push({ x: 100, y: 700, width: 600, height: 5, type: 'fence', color: '#A1887F' });
    staticObjects.push({ x: 100, y: 100, width: 5, height: 600, type: 'fence', color: '#A1887F' });
    staticObjects.push({ x: 700, y: 100, width: 5, height: 600, type: 'fence', color: '#A1887F' });

    // Предметы декора (схемы)
    staticObjects.push({ x: 550, y: 300, width: 20, height: 20, type: 'deco', color: '#8D6E63' }); // Бочка
    staticObjects.push({ x: 180, y: 400, width: 30, height: 10, type: 'deco', color: '#A1887F' }); // Скамейка

    // 2. СХЕМАТИЧНЫЙ ЛЕСОК (Зона правее и выше деревни)
    for (let i = 0; i < 20; i++) {
        staticObjects.push({ 
            x: rand(900, 2000), y: rand(100, 1500), 
            width: rand(100, 300), height: rand(150, 400), 
            type: 'forest_zone', color: 'rgba(27, 94, 32, 0.4)' 
        });
    }

    // 3. NPC (Цветные круги)
    npcs = [
        { x: 250, y: 260, width: 15, height: 15, color: '#FFB300', type: 'uncle', animTimer: 0 }, // Желтый - важный
        { x: 390, y: 490, width: 15, height: 15, color: '#26A69A', type: 'merchant', animTimer: 0 } // Бирюзовый - торгаш
    ];

    // 4. ВРАГИ (Цветные квадраты, спавнятся далеко)
    // Хвощевики (Поле)
    for (let i = 0; i < 15; i++) {
        enemies.push(createPrototypeEnemy('hroshevik', rand(800, 2000), rand(1500, 2800)));
    }
    // Мертвецы (Погост - правый нижний угол)
    for (let i = 0; i < 10; i++) {
        enemies.push(createPrototypeEnemy('undead', rand(2000, 2900), rand(2000, 2900)));
    }
}

function createPrototypeEnemy(type, x, y) {
    if (type === 'hroshevik') {
        return { 
            type: 'hroshevik', baseAnim: 'enemy', x: x, y: y, width: 20, height: 20, speed: 1.2, hp: 30, color: '#689F38', // Салатовый
            state: 'idle', aggroRange: 250, hurtTimer: 0, damage: 15, attackTimer: 0, isLockAnim: false, facingRight: false, revives: 0 
        };
    } else if (type === 'undead') {
        return { 
            type: 'undead', baseAnim: 'undead', x: x, y: y, width: 25, height: 25, speed: 0.6, hp: 50, color: '#78909C', // Серый
            state: 'idle', aggroRange: 300, hurtTimer: 0, damage: 25, attackTimer: 0, isLockAnim: false, facingRight: false, revives: 1, reviveTimer: 0 
        };
    }
}

// Запускаем прототипирование
setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
initWorldPrototyping();
updateHUD();


// ==========================================
// --- ТЕКСТЫ И ИНТЕРФЕЙС ---
// ==========================================
function updateObjectiveText() {
    if (player.questStatus === 'get_weapon') objectiveText.innerText = "Цель: Забери топор у сарая в деревне (F)";
    else if (player.questStatus === 'kill_monsters') objectiveText.innerText = "Цель: Исследуй мир и зачисти Поле от Хвощевиков";
    else if (player.questStatus === 'return') objectiveText.innerText = "Цель: Вернись к дядюшке в деревню <-";
    else if (player.questStatus === 'talk_merchant') objectiveText.innerText = "Цель: Поговори с торговцем Снагом (F)";
    else if (player.questStatus === 'gather_seeds') objectiveText.innerText = `Цель: Собери семена (${player.seeds}/10)`;
    else if (player.questStatus === 'return_merchant') objectiveText.innerText = "Цель: Отнеси семена Снагу (F)";
    else if (player.questStatus === 'talk_uncle_2') objectiveText.innerText = "Цель: Выслушай дядюшку (F)";
    else if (player.questStatus === 'go_graveyard' || player.questStatus === 'kill_undead') objectiveText.innerText = "Цель: Иди на юго-восток на Погост";
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
    document.getElementById('stat-def').innerHTML = `${player.defense} <span style="font-size:10px; color:#aaa;">(Тело: ${player.bonusDefense})</span>`; 
    document.getElementById('stat-dmg').innerHTML = `${totalDmg} <span style="font-size:10px; color:#aaa;">(Сила: ${player.bonusDamage})</span>`;

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

    addStackedItem('<div style="font-size: 24px;">🧪</div>', 'Зелье лечения', player.potions);
    addStackedItem('<div style="width:12px; height:12px; background:#4fc3f7; border: 1px solid #000;"></div>', 'Панцирь', player.shell);
    addStackedItem('<div style="width:12px; height:12px; background:#fff; border: 1px solid #000;"></div>', 'Кость', player.bones);

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

// --- ДИАЛОГИ И МЕНЮ ---
// Заглушка, чтобы не падало
function loadFrames() { return []; }
function setAnimation() {}
function updateAnimation() {}
function updateEnemyAnimation() {}

function startDialogue(lines) { dialogueLines = lines; currentLine = 0; currentState = 'DIALOGUE'; hud.classList.add('hidden'); mobileControls.classList.add('hidden'); dialogueScreen.classList.remove('hidden'); updateDialogueUI(); }
function advanceDialogue() {
    if (currentState === 'STORY') {
        storyScreen.classList.add('hidden');
        startDialogue([
            { name: "Вейланд", text: "Тарн, мальчик мой. На полях опять неспокойно. Гниль распространяется." },
            { name: "Вейланд", text: "Возьми старый топор у сарая (на востоке деревни). Очисти землю, пока эта дрянь не добралась до нас." }
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
        currentState = 'INVENTORY'; keys.w = keys.a = keys.s = keys.d = false; mobileControls.classList.add('hidden'); inventoryScreen.classList.remove('hidden'); updateInventoryUI();
    } else if (currentState === 'INVENTORY') { currentState = 'PLAY'; inventoryScreen.classList.add('hidden'); checkMobile(); }
}

function openShop() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; shopScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); }
function closeShop() { currentState = 'PLAY'; shopScreen.classList.add('hidden'); checkMobile(); }
function openCraft() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; craftScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); }
function closeCraft() { currentState = 'PLAY'; craftScreen.classList.add('hidden'); checkMobile(); }
function openTraining() { currentState = 'SHOP'; keys.w = keys.a = keys.s = keys.d = false; trainingScreen.classList.remove('hidden'); mobileControls.classList.add('hidden'); updateTrainingUI(); }
function closeTraining() { currentState = 'PLAY'; trainingScreen.classList.add('hidden'); checkMobile(); }

function updateTrainingUI() { spCount.innerText = player.skillPoints; [btnTrainStr, btnTrainDef, btnTrainHp].forEach(btn => btn.disabled = player.skillPoints <= 0); }

btnTrainStr.addEventListener('click', () => { if(player.skillPoints > 0) { player.skillPoints--; player.bonusDamage += 5; updateTrainingUI(); updateHUD(); updateInventoryUI(); } });
btnTrainDef.addEventListener('click', () => { if(player.skillPoints > 0) { player.skillPoints--; player.bonusDefense += 2; updateTrainingUI(); updateHUD(); updateInventoryUI(); } });
btnTrainHp.addEventListener('click', () => { if(player.skillPoints > 0) { player.skillPoints--; player.maxHp += 20; player.hp += 20; updateTrainingUI(); updateHUD(); updateInventoryUI(); } });
btnCloseTraining.addEventListener('click', closeTraining);
btnPotion.addEventListener('click', () => { if (player.coins >= 2) { player.coins -= 2; player.potions++; updateHUD(); updateInventoryUI(); } else alert("Не хватает монет!"); });
btnCloseShop.addEventListener('click', closeShop);
btnCraftChest.addEventListener('click', () => { 
    if (player.shell >= 15 && player.coins >= 10) { 
        player.shell -= 15; player.coins -= 10; player.equipment.chest = { name: "Нагрудник (+5)", def: 5 };
        btnCraftChest.innerText = "ПРОДАНО"; btnCraftChest.disabled = true; updateHUD(); updateInventoryUI(); alert("Скрафчен Нагрудник!"); 
    } else alert("Не хватает материалов!"); 
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
    if (currentState === 'GAMEOVER' || currentState === 'SHOP' || currentState === 'INVENTORY' || currentState === 'DIALOGUE') return;
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

// Добавляем глобальную обработку диалогов и инвентаря
window.addEventListener('keydown', (e) => {
    if (currentState === 'DIALOGUE') { if (e.code === 'Space' || e.code === 'Enter') advanceDialogue(); }
    if (e.code === 'KeyI' && (currentState === 'PLAY' || currentState === 'INVENTORY')) toggleInventory();
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
        player.state = 'roll'; player.rollTimer = 20; // Кувырок на 20 кадров
        player.isLockAnim = true;
    } else if (action === 'attackLight') {
        player.state = 'attackLight'; player.attackHitboxActive = true; player.isLockAnim = true; 
        setTimeout(() => { player.isLockAnim = false; player.state = 'idle'; player.attackHitboxActive = false; }, 200);
    } else if (action === 'attackHeavy') {
        player.state = 'attackHeavy'; player.attackHitboxActive = true; player.isLockAnim = true;
        setTimeout(() => { player.isLockAnim = false; player.state = 'idle'; player.attackHitboxActive = false; }, 400);
    }
}

// --- СХЕМАТИЧНОЕ ВЗАИМОДЕЙСТВИЕ ---
function checkInteraction() {
    // 1. Проверка взаимодействия через staticObjects (дома)
    for (let obj of staticObjects) {
        if (obj.interactable && Math.hypot(player.x - (obj.x + obj.width/2), player.y - (obj.y + obj.height/2)) < 100) {
            
            if (obj.npcType === 'shed' && player.questStatus === 'get_weapon') {
                player.hasWeapon = true; obj.interactable = false;
                player.equipment.weapon = { name: "Топор", dmg: 10 };
                player.questStatus = 'kill_monsters'; updateHUD(); alert("Взят Топор!"); return; 
            }
            if (obj.npcType === 'uncle') startDialogue([{ name: "Вейланд", text: "Очисти поле, Тарн!" }]);
            if (obj.npcType === 'merchant') startDialogue([{ name: "Снаг", text: "Ква... Поговори с дядюшкой сначала." }]);
            return;
        }
    }

    // 2. Проверка взаимодействия напрямую с NPC (для квестов дальше)
    for (let npc of npcs) {
        if (Math.hypot(player.x - npc.x, player.y - npc.y) < 50) {
             if (npc.type === 'uncle') startDialogue([{ name: "Вейланд", text: "Удачи в бою!" }]);
             if (npc.type === 'merchant') openShop();
             return;
        }
    }
}

function checkQuestProgress() { 
    // Заглушка, так как механика квестов будет пересмотрена
}

// ==========================================
// --- ОБНОВЛЕНИЕ ЛОГИКИ (ТОП-ДАУН) ---
// ==========================================
function update() {
    if (currentState !== 'PLAY') return;
    if (player.hurtTimer > 0) player.hurtTimer--;

    // NPC просто стоят
    globalNpcTimer++; if (globalNpcTimer >= npcAnimSpeed) { globalNpcTimer = 0; globalNpcFrame++; }

    let currentSpeed = player.speed;

    if (player.state === 'roll') { 
        currentSpeed *= player.rollSpeedMult; player.rollTimer--; 
        if (player.rollTimer <= 0) { player.isLockAnim = false; player.state = 'idle'; }
    } 
    else if (player.state === 'idle' || player.state === 'walk') {
        if (keys.w || keys.a || keys.s || keys.d) { player.state = 'walk'; } 
        else { player.state = 'idle'; }
    }

    if (player.state === 'walk' || player.state === 'roll') {
        let dx = 0; let dy = 0;
        if (keys.w) dy -= currentSpeed; if (keys.s) dy += currentSpeed;
        if (keys.a) { dx -= currentSpeed; player.facingRight = false; }
        if (keys.d) { dx += currentSpeed; player.facingRight = true; }
        // Нормализация диагонального движения
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        
        player.x += dx; player.y += dy;
        
        // ОГРАНИЧЕНИЯ ТОП-ДАУН (Бегаем по всему миру)
        player.x = Math.max(10, Math.min(player.x, WORLD_WIDTH - 10));
        player.y = Math.max(10, Math.min(player.y, WORLD_HEIGHT - 10)); 
    }

    updateCamera(); // Камера следит за Тарном везде

    // ЛУТ (сбор)
    for (let i = lootItems.length - 1; i >= 0; i--) { 
        let item = lootItems[i]; 
        if (Math.hypot(player.x - item.x, player.y - item.y) < 30) { 
            if (item.type === 'coin') player.coins++; 
            else if (item.type === 'seed') player.seeds++;
            lootItems.splice(i, 1); updateHUD(); 
        } 
    }
    
    // БОЙ
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = player.state === 'attackLight' ? 30 : 45; // Уменьшенный радиус атаки
        
        let totalDmg = player.baseDamage + player.bonusDamage;
        let attackDamage = totalDmg * (player.state === 'attackLight' ? 1 : 2);
        
        enemies.forEach(enemy => {
            if (enemy.state === 'dead' || enemy.state === 'resurrecting') return;
            
            let dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            
            if (dist < reach) {
                enemy.hp -= attackDamage; 
                enemy.state = 'hurt'; enemy.hurtTimer = 15;
                // Небольшой отброс
                let angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                enemy.x += Math.cos(angle) * 10; enemy.y += Math.sin(angle) * 10;

                if (enemy.hp <= 0) { 
                    enemy.state = 'dead'; player.xp += 20; updateHUD();
                    // Дроп
                    lootItems.push({ x: enemy.x, y: enemy.y, type: 'coin' }); 
                } else {
                    // Агрится при получении урона
                    enemy.state = 'chase';
                }
            }
        });
    }

    // ЛОГИКА ВРАГОВ (ИИ)
    enemies.forEach(enemy => {
        if (enemy.state === 'dead') return;

        let dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        
        if (enemy.state === 'idle') {
            // "Спит", пока игрок далеко
            if (dist < enemy.aggroRange) { enemy.state = 'chase'; }
        }
        else if (enemy.state === 'chase') {
            if (dist > 40) { 
                let angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.x += Math.cos(angle) * enemy.speed; enemy.y += Math.sin(angle) * enemy.speed;
                enemy.facingRight = player.x > enemy.x;
            } else {
                // Атака
                if (enemy.attackTimer <= 0 && player.state !== 'dead' && player.state !== 'roll') {
                    // Урон игроку мгновенно для прототипа
                    let finalDamage = Math.max(1, enemy.damage - player.defense);
                    player.hp -= finalDamage; player.hurtTimer = 40; updateHUD();
                    enemy.attackTimer = 100; // Кулдаун
                    if (player.hp <= 0) { player.state = 'dead'; currentState = 'GAMEOVER'; mobileControls.classList.add('hidden'); gameOverScreen.classList.remove('hidden'); }
                }
            }
            if (enemy.attackTimer > 0) enemy.attackTimer--;
            // Теряет агр, если игрок слишком далеко
            if (dist > enemy.aggroRange * 1.5) { enemy.state = 'idle'; }
        }
    });
}

// ==========================================
// --- ОТРИСОВКА (ПРОТОТИПНАЯ, ЦВЕТНЫЕ БЛОКИ) ---
// ==========================================
function draw() {
    // 1. Заливаем всё цветом травы
    ctx.fillStyle = '#66BB6A'; // Приятный зеленый
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y); // Скроллинг мира

    // 2. Отрисовка статических объектов (схем)
    // Разделяем на фоновые зоны и твердые объекты для сортинга (в будущем)
    staticObjects.forEach(obj => {
        ctx.fillStyle = obj.color;
        if (obj.type === 'fence') { ctx.fillRect(obj.x, obj.y, obj.width, obj.height); }
        else if (obj.type === 'deco') { // Бочки/скамейки - блоки
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(obj.x+2, obj.y+obj.height-5, obj.width, 10); // Тень
            ctx.fillStyle = obj.color; ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        }
        else { // Зоны деревни/леса/здания - просто прямоугольники
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            if (obj.type === 'building') { // Очертания домов
                ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                // Квестовый маркер над сараем
                if (obj.npcType === 'shed' && player.questStatus === 'get_weapon') { drawPrototypeQuestMark(obj.x + obj.width/2, obj.y, '!'); }
            }
        }
    });

    // 3. Отрисовка лута
    lootItems.forEach(item => { 
        ctx.fillStyle = item.type === 'coin' ? '#FFD54F' : '#81D4FA'; // Желтый/Голубой
        ctx.beginPath(); ctx.arc(item.x, item.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    });

    // 4. Отрисовка NPC (Цветные круги)
    npcs.forEach(npc => {
        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(npc.x, npc.y+10, 15, 8, 0, 0, Math.PI*2); ctx.fill();
        // Тело
        ctx.fillStyle = npc.color; ctx.beginPath(); ctx.arc(npc.x, npc.y, npc.width, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        // Маркеры
        if (npc.type === 'uncle' && ['return', 'talk_uncle_2', 'return_graveyard'].includes(player.questStatus)) drawPrototypeQuestMark(npc.x, npc.y - 20, '!');
        if (npc.type === 'merchant' && ['talk_merchant', 'return_merchant'].includes(player.questStatus)) drawPrototypeQuestMark(npc.x, npc.y - 20, '!');
    });

    // 5. Отрисовка Врагов (Цветные квадраты)
    enemies.forEach(enemy => {
        if (enemy.state === 'dead') {
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(enemy.x - enemy.width/2, enemy.y, enemy.width, 10); // Труп
            return;
        }
        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y+enemy.height/2, enemy.width, 8, 0, 0, Math.PI*2); ctx.fill();
        // Тело
        if (enemy.hurtTimer > 0) ctx.fillStyle = '#fff'; else ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height/2, enemy.width, enemy.height);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(enemy.x - enemy.width/2, enemy.y - enemy.height/2, enemy.width, enemy.height);
        
        // Полоска ХП врага (схематичная)
        ctx.fillStyle = 'red'; ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height/2 - 10, enemy.width * (enemy.hp/30), 4);
    });

    // 6. Отрисовка Игрока (Цветной блок)
    drawPrototypePlayer();

    ctx.restore();
}

function drawPrototypePlayer() {
    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(player.x, player.y + player.height/2, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
    
    // Блок тела
    if (player.state === 'dead') ctx.fillStyle = '#4A148C'; // Фиолетовый труп
    else if (player.state === 'roll') ctx.fillStyle = '#CE93D8'; // Светло-фиолетовый в кувырке
    else if (player.hurtTimer > 0) ctx.fillStyle = '#fff';
    else ctx.fillStyle = '#7E57C2'; // Основной цвет Тарна - Фиолетовый
    
    ctx.fillRect(player.x - player.width/2, player.y - player.height/2, player.width, player.height);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(player.x - player.width/2, player.y - player.height/2, player.width, player.height);
    
    // Схематичное оружие (линия)
    if (player.hasWeapon && player.state !== 'roll') {
        ctx.strokeStyle = '#90A4AE'; ctx.lineWidth = 4;
        ctx.beginPath();
        let handX = player.x + (player.facingRight ? 15 : -15);
        ctx.moveTo(handX, player.y);
        ctx.lineTo(handX + (player.facingRight ? 10 : -10), player.y - 15);
        ctx.stroke();
    }
}

function drawPrototypeQuestMark(x, y, markStr) {
    ctx.fillStyle = '#FFEB3B'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.fillText(markStr, x, y);
}

// Заглушка, чтобы не падало
function drawPlayer() {}
function drawEnemy() {}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

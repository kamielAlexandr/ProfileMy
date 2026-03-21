const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// Кнопки магазина
const btnPotion = document.getElementById('btn-buy-potion');
const btnUpgrade = document.getElementById('btn-buy-upgrade');
const btnCloseShop = document.getElementById('btn-close-shop');

let currentState = 'STORY'; // STORY, DIALOGUE, PLAY, SHOP, GAMEOVER, TRANSITION
let currentLocation = 'village'; 
let dialogueLines = [];
let currentLine = 0;

const keys = { w: false, a: false, s: false, d: false };

// ИГРОК: инвентарь и базовый урон
const player = {
    x: 300, y: 300, width: 40, height: 80,
    speed: 3.5, color: '#8D6E63',
    state: 'idle', facingRight: true,
    rollTimer: 0, rollDuration: 15, rollSpeedMult: 2,
    hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0,
    xp: 0, 
    coins: 0, seeds: 0, potions: 0,
    baseDamage: 10, // Базовый урон, который мы будем прокачивать
    questStatus: 'get_weapon'
};

let environment = [];
let enemies = [];
let lootItems = []; // Массив для лежащего на земле лута

const locations = {
    village: {
        bgColor: '#5d4037', horizonColor: '#1b1b1b',
        setup: () => {
            environment = [
                { x: 600, y: 220, width: 100, height: 70, color: player.hasWeapon ? '#271714' : '#3E2723', interactable: !player.hasWeapon, type: 'shed' },
                { x: 200, y: 280, width: 40, height: 80, color: '#ffb300', interactable: true, type: 'uncle' },
                // НОВЫЙ NPC: Торговец Жаболюд
                { x: 450, y: 240, width: 45, height: 60, color: '#2e7d32', interactable: true, type: 'merchant' }
            ];
            enemies = [];
            lootItems = [];
            
            if (player.questStatus === 'get_weapon') objectiveText.innerText = "Цель: Забери цеп у сарая (F)";
            else if (player.questStatus === 'return') objectiveText.innerText = "Цель: Поговори с дядюшкой (F)";
            else if (player.questStatus === 'done') objectiveText.innerText = "Свободная игра: охоться и торгуй!";
        }
    },
    field: {
        bgColor: '#4e5e3d', horizonColor: '#0a1a0f', 
        setup: () => {
            environment = [];
            lootItems = [];
            // Враги теперь спавнятся всегда (чтобы можно было фармить лут)
            enemies = [createEnemy(500, 300), createEnemy(650, 250), createEnemy(750, 380)];
            if (player.questStatus === 'kill_monsters') objectiveText.innerText = "Цель: Выживи и выкорчуй нечисть!";
            else objectiveText.innerText = "Охота на Хвощевиков продолжается...";
        }
    }
};

function createEnemy(x, y) {
    return { x: x, y: y, width: 35, height: 60, speed: 1.2, hp: 30, color: '#689f38', state: 'chase', hurtTimer: 0, damage: 15, attackTimer: 0 };
}

setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
locations.village.setup();
updateHUD();

// --- ДИАЛОГИ ---
function startDialogue(lines) {
    dialogueLines = lines; currentLine = 0; currentState = 'DIALOGUE';
    hud.classList.add('hidden'); dialogueScreen.classList.remove('hidden');
    updateDialogueUI();
}

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
        if (currentLine >= dialogueLines.length) {
            currentState = 'PLAY';
            dialogueScreen.classList.add('hidden'); hud.classList.remove('hidden');
        } else updateDialogueUI();
    }
}

function updateDialogueUI() {
    speakerName.innerText = dialogueLines[currentLine].name;
    dialogueText.innerText = dialogueLines[currentLine].text;
    speakerName.style.color = dialogueLines[currentLine].name === "Тарн" ? "#a1887f" : "#ffb300";
}

// --- УПРАВЛЕНИЕ ---
window.addEventListener('mousedown', () => {
    if (currentState === 'STORY' || currentState === 'DIALOGUE') advanceDialogue();
});

window.addEventListener('keydown', (e) => {
    if (currentState === 'GAMEOVER' || currentState === 'SHOP') return;

    if (currentState === 'STORY' || currentState === 'DIALOGUE') {
        if (e.code === 'Space' || e.code === 'Enter') advanceDialogue();
        return;
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
        
        // Использование зелья
        if (e.code === 'KeyE') usePotion();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
});

// --- МАГАЗИН И ПРЕДМЕТЫ ---
function openShop() {
    currentState = 'SHOP';
    keys.w = keys.a = keys.s = keys.d = false; // Останавливаем игрока
    shopScreen.classList.remove('hidden');
}

function closeShop() {
    currentState = 'PLAY';
    shopScreen.classList.add('hidden');
}

btnPotion.addEventListener('click', () => {
    if (player.coins >= 2) {
        player.coins -= 2;
        player.potions++;
        updateHUD();
        alert("Куплено: Зелье лечения!");
    } else alert("Не хватает монет!");
});

btnUpgrade.addEventListener('click', () => {
    if (player.seeds >= 5) {
        player.seeds -= 5;
        player.baseDamage += 10;
        updateHUD();
        alert("Твое оружие стало острее! (+10 к урону навсегда)");
    } else alert("Не хватает семян гнили!");
});

btnCloseShop.addEventListener('click', closeShop);

function usePotion() {
    if (player.potions > 0 && player.hp < player.maxHp) {
        player.potions--;
        player.hp = Math.min(player.maxHp, player.hp + 50);
        updateHUD();
    }
}

function updateHUD() {
    let hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    hpBarFill.style.width = hpPercent + '%';
    xpText.innerText = 'Опыт: ' + player.xp;
    inventoryText.innerText = `Монеты: ${player.coins} | Семена: ${player.seeds} | Зелья (E): ${player.potions}`;
}

function performAction(action) {
    if (player.state !== 'idle' && player.state !== 'walk') return;
    if (action === 'roll') {
        player.state = 'roll'; player.rollTimer = player.rollDuration;
    } else if (action === 'attackLight' || action === 'attackHeavy') {
        if (!player.hasWeapon) { alert("Возьми оружие у сарая!"); return; }
        player.state = action;
        player.attackHitboxActive = true; 
        let duration = action === 'attackLight' ? 300 : 500;
        setTimeout(() => { if(player.state !== 'dead') player.state = 'idle'; }, duration);
    }
}

function checkInteraction() {
    for (let obj of environment) {
        let dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist < 80 && obj.interactable) {
            
            if (obj.type === 'shed' && player.questStatus === 'get_weapon') {
                player.hasWeapon = true; obj.interactable = false; obj.color = '#271714'; 
                player.questStatus = 'kill_monsters';
                objectiveText.innerText = "Цель: Иди направо, на дальнее поле ->";
            }
            else if (obj.type === 'uncle') {
                if (player.questStatus === 'get_weapon' || player.questStatus === 'kill_monsters') {
                    startDialogue([{ name: "Вейланд", text: "Очисти поле, пока они не сожрали урожай!" }]);
                } else if (player.questStatus === 'return') {
                    player.questStatus = 'done'; player.xp += 100; updateHUD();
                    startDialogue([{ name: "Вейланд", text: "Хорошая работа, Тарн. (+100 ОПЫТА)" }]);
                    objectiveText.innerText = "Свободная охота: фарми лут на поле!";
                } else {
                    startDialogue([{ name: "Вейланд", text: "Поговори с Жаболюдом Снагом, он скупает странные вещи." }]);
                }
            }
            // Взаимодействие с Торговцем
            else if (obj.type === 'merchant') {
                openShop();
            }
        }
    }
}

function checkQuestProgress() {
    if (player.questStatus === 'kill_monsters') {
        let allDead = enemies.every(e => e.state === 'dead');
        if (allDead) {
            player.questStatus = 'return';
            objectiveText.innerText = "Цель: Вернись к дядюшке (Иди влево <-)";
        }
    }
}

function transitionLocation(newLoc, spawnSide = 'left') {
    currentState = 'TRANSITION';
    fadeOverlay.classList.remove('hidden'); 
    setTimeout(() => {
        currentLocation = newLoc; locations[newLoc].setup();
        player.x = spawnSide === 'left' ? 50 : canvas.width - 50; 
        fadeOverlay.classList.add('hidden'); currentState = 'PLAY';
    }, 600);
}

// --- ИГРОВОЙ ЦИКЛ (UPDATE) ---
function update() {
    if (currentState !== 'PLAY') return;
    if (player.hurtTimer > 0) player.hurtTimer--;

    let currentSpeed = player.speed;

    if (player.state === 'roll') {
        currentSpeed *= player.rollSpeedMult; player.rollTimer--;
        if (player.rollTimer <= 0) player.state = 'idle';
    } else if (player.state === 'idle' || player.state === 'walk') {
        if (keys.w || keys.a || keys.s || keys.d) player.state = 'walk';
        else player.state = 'idle';
    }

    if (player.state === 'walk' || player.state === 'roll') {
        let dx = 0; let dy = 0;
        if (keys.w) dy -= currentSpeed; if (keys.s) dy += currentSpeed;
        if (keys.a) { dx -= currentSpeed; player.facingRight = false; }
        if (keys.d) { dx += currentSpeed; player.facingRight = true; }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        
        player.x += dx; player.y += dy;

        const horizon = 200; 
        if (player.y < horizon) player.y = horizon;
        if (player.y > canvas.height) player.y = canvas.height;

        if (player.x > canvas.width + 20) {
            if (currentLocation === 'village' && player.hasWeapon) transitionLocation('field', 'left');
            else player.x = canvas.width - player.width/2; 
        }
        if (player.x < -20) {
            if (currentLocation === 'field') transitionLocation('village', 'right');
            else player.x = player.width/2;
        }
    }

    // Сбор лута
    for (let i = lootItems.length - 1; i >= 0; i--) {
        let item = lootItems[i];
        let dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < 30) {
            if (item.type === 'coin') player.coins++;
            else if (item.type === 'seed') player.seeds++;
            lootItems.splice(i, 1); // Удаляем поднятый лут
            updateHUD();
        }
    }

    // Атака игрока
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = player.state === 'attackLight' ? 50 : 70;
        
        // Урон теперь зависит от базы и типа атаки
        let attackDamage = player.baseDamage * (player.state === 'attackLight' ? 1 : 2);
        
        enemies.forEach(enemy => {
            if (enemy.state === 'dead') return;
            let inRangeX = player.facingRight ? (enemy.x > player.x && enemy.x - player.x < reach) : (enemy.x < player.x && player.x - enemy.x < reach);
            let inRangeY = Math.abs(player.y - enemy.y) < 30;

            if (inRangeX && inRangeY) {
                enemy.hp -= attackDamage;
                enemy.state = 'hurt'; enemy.hurtTimer = 15;
                enemy.x += player.facingRight ? 20 : -20;
                
                if (enemy.hp <= 0) {
                    enemy.state = 'dead';
                    player.xp += 20;
                    
                    // Спавн лута (50% монетка, 50% семечко)
                    let dropType = Math.random() > 0.5 ? 'coin' : 'seed';
                    lootItems.push({ x: enemy.x, y: enemy.y, type: dropType });
                    
                    updateHUD();
                    checkQuestProgress();
                }
            }
        });
    }

    // Логика врагов
    enemies.forEach(enemy => {
        if (enemy.state === 'dead') return;
        if (enemy.attackTimer > 0) enemy.attackTimer--;

        if (enemy.state === 'hurt') {
            enemy.hurtTimer--;
            if (enemy.hurtTimer <= 0) enemy.state = 'chase';
        } else if (enemy.state === 'chase') {
            let dx = player.x - enemy.x; let dy = player.y - enemy.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist > 40) {
                enemy.x += (dx / dist) * enemy.speed; enemy.y += (dy / dist) * enemy.speed;
            } else {
                if (enemy.attackTimer <= 0 && player.state !== 'dead' && player.state !== 'roll' && player.hurtTimer <= 0) {
                    player.hp -= enemy.damage; player.hurtTimer = 40;
                    updateHUD(); enemy.attackTimer = 60; 
                    if (player.hp <= 0) {
                        player.state = 'dead'; currentState = 'GAMEOVER';
                        gameOverScreen.classList.remove('hidden');
                    }
                }
            }
        }
    });
}

// --- ОТРИСОВКА (DRAW) ---
function draw() {
    const loc = locations[currentLocation];
    ctx.fillStyle = loc.bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = loc.horizonColor; ctx.fillRect(0, 0, canvas.width, 180);

    if (currentState === 'PLAY' || currentState === 'GAMEOVER' || currentState === 'SHOP') {
        
        // Отрисовка лута на земле
        lootItems.forEach(item => {
            ctx.fillStyle = item.type === 'coin' ? '#ffca28' : '#69f0ae'; // Желтый или зеленый
            ctx.beginPath();
            ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
            ctx.fill();
            // Обводка
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        });

        let renderQueue = [player, ...environment, ...enemies];
        renderQueue.sort((a, b) => a.y - b.y);

        for (let obj of renderQueue) {
            if (obj === player) drawPlayer();
            else if (enemies.includes(obj)) drawEnemy(obj);
            else {
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.ellipse(obj.x, obj.y, obj.width/1.5, 10, 0, 0, Math.PI * 2); ctx.fill();
                
                // Глазки для Жаболюда-торговца
                if (obj.type === 'merchant') {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(obj.x - 10, obj.y - obj.height + 10, 4, 4);
                    ctx.fillRect(obj.x + 6, obj.y - obj.height + 10, 4, 4);
                }
            }
        }
    }
}

function drawPlayer() {
    if (player.state === 'dead') {
        ctx.fillStyle = '#4a0000'; ctx.fillRect(player.x - player.height/2, player.y - 10, player.height, 15);
        return;
    }
    if (player.hurtTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(player.x, player.y, player.width/1.5, 8, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = player.color;
    if (player.state === 'roll') ctx.fillStyle = '#bcaaa4';
    if (player.state === 'attackLight') ctx.fillStyle = '#ff5722';
    if (player.state === 'attackHeavy') ctx.fillStyle = '#d32f2f';

    let drawY = player.y - player.height;
    let drawHeight = player.state === 'roll' ? player.height / 2 : player.height;
    if (player.state === 'roll') drawY += player.height / 2;

    ctx.fillRect(player.x - player.width/2, drawY, player.width, drawHeight);

    ctx.fillStyle = '#fff';
    let eyeX = player.facingRight ? player.x + 10 : player.x - 15;
    ctx.fillRect(eyeX, drawY + 10, 5, 5);
}

function drawEnemy(enemy) {
    if (enemy.state === 'dead') {
        ctx.fillStyle = '#2e3b1c'; ctx.fillRect(enemy.x - enemy.height/2, enemy.y - 10, enemy.height, 10);
        return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y, enemy.width/1.5, 8, 0, 0, Math.PI * 2); ctx.fill();

    if (enemy.attackTimer > 40 && enemy.state !== 'hurt') ctx.fillStyle = '#ff8a65';
    else ctx.fillStyle = enemy.state === 'hurt' ? '#fff' : enemy.color;
    
    let drawY = enemy.y - enemy.height;
    ctx.fillRect(enemy.x - enemy.width/2, drawY, enemy.width, enemy.height);

    ctx.fillStyle = '#ff0000';
    let isFacingPlayer = player.x > enemy.x;
    let eyeX = isFacingPlayer ? enemy.x + 5 : enemy.x - 10;
    ctx.fillRect(eyeX, drawY + 15, 4, 4);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();

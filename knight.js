const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI элементы
const storyScreen = document.getElementById('story-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
const fadeOverlay = document.getElementById('fade-overlay');
const hud = document.getElementById('hud');
const objectiveText = document.getElementById('objective');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');
const hpBarFill = document.getElementById('hp-bar-fill');
const gameOverScreen = document.getElementById('game-over-screen');

// Состояния игры
let currentState = 'STORY'; 
let currentLocation = 'village'; 

// Данные диалога
const dialogueLines = [
    { name: "Вейланд", text: "Тарн, мальчик мой. На дальнем поле опять неспокойно. Земля гниет, и из нее лезут Хвощевики." },
    { name: "Тарн", text: "Снова они? В прошлый раз я сломал о них любимые вилы." },
    { name: "Вейланд", text: "Возьми старый цеп у сарая. И будь осторожен. Очисти поле, пока эта дрянь не добралась до амбаров." },
    { name: "Тарн", text: "Сделаю, дядюшка." }
];
let currentLine = 0;

// Управление
const keys = { w: false, a: false, s: false, d: false };

// Игрок (Тарн)
const player = {
    x: 300, y: 300, width: 40, height: 80,
    speed: 3.5, color: '#8D6E63',
    state: 'idle', facingRight: true,
    rollTimer: 0, rollDuration: 15, rollSpeedMult: 2,
    hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0
};

// Объекты окружения и Враги
let environment = [];
let enemies = [];

// Настройка локаций
const locations = {
    village: {
        bgColor: '#5d4037', horizonColor: '#1b1b1b',
        setup: () => {
            environment = [{ x: 600, y: 220, width: 100, height: 70, color: '#3E2723', interactable: true, type: 'shed' }];
            enemies = [];
            objectiveText.innerText = "Цель: Забери цеп у сарая (F)";
        }
    },
    field: {
        bgColor: '#4e5e3d', horizonColor: '#0a1a0f', 
        setup: () => {
            environment = [];
            enemies = [
                createEnemy(600, 300),
                createEnemy(700, 250),
                createEnemy(750, 380)
            ];
            objectiveText.innerText = "Цель: Выживи и выкорчуй нечисть!";
        }
    }
};

function createEnemy(x, y) {
    return {
        x: x, y: y, width: 35, height: 60,
        speed: 1.2, hp: 30, color: '#689f38',
        state: 'chase', hurtTimer: 0,
        damage: 15, attackTimer: 0
    };
}

// Инициализация при загрузке
setTimeout(() => fadeOverlay.classList.add('hidden'), 500);
locations.village.setup();
updateHUD();

// Обработчики клавиатуры
// Функция для продвижения сюжета (вызывается и по кнопке, и по клику)
function advanceStory() {
    if (currentState === 'STORY') {
        currentState = 'DIALOGUE';
        storyScreen.classList.add('hidden');
        dialogueScreen.classList.remove('hidden');
        updateDialogueUI();
    } else if (currentState === 'DIALOGUE') {
        currentLine++;
        if (currentLine >= dialogueLines.length) {
            currentState = 'PLAY';
            dialogueScreen.classList.add('hidden');
            hud.classList.remove('hidden');
        } else {
            updateDialogueUI();
        }
    }
}

// Обработка клика мыши или тапа по экрану
window.addEventListener('mousedown', (e) => {
    if (currentState === 'STORY' || currentState === 'DIALOGUE') {
        advanceStory();
    }
});

// Обработчики клавиатуры
window.addEventListener('keydown', (e) => {
    if (currentState === 'GAMEOVER') return;

    if (currentState === 'STORY' || currentState === 'DIALOGUE') {
        if (e.code === 'Space' || e.code === 'Enter') {
            advanceStory();
        }
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
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
});

function updateDialogueUI() {
    speakerName.innerText = dialogueLines[currentLine].name;
    dialogueText.innerText = dialogueLines[currentLine].text;
    speakerName.style.color = dialogueLines[currentLine].name === "Тарн" ? "#a1887f" : "#ffb300";
}

function updateHUD() {
    let hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    hpBarFill.style.width = hpPercent + '%';
}

function performAction(action) {
    if (player.state !== 'idle' && player.state !== 'walk') return;

    if (action === 'roll') {
        player.state = 'roll';
        player.rollTimer = player.rollDuration;
    } else if (action === 'attackLight' || action === 'attackHeavy') {
        if (!player.hasWeapon) {
            alert("Нужно найти оружие! Подойди к сараю и нажми F.");
            return;
        }
        player.state = action;
        player.attackHitboxActive = true; 
        let duration = action === 'attackLight' ? 300 : 500;
        setTimeout(() => { if(player.state !== 'dead') player.state = 'idle'; }, duration);
    }
}

function checkInteraction() {
    for (let obj of environment) {
        let dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist < 80 && obj.interactable && obj.type === 'shed') {
            player.hasWeapon = true;
            obj.interactable = false;
            obj.color = '#271714'; 
            objectiveText.innerText = "Цель: Иди направо, на дальнее поле ->";
        }
    }
}

function transitionLocation(newLoc) {
    currentState = 'TRANSITION';
    fadeOverlay.classList.remove('hidden'); 
    
    setTimeout(() => {
        currentLocation = newLoc;
        locations[newLoc].setup();
        player.x = 50; 
        fadeOverlay.classList.add('hidden'); 
        currentState = 'PLAY';
    }, 600);
}

function update() {
    if (currentState !== 'PLAY') return;

    // Таймер неуязвимости игрока
    if (player.hurtTimer > 0) player.hurtTimer--;

    // --- Логика игрока ---
    let currentSpeed = player.speed;

    if (player.state === 'roll') {
        currentSpeed *= player.rollSpeedMult;
        player.rollTimer--;
        if (player.rollTimer <= 0) player.state = 'idle';
    } else if (player.state === 'idle' || player.state === 'walk') {
        if (keys.w || keys.a || keys.s || keys.d) player.state = 'walk';
        else player.state = 'idle';
    }

    if (player.state === 'walk' || player.state === 'roll') {
        let dx = 0; let dy = 0;
        if (keys.w) dy -= currentSpeed;
        if (keys.s) dy += currentSpeed;
        if (keys.a) { dx -= currentSpeed; player.facingRight = false; }
        if (keys.d) { dx += currentSpeed; player.facingRight = true; }

        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

        player.x += dx; player.y += dy;

        const horizon = 200; 
        if (player.x < player.width/2) player.x = player.width/2;
        if (player.y < horizon) player.y = horizon;
        if (player.y > canvas.height) player.y = canvas.height;

        if (player.x > canvas.width + 20) {
            if (currentLocation === 'village' && player.hasWeapon) {
                transitionLocation('field');
            } else {
                player.x = canvas.width - player.width/2; 
            }
        }
    }

    // --- Атака Игрока ---
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; 
        let reach = player.state === 'attackLight' ? 50 : 70;
        let attackDamage = player.state === 'attackLight' ? 10 : 20;
        
        enemies.forEach(enemy => {
            if (enemy.state === 'dead') return;
            let inRangeX = player.facingRight ? 
                (enemy.x > player.x && enemy.x - player.x < reach) : 
                (enemy.x < player.x && player.x - enemy.x < reach);
            let inRangeY = Math.abs(player.y - enemy.y) < 30;

            if (inRangeX && inRangeY) {
                enemy.hp -= attackDamage;
                enemy.state = 'hurt';
                enemy.hurtTimer = 15;
                enemy.x += player.facingRight ? 20 : -20;
                if (enemy.hp <= 0) enemy.state = 'dead';
            }
        });
    }

    // --- ИИ Врагов и Атака по Игроку ---
    enemies.forEach(enemy => {
        if (enemy.state === 'dead') return;

        if (enemy.attackTimer > 0) enemy.attackTimer--;

        if (enemy.state === 'hurt') {
            enemy.hurtTimer--;
            if (enemy.hurtTimer <= 0) enemy.state = 'chase';
        } else if (enemy.state === 'chase') {
            let dx = player.x - enemy.x;
            let dy = player.y - enemy.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist > 40) {
                // Догоняем
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            } else {
                // Атакуем Тарна!
                if (enemy.attackTimer <= 0 && player.state !== 'dead' && player.state !== 'roll' && player.hurtTimer <= 0) {
                    player.hp -= enemy.damage;
                    player.hurtTimer = 40; // Даем Тарну ~0.6 сек неуязвимости
                    updateHUD();
                    enemy.attackTimer = 60; // Враг бьет раз в секунду
                    
                    if (player.hp <= 0) {
                        player.state = 'dead';
                        currentState = 'GAMEOVER';
                        gameOverScreen.classList.remove('hidden');
                    }
                }
            }
        }
    });
}

function draw() {
    const loc = locations[currentLocation];
    ctx.fillStyle = loc.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = loc.horizonColor;
    ctx.fillRect(0, 0, canvas.width, 180);

    if (currentState === 'PLAY' || currentState === 'GAMEOVER') {
        let renderQueue = [player, ...environment, ...enemies];
        renderQueue.sort((a, b) => a.y - b.y);

        for (let obj of renderQueue) {
            if (obj === player) drawPlayer();
            else if (enemies.includes(obj)) drawEnemy(obj);
            else {
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(obj.x, obj.y, obj.width/1.5, 10, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawPlayer() {
    if (player.state === 'dead') {
        ctx.fillStyle = '#4a0000';
        ctx.fillRect(player.x - player.height/2, player.y - 10, player.height, 15);
        return;
    }

    // Мигание при получении урона (кадры неуязвимости)
    if (player.hurtTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y, player.width/1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

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
        ctx.fillStyle = '#2e3b1c';
        ctx.fillRect(enemy.x - enemy.height/2, enemy.y - 10, enemy.height, 10);
        return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.width/1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Враг становится красным перед ударом
    if (enemy.attackTimer > 40 && enemy.state !== 'hurt') {
        ctx.fillStyle = '#ff8a65';
    } else {
        ctx.fillStyle = enemy.state === 'hurt' ? '#fff' : enemy.color;
    }
    
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

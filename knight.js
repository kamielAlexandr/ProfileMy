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

// Состояния игры
let currentState = 'STORY'; 
let currentLocation = 'village'; // village или field
let fadeAlpha = 1; // Для плавного появления при старте

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
    damage: 10
};

// Объекты окружения (зависят от локации)
let environment = [];
// Враги
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
        bgColor: '#4e5e3d', horizonColor: '#0a1a0f', // Более зеленовато-гнилостный фон
        setup: () => {
            environment = [];
            // Спавним 3 Хвощевиков
            enemies = [
                createEnemy(600, 300),
                createEnemy(700, 250),
                createEnemy(750, 380)
            ];
            objectiveText.innerText = "Цель: Выкорчуй нечисть!";
        }
    }
};

function createEnemy(x, y) {
    return {
        x: x, y: y, width: 35, height: 60,
        speed: 1.2, hp: 30, color: '#689f38',
        state: 'chase', // chase, hurt, dead
        hurtTimer: 0
    };
}

// Инициализация при загрузке
setTimeout(() => fadeOverlay.classList.add('hidden'), 500); // Убираем стартовый черный экран
locations.village.setup();

// Обработчики клавиатуры (теперь работают на любой раскладке)
window.addEventListener('keydown', (e) => {
    if (currentState === 'STORY') {
        if (e.code === 'Space') {
            currentState = 'DIALOGUE';
            storyScreen.classList.add('hidden');
            dialogueScreen.classList.remove('hidden');
            updateDialogueUI();
        }
        return;
    }

    if (currentState === 'DIALOGUE') {
        if (e.code === 'Space') {
            currentLine++;
            if (currentLine >= dialogueLines.length) {
                currentState = 'PLAY';
                dialogueScreen.classList.add('hidden');
                hud.classList.remove('hidden');
            } else {
                updateDialogueUI();
            }
        }
        return;
    }

    if (currentState === 'PLAY') {
        // e.code считывает физическую клавишу, а не букву
        if (e.code === 'KeyW') keys.w = true;
        if (e.code === 'KeyA') keys.a = true;
        if (e.code === 'KeyS') keys.s = true;
        if (e.code === 'KeyD') keys.d = true;
        
        if (e.code === 'KeyJ') performAction('attackLight');
        if (e.code === 'KeyK') performAction('attackHeavy');
        if (e.code === 'KeyL') performAction('roll');
        if (e.code === 'KeyF') checkInteraction();
    }
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
        player.attackHitboxActive = true; // Хитбокс активен только в первый кадр атаки
        let duration = action === 'attackLight' ? 300 : 500;
        setTimeout(() => player.state = 'idle', duration);
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
    fadeOverlay.classList.remove('hidden'); // Затемняем экран
    
    setTimeout(() => {
        currentLocation = newLoc;
        locations[newLoc].setup();
        player.x = 50; // Перемещаем Тарна в начало экрана
        fadeOverlay.classList.add('hidden'); // Высветляем
        currentState = 'PLAY';
    }, 600);
}

function update() {
    if (currentState !== 'PLAY') return;

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

        // Ограничения и переход на другую локацию
        const horizon = 200; 
        if (player.x < player.width/2) player.x = player.width/2;
        if (player.y < horizon) player.y = horizon;
        if (player.y > canvas.height) player.y = canvas.height;

        // Если ушли за правый край экрана с оружием в деревне
        if (player.x > canvas.width + 20) {
            if (currentLocation === 'village' && player.hasWeapon) {
                transitionLocation('field');
            } else {
                player.x = canvas.width - player.width/2; // Упираемся в стену
            }
        }
    }

    // --- Логика атак (Хитбоксы) ---
    if ((player.state === 'attackLight' || player.state === 'attackHeavy') && player.attackHitboxActive) {
        player.attackHitboxActive = false; // Наносим урон только один раз за взмах
        
        let reach = player.state === 'attackLight' ? 50 : 70;
        let attackDamage = player.state === 'attackLight' ? 10 : 20;
        
        enemies.forEach(enemy => {
            if (enemy.state === 'dead') return;
            
            // Проверка дистанции по X
            let inRangeX = player.facingRight ? 
                (enemy.x > player.x && enemy.x - player.x < reach) : 
                (enemy.x < player.x && player.x - enemy.x < reach);
            
            // Проверка глубины по Y (чтобы нельзя было бить врага, стоящего сильно выше или ниже)
            let inRangeY = Math.abs(player.y - enemy.y) < 30;

            if (inRangeX && inRangeY) {
                // Попадание!
                enemy.hp -= attackDamage;
                enemy.state = 'hurt';
                enemy.hurtTimer = 15;
                // Отбрасывание
                enemy.x += player.facingRight ? 20 : -20;
                
                if (enemy.hp <= 0) enemy.state = 'dead';
            }
        });
    }

    // --- ИИ Врагов ---
    enemies.forEach(enemy => {
        if (enemy.state === 'dead') return;

        if (enemy.state === 'hurt') {
            enemy.hurtTimer--;
            if (enemy.hurtTimer <= 0) enemy.state = 'chase';
        } else if (enemy.state === 'chase') {
            // Двигаемся к игроку
            let dx = player.x - enemy.x;
            let dy = player.y - enemy.y;
            let dist = Math.hypot(dx, dy);
            
            // Останавливаемся вплотную
            if (dist > 30) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
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

    if (currentState === 'PLAY') {
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

    // Глаза
    ctx.fillStyle = '#fff';
    let eyeX = player.facingRight ? player.x + 10 : player.x - 15;
    ctx.fillRect(eyeX, drawY + 10, 5, 5);
}

function drawEnemy(enemy) {
    if (enemy.state === 'dead') {
        // Труп на земле
        ctx.fillStyle = '#2e3b1c';
        ctx.fillRect(enemy.x - enemy.height/2, enemy.y - 10, enemy.height, 10);
        return;
    }

    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.width/1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Тело
    ctx.fillStyle = enemy.state === 'hurt' ? '#fff' : enemy.color;
    let drawY = enemy.y - enemy.height;
    ctx.fillRect(enemy.x - enemy.width/2, drawY, enemy.width, enemy.height);

    // "Глаза" хвощевика (красные точки)
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

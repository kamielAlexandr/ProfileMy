const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI элементы
const storyScreen = document.getElementById('story-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
const hud = document.getElementById('hud');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');

// Состояния игры: STORY, DIALOGUE, PLAY
let currentState = 'STORY'; 

// Данные диалога
const dialogueLines = [
    { name: "Вейланд", text: "Тарн, мальчик мой. На дальнем поле опять неспокойно. Земля гниет, и из нее лезут Хвощевики." },
    { name: "Тарн", text: "Снова они? В прошлый раз я сломал о них любимые вилы." },
    { name: "Вейланд", text: "Возьми старый цеп в сарае. И будь осторожен. Они крупнее, чем обычно. Очисти поле, пока эта дрянь не добралась до амбаров." },
    { name: "Тарн", text: "Сделаю, дядюшка. Ни одна сорняковая тварь не тронет наш урожай." }
];
let currentLine = 0;

// Управление
const keys = { w: false, a: false, s: false, d: false };
const actions = { attackLight: false, attackHeavy: false, roll: false, interact: false };

// Игрок (Тарн)
const player = {
    x: 400,
    y: 300,        // Y работает как глубина (Z-координата в 2.5D играх)
    z: 0,          // Подпрыгивание (высота над землей)
    width: 40,
    height: 80,
    speed: 3,
    color: '#8D6E63',
    state: 'idle', // idle, walk, attack1, attack2, roll
    facingRight: true,
    rollTimer: 0,
    rollDuration: 15, // Кадры кувырка
    rollSpeedMult: 2.5
};

// Интерактивный объект (например, сарай с оружием)
const environment = [
    { x: 600, y: 250, width: 80, height: 60, color: '#3E2723', interactable: true, message: "Вы нашли Тяжелый Цеп!" }
];

// Обработчики клавиатуры
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

    // Игровое управление
    if (currentState === 'PLAY') {
        if (e.key === 'w' || e.key === 'W') keys.w = true;
        if (e.key === 'a' || e.key === 'A') keys.a = true;
        if (e.key === 's' || e.key === 'S') keys.s = true;
        if (e.key === 'd' || e.key === 'D') keys.d = true;
        
        if (e.key === 'j' || e.key === 'J') performAction('attackLight');
        if (e.key === 'k' || e.key === 'K') performAction('attackHeavy');
        if (e.key === 'l' || e.key === 'L') performAction('roll');
        if (e.key === 'f' || e.key === 'F') checkInteraction();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
});

function updateDialogueUI() {
    speakerName.innerText = dialogueLines[currentLine].name;
    dialogueText.innerText = dialogueLines[currentLine].text;
    speakerName.style.color = dialogueLines[currentLine].name === "Тарн" ? "#a1887f" : "#ffb300";
}

function performAction(action) {
    if (player.state !== 'idle' && player.state !== 'walk') return; // Блокируем, если уже в действии

    if (action === 'roll') {
        player.state = 'roll';
        player.rollTimer = player.rollDuration;
    } else if (action === 'attackLight') {
        player.state = 'attack1';
        setTimeout(() => player.state = 'idle', 300); // Длительность атаки
    } else if (action === 'attackHeavy') {
        player.state = 'attack2';
        setTimeout(() => player.state = 'idle', 500);
    }
}

function checkInteraction() {
    for (let obj of environment) {
        // Простая проверка дистанции
        let dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist < 80 && obj.interactable) {
            alert(obj.message); // В полноценной игре здесь будет UI попап
            obj.interactable = false; // Подобрали предмет
            obj.color = '#271714'; // Меняем цвет сарая
        }
    }
}

function update() {
    if (currentState !== 'PLAY') return;

    let currentSpeed = player.speed;

    // Логика кувырка
    if (player.state === 'roll') {
        currentSpeed *= player.rollSpeedMult;
        player.rollTimer--;
        if (player.rollTimer <= 0) player.state = 'idle';
    } else if (player.state === 'idle' || player.state === 'walk') {
        // Определение состояния ходьбы
        if (keys.w || keys.a || keys.s || keys.d) {
            player.state = 'walk';
        } else {
            player.state = 'idle';
        }
    }

    // Движение (заблокировано во время атак)
    if (player.state === 'walk' || player.state === 'roll') {
        let dx = 0;
        let dy = 0;

        if (keys.w) dy -= currentSpeed;
        if (keys.s) dy += currentSpeed;
        if (keys.a) { dx -= currentSpeed; player.facingRight = false; }
        if (keys.d) { dx += currentSpeed; player.facingRight = true; }

        // Нормализация диагональной скорости
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        player.x += dx;
        player.y += dy;

        // Ограничения экрана (псевдо-3D границы)
        // Верхняя часть экрана - "горизонт", туда зайти нельзя
        const horizon = 200; 
        if (player.x < player.width/2) player.x = player.width/2;
        if (player.x > canvas.width - player.width/2) player.x = canvas.width - player.width/2;
        if (player.y < horizon) player.y = horizon;
        if (player.y > canvas.height) player.y = canvas.height;
    }
}

function draw() {
    // Очистка и отрисовка фона
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем горизонт (лес на заднем плане)
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(0, 0, canvas.width, 180);

    if (currentState === 'PLAY') {
        // В 2.5D играх очень важна сортировка отрисовки по оси Y (глубина)
        // Собираем все объекты для отрисовки в массив и сортируем
        let renderQueue = [player, ...environment];
        renderQueue.sort((a, b) => a.y - b.y);

        for (let obj of renderQueue) {
            if (obj === player) drawPlayer();
            else {
                // Отрисовка объектов окружения
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x - obj.width/2, obj.y - obj.height, obj.width, obj.height);
                // Тень
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(obj.x, obj.y, obj.width/1.5, 10, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawPlayer() {
    // Тень (рисуется на земле, то есть на Y)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y, player.width/1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Сам игрок
    ctx.fillStyle = player.color;
    
    // Меняем цвет/форму в зависимости от состояния
    if (player.state === 'roll') ctx.fillStyle = '#bcaaa4';
    if (player.state === 'attack1') ctx.fillStyle = '#ff5722';
    if (player.state === 'attack2') ctx.fillStyle = '#d32f2f';

    // Для 2.5D эффекта персонаж рисуется ВВЕРХ от своей Y координаты
    let drawY = player.y - player.height;

    // Сплющиваем игрока во время кувырка
    let drawHeight = player.state === 'roll' ? player.height / 2 : player.height;
    if (player.state === 'roll') drawY += player.height / 2;

    ctx.fillRect(player.x - player.width/2, drawY, player.width, drawHeight);

    // Указатель направления (глаза/лицо)
    ctx.fillStyle = '#fff';
    let eyeX = player.facingRight ? player.x + 10 : player.x - 15;
    ctx.fillRect(eyeX, drawY + 10, 5, 5);

    // Визуализация атаки (хитбокс)
    if (player.state === 'attack1' || player.state === 'attack2') {
        ctx.fillStyle = player.state === 'attack1' ? 'rgba(255, 165, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        let reach = player.state === 'attack1' ? 40 : 60;
        let attackWidth = 50;
        let hitboxX = player.facingRight ? player.x + player.width/2 : player.x - player.width/2 - attackWidth;
        ctx.fillRect(hitboxX, drawY + 20, attackWidth, reach);
    }
}

// Игровой цикл
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Запуск
gameLoop();

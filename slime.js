const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() { 
    width = canvas.width = window.innerWidth; 
    height = canvas.height = window.innerHeight; 
}
window.addEventListener('resize', resize); resize();

let gameState = 'tutorial'; // Возможные состояния: 'tutorial', 'playing', 'paused', 'paused_menu', 'levelup', 'gameover', 'transition'
const WORLD_SIZE = 2500; 
let camera = { x: 0, y: 0 };

const biomes = [
    { name: "Темный Лес", bg: '#0a0f0a', line: '#1a2a1a', req: 10, enemies: ['trash', 'frog'] },
    { name: "Гнилое Болото", bg: '#100a12', line: '#2a1a2a', req: 20, enemies: ['trash', 'frog', 'lizard'] },
    { name: "Погост Древних", bg: '#0a0a12', line: '#1a1a2a', req: 30, enemies: ['bone', 'undead', 'lizard'] },
    { name: "Бездна", bg: '#050005', line: '#200020', req: 40, enemies: ['lizard', 'undead', 'leprechaun'] },
    { name: "Выжженные Земли", bg: '#1a0505', line: '#330a0a', req: 50, enemies: ['bone', 'lizard', 'bomber'] }, 
    { name: "Замерзшее Озеро", bg: '#001122', line: '#002244', req: 60, enemies: ['frog', 'leprechaun', 'bomber'] }, 
    { name: "Грибные Глубины", bg: '#112211', line: '#224422', req: 70, enemies: ['trash', 'bomber', 'undead'] },
    { name: "Заброшенная Цитадель", bg: '#1a1a1a', line: '#333', req: 85, enemies: ['lizard', 'undead', 'hunter'] }, 
    { name: "Искаженное Пространство", bg: '#220022', line: '#440044', req: 100, enemies: ['hunter', 'bomber', 'leprechaun'] },
    { name: "Ядро Аномалии", bg: '#000', line: '#ff0000', req: 120, enemies: ['hunter', 'bomber', 'lizard', 'undead'] },
    { name: "СЕРДЦЕ БЕЗДНЫ", bg: '#080000', line: '#220000', req: 9999, enemies: [] }
];
let currentBiomeIdx = 0;

const bestiaryData = {
    'trash': { name: "Обломки", desc: "Дает 1 массу.", icon: "🪵" },
    'frog': { name: "Фрогфолк", desc: "Дает 2 массы и 2 опыта.", icon: "🐸" },
    'leprechaun': { name: "Лепрекон", desc: "Убегает, дает 50 опыта!", icon: "💰" },
    'lizard': { name: "Каменный Страж", desc: "Пробивается только РЫВКОМ. Дает 3 массы и 5 опыта.", icon: "🛡️" },
    'undead': { name: "Гниющий Древень", desc: "Оставляет заразное семя.", icon: "🌳" },
    'bone': { name: "Зараженное Семя", desc: "Вырастет, если не съесть. Дает 1 массу и 1 опыт.", icon: "🌱" },
    'hunter': { name: "Теневой Коготь", desc: "Преследует. Уничтожается РЫВКОМ. Дает 4 массы и 10 опыта.", icon: "👁️‍🗨️" },
    'bomber': { name: "Нестабильный Кристалл", desc: "Взрывается по площади. Держитесь подальше.", icon: "💎" },
    'projectile': { name: "Сгусток Тьмы", desc: "Чистая ненависть. Наносит урон при касании.", icon: "☄️" },
    'boss': { name: "Владыка Аномалии", desc: "ФИНАЛЬНЫЙ БОСС. Уклоняйтесь от атак и бейте его РЫВКОМ!", icon: "👁️" }
};
let discoveredEnemies = new Set(['trash']); 

let player = {
    x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 + 200,
    radius: 20, baseRadius: 20,
    speed: 250, dashSpeed: 1000, targetX: WORLD_SIZE / 2, targetY: WORLD_SIZE / 2 + 200,
    hp: 3, maxHp: 3, invulnTimer: 0, load: 0, maxLoad: 10, xp: 0, level: 1, xpNeeded: 10,
    isDashing: false, dashCooldown: 0, maxDashCooldown: 2.0, dashDuration: 0, dashAngle: 0, stunTimer: 0,
    magnetRadius: 0, colorBase: '#006400', colorInner: '#32cd32'
};

let portal = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: 70, pulse: 0, fed: 0 };
let entities = [];
let explosions = []; 
let bossEntity = null; 

const cardPool = [
    { id: 'hp', title: "Плотная Слизь", desc: "+1 Макс HP и лечение", icon: "❤️", action: () => { player.maxHp++; player.hp = player.maxHp; } },
    { id: 'capacity', title: "Бездонный Желудок", desc: "+5 к вместимости", icon: "🎒", action: () => { player.maxLoad += 5; } },
    { id: 'speed', title: "Желейные Мышцы", desc: "Скорость +15%", icon: "⚡", action: () => { player.speed *= 1.15; } },
    { id: 'dash', title: "Теневой Рывок", desc: "КД рывка -0.3 сек", icon: "💨", action: () => { player.maxDashCooldown = Math.max(0.5, player.maxDashCooldown - 0.3); } },
    { id: 'magnet', title: "Гравитация", desc: "Усиливает магнит", icon: "🧲", action: () => { player.magnetRadius += 40; } },
    { id: 'heal', title: "Регенерация", desc: "Лечение на максимум", icon: "🩹", action: () => { player.hp = player.maxHp; } }
];

function spawnEntities() {
    entities = [];
    if (currentBiomeIdx === 10) {
        bossEntity = { type: 'boss', x: WORLD_SIZE/2, y: WORLD_SIZE/2, size: 100, hp: 30, maxHp: 30, active: true, stateTimer: 3.0, phase: 1, angle: 0 };
        entities.push(bossEntity);
        for(let i=0; i<30; i++) spawnDroppedMass(WORLD_SIZE/2 + (Math.random()-0.5)*1000, WORLD_SIZE/2 + (Math.random()-0.5)*1000);
        document.getElementById('boss-ui').style.display = 'block';
        document.getElementById('biome-box').style.display = 'none'; 
        return;
    }

    let b = biomes[Math.min(currentBiomeIdx, biomes.length - 1)];
    for (let i = 0; i < 150 + (currentBiomeIdx * 30); i++) {
        let rx = Math.random() * WORLD_SIZE, ry = Math.random() * WORLD_SIZE;
        if (Math.hypot(rx - portal.x, ry - portal.y) < 300) continue;
        
        let type = b.enemies[Math.floor(Math.random() * b.enemies.length)];
        let size = 16;
        if(type === 'lizard' || type === 'hunter') size = 20;
        if(type === 'bomber') size = 22;
        if(type === 'trash' || type === 'leprechaun') size = 12;
        
        let stateTimer = (type === 'bone') ? 3 : (type === 'bomber') ? 0 : 0;
        entities.push({ x: rx, y: ry, type: type, size: size, active: true, vx: 0, vy: 0, stateTimer: stateTimer, angle: Math.random() * Math.PI * 2 });
    }
}
spawnEntities();

// === ОБРАБОТЧИКИ КНОПОК UI И ПАУЗЫ ===
const bestiaryPanel = document.getElementById('bestiary-panel');
const pauseScreen = document.getElementById('pause-screen');

document.getElementById('start-btn').onclick = () => {
    document.getElementById('tutorial-screen').style.display = 'none';
    gameState = 'playing';
};

// Функция переключения паузы
function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused_menu'; 
        pauseScreen.style.display = 'flex';
    } else if (gameState === 'paused_menu') {
        gameState = 'playing'; 
        pauseScreen.style.display = 'none';
    }
}

document.getElementById('pause-btn').onclick = togglePause;
document.getElementById('resume-btn').onclick = togglePause;

// Горячие клавиши (Escape для паузы)
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (gameState === 'playing' || gameState === 'paused_menu') {
            togglePause();
        } else if (gameState === 'paused' && bestiaryPanel.style.display === 'block') {
            gameState = 'playing';
            bestiaryPanel.style.display = 'none';
        }
    }
});

document.getElementById('bestiary-btn').onclick = () => { 
    if (gameState === 'tutorial') return; 
    if (bestiaryPanel.style.display === 'block') {
        gameState = 'playing'; bestiaryPanel.style.display = 'none'; 
    } else {
        gameState = 'paused'; bestiaryPanel.style.display = 'block'; renderBestiary(); 
    }
};

document.getElementById('close-bestiary').onclick = () => { 
    gameState = 'playing'; bestiaryPanel.style.display = 'none'; 
};

function renderBestiary() {
    const container = document.getElementById('bestiary-container');
    container.innerHTML = '';
    for (let key in bestiaryData) {
        let m = bestiaryData[key];
        let known = discoveredEnemies.has(key);
        container.innerHTML += `
            <div class="monster-card ${known ? 'discovered' : ''}">
                <div class="monster-icon">${known ? m.icon : '❓'}</div>
                <div class="monster-info">
                    <h4>${known ? m.name : 'Неизвестная особь'}</h4>
                    <p>${known ? m.desc : 'Скушайте это существо, чтобы изучить.'}</p>
                </div>
            </div>`;
    }
}

// === УПРАВЛЕНИЕ ===
let lastTapTime = 0; 

function setTarget(clientX, clientY) {
    if (gameState !== 'playing' || player.stunTimer > 0 || player.isDashing) return;
    player.targetX = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, clientX - width / 2 + player.x));
    player.targetY = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, clientY - height / 2 + player.y));
}

canvas.addEventListener('pointermove', (e) => { 
    if(e.buttons === 1 || e.pointerType === 'touch') setTarget(e.clientX, e.clientY); 
});

canvas.addEventListener('pointerdown', (e) => {
    if (gameState !== 'playing') return;
    let currentTime = new Date().getTime();
    let tapLength = currentTime - lastTapTime;
    
    if(e.button === 2 || (tapLength < 300 && tapLength > 0)) {
        activateDash(e.clientX, e.clientY);
        e.preventDefault(); 
    } else {
        setTarget(e.clientX, e.clientY);
    }
    lastTapTime = currentTime;
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

function activateDash(mouseX, mouseY) {
    if (player.dashCooldown <= 0 && player.stunTimer <= 0 && player.load > 0) {
        player.isDashing = true; 
        player.dashDuration = currentBiomeIdx === 5 ? 0.3 : 0.20; 
        player.dashCooldown = player.maxDashCooldown;
        let targetWorldX = mouseX - width / 2 + player.x, targetWorldY = mouseY - height / 2 + player.y;
        player.dashAngle = Math.atan2(targetWorldY - player.y, targetWorldX - player.x);
        player.load--; updateRadius(); updateUI();
    }
}

function spawnDroppedMass(x, y) { 
    entities.push({ x: x, y: y, type: 'trash', size: 12, active: true, vx: 0, vy: 0, stateTimer: 0, angle: Math.random() * Math.PI * 2 }); 
}

function takeDamage(enemyType) {
    if (player.invulnTimer > 0 || player.isDashing) return;
    if(enemyType) discoveredEnemies.add(enemyType); 
    
    player.hp--; player.invulnTimer = 1.0; player.stunTimer = 0.3;
    let lost = Math.floor(player.load / 2); player.load -= lost;
    for(let i=0; i<lost; i++) spawnDroppedMass(player.x + (Math.random()-0.5)*150, player.y + (Math.random()-0.5)*150);
    updateRadius(); updateUI();

    if (player.hp <= 0) {
        gameState = 'gameover';
        document.getElementById('final-score').innerText = `Вы погибли. Достигнут Биом: ${biomes[Math.min(currentBiomeIdx, biomes.length-1)].name}`;
        document.getElementById('game-over-screen').style.display = 'flex';
    }
}

function gainXP(amount) {
    player.xp += amount;
    if (player.xp >= player.xpNeeded) {
        player.xp -= player.xpNeeded; player.level++; player.xpNeeded = Math.floor(player.xpNeeded * 1.5);
        gameState = 'levelup';
        const container = document.getElementById('cards-container'); container.innerHTML = '';
        cardPool.sort(() => 0.5 - Math.random()).slice(0, 3).forEach(card => {
            let div = document.createElement('div'); div.className = 'card';
            div.innerHTML = `<div class="card-icon">${card.icon}</div>
                             <div class="card-info">
                                 <div class="card-title">${card.title}</div>
                                 <div class="card-desc">${card.desc}</div>
                             </div>`;
            div.onclick = () => { card.action(); document.getElementById('level-up-screen').style.display = 'none'; gameState = 'playing'; updateUI(); };
            container.appendChild(div);
        });
        document.getElementById('level-up-screen').style.display = 'flex';
    }
    updateUI();
}

function feedPortal() {
    portal.fed++; portal.pulse = 1.5; gainXP(1);
    let req = biomes[Math.min(currentBiomeIdx, biomes.length - 1)].req;
    if (portal.fed >= req) {
        gameState = 'transition'; currentBiomeIdx++; portal.fed = 0; explosions = []; 
        let flashDiv = document.createElement('div');
        flashDiv.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; background:white; z-index:50; opacity:0; transition: opacity 1s;";
        document.body.appendChild(flashDiv);
        player.targetX = portal.x; player.targetY = portal.y;
        setTimeout(() => { flashDiv.style.opacity = '1'; }, 100);
        setTimeout(() => { spawnEntities(); updateUI(); flashDiv.style.opacity = '0'; gameState = 'playing'; setTimeout(() => flashDiv.remove(), 1000); }, 1500);
    }
    updateUI();
}

function updateUI() {
    document.getElementById('load-text').innerText = `Масса: ${player.load} / ${player.maxLoad}`;
    let hearts = ""; for(let i=0; i<player.maxHp; i++) hearts += (i < player.hp) ? "❤️" : "🖤";
    document.getElementById('hp-bar').innerText = hearts;
    
    let dashEl = document.getElementById('dash-status');
    if (player.dashCooldown > 0) {
        dashEl.innerText = `Рывок: ${player.dashCooldown.toFixed(1)}с`; dashEl.style.color = '#ff5555'; 
    } else {
        dashEl.innerText = `Рывок: ГОТОВ`; dashEl.style.color = '#adff2f'; 
    }

    let b = biomes[Math.min(currentBiomeIdx, biomes.length - 1)];
    document.getElementById('biome-text').innerText = `Биом ${currentBiomeIdx + 1}: ${b.name}`;
    document.getElementById('anomaly-bar').style.width = `${(portal.fed / b.req) * 100}%`;
    document.getElementById('xp-text').innerText = `УРОВЕНЬ ${player.level}`;
    document.getElementById('xp-bar').style.width = `${(player.xp / player.xpNeeded) * 100}%`;
    
    if (bossEntity) {
        document.getElementById('boss-hp-fill').style.width = `${(bossEntity.hp / bossEntity.maxHp) * 100}%`;
    }
}
function updateRadius() { player.radius = player.baseRadius + (player.load * 1.5); }

// === ИГРОВОЙ ЦИКЛ ===
let lastTime = 0, gameTime = 0;
function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = timestamp; 
    
    // Останавливаем физику, если игра на паузе (туториал, смерть, левел-ап, пауза)
    if (gameState === 'playing' || gameState === 'transition') { 
        gameTime += dt; 
        update(dt); 
    }
    
    draw(); 
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (player.invulnTimer > 0) player.invulnTimer -= dt;
    if (player.stunTimer > 0) player.stunTimer -= dt;
    if (player.dashDuration > 0) player.dashDuration -= dt; else if (player.isDashing) { player.isDashing = false; player.targetX = player.x; player.targetY = player.y; }
    if (player.dashCooldown > 0) { player.dashCooldown -= dt; updateUI(); }

    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].life -= dt; if (explosions[i].life <= 0) explosions.splice(i, 1);
    }

    if (player.stunTimer <= 0) {
        if (player.isDashing) {
            player.x += Math.cos(player.dashAngle) * player.dashSpeed * dt; player.y += Math.sin(player.dashAngle) * player.dashSpeed * dt;
        } else if (gameState !== 'transition') {
            const dx = player.targetX - player.x, dy = player.targetY - player.y;
            const distance = Math.hypot(dx, dy);
            let speedMult = currentBiomeIdx === 5 ? 1.5 : 1.0;
            if (distance > 5) {
                const moveDist = player.speed * speedMult * dt;
                if (moveDist > distance) { player.x = player.targetX; player.y = player.targetY; } 
                else { player.x += (dx / distance) * moveDist; player.y += (dy / distance) * moveDist; }
            }
        } else if (currentBiomeIdx < 10) {
            player.x += (portal.x - player.x) * 2 * dt; player.y += (portal.y - player.y) * 2 * dt;
        }
        player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x)); player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y));
    }

    for (let i = 0; i < entities.length; i++) {
        let e = entities[i]; if (!e.active) continue;
        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        
        if (e.type === 'boss') {
            e.angle += dt * 0.5; 
            e.stateTimer -= dt;
            if (e.hp <= 20 && e.phase === 1) { e.phase = 2; e.stateTimer = 1.0; }
            if (e.hp <= 10 && e.phase === 2) { e.phase = 3; e.stateTimer = 1.0; }
            if (e.phase === 3) {
                let angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
                e.x += Math.cos(angleToPlayer) * 120 * dt; e.y += Math.sin(angleToPlayer) * 120 * dt;
            }
            if (e.stateTimer <= 0) {
                if (e.phase === 1) {
                    for(let k=0; k<12; k++) {
                        let a = (Math.PI*2/12) * k + e.angle;
                        entities.push({ type: 'projectile', x: e.x, y: e.y, size: 15, vx: Math.cos(a)*400, vy: Math.sin(a)*400, active: true, angle: a });
                    }
                    e.stateTimer = 2.5;
                    spawnDroppedMass(e.x + (Math.random()-0.5)*600, e.y + (Math.random()-0.5)*600);
                } else if (e.phase === 2 || e.phase === 3) {
                    let a = e.angle * 4;
                    entities.push({ type: 'projectile', x: e.x, y: e.y, size: 15, vx: Math.cos(a)*500, vy: Math.sin(a)*500, active: true, angle: a });
                    entities.push({ type: 'projectile', x: e.x, y: e.y, size: 15, vx: Math.cos(a+Math.PI)*500, vy: Math.sin(a+Math.PI)*500, active: true, angle: a+Math.PI });
                    e.stateTimer = 0.2;
                    if (Math.random() < 0.1) spawnDroppedMass(e.x + (Math.random()-0.5)*800, e.y + (Math.random()-0.5)*800);
                }
            }
            if (distToPlayer < player.radius + e.size) {
                if (player.isDashing) {
                    e.hp--; updateUI(); discoveredEnemies.add('boss');
                    player.isDashing = false;
                    let bounceAngle = Math.atan2(player.y - e.y, player.x - e.x);
                    player.targetX = player.x + Math.cos(bounceAngle) * 300; player.targetY = player.y + Math.sin(bounceAngle) * 300;
                    player.x = player.targetX; player.y = player.targetY;
                    explosions.push({ x: e.x, y: e.y, maxRadius: e.size*1.5, life: 0.3, maxLife: 0.3 });
                    if (e.hp <= 0) {
                        e.active = false; gameState = 'gameover';
                        document.getElementById('game-over-title').innerText = "БЕЗДНА ПОКОРЕНА!";
                        document.getElementById('game-over-title').style.color = "#adff2f";
                        document.getElementById('final-score').innerText = `Вы уничтожили Владыку Аномалии на ${player.level} уровне!`;
                        document.getElementById('game-over-screen').style.display = 'flex';
                    }
                } else {
                    takeDamage('boss');
                    let bounceAngle = Math.atan2(player.y - e.y, player.x - e.x);
                    player.x += Math.cos(bounceAngle) * 150; player.y += Math.sin(bounceAngle) * 150;
                    player.targetX = player.x; player.targetY = player.y;
                }
            }
            continue; 
        }
        
        if (e.type === 'projectile') {
            e.x += e.vx * dt; e.y += e.vy * dt;
            if (e.x < 0 || e.x > WORLD_SIZE || e.y < 0 || e.y > WORLD_SIZE) e.active = false;
            if (distToPlayer < player.radius + e.size/2) { takeDamage('projectile'); e.active = false; }
            continue;
        }

        if (player.load < player.maxLoad && player.magnetRadius > 0 && (e.type === 'trash' || e.type === 'bone')) {
            if (distToPlayer < player.magnetRadius + player.radius) {
                const magAngle = Math.atan2(player.y - e.y, player.x - e.x); e.x += Math.cos(magAngle) * 300 * dt; e.y += Math.sin(magAngle) * 300 * dt;
            }
        }
        
        switch (e.type) {
            case 'frog':
                e.stateTimer -= dt;
                if (distToPlayer < 250 && e.stateTimer <= 0) { e.angle = Math.atan2(e.y - player.y, e.x - player.x); e.vx = Math.cos(e.angle) * 800; e.vy = Math.sin(e.angle) * 800; e.stateTimer = 1.5; }
                e.vx *= 0.85; e.vy *= 0.85; e.x += e.vx * dt; e.y += e.vy * dt; if (Math.hypot(e.vx, e.vy) > 10) e.angle = Math.atan2(e.vy, e.vx); break;
            case 'lizard':
                if (distToPlayer < 150) { e.angle = Math.atan2(player.y - e.y, player.x - e.x); e.x -= Math.cos(e.angle) * 40 * dt; e.y -= Math.sin(e.angle) * 40 * dt; } break;
            case 'undead':
                e.stateTimer -= dt; if (e.stateTimer <= 0) { e.angle = Math.random() * Math.PI * 2; e.vx = Math.cos(e.angle) * 60; e.vy = Math.sin(e.angle) * 60; e.stateTimer = 2.0; }
                e.x += e.vx * dt; e.y += e.vy * dt; break;
            case 'bone': e.stateTimer -= dt; if (e.stateTimer <= 0) { e.type = 'undead'; e.size = 18; } break;
            case 'leprechaun':
                if (distToPlayer < 350) { e.angle = Math.atan2(e.y - player.y, e.x - player.x) + (Math.sin(gameTime * 15) * 0.5); e.x += Math.cos(e.angle) * 220 * dt; e.y += Math.sin(e.angle) * 220 * dt; } break;
            case 'hunter':
                if (distToPlayer < 350) { e.angle = Math.atan2(player.y - e.y, player.x - e.x); e.x += Math.cos(e.angle) * 180 * dt; e.y += Math.sin(e.angle) * 180 * dt; } break;
            case 'bomber':
                if (distToPlayer < 120) { 
                    e.stateTimer += dt; 
                    if(e.stateTimer > 1.0) { explosions.push({ x: e.x, y: e.y, maxRadius: 150, life: 0.5, maxLife: 0.5 }); if(distToPlayer < 150) takeDamage('bomber'); e.active = false; } 
                } else { e.stateTimer = 0; }
                e.angle += dt; if (e.stateTimer === 0) { e.x += Math.cos(e.angle) * 20 * dt; e.y += Math.sin(e.angle) * 20 * dt; } break;
        }
        e.x = Math.max(0, Math.min(WORLD_SIZE, e.x)); e.y = Math.max(0, Math.min(WORLD_SIZE, e.y));
        
        if (distToPlayer < player.radius + e.size / 2 && e.active) {
            if ((e.type === 'lizard' || e.type === 'hunter') && !player.isDashing) {
                const angle = Math.atan2(player.y - e.y, player.x - e.x); player.x += Math.cos(angle) * 60; player.y += Math.sin(angle) * 60; player.targetX = player.x; player.targetY = player.y; takeDamage(e.type); continue;
            }
            if (e.type === 'bomber') { explosions.push({ x: e.x, y: e.y, maxRadius: 150, life: 0.5, maxLife: 0.5 }); takeDamage('bomber'); e.active = false; continue; }
            if (e.type === 'undead') { discoveredEnemies.add('undead'); e.type = 'bone'; e.size = 14; e.stateTimer = 4.0; const angle = Math.atan2(player.y - e.y, player.x - e.x); player.x += Math.cos(angle) * 15; player.y += Math.sin(angle) * 15; continue; }
            if (e.type === 'leprechaun') { discoveredEnemies.add('leprechaun'); gainXP(50); e.active = false; continue; }
            
            let isFoodOnly = ['trash', 'bone', 'frog'].includes(e.type);
            if (isFoodOnly && player.load >= player.maxLoad) {
                let pushAngle = Math.atan2(e.y - player.y, e.x - player.x); e.x += Math.cos(pushAngle) * 150 * dt; e.y += Math.sin(pushAngle) * 150 * dt; continue; 
            }

            discoveredEnemies.add(e.type); e.active = false; 
            let gainedMass = 1; let gainedXp = 0;
            switch(e.type) { case 'trash': gainedMass = 1; gainedXp = 0; break; case 'bone':  gainedMass = 1; gainedXp = 1; break; case 'frog':  gainedMass = 2; gainedXp = 2; break; case 'lizard': gainedMass = 3; gainedXp = 5; break; case 'hunter': gainedMass = 4; gainedXp = 10; break; }
            
            if (player.load < player.maxLoad) { player.load = Math.min(player.maxLoad, player.load + gainedMass); updateRadius(); }
            if (gainedXp > 0) gainXP(gainedXp); else updateUI();
        }
    }
    entities = entities.filter(e => e.active);

    if (currentBiomeIdx < 10) {
        const distToPortal = Math.hypot(player.x - portal.x, player.y - portal.y);
        if (distToPortal < portal.radius + player.radius && player.load > 0 && !player.isDashing && player.stunTimer <= 0) {
            player.load -= 1; updateRadius(); feedPortal();
        }
        if (portal.pulse > 0) portal.pulse = Math.max(0, portal.pulse - dt * 2);
    }
    
    camera.x = player.x - width / 2; camera.y = player.y - height / 2;
}

function draw() {
    let bgConfig = biomes[Math.min(currentBiomeIdx, biomes.length - 1)];
    ctx.fillStyle = bgConfig.bg; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(-camera.x, -camera.y);

    ctx.strokeStyle = bgConfig.line; ctx.lineWidth = 2;
    for(let i=0; i<=WORLD_SIZE; i+=100) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i); ctx.stroke(); }

    if (player.magnetRadius > 0) { ctx.fillStyle = 'rgba(138, 43, 226, 0.05)'; ctx.beginPath(); ctx.arc(player.x, player.y, player.magnetRadius + player.radius, 0, Math.PI * 2); ctx.fill(); }

    for (let exp of explosions) {
        ctx.save(); ctx.translate(exp.x, exp.y);
        let progress = 1 - (exp.life / exp.maxLife); let currentRadius = exp.maxRadius * progress; let alpha = Math.max(0, exp.life / exp.maxLife);
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(0, 0, currentRadius, 0, Math.PI*2); ctx.lineWidth = 15 * alpha; ctx.strokeStyle = '#ff4081'; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, currentRadius * 0.6, 0, Math.PI*2); ctx.fillStyle = '#aa00ff'; ctx.fill(); ctx.restore();
    }

    for (let i = 0; i < entities.length; i++) {
        let e = entities[i]; if (!e.active) continue;
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle || 0);
        
        if (e.type !== 'boss' && e.type !== 'projectile') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, e.size*0.3, e.size*0.8, e.size*0.5, 0, 0, Math.PI*2); ctx.fill();
        }

        let eSpeed = Math.hypot(e.vx || 0, e.vy || 0);
        switch(e.type) {
            case 'trash': 
                ctx.fillStyle = '#5c3a21'; ctx.fillRect(-e.size, -e.size/4, e.size*2, e.size/2); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-e.size, -e.size/4, e.size*2, e.size/6);
                ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-e.size*0.8, 0); ctx.lineTo(e.size*0.8, 0); ctx.stroke();
                ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(0, e.size/2, e.size/1.5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(-e.size/6, e.size/2.5, e.size/2.5, 0, Math.PI*2); ctx.fill(); break;
            case 'bone': 
                let pulse = 1 + Math.sin(gameTime * 5) * 0.1; ctx.scale(pulse, pulse);
                ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.ellipse(0, 0, e.size, e.size*0.7, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#76ff03'; ctx.beginPath(); ctx.ellipse(0, 0, e.size*0.6, e.size*0.4, 0, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#003300'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-e.size*0.3, 0); ctx.lineTo(e.size*0.3, 0); ctx.stroke();
                ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-e.size, 0); ctx.lineTo(-e.size*1.5, -e.size*0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.size, 0); ctx.lineTo(e.size*1.5, e.size*0.5); ctx.stroke(); break;
            case 'frog': 
                ctx.scale(1 + (eSpeed/1500), 1 - (eSpeed/2000));
                ctx.fillStyle = '#1e5e3a'; if (eSpeed > 50) { ctx.beginPath(); ctx.ellipse(-e.size, -e.size*0.5, e.size*0.6, e.size*0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-e.size, e.size*0.5, e.size*0.6, e.size*0.2, 0, 0, Math.PI*2); ctx.fill(); }
                ctx.fillStyle = '#2e8b57'; ctx.beginPath(); ctx.ellipse(0, 0, e.size, e.size*0.8, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#1a4d33'; ctx.beginPath(); ctx.arc(-e.size*0.3, 0, e.size*0.2, 0, Math.PI*2); ctx.fill(); 
                ctx.fillStyle = '#3cb371'; ctx.beginPath(); ctx.ellipse(0, -e.size*0.2, e.size*0.6, e.size*0.4, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.size*0.5, -e.size*0.6, e.size*0.4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(e.size*0.5, e.size*0.6, e.size*0.4, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.size*0.7, -e.size*0.6, e.size*0.15, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(e.size*0.7, e.size*0.6, e.size*0.15, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#5c3a21'; ctx.fillRect(-e.size*0.5, e.size*0.7, e.size*2.5, e.size*0.2); ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.moveTo(e.size*2, e.size*0.6); ctx.lineTo(e.size*2.8, e.size*0.8); ctx.lineTo(e.size*2, e.size*1.0); ctx.fill(); break;
            case 'lizard': 
                ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.moveTo(-e.size, -e.size); ctx.lineTo(e.size*0.3, -e.size*0.8); ctx.lineTo(e.size*0.6, 0); ctx.lineTo(e.size*0.3, e.size*0.8); ctx.lineTo(-e.size, e.size); ctx.fill();
                ctx.fillStyle = '#546e7a'; ctx.beginPath(); ctx.moveTo(-e.size*0.8, -e.size*0.8); ctx.lineTo(e.size*0.1, -e.size*0.6); ctx.lineTo(e.size*0.3, 0); ctx.lineTo(-e.size*0.8, 0); ctx.fill();
                ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-e.size*0.3, -e.size*0.4); ctx.lineTo(0, e.size*0.3); ctx.lineTo(-e.size*0.5, e.size*0.2); ctx.stroke();
                ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 15; ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(e.size*0.3, 0, e.size + 4, -Math.PI/2.5, Math.PI/2.5); ctx.stroke(); ctx.shadowBlur = 0; break;
            case 'undead': 
                ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.moveTo(-e.size, -e.size*0.5); ctx.lineTo(e.size*1.2, -e.size*0.8); ctx.lineTo(e.size*0.5, -e.size*0.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(-e.size, e.size*0.5); ctx.lineTo(e.size*1.2, e.size*0.8); ctx.lineTo(e.size*0.5, e.size*0.3); ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, e.size, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#76ff03'; ctx.shadowColor = '#76ff03'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(e.size*0.2, 0, e.size*0.4, e.size*0.6, 0, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
                ctx.strokeStyle = '#76ff03'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-e.size*0.5, -e.size*0.5); ctx.lineTo(e.size*0.1, -e.size*0.1); ctx.stroke(); break;
            case 'leprechaun': 
                ctx.translate(0, (eSpeed > 10) ? -Math.abs(Math.sin(gameTime * 15)) * e.size * 0.3 : 0);
                ctx.fillStyle = '#d2691e'; ctx.beginPath(); ctx.arc(e.size*0.5, 0, e.size*0.7, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ffcc99'; ctx.beginPath(); ctx.arc(0, 0, e.size*0.8, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#006400'; ctx.fillRect(-e.size*0.5, -e.size*0.8, e.size, e.size*1.6); ctx.fillRect(-e.size*0.8, -e.size*0.5, e.size*0.8, e.size);
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(-e.size*0.5, -e.size*0.2, e.size*0.3, e.size*0.4);
                ctx.fillStyle = '#3cb371'; ctx.beginPath(); ctx.arc(-e.size*0.6, -e.size*0.6, e.size*0.2, 0, Math.PI*2); ctx.fill();
                ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15; ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(e.size*1.2, 0, e.size*0.6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(e.size*1.2, 0, e.size*0.4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; break;
            case 'hunter': 
                ctx.fillStyle = '#1a237e'; ctx.beginPath(); ctx.ellipse(-e.size*0.2, 0, e.size*0.8, e.size*0.6, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#311b92'; ctx.beginPath(); ctx.ellipse(-e.size*0.2, 0, e.size*0.5, e.size*0.4, 0, 0, Math.PI*2); ctx.fill();
                let clawGrip = Math.sin(gameTime * 10) * e.size * 0.2; ctx.fillStyle = '#1a237e'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-e.size*0.2, -e.size*0.5); ctx.lineTo(e.size*0.8 + clawGrip, -e.size*0.8); ctx.lineTo(e.size*0.5, -e.size*0.2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -e.size*0.2); ctx.lineTo(e.size*1.2 + clawGrip, 0); ctx.lineTo(0, e.size*0.2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-e.size*0.2, e.size*0.5); ctx.lineTo(e.size*0.8 + clawGrip, e.size*0.8); ctx.lineTo(e.size*0.5, e.size*0.2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#d50000'; ctx.beginPath(); ctx.moveTo(e.size*0.8 + clawGrip, -e.size*0.8); ctx.lineTo(e.size*1.4 + clawGrip, -e.size*0.5); ctx.lineTo(e.size*0.5, -e.size*0.2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(e.size*1.2 + clawGrip, 0); ctx.lineTo(e.size*1.8 + clawGrip, 0); ctx.lineTo(0, e.size*0.2); ctx.fill(); ctx.beginPath(); ctx.moveTo(e.size*0.8 + clawGrip, e.size*0.8); ctx.lineTo(e.size*1.4 + clawGrip, e.size*0.5); ctx.lineTo(e.size*0.5, e.size*0.2); ctx.fill(); break;
            case 'bomber': 
                ctx.rotate(gameTime * (2 + e.stateTimer * 10)); let bScale = 1 + (e.stateTimer > 0 ? Math.sin(gameTime * 30) * 0.2 : 0); ctx.scale(bScale, bScale);
                ctx.fillStyle = '#aa00ff'; ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.moveTo(e.size, 0); ctx.lineTo(0, e.size*0.6); ctx.lineTo(-e.size, 0); ctx.lineTo(0, -e.size*0.6); ctx.fill();
                if (e.stateTimer > 0) { ctx.fillStyle = (Math.floor(gameTime * 20)%2===0) ? '#fff' : '#ff4081'; ctx.beginPath(); ctx.moveTo(e.size*0.6, 0); ctx.lineTo(0, e.size*0.3); ctx.lineTo(-e.size*0.6, 0); ctx.lineTo(0, -e.size*0.3); ctx.fill(); } 
                else { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(e.size, 0); ctx.lineTo(0, e.size*0.6); ctx.lineTo(0, -e.size*0.6); ctx.fill(); }
                ctx.shadowBlur = 0; ctx.fillStyle = '#ff4081'; ctx.fillRect(e.size*1.2, 0, 4, 4); ctx.fillRect(-e.size*1.2, 0, 4, 4); ctx.fillRect(0, e.size*1.2, 4, 4); ctx.fillRect(0, -e.size*1.2, 4, 4); break;
            
            case 'projectile':
                ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 15; ctx.fillStyle = '#ff0044'; ctx.beginPath(); ctx.arc(0, 0, e.size, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, e.size*0.5, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; break;
            case 'boss':
                let bossPulse = 1 + Math.sin(gameTime * 2) * 0.05; ctx.scale(bossPulse, bossPulse);
                ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 40; ctx.fillStyle = '#110000'; ctx.beginPath(); ctx.arc(0, 0, e.size, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.ellipse(0, 0, e.size*0.6, e.size*0.3, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, e.size*0.2, e.size*0.3, 0, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0; ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 8; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(0, 0, e.size*1.3, e.angle, e.angle + Math.PI*0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, e.size*1.3, e.angle + Math.PI, e.angle + Math.PI*1.8); ctx.stroke(); break;
        }
        ctx.restore();
    }

    if (currentBiomeIdx < 10) {
        ctx.save(); ctx.translate(portal.x, portal.y); ctx.rotate(gameTime * 0.5);
        const pulseScale = 1 + (Math.sin(gameTime * 3) * 0.05) + (portal.pulse * 0.2);
        const currentRadius = portal.radius * pulseScale;
        const gradient = ctx.createRadialGradient(0, 0, currentRadius * 0.5, 0, 0, currentRadius * 2.5);
        gradient.addColorStop(0, '#000000'); gradient.addColorStop(0.4, 'rgba(138, 43, 226, 0.8)'); gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, currentRadius * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(186, 85, 211, 0.5)'; ctx.lineWidth = 4;
        for(let j=0; j<3; j++) { ctx.beginPath(); ctx.ellipse(0, 0, currentRadius * (1 + j*0.2), currentRadius * (0.8 + j*0.1), gameTime + j, 0, Math.PI*2); ctx.stroke(); }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, currentRadius * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();

        // === НАВИГАТОР (СТРЕЛКА К ПОРТАЛУ) ===
        const distToPortal = Math.hypot(portal.x - player.x, portal.y - player.y);
        if (distToPortal > Math.min(width, height) / 2) {
            ctx.save();
            ctx.translate(player.x, player.y);
            let arrowAngle = Math.atan2(portal.y - player.y, portal.x - player.x);
            ctx.rotate(arrowAngle);
            ctx.translate(Math.min(width, height) / 2 - 50, 0); 
            
            ctx.shadowColor = '#8a2be2'; ctx.shadowBlur = 15;
            ctx.fillStyle = '#b388ff';
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-15, 15); ctx.lineTo(-5, 0); ctx.lineTo(-15, -15); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }

    if (gameState === 'tutorial') return; 

    ctx.save(); ctx.translate(player.x, player.y);
    if (player.invulnTimer > 0 && Math.floor(gameTime * 10) % 2 === 0) { ctx.globalAlpha = 0.5; }
    let lookAngle = player.isDashing ? player.dashAngle : Math.atan2(player.targetY - player.y, player.targetX - player.x); ctx.rotate(lookAngle); 
    const isMoving = Math.hypot(player.targetX - player.x, player.targetY - player.y) > 5;
    const stretchX = (player.stunTimer <= 0 && (isMoving || player.isDashing)) ? (player.isDashing ? 1.4 : 1.15) : 1.0;
    const stretchY = (player.stunTimer <= 0 && (isMoving || player.isDashing)) ? (player.isDashing ? 0.7 : 0.9) : 1.0;

    ctx.scale(stretchX, stretchY);

    if (player.stunTimer > 0) { ctx.shadowColor = 'red'; ctx.shadowBlur = 20; ctx.fillStyle = '#8b0000'; 
    } else if (player.isDashing) { ctx.shadowColor = '#adff2f'; ctx.shadowBlur = 30; ctx.fillStyle = '#006400'; 
    } else { ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 10; ctx.fillStyle = player.colorBase; }

    ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; 
    ctx.fillStyle = player.stunTimer > 0 ? '#ff4444' : player.colorInner;
    ctx.beginPath(); ctx.arc(-player.radius * 0.1, -player.radius * 0.1, player.radius * 0.8, 0, Math.PI * 2); ctx.fill();

    if (player.stunTimer <= 0) { 
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(player.radius * 0.4, -player.radius * 0.4, player.radius * 0.3, 0, Math.PI * 2); ctx.arc(player.radius * 0.4, player.radius * 0.4, player.radius * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(player.radius * 0.5, -player.radius * 0.4, player.radius * 0.2, 0, Math.PI * 2); ctx.arc(player.radius * 0.5, player.radius * 0.4, player.radius * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(player.radius * 0.55, -player.radius * 0.45, player.radius * 0.08, 0, Math.PI * 2); ctx.arc(player.radius * 0.55, player.radius * 0.35, player.radius * 0.08, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(player.radius*0.2, -player.radius*0.6); ctx.lineTo(player.radius*0.5, -player.radius*0.4); ctx.lineTo(player.radius*0.2, -player.radius*0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(player.radius*0.2, player.radius*0.6); ctx.lineTo(player.radius*0.5, player.radius*0.4); ctx.lineTo(player.radius*0.2, player.radius*0.2); ctx.stroke();
    }
    ctx.restore(); ctx.restore(); 
}

updateUI(); requestAnimationFrame(gameLoop);

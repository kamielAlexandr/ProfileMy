document.addEventListener('DOMContentLoaded', () => {
    console.log("Скрипт игры успешно загружен!");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return; // Защита для других страниц сайта

    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('startGameBtn');
    const overlayTitle = document.getElementById('overlayTitle');
    const gameContainer = document.getElementById('gameContainer');

    const localScoreDisplay = document.getElementById('localScoreDisplay');
    const globalScoreDisplay = document.getElementById('globalScoreDisplay');

    let score = 0, lives = 5, maxLives = 5, isGameOver = true, animationId;
    let coins = 0, archers = 0, archerCost = 15, archerTimer = 0;
    let spawnTimer = 0, spawnInterval = 60, gameSpeedMultiplier = 1, repairTimer = 0, repairInterval = 500; 
    let enemies = [], particles = [], repairItems = [], damageNumbers = [], slashes = [], footprints = [], arrows = [];
    
    let localHighScore = parseInt(localStorage.getItem('citadelHighScore')) || 0; 
    if (localScoreDisplay) localScoreDisplay.textContent = localHighScore;
    let globalHighScore = 0; 

    // Элементы интерфейса
    const statsContainer = document.getElementById('statsContainer');
    const scoreUI = document.getElementById('scoreUI');
    const goldUI = document.getElementById('goldUI');
    const livesUI = document.getElementById('livesUI');
    const shopBtn = document.getElementById('buyArcherBtn');
    let lastScore = -1, lastCoins = -1, lastLives = -1, lastArchers = -1;

    function updateUI() {
        if (!statsContainer || !scoreUI) return; 

        if (lastScore !== score || lastCoins !== coins || lastLives !== lives || lastArchers !== archers) {
            scoreUI.innerHTML = `💀 Убито: ${score}`;
            goldUI.innerHTML = `🪙 Монеты: <span style="color:#ffd700">${coins}</span>`;
            let wallColor = lives > 3 ? '#4caf50' : (lives > 1 ? '#ff9800' : '#f44336');
            livesUI.innerHTML = `🛡️ Прочность: <span style="color:${wallColor}">${Math.max(0, lives)}/${maxLives}</span>`;

            if (shopBtn) {
                shopBtn.innerHTML = `🏹 Лучник (${archerCost} 🪙)<br><span style="font-size: 0.8rem">На стене: ${archers}</span>`;
                if (coins >= archerCost && !isGameOver) {
                    shopBtn.style.opacity = '1'; shopBtn.style.pointerEvents = 'auto';
                    shopBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)'; 
                } else {
                    shopBtn.style.opacity = '0.5'; shopBtn.style.pointerEvents = 'none';
                    shopBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
                }
            }

            lastScore = score; lastCoins = coins; lastLives = lives; lastArchers = archers;
        }
    }

    if (shopBtn) {
        shopBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        shopBtn.addEventListener('touchstart', (e) => e.stopPropagation());
        shopBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (coins >= archerCost) {
                coins -= archerCost; archers++; archerCost = Math.floor(archerCost * 1.5); updateUI(); 
                damageNumbers.push(new DamageNumber(canvas.width - 150, canvas.height - 100, 'Лучник нанят!', '#00E676'));
            }
        });
    }

    // ЗАГРУЗКА АНИМАЦИИ
    const goblinFrames = []; let isSpriteLoaded = false, loadedImagesCount = 0;
    const frameNames = ['img/gob1.png', 'img/gob2.png', 'img/gob3.png', 'img/gob4.png'];
    frameNames.forEach((src) => {
        const img = new Image();
        img.onload = () => {
            loadedImagesCount++;
            if (loadedImagesCount === frameNames.length) {
                isSpriteLoaded = true;
                if (isGameOver && startBtn) { startBtn.textContent = "Начать игру"; startBtn.disabled = false; overlayTitle.textContent = "Готовы к битве?"; }
            }
        };
        img.onerror = () => { if (isGameOver && startBtn) { startBtn.textContent = "Начать (Без анимации)"; startBtn.disabled = false; } };
        img.src = src; goblinFrames.push(img); 
    });

    // СЕТЬ
    const SUPABASE_URL = 'https://bgzxdpjfsodndxroieay.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_7lewcPQCbnoXmkcMLu_Hlw_dnfCXZka';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let currentPlayerName = "Аноним";
    const leaderboardList = document.getElementById('leaderboardList'); 
    async function checkCurrentPlayer() { const { data: { user } } = await supabase.auth.getUser(); if (user) currentPlayerName = user.email.split('@')[0]; }
    async function fetchGlobalHighScore() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=score,nickname&order=score.desc&limit=1`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
            const data = await response.json();
            if (data && data.length > 0) { globalHighScore = data[0].score; if (globalScoreDisplay) globalScoreDisplay.textContent = `${globalHighScore} (${data[0].nickname || "Неизвестный"})`; }
        } catch (e) {}
    }
    async function fetchLeaderboard() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=score,nickname&order=score.desc&limit=5`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
            const data = await response.json();
            if (data && data.length > 0 && leaderboardList) {
                leaderboardList.innerHTML = ''; 
                data.forEach((entry, index) => {
                    const li = document.createElement('li'); let medal = `${index + 1}.`; if (index === 0) medal = '🥇'; if (index === 1) medal = '🥈'; if (index === 2) medal = '🥉';
                    li.innerHTML = `<span class="rank">${medal}</span> <span class="name">${entry.nickname || "Аноним"}</span> <span class="score">${entry.score}</span>`;
                    leaderboardList.appendChild(li);
                });
            }
        } catch (e) {}
    }
    async function saveGlobalHighScore(newScore) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ score: newScore, nickname: currentPlayerName }) });
            if(response.ok) { globalHighScore = newScore; if(globalScoreDisplay) globalScoreDisplay.textContent = `${globalHighScore} (${currentPlayerName})`; fetchLeaderboard(); }
        } catch (e) {}
    }
    checkCurrentPlayer(); fetchGlobalHighScore(); fetchLeaderboard(); 

    // КЛАССЫ
    class Enemy {
        constructor(isBoss = false) {
            this.isBoss = isBoss; this.width = isBoss ? 100 : 64; this.height = isBoss ? 100 : 64;
            this.x = Math.random() * (canvas.width - this.width); this.y = -this.height;
            this.hp = isBoss ? 5 : 1; this.maxHp = this.hp;
            this.speed = (isBoss ? 0.7 : (1 + Math.random() * 2)) * gameSpeedMultiplier;
            this.color = isBoss ? '#827717' : '#2e7d32'; 
            this.frameX = 0; this.maxFrame = 3; this.animationSpeed = 8; this.frameTimer = 0; 
        }
        update() {
            this.y += this.speed; this.frameTimer++;
            if (this.frameTimer % this.animationSpeed === 0) {
                this.frameX = this.frameX < this.maxFrame ? this.frameX + 1 : 0; this.frameTimer = 0; 
                footprints.push(new Footprint(this.x + this.width / 2, this.y + this.height - 5));
            }
        }
        draw() {
            if (!isSpriteLoaded || this.isBoss) {
                ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.moveTo(this.width*0.1, this.height*0.3); ctx.lineTo(this.width*0.5, 0); ctx.lineTo(this.width*0.9, this.height*0.3); ctx.lineTo(this.width, this.height*0.8); ctx.lineTo(this.width*0.5, this.height); ctx.lineTo(0, this.height*0.8); ctx.closePath(); ctx.fill();
                if (this.isBoss) { ctx.fillStyle = '#333'; ctx.fillRect(0, -12, this.width, 6); ctx.fillStyle = '#4caf50'; ctx.fillRect(0, -12, this.width * (this.hp/this.maxHp), 6); }
                ctx.restore(); return; 
            }
            ctx.drawImage(goblinFrames[this.frameX], this.x, this.y, this.width, this.height);
        }
    }

    class RepairItem {
        constructor() { this.width = 50; this.height = 50; this.x = Math.random() * (canvas.width - this.width); this.y = -this.height; this.speed = (1.5 + Math.random()) * gameSpeedMultiplier; }
        update() { this.y += this.speed; }
        draw() { ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = '#8D6E63'; ctx.fillRect(0, 0, this.width, this.height); ctx.strokeStyle = '#4E342E'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, this.width, this.height); ctx.fillStyle = '#00E676'; ctx.fillRect(this.width*0.4, this.height*0.15, this.width*0.2, this.height*0.7); ctx.fillRect(this.width*0.15, this.height*0.4, this.width*0.7, this.height*0.2); ctx.restore(); }
    }
    class Particle {
        constructor(x, y, color) { this.x = x; this.y = y; this.size = Math.random() * 5 + 2; this.speedX = (Math.random() - 0.5) * 8; this.speedY = (Math.random() - 0.5) * 8; this.color = color; this.life = 1.0; }
        update() { this.x += this.speedX; this.y += this.speedY; this.life -= 0.05; }
        draw() { ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.size, this.size); ctx.globalAlpha = 1.0; }
    }
    class DamageNumber {
        constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; this.speedY = -2; }
        update() { this.y += this.speedY; this.life -= 0.02; }
        draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
    }
    class SlashMark {
        constructor(x, y) { this.x = x; this.y = y; this.life = 1.0; this.angle = Math.random() * Math.PI * 2; }
        update() { this.life -= 0.04; }
        draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * this.life; ctx.shadowColor = '#00E676'; ctx.shadowBlur = 10; ctx.stroke(); ctx.restore(); }
    }
    class Footprint {
        constructor(x, y) { this.x = x; this.y = y; this.life = 1.0; this.offsetX = (Math.random() - 0.5) * 15; }
        update() { this.life -= 0.005; }
        draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life * 0.4); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(this.x + this.offsetX, this.y, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    class Arrow {
        constructor(startX, startY, targetEnemy) { this.x = startX; this.y = startY; this.target = targetEnemy; this.speed = 12; this.active = true; }
        update() {
            if (!this.target || this.target.hp <= 0) { this.active = false; return; }
            let dx = (this.target.x + this.target.width/2) - this.x; let dy = (this.target.y + this.target.height/2) - this.y; let dist = Math.hypot(dx, dy);
            if (dist < this.speed) { this.target.hp -= 1; createExplosion(this.x, this.y, '#fff', 5); damageNumbers.push(new DamageNumber(this.x, this.y, '-1', '#ff5252')); this.active = false; } 
            else { this.angle = Math.atan2(dy, dx); this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed; }
        }
        draw() { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#ccc'; ctx.fillRect(-8, -1, 16, 2); ctx.fillStyle = '#ff3333'; ctx.fillRect(8, -2, 4, 4); ctx.restore(); }
    }

    // ИГРА
    function initGame() {
        if (animationId) cancelAnimationFrame(animationId);
        score = 0; lives = maxLives; isGameOver = false; coins = 0; archers = 0; archerCost = 15;
        enemies = []; particles = []; repairItems = []; damageNumbers = []; slashes = []; footprints = []; arrows = [];
        spawnTimer = 0; spawnInterval = 60; repairTimer = 0; gameSpeedMultiplier = 1;
        lastScore = -1; lastCoins = -1; lastLives = -1; lastArchers = -1;
        
        if (statsContainer) statsContainer.style.display = 'flex';
        if (shopBtn) shopBtn.style.display = 'block';
        overlay.style.display = 'none';
        
        updateUI();
        gameLoop();
    }

    function createExplosion(x, y, color, count = 15) { for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color)); }

    function update() {
        gameSpeedMultiplier = Math.min(3.5, 1 + (score * 0.015));
        
        if (archers > 0 && enemies.length > 0) {
            archerTimer++; let fireRate = Math.max(15, 100 - (archers * 10)); 
            if (archerTimer >= fireRate) {
                archerTimer = 0; let target = enemies.reduce((lowest, current) => (current.y > lowest.y ? current : lowest), enemies[0]);
                arrows.push(new Arrow(canvas.width / 2, canvas.height - 20, target));
            }
        }

        spawnInterval = Math.max(25, 60 - score * 0.3); spawnTimer++;
        if (spawnTimer >= spawnInterval) { enemies.push(new Enemy(score > 10 && Math.random() < 0.1)); spawnTimer = 0; }

        repairTimer++; if (repairTimer >= repairInterval) { repairItems.push(new RepairItem()); repairTimer = 0; repairInterval = Math.floor(Math.random() * 400) + 400; }

        for (let i = footprints.length - 1; i >= 0; i--) { footprints[i].update(); if (footprints[i].life <= 0) footprints.splice(i, 1); }
        for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); if (particles[i].life <= 0) particles.splice(i, 1); }
        for (let i = damageNumbers.length - 1; i >= 0; i--) { damageNumbers[i].update(); if (damageNumbers[i].life <= 0) damageNumbers.splice(i, 1); }
        for (let i = slashes.length - 1; i >= 0; i--) { slashes[i].update(); if (slashes[i].life <= 0) slashes.splice(i, 1); }
        for (let i = arrows.length - 1; i >= 0; i--) { arrows[i].update(); if (!arrows[i].active) arrows.splice(i, 1); }
        for (let i = repairItems.length - 1; i >= 0; i--) { repairItems[i].update(); if (repairItems[i].y > canvas.height) repairItems.splice(i, 1); }

        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];

            if (enemy.hp <= 0) {
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, enemy.isBoss ? 50 : 15);
                score += enemy.isBoss ? 5 : 1; let coinReward = enemy.isBoss ? 5 : 1; coins += coinReward; 
                damageNumbers.push(new DamageNumber(enemy.x + enemy.width/2, enemy.y + enemy.height/2, `+${coinReward} 🪙`, '#ffd700'));
                enemies.splice(i, 1); continue; 
            }
            enemy.update();

            // === ЗДЕСЬ РЕГУЛИРУЕТСЯ СТОЛКНОВЕНИЕ СО СТЕНОЙ ===
            // Чем больше hitPadding, тем ниже должен опуститься гоблин, чтобы ударить стену
            let hitPadding = 15; 
            let goblinBottom = enemy.y + enemy.height - hitPadding;
            let wallTop = canvas.height - 20;

            if (goblinBottom >= wallTop) {
                lives -= enemy.isBoss ? 3 : 1; createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height, '#ff9800', 30);
                enemies.splice(i, 1); if (lives <= 0) isGameOver = true;
            }
        }
        
        updateUI();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        footprints.forEach(fp => fp.draw());

        let wallColor = lives > 3 ? '#4caf50' : (lives > 1 ? '#ff9800' : '#f44336');
        ctx.fillStyle = '#333'; ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        ctx.fillStyle = wallColor; ctx.fillRect(0, canvas.height - 20, canvas.width * (Math.max(0, lives) / maxLives), 3); 

        for (let i = 0; i < archers; i++) {
            let ax = 30 + i * 25; if (ax > canvas.width - 30) break; 
            ctx.fillStyle = '#827717'; ctx.fillRect(ax, canvas.height - 25, 10, 10); ctx.fillStyle = '#fff'; ctx.fillRect(ax + 2, canvas.height - 30, 2, 8); 
        }

        repairItems.forEach(item => item.draw());
        enemies.forEach(enemy => enemy.draw());
        arrows.forEach(arrow => arrow.draw()); 
        particles.forEach(p => p.draw());
        damageNumbers.forEach(dn => dn.draw()); 
        slashes.forEach(slash => slash.draw()); 
    }

    function gameLoop() {
        if (isGameOver) { endGame(); return; }
        update(); draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        cancelAnimationFrame(animationId);
        if (statsContainer) statsContainer.style.display = 'none'; 
        if (shopBtn) shopBtn.style.display = 'none'; 
        
        let recordMessage = "";
        if (score > localHighScore) {
            localHighScore = score; localStorage.setItem('citadelHighScore', localHighScore); 
            if (localScoreDisplay) localScoreDisplay.textContent = localHighScore; 
            recordMessage += `<br><span style="font-size:1.1rem; color:#aaa;">Вы побили свой рекорд!</span>`;
        }
        if (!isNaN(globalHighScore) && score > globalHighScore) {
            saveGlobalHighScore(score); recordMessage += `<br><span style="font-size:1.3rem; color:#00E676; text-shadow: 0 0 10px #00E676;">👑 ВЫ ПОБИЛИ РЕКОРД САЙТА! 👑</span>`;
        }
        overlayTitle.innerHTML = `Ворота пробиты!<br><span style="font-size:1.5rem; color:#ff5252;">Счет: ${score}</span>${recordMessage}`;
        startBtn.textContent = 'Держать оборону снова'; overlay.style.display = 'flex'; draw(); 
    }

    function handleInput(e) {
        if (isGameOver) return;
        e.preventDefault(); 
        const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
        let clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; 
        let clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const clickX = (clientX - rect.left) * scaleX; const clickY = (clientY - rect.top) * scaleY;
        
        slashes.push(new SlashMark(clickX, clickY));
        let hitSomething = false;

        for (let i = repairItems.length - 1; i >= 0; i--) {
            const item = repairItems[i];
            if (clickX >= item.x && clickX <= item.x + item.width && clickY >= item.y && clickY <= item.y + item.height) {
                if (lives < maxLives) lives++; createExplosion(item.x + item.width/2, item.y + item.height/2, '#00E676', 20);
                damageNumbers.push(new DamageNumber(item.x + item.width/2, item.y, '+1 HP', '#00E676')); repairItems.splice(i, 1); hitSomething = true; break;
            }
        }
        if (hitSomething) return; 

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            // Хитбокс для клика
            if (clickX >= enemy.x && clickX <= enemy.x + enemy.width && clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                enemy.hp--; createExplosion(clickX, clickY, '#fff', 5); damageNumbers.push(new DamageNumber(clickX, clickY, '-1', '#ff5252')); break; 
            }
        }
    }

    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });
    if(startBtn) startBtn.addEventListener('click', initGame);
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn && gameContainer) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) { gameContainer.requestFullscreen().catch(e => console.warn(e.message)); fullscreenBtn.textContent = "✖"; } 
            else { document.exitFullscreen(); fullscreenBtn.textContent = "⛶"; }
        });
        document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) fullscreenBtn.textContent = "⛶"; });
    }
});

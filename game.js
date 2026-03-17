if (window.gameInitialized) {
    console.warn("Скрипт попытался запуститься дважды. Блокировка сработала.");
} else {
    window.gameInitialized = true;

    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return; 

        const ctx = canvas.getContext('2d');
        const overlay = document.getElementById('gameOverlay');
        const startBtn = document.getElementById('startGameBtn');
        const overlayTitle = document.getElementById('overlayTitle');
        const gameWrapper = document.getElementById('gameWrapper'); // ГЛАВНЫЙ КОНТЕЙНЕР ДЛЯ КУРСОРОВ И ФУЛЛСКРИНА

        let score = 0, lives = 5, maxLives = 5, isGameOver = true, animationId;
        let coins = 0, archers = 0, archerCost = 15, archerTimer = 0;
        let spikesLevel = 0, spikesCost = 20;
        
        let clickDamage = 1;
        let swordCost = 30; 

        let spawnTimer = 0, spawnInterval = 60, gameSpeedMultiplier = 1;
        let repairTimer = 0, repairInterval = 500; 
        
        let enemies = [], particles = [], repairItems = [], damageNumbers = [], slashes = [], footprints = [], arrows = [];
        
        let localHighScore = 0;
        try { localHighScore = parseInt(localStorage.getItem('citadelHighScore')) || 0; } catch(e) {}
        let globalHighScore = 0; 

        // ДОСТИЖЕНИЯ
        let unlockedAchievements = [];
        try { unlockedAchievements = JSON.parse(localStorage.getItem('citadelAchievements')) || []; } catch(e) {}
        
        const achievementPopup = document.createElement('div');
        achievementPopup.className = 'achievement-popup';
        document.body.appendChild(achievementPopup);

        function unlockAchievement(id, title) {
            if (!unlockedAchievements.includes(id)) {
                unlockedAchievements.push(id);
                try { localStorage.setItem('citadelAchievements', JSON.stringify(unlockedAchievements)); } catch(e) {}
                achievementPopup.innerHTML = `🏆 Достижение получено!<br><b style="color:#ffd700">${title}</b>`;
                achievementPopup.classList.add('show');
                setTimeout(() => { achievementPopup.classList.remove('show'); }, 3500);
            }
        }

        const topUI = document.getElementById('topUI');
        const bottomUI = document.getElementById('bottomUI');
        const scoreUI = document.getElementById('scoreUI');
        const goldUI = document.getElementById('goldUI');
        const livesUI = document.getElementById('livesUI');
        const shopBtn = document.getElementById('buyArcherBtn');
        const spikesBtn = document.getElementById('buySpikesBtn');
        const swordBtn = document.getElementById('upgradeSwordBtn'); 
        
        let lastScore = -1, lastCoins = -1, lastLives = -1, lastArchers = -1, lastSpikes = -1, lastSword = -1;

        function updateUI() {
            if (!scoreUI) return; 

            if (lastScore !== score || lastCoins !== coins || lastLives !== lives || lastArchers !== archers || lastSpikes !== spikesLevel || lastSword !== clickDamage) {
                scoreUI.innerHTML = `💀 Убито: ${score}`;
                goldUI.innerHTML = `🪙 Монеты: <span style="color:#ffd700">${coins}</span>`;
                let wallColor = lives > 3 ? '#4caf50' : (lives > 1 ? '#ff9800' : '#f44336');
                livesUI.innerHTML = `🛡️ Прочность: <span style="color:${wallColor}">${Math.max(0, lives)}/${maxLives}</span>`;

                if (shopBtn) {
                    shopBtn.innerHTML = `🏹 Лучник (${archerCost} 🪙)<br><span>На стене: ${archers}</span>`;
                    shopBtn.style.opacity = (coins >= archerCost && !isGameOver) ? '1' : '0.5';
                    shopBtn.style.pointerEvents = (coins >= archerCost && !isGameOver) ? 'auto' : 'none';
                }

                if (spikesBtn) {
                    spikesBtn.innerHTML = `🗡️ Шипы (${spikesCost} 🪙)<br><span>Уровень: ${spikesLevel}</span>`;
                    spikesBtn.style.opacity = (coins >= spikesCost && !isGameOver) ? '1' : '0.5';
                    spikesBtn.style.pointerEvents = (coins >= spikesCost && !isGameOver) ? 'auto' : 'none';
                }

                if (swordBtn) {
                    swordBtn.innerHTML = `⚔️ Меч (${swordCost} 🪙)<br><span>Урон клика: ${clickDamage}</span>`;
                    swordBtn.style.opacity = (coins >= swordCost && !isGameOver) ? '1' : '0.5';
                    swordBtn.style.pointerEvents = (coins >= swordCost && !isGameOver) ? 'auto' : 'none';
                }

                if (coins >= 100) unlockAchievement('wealthy', 'Толстосум');

                lastScore = score; lastCoins = coins; lastLives = lives; lastArchers = archers; lastSpikes = spikesLevel; lastSword = clickDamage;
            }
        }

        if (shopBtn) {
            shopBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (coins >= archerCost && !isGameOver) {
                    coins -= archerCost; archers++; archerCost = Math.floor(archerCost * 1.5); updateUI(); 
                    damageNumbers.push(new DamageNumber(canvas.width / 2, canvas.height - 50, 'Лучник нанят!', '#00E676'));
                    unlockAchievement('first_archer', 'Острый глаз');
                    if (archers >= 5) unlockAchievement('arrow_storm', 'Шквальный огонь');
                }
            });
        }

        if (spikesBtn) {
            spikesBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (coins >= spikesCost && !isGameOver) {
                    coins -= spikesCost; spikesLevel++; spikesCost = Math.floor(spikesCost * 1.5); updateUI(); 
                    damageNumbers.push(new DamageNumber(canvas.width / 2, canvas.height - 120, 'Ров улучшен!', '#00E676'));
                    if (spikesLevel === 1) unlockAchievement('spikes_1', 'Шипы и боль');
                    if (spikesLevel === 2) unlockAchievement('bloodbath', 'Кровавая баня');
                }
            });
        }

        if (swordBtn) {
            swordBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (coins >= swordCost && !isGameOver) {
                    coins -= swordCost; 
                    clickDamage++; 
                    swordCost = Math.floor(swordCost * 2); 
                    updateUI(); 
                    damageNumbers.push(new DamageNumber(canvas.width / 2, canvas.height - 180, 'Меч улучшен!', '#ff5252'));
                    
                    // ДОБАВЛЯЕМ КЛАСС ПРЯМО НА WRAPPER ДЛЯ СМЕНЫ КУРСОРА
                    if (gameWrapper) {
                        gameWrapper.classList.remove('sword-lvl-2', 'sword-lvl-3');
                        if (clickDamage === 2) gameWrapper.classList.add('sword-lvl-2');
                        if (clickDamage >= 3) gameWrapper.classList.add('sword-lvl-3');
                    }
                }
            });
        }

        // ЗАГРУЗКА ГРАФИКИ
        const goblinFrames = []; 
        const bossFrames = []; 
        let isSpriteLoaded = false, loadedImagesCount = 0;
        
        const frameNames = ['img/gob1.png', 'img/gob2.png', 'img/gob3.png', 'img/gob4.png'];
        const bossFrameNames = ['img/min_bos_gob1.png', 'img/min_bos_gob2.png', 'img/min_bos_gob3.png', 'img/min_bos_gob4.png'];
        const totalImages = frameNames.length + bossFrameNames.length;

        function checkImagesLoaded() {
            loadedImagesCount++;
            if (loadedImagesCount === totalImages) {
                isSpriteLoaded = true;
                if (isGameOver && startBtn) { startBtn.textContent = "Начать битву"; startBtn.disabled = false; overlayTitle.textContent = "Цитадель ждет"; }
            }
        }

        frameNames.forEach((src) => {
            const img = new Image(); img.onload = checkImagesLoaded;
            img.onerror = () => { if (isGameOver && startBtn) { startBtn.textContent = "Играть (Без анимации)"; startBtn.disabled = false; } };
            img.src = src; goblinFrames.push(img); 
        });

        bossFrameNames.forEach((src) => {
            const img = new Image(); img.onload = checkImagesLoaded;
            img.onerror = () => { if (isGameOver && startBtn) { startBtn.textContent = "Играть (Без анимации)"; startBtn.disabled = false; } };
            img.src = src; bossFrames.push(img); 
        });

        // СЕТЕВОЙ КОД
        const SUPABASE_URL = 'https://bgzxdpjfsodndxroieay.supabase.co'; 
        const SUPABASE_ANON_KEY = 'sb_publishable_7lewcPQCbnoXmkcMLu_Hlw_dnfCXZka';
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        let currentPlayerName = "Аноним";
        
        async function checkCurrentPlayer() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user) {
                    currentPlayerName = session.user.user_metadata?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Аноним";
                }
            } catch (e) {}
        }
        
        async function fetchLeaderboard() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=score,nickname&order=score.desc&limit=5`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
                const data = await response.json();
                const list = document.getElementById('leaderboardList');
                if (data && data.length > 0 && list) {
                    list.innerHTML = ''; 
                    data.forEach((entry, index) => {
                        const li = document.createElement('li'); let medal = `${index + 1}.`; if (index === 0) medal = '🥇'; if (index === 1) medal = '🥈'; if (index === 2) medal = '🥉';
                        li.innerHTML = `<span class="rank">${medal}</span> <span class="name">${entry.nickname || "Аноним"}</span> <span class="score">${entry.score}</span>`;
                        list.appendChild(li);
                    });
                }
            } catch (e) {}
        }
        checkCurrentPlayer(); fetchLeaderboard();

        // КЛАССЫ ИГРЫ
        class Enemy {
            constructor(isBoss = false) {
                this.isBoss = isBoss; 
                this.width = isBoss ? 128 : 64; this.height = isBoss ? 128 : 64;
                this.x = Math.random() * (canvas.width - this.width); this.y = -this.height;
                this.hp = isBoss ? 10 : 1; this.maxHp = this.hp;
                this.speed = (isBoss ? 0.6 : (1 + Math.random() * 2)) * gameSpeedMultiplier;
                this.color = isBoss ? '#827717' : '#2e7d32'; 
                this.frameX = 0; this.maxFrame = 3; this.animationSpeed = 8; this.frameTimer = 0; 
            }
            update() {
                let currentSpeed = this.speed; let currentAnimSpeed = this.animationSpeed; let inMoat = false;
                let moatTop = canvas.height - 140; let moatBottom = canvas.height - 50;

                if (spikesLevel > 0 && (this.y + this.height > moatTop) && (this.y < moatBottom)) {
                    inMoat = true; let slowMultiplier = Math.max(0.15, 0.5 - (spikesLevel * 0.15));
                    currentSpeed *= slowMultiplier; currentAnimSpeed *= 2; 
                }

                this.y += currentSpeed; this.frameTimer++;
                
                if (this.frameTimer >= currentAnimSpeed) {
                    this.frameX = this.frameX < this.maxFrame ? this.frameX + 1 : 0; this.frameTimer = 0; 
                    footprints.push(new Footprint(this.x + this.width / 2, this.y + this.height - 10));
                    
                    if (inMoat) {
                        let splashColor = spikesLevel > 1 ? '#8a0303' : '#4e342e'; 
                        createExplosion(this.x + this.width / 2, this.y + this.height, splashColor, 3);
                    }
                }
            }
            draw() {
                if (!isSpriteLoaded) {
                    ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = this.color; ctx.fillRect(0, 0, this.width, this.height);
                    if (this.isBoss) { ctx.fillStyle = '#333'; ctx.fillRect(0, -12, this.width, 6); ctx.fillStyle = '#4caf50'; ctx.fillRect(0, -12, this.width * (this.hp/this.maxHp), 6); }
                    ctx.restore(); return; 
                }

                if (this.isBoss) {
                    ctx.drawImage(bossFrames[this.frameX], this.x, this.y, this.width, this.height);
                    ctx.fillStyle = '#333'; ctx.fillRect(this.x + 14, this.y - 10, 100, 8); 
                    ctx.fillStyle = '#ff5252'; ctx.fillRect(this.x + 14, this.y - 10, 100 * (this.hp / this.maxHp), 8); 
                } else {
                    ctx.drawImage(goblinFrames[this.frameX], this.x, this.y, this.width, this.height);
                }
            }
        }

        class RepairItem {
            constructor() { this.width = 40; this.height = 40; this.x = Math.random() * (canvas.width - this.width); this.y = -this.height; this.speed = (1.5 + Math.random()) * gameSpeedMultiplier; }
            update() { this.y += this.speed; }
            draw() { ctx.fillStyle = '#00E676'; ctx.fillRect(this.x, this.y, this.width, this.height); }
        }
        class Particle {
            constructor(x, y, color) { this.x = x; this.y = y; this.size = Math.random() * 5 + 2; this.speedX = (Math.random() - 0.5) * 8; this.speedY = (Math.random() - 0.5) * 8; this.color = color; this.life = 1.0; }
            update() { this.x += this.speedX; this.y += this.speedY; this.life -= 0.05; }
            draw() { ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.size, this.size); ctx.globalAlpha = 1.0; }
        }
        class DamageNumber {
            constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; this.speedY = -2; }
            update() { this.y += this.speedY; this.life -= 0.02; }
            draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
        }
        class SlashMark {
            constructor(x, y) { this.x = x; this.y = y; this.life = 1.0; this.angle = Math.random() * Math.PI * 2; }
            update() { this.life -= 0.05; }
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
                if (dist < this.speed) { this.target.hp -= clickDamage; createExplosion(this.x, this.y, '#fff', 5); damageNumbers.push(new DamageNumber(this.x, this.y, `-${clickDamage}`, '#ff5252')); this.active = false; } 
                else { this.angle = Math.atan2(dy, dx); this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed; }
            }
            draw() { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#ccc'; ctx.fillRect(-8, -1, 16, 2); ctx.fillStyle = '#ff3333'; ctx.fillRect(8, -2, 4, 4); ctx.restore(); }
        }

        function initGame() {
            if (animationId) cancelAnimationFrame(animationId); 
            score = 0; lives = maxLives; isGameOver = false; coins = 0; archers = 0; archerCost = 15; spikesLevel = 0; spikesCost = 20; 
            clickDamage = 1; swordCost = 30; 
            
            if (gameWrapper) gameWrapper.classList.remove('sword-lvl-2', 'sword-lvl-3'); 
            
            enemies = []; particles = []; repairItems = []; damageNumbers = []; slashes = []; footprints = []; arrows = [];
            spawnTimer = 0; spawnInterval = 60; repairTimer = 0; gameSpeedMultiplier = 1;
            lastScore = -1; lastCoins = -1; lastLives = -1; lastArchers = -1; lastSpikes = -1; lastSword = -1;
            
            if (topUI) topUI.style.display = 'flex';
            if (bottomUI) bottomUI.style.display = 'flex';
            if (overlay) overlay.style.display = 'none';
            
            updateUI(); gameLoop();
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
            if (spawnTimer >= spawnInterval) { enemies.push(new Enemy(score > 5 && Math.random() < 0.1)); spawnTimer = 0; }
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
                    
                    unlockAchievement('first_blood', 'Первая кровь');
                    if (enemy.isBoss) unlockAchievement('boss_slayer', 'Убийца великанов');
                    if (score >= 100) unlockAchievement('hundred_skulls', 'Сотня черепов');
                    if (score >= 300) unlockAchievement('impenetrable', 'Неприступная Цитадель');

                    enemies.splice(i, 1); continue; 
                }
                enemy.update();

                const spriteDeadSpace = 25; 
                const actualBottomEdge = enemy.y + enemy.height - spriteDeadSpace; 
                const wallY = canvas.height - 20;

                if (actualBottomEdge >= wallY) {
                    lives -= enemy.isBoss ? 3 : 1; 
                    createExplosion(enemy.x + enemy.width/2, wallY, '#ff9800', 30);
                    enemies.splice(i, 1); 
                    if (lives <= 0) isGameOver = true;
                }
            }
            updateUI();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            footprints.forEach(fp => fp.draw());

            if (spikesLevel > 0) {
                let moatY = canvas.height - 130; let moatHeight = 60;
                ctx.fillStyle = 'rgba(28, 55, 66, 0.6)'; ctx.fillRect(0, moatY, canvas.width, moatHeight);
                for(let i = -10; i < canvas.width; i += 20) {
                    ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.moveTo(i, moatY + moatHeight); ctx.lineTo(i + 10, moatY - 10); ctx.lineTo(i + 20, moatY + moatHeight); ctx.fill();
                    if (spikesLevel > 1) {
                        ctx.fillStyle = '#8a0303'; ctx.beginPath(); ctx.moveTo(i + 6, moatY + 15); ctx.lineTo(i + 10, moatY - 10); ctx.lineTo(i + 14, moatY + 15); ctx.fill();
                    }
                }
            }

            let wallColor = lives > 3 ? '#4caf50' : (lives > 1 ? '#ff9800' : '#f44336');
            ctx.fillStyle = '#333'; ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
            ctx.fillStyle = wallColor; ctx.fillRect(0, canvas.height - 20, canvas.width * (Math.max(0, lives) / maxLives), 3); 

            for (let i = 0; i < archers; i++) {
                let ax = 30 + i * 25; if (ax > canvas.width - 30) break; 
                ctx.fillStyle = '#827717'; ctx.fillRect(ax, canvas.height - 25, 10, 10); ctx.fillStyle = '#fff'; ctx.fillRect(ax + 2, canvas.height - 30, 2, 8); 
            }

            repairItems.forEach(item => item.draw()); enemies.forEach(enemy => enemy.draw());
            arrows.forEach(arrow => arrow.draw()); particles.forEach(p => p.draw());
            damageNumbers.forEach(dn => dn.draw()); slashes.forEach(slash => slash.draw()); 
        }

        function gameLoop() {
            if (isGameOver) { endGame(); return; }
            update(); draw();
            animationId = requestAnimationFrame(gameLoop);
        }

        async function endGame() {
            cancelAnimationFrame(animationId);
            
            if (topUI) topUI.style.display = 'none'; 
            if (bottomUI) bottomUI.style.display = 'none'; 
            
            await checkCurrentPlayer(); 
            
            let recordMessage = "";
            try {
                if (score > localHighScore && score > 0) {
                    localHighScore = score; localStorage.setItem('citadelHighScore', localHighScore); 
                    recordMessage += `<br><span style="font-size:1.1rem; color:#aaa;">Вы побили свой личный рекорд!</span>`;
                }
            } catch(e) {}
            
            try {
                if (score > globalHighScore && globalHighScore > 0) {
                    fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ score: score, nickname: currentPlayerName }) }).catch(err => {});
                    recordMessage += `<br><span style="font-size:1.3rem; color:#00E676; text-shadow: 0 0 10px #00E676;">👑 ВЫ ПОБИЛИ РЕКОРД САЙТА! 👑</span>`;
                } else if (score > 0 && globalHighScore === 0) {
                    fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ score: score, nickname: currentPlayerName }) }).catch(err => {});
                }
            } catch(e) {}

            if (overlayTitle) overlayTitle.innerHTML = `Ворота пробиты!<br><span style="font-size:1.5rem; color:#ff5252;">Счет: ${score}</span>${recordMessage}`;
            if (startBtn) { startBtn.textContent = 'Держать оборону снова'; startBtn.disabled = false; }
            if (overlay) { overlay.style.display = 'flex'; overlay.style.zIndex = '9999'; }
            draw(); 
            setTimeout(fetchLeaderboard, 1000); 
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
                    damageNumbers.push(new DamageNumber(item.x + item.width/2, item.y, '+1 HP', '#00E676')); repairItems.splice(i, 1); hitSomething = true; 
                    unlockAchievement('repairman', 'Ремонтная бригада'); 
                    break;
                }
            }
            if (hitSomething) return; 

            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                if (clickX >= enemy.x && clickX <= enemy.x + enemy.width && clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                    
                    enemy.hp -= clickDamage; 
                    
                    createExplosion(clickX, clickY, '#fff', 5); 
                    damageNumbers.push(new DamageNumber(clickX, clickY, `-${clickDamage}`, '#ff5252')); 
                    break; 
                }
            }
        }

        canvas.removeEventListener('mousedown', handleInput);
        canvas.removeEventListener('touchstart', handleInput);
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleInput, { passive: false });
        
        if (startBtn) startBtn.onclick = initGame; 
        
        // РАБОЧИЙ ПОЛНЫЙ ЭКРАН
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn && gameWrapper) {
            fullscreenBtn.onclick = () => {
                if (!document.fullscreenElement) { 
                    gameWrapper.requestFullscreen().catch(err => console.warn(err)); 
                    fullscreenBtn.textContent = "✖ Выйти"; 
                } else { 
                    document.exitFullscreen(); 
                    fullscreenBtn.textContent = "⛶ Полный экран"; 
                }
            };
            document.addEventListener('fullscreenchange', () => { 
                if (!document.fullscreenElement) fullscreenBtn.textContent = "⛶ Полный экран"; 
            });
        }
    });
}

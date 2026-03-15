// ЖЕСТКАЯ ЗАЩИТА ОТ ДВОЙНОГО ЗАПУСКА
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

        let score = 0, lives = 5, maxLives = 5, isGameOver = true, animationId;
        let coins = 0, archers = 0, archerCost = 15, archerTimer = 0;
        
        // НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ РВА С ШИПАМИ
        let spikesLevel = 0, spikesCost = 20;

        let spawnTimer = 0, spawnInterval = 60, gameSpeedMultiplier = 1;
        let repairTimer = 0, repairInterval = 500; 
        
        let enemies = [], particles = [], repairItems = [], damageNumbers = [], slashes = [], footprints = [], arrows = [];
        
        let localHighScore = parseInt(localStorage.getItem('citadelHighScore')) || 0; 
        let globalHighScore = 0; 

        const topUI = document.getElementById('topUI');
        const bottomUI = document.getElementById('bottomUI');
        const scoreUI = document.getElementById('scoreUI');
        const goldUI = document.getElementById('goldUI');
        const livesUI = document.getElementById('livesUI');
        const shopBtn = document.getElementById('buyArcherBtn');
        const spikesBtn = document.getElementById('buySpikesBtn'); // Нашли кнопку шипов
        
        let lastScore = -1, lastCoins = -1, lastLives = -1, lastArchers = -1, lastSpikes = -1;

        function updateUI() {
            if (!scoreUI) return; 

            if (lastScore !== score || lastCoins !== coins || lastLives !== lives || lastArchers !== archers || lastSpikes !== spikesLevel) {
                scoreUI.innerHTML = `💀 Убито: ${score}`;
                goldUI.innerHTML = `🪙 Монеты: <span style="color:#ffd700">${coins}</span>`;
                let wallColor = lives > 3 ? '#4caf50' : (lives > 1 ? '#ff9800' : '#f44336');
                livesUI.innerHTML = `🛡️ Прочность: <span style="color:${wallColor}">${Math.max(0, lives)}/${maxLives}</span>`;

                if (shopBtn) {
                    shopBtn.innerHTML = `🏹 Нанять Лучника (${archerCost} 🪙)<br><span>На стене: ${archers}</span>`;
                    if (coins >= archerCost && !isGameOver) {
                        shopBtn.style.opacity = '1'; shopBtn.style.pointerEvents = 'auto';
                        shopBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)'; 
                    } else {
                        shopBtn.style.opacity = '0.5'; shopBtn.style.pointerEvents = 'none';
                        shopBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
                    }
                }

                // ОБНОВЛЯЕМ КНОПКУ ШИПОВ
                if (spikesBtn) {
                    spikesBtn.innerHTML = `🗡️ Ров с шипами (${spikesCost} 🪙)<br><span>Уровень: ${spikesLevel}</span>`;
                    if (coins >= spikesCost && !isGameOver) {
                        spikesBtn.style.opacity = '1'; spikesBtn.style.pointerEvents = 'auto';
                        spikesBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)'; 
                    } else {
                        spikesBtn.style.opacity = '0.5'; spikesBtn.style.pointerEvents = 'none';
                        spikesBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
                    }
                }

                lastScore = score; lastCoins = coins; lastLives = lives; lastArchers = archers; lastSpikes = spikesLevel;
            }
        }

        if (shopBtn) {
            shopBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (coins >= archerCost && !isGameOver) {
                    coins -= archerCost; archers++; archerCost = Math.floor(archerCost * 1.5); updateUI(); 
                    damageNumbers.push(new DamageNumber(canvas.width / 2, canvas.height - 50, 'Лучник нанят!', '#00E676'));
                }
            });
        }

        // ЛОГИКА ПОКУПКИ ШИПОВ
        if (spikesBtn) {
            spikesBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (coins >= spikesCost && !isGameOver) {
                    coins -= spikesCost; spikesLevel++; spikesCost = Math.floor(spikesCost * 1.5); updateUI(); 
                    damageNumbers.push(new DamageNumber(canvas.width / 2, canvas.height - 120, 'Ров улучшен!', '#00E676'));
                }
            });
        }

        const goblinFrames = []; let isSpriteLoaded = false, loadedImagesCount = 0;
        const frameNames = ['img/gob1.png', 'img/gob2.png', 'img/gob3.png', 'img/gob4.png'];
        frameNames.forEach((src) => {
            const img = new Image();
            img.onload = () => {
                loadedImagesCount++;
                if (loadedImagesCount === frameNames.length) {
                    isSpriteLoaded = true;
                    if (isGameOver && startBtn) { startBtn.textContent = "Начать битву"; startBtn.disabled = false; overlayTitle.textContent = "Цитадель ждет"; }
                }
            };
            img.onerror = () => { if (isGameOver && startBtn) { startBtn.textContent = "Играть (Без анимации)"; startBtn.disabled = false; } };
            img.src = src; goblinFrames.push(img); 
        });

        const SUPABASE_URL = 'https://bgzxdpjfsodndxroieay.supabase.co'; 
        const SUPABASE_ANON_KEY = 'sb_publishable_7lewcPQCbnoXmkcMLu_Hlw_dnfCXZka';
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        let currentPlayerName = "Аноним";
        
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
        fetchLeaderboard();

        // КЛАССЫ ИГРЫ
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
                let currentSpeed = this.speed;

                // --- ЛОГИКА ЗАМЕДЛЕНИЯ В РВУ С ШИПАМИ ---
                let moatTop = canvas.height - 130; // Начало рва
                let moatBottom = canvas.height - 60; // Конец рва

                // Если гоблин наступил в ров
                if (spikesLevel > 0 && (this.y + this.height > moatTop) && (this.y < moatBottom)) {
                    // Каждый уровень шипов замедляет на 20% (но не медленнее, чем до 20% от базы)
                    let slowMultiplier = Math.max(0.2, 1 - (spikesLevel * 0.2));
                    currentSpeed *= slowMultiplier;
                }

                this.y += currentSpeed; 
                
                this.frameTimer++;
                if (this.frameTimer % this.animationSpeed === 0) {
                    this.frameX = this.frameX < this.maxFrame ? this.frameX + 1 : 0; this.frameTimer = 0; 
                    footprints.push(new Footprint(this.x + this.width / 2, this.y + this.height - 10));
                }
            }
            draw() {
                if (!isSpriteLoaded || this.isBoss) {
                    ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = this.color;
                    ctx.fillRect(0, 0, this.width, this.height);
                    if (this.isBoss) { ctx.fillStyle = '#333'; ctx.fillRect(0, -12, this.width, 6); ctx.fillStyle = '#4caf50'; ctx.fillRect(0, -12, this.width * (this.hp/this.maxHp), 6); }
                    ctx.restore(); return; 
                }
                ctx.drawImage(goblinFrames[this.frameX], this.x, this.y, this.width, this.height);
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
                if (dist < this.speed) { this.target.hp -= 1; createExplosion(this.x, this.y, '#fff', 5); damageNumbers.push(new DamageNumber(this.x, this.y, '-1', '#ff5252')); this.active = false; } 
                else { this.angle = Math.atan2(dy, dx); this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed; }
            }
            draw() { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#ccc'; ctx.fillRect(-8, -1, 16, 2); ctx.fillStyle = '#ff3333'; ctx.fillRect(8, -2, 4, 4); ctx.restore(); }
        }

        function initGame() {
            if (animationId) cancelAnimationFrame(animationId); 
            
            score = 0; lives = maxLives; isGameOver = false; 
            coins = 0; archers = 0; archerCost = 15;
            spikesLevel = 0; spikesCost = 20; // Сбрасываем шипы
            
            enemies = []; particles = []; repairItems = []; damageNumbers = []; slashes = []; footprints = []; arrows = [];
            spawnTimer = 0; spawnInterval = 60; repairTimer = 0; gameSpeedMultiplier = 1;
            lastScore = -1; lastCoins = -1; lastLives = -1; lastArchers = -1; lastSpikes = -1;
            
            if (topUI) topUI.style.display = 'flex';
            if (bottomUI) bottomUI.style.display = 'flex';
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

            // --- РИСУЕМ РОВ С ШИПАМИ ---
            if (spikesLevel > 0) {
                let moatY = canvas.height - 110;
                let moatHeight = 40;
                
                ctx.fillStyle = 'rgba(28, 55, 66, 0.6)'; // Мутная вода
                ctx.fillRect(0, moatY, canvas.width, moatHeight);
                
                ctx.fillStyle = '#4e342e'; // Дерево
                for(let i = -10; i < canvas.width; i += 25) {
                    ctx.beginPath();
                    ctx.moveTo(i, moatY + moatHeight);
                    ctx.lineTo(i + 12, moatY - 15);
                    ctx.lineTo(i + 25, moatY + moatHeight);
                    ctx.fill();
                    
                    // Кровь на шипах (со 2 уровня)
                    if (spikesLevel > 1) {
                        ctx.fillStyle = '#8a0303';
                        ctx.beginPath();
                        ctx.moveTo(i + 8, moatY + 5);
                        ctx.lineTo(i + 12, moatY - 15);
                        ctx.lineTo(i + 16, moatY + 5);
                        ctx.fill();
                        ctx.fillStyle = '#4e342e'; 
                    }
                }
            }

            // РИСУЕМ СТЕНУ
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
            if (topUI) topUI.style.display = 'none'; 
            if (bottomUI) bottomUI.style.display = 'none'; 
            
            let recordMessage = "";
            if (score > localHighScore) {
                localHighScore = score; localStorage.setItem('citadelHighScore', localHighScore); 
                recordMessage += `<br><span style="font-size:1.1rem; color:#aaa;">Вы побили свой рекорд!</span>`;
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
                if (clickX >= enemy.x && clickX <= enemy.x + enemy.width && clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                    enemy.hp--; createExplosion(clickX, clickY, '#fff', 5); damageNumbers.push(new DamageNumber(clickX, clickY, '-1', '#ff5252')); break; 
                }
            }
        }

        canvas.removeEventListener('mousedown', handleInput);
        canvas.removeEventListener('touchstart', handleInput);
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleInput, { passive: false });
        
        if (startBtn) startBtn.onclick = initGame; 
        
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const gameWrapper = document.getElementById('gameWrapper'); 
        if (fullscreenBtn && gameWrapper) {
            fullscreenBtn.onclick = () => {
                if (!document.fullscreenElement) { gameWrapper.requestFullscreen(); fullscreenBtn.textContent = "✖ Выйти"; } 
                else { document.exitFullscreen(); fullscreenBtn.textContent = "⛶ Полный экран"; }
            };
            document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) fullscreenBtn.textContent = "⛶ Полный экран"; });
        }
    });
}

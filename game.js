document.addEventListener('DOMContentLoaded', () => {
    console.log("Скрипт игры успешно загружен!");

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('startGameBtn');
    const overlayTitle = document.getElementById('overlayTitle');

    const localScoreDisplay = document.getElementById('localScoreDisplay');
    const globalScoreDisplay = document.getElementById('globalScoreDisplay');

    // Настройки игры
    let score = 0;
    const maxLives = 5;
    let lives = maxLives;
    let isGameOver = true; 
    let animationId;
    
    let localHighScore = parseInt(localStorage.getItem('citadelHighScore')) || 0; 
    if (localScoreDisplay) localScoreDisplay.textContent = localHighScore;
    
    let globalHighScore = 0; 
    
    let enemies = [];
    let particles = [];
    let repairItems = [];
    
    let spawnTimer = 0;
    let spawnInterval = 60;
    let gameSpeedMultiplier = 1;
    let repairTimer = 0;
    let repairInterval = 500; 

    // --- СЕТЕВАЯ ЛОГИКА (API SUPABASE) ---
    const SUPABASE_URL = 'https://bgzxdpjfsodndxroieay.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_7lewcPQCbnoXmkcMLu_Hlw_dnfCXZka';

    async function fetchGlobalHighScore() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=score&order=score.desc&limit=1`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                globalHighScore = data[0].score;
            } else {
                globalHighScore = 0;
            }
            
            if (globalScoreDisplay) {
                 globalScoreDisplay.textContent = globalHighScore;
            }
        } catch (error) {
            console.error("Ошибка загрузки рекорда сайта:", error);
            if (globalScoreDisplay) globalScoreDisplay.textContent = "Ошибка сети";
        }
    }

    async function saveGlobalHighScore(newScore) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ score: newScore })
            });
            
            if(response.ok) {
                console.log("Рекорд успешно отправлен в базу!");
                globalHighScore = newScore;
                if(globalScoreDisplay) globalScoreDisplay.textContent = globalHighScore;
            }
        } catch (error) {
            console.error("Ошибка сохранения рекорда:", error);
        }
    }

    fetchGlobalHighScore();

    // --- КЛАССЫ ---
    class Enemy {
        constructor(isBoss = false) {
            this.isBoss = isBoss;
            this.width = isBoss ? 80 : 40;
            this.height = isBoss ? 80 : 40;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            this.hp = isBoss ? 5 : 1; 
            this.maxHp = this.hp;
            let baseSpeed = isBoss ? 0.7 : (1 + Math.random() * 2);
            this.speed = baseSpeed * gameSpeedMultiplier;
            this.color = isBoss ? '#827717' : '#2e7d32'; 
        }
        update() { this.y += this.speed; }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            const w = this.width; const h = this.height;

            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(w * 0.1, h * 0.3); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w * 0.9, h * 0.3); 
            ctx.lineTo(w, h * 0.8); ctx.lineTo(w * 0.5, h); ctx.lineTo(0, h * 0.8); ctx.closePath();
            ctx.fill();

            ctx.fillStyle = this.isBoss ? '#ffff00' : '#ff1744'; 
            ctx.beginPath();
            ctx.moveTo(w * 0.2, h * 0.4); ctx.lineTo(w * 0.4, h * 0.35); ctx.lineTo(w * 0.45, h * 0.55); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w * 0.8, h * 0.4); ctx.lineTo(w * 0.6, h * 0.35); ctx.lineTo(w * 0.55, h * 0.55); ctx.closePath(); ctx.fill();

            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(w * 0.25, h * 0.75); ctx.lineTo(w * 0.75, h * 0.75); ctx.lineTo(w * 0.5, h * 0.95); ctx.closePath(); ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(w * 0.35, h * 0.75, w * 0.05, h * 0.08); ctx.fillRect(w * 0.6, h * 0.75, w * 0.05, h * 0.08);  

            if (this.isBoss) {
                ctx.fillStyle = '#333'; ctx.fillRect(0, -12, this.width, 6); 
                ctx.fillStyle = '#4caf50'; ctx.fillRect(0, -12, this.width * (this.hp / this.maxHp), 6);
            }
            ctx.restore();
        }
    }

    class RepairItem {
        constructor() {
            this.width = 35; this.height = 35;
            this.x = Math.random() * (canvas.width - this.width); this.y = -this.height;
            this.speed = (1.5 + Math.random()) * gameSpeedMultiplier;
        }
        update() { this.y += this.speed; }
        draw() {
            ctx.save(); ctx.translate(this.x, this.y);
            ctx.fillStyle = '#8D6E63'; ctx.fillRect(0, 0, this.width, this.height);
            ctx.strokeStyle = '#4E342E'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, this.width, this.height);
            ctx.fillStyle = '#00E676';
            ctx.fillRect(this.width * 0.4, this.height * 0.15, this.width * 0.2, this.height * 0.7);
            ctx.fillRect(this.width * 0.15, this.height * 0.4, this.width * 0.7, this.height * 0.2);
            ctx.restore();
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x; this.y = y; this.size = Math.random() * 5 + 2;
            this.speedX = (Math.random() - 0.5) * 8; this.speedY = (Math.random() - 0.5) * 8;
            this.color = color; this.life = 1.0;
        }
        update() { this.x += this.speedX; this.y += this.speedY; this.life -= 0.05; }
        draw() {
            ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size); ctx.globalAlpha = 1.0;
        }
    }

    // --- ИГРОВАЯ ЛОГИКА ---
    function initGame() {
        console.log("Кнопка нажата! Игра начинается...");
        
        score = 0; lives = maxLives; isGameOver = false;
        enemies = []; particles = []; repairItems = [];
        spawnTimer = 0; spawnInterval = 60; repairTimer = 0; gameSpeedMultiplier = 1;
        
        // ЖЕЛЕЗОБЕТОННОЕ СКРЫТИЕ ОКНА
        overlay.style.display = 'none';
        
        if(localScoreDisplay) localScoreDisplay.textContent = localHighScore;
        if(globalScoreDisplay && globalScoreDisplay.textContent === "Загрузка...") {
             globalScoreDisplay.textContent = globalHighScore;
        }
        
        gameLoop();
    }

    function createExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
    }

    function update() {
        gameSpeedMultiplier += 0.0005;
        spawnInterval = Math.max(20, 60 - score * 0.4);

        spawnTimer++;
        if (spawnTimer >= spawnInterval) {
            let spawnBoss = (score > 10 && Math.random() < 0.1);
            enemies.push(new Enemy(spawnBoss));
            spawnTimer = 0;
        }

        repairTimer++;
        if (repairTimer >= repairInterval) {
            repairItems.push(new RepairItem());
            repairTimer = 0;
            repairInterval = Math.floor(Math.random() * 400) + 400; 
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        for (let i = repairItems.length - 1; i >= 0; i--) {
            repairItems[i].update();
            if (repairItems[i].y > canvas.height) repairItems.splice(i, 1);
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            enemy.update();

            if (enemy.y + enemy.height >= canvas.height - 20) {
                lives -= enemy.isBoss ? 3 : 1; 
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height, '#ff9800', 30);
                enemies.splice(i, 1);
                if (lives <= 0) isGameOver = true;
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let wallColor = lives > 3 ? '#4caf50' : (lives > 1 ? '#ff9800' : '#f44336');
        
        ctx.fillStyle = '#333';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        ctx.fillStyle = wallColor;
        ctx.fillRect(0, canvas.height - 20, canvas.width * (Math.max(0, lives) / maxLives), 3); 

        repairItems.forEach(item => item.draw());
        enemies.forEach(enemy => enemy.draw());
        particles.forEach(p => p.draw());

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`💀 Убито: ${score}`, 20, 35);
        ctx.fillStyle = wallColor;
        ctx.fillText(`🛡️ Прочность: ${Math.max(0, lives)}/${maxLives}`, 20, 65);
    }

    function gameLoop() {
        if (isGameOver) {
            endGame();
            return;
        }
        update(); draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        cancelAnimationFrame(animationId);
        
        let recordMessage = "";
        
        if (score > localHighScore) {
            localHighScore = score;
            localStorage.setItem('citadelHighScore', localHighScore); 
            if (localScoreDisplay) localScoreDisplay.textContent = localHighScore; 
            recordMessage += `<br><span style="font-size:1.1rem; color:#aaa;">Вы побили свой рекорд!</span>`;
        }
        
        if (!isNaN(globalHighScore) && score > globalHighScore) {
            saveGlobalHighScore(score); 
            recordMessage += `<br><span style="font-size:1.3rem; color:#00E676; text-shadow: 0 0 10px #00E676;">👑 ВЫ ПОБИЛИ РЕКОРД САЙТА! 👑</span>`;
        }

        overlayTitle.innerHTML = `Ворота пробиты!<br><span style="font-size:1.5rem; color:#ff5252;">Счет: ${score}</span>${recordMessage}`;
        startBtn.textContent = 'Держать оборону снова';
        
        // ЖЕЛЕЗОБЕТОННОЕ ПОЯВЛЕНИЕ ОКНА
        overlay.style.display = 'flex';
        draw(); 
    }

    // --- УПРАВЛЕНИЕ ---
    canvas.addEventListener('mousedown', (e) => {
        if (isGameOver) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        
        let hitSomething = false;

        for (let i = repairItems.length - 1; i >= 0; i--) {
            const item = repairItems[i];
            if (clickX >= item.x && clickX <= item.x + item.width && clickY >= item.y && clickY <= item.y + item.height) {
                if (lives < maxLives) lives++; 
                createExplosion(item.x + item.width/2, item.y + item.height/2, '#00E676', 20);
                repairItems.splice(i, 1);
                hitSomething = true;
                break;
            }
        }
        if (hitSomething) return; 

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (clickX >= enemy.x && clickX <= enemy.x + enemy.width && clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                enemy.hp--; 
                createExplosion(clickX, clickY, '#fff', 5);
                if (enemy.hp <= 0) {
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, enemy.isBoss ? 50 : 15);
                    score += enemy.isBoss ? 5 : 1; 
                    enemies.splice(i, 1);
                }
                break; 
            }
        }
    });

    if(startBtn) {
        startBtn.addEventListener('click', initGame);
    } else {
        console.error("Кнопка startGameBtn не найдена в HTML!");
    }
    
    draw(); 
});

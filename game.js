document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('startGameBtn');
    const overlayTitle = document.getElementById('overlayTitle');

    // Настройки игры
    let score = 0;
    const maxLives = 5;
    let lives = maxLives;
    let isGameOver = false;
    let animationId;
    
    // Локальный рекорд
    let localHighScore = parseInt(localStorage.getItem('citadelHighScore')) || 0; 
    
    // ГЛОБАЛЬНЫЙ РЕКОРД (Загружается с сервера)
    let globalHighScore = "..."; 
    
    let enemies = [];
    let particles = [];
    let repairItems = [];
    
    let spawnTimer = 0;
    let spawnInterval = 60;
    let gameSpeedMultiplier = 1;
    let repairTimer = 0;
    let repairInterval = 500; 

    // --- СЕТЕВАЯ ЛОГИКА (API) ---

    // 1. Функция получения рекорда сайта
    async function fetchGlobalHighScore() {
        try {
            // В БУДУЩЕМ ЗАМЕНИ ЭТОТ URL НА СВОЮ БАЗУ ДАННЫХ (Firebase / Supabase / JSONBin)
            // const response = await fetch('https://твой-сервер.com/api/highscore');
            // const data = await response.json();
            // globalHighScore = data.score;
            
            // Пока базы нет, сделаем фейковую загрузку для красоты:
            setTimeout(() => {
                globalHighScore = localHighScore; // Временно приравниваем к твоему
            }, 1000);

        } catch (error) {
            console.error("Ошибка загрузки рекорда сайта:", error);
            globalHighScore = "Ошибка";
        }
    }

    // 2. Функция отправки нового рекорда на сервер
    async function saveGlobalHighScore(newScore) {
        try {
            // В БУДУЩЕМ РАСКОММЕНТИРУЙ И ВПИШИ СВОЙ API
            /*
            await fetch('https://твой-сервер.com/api/highscore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: newScore, player: "Аноним" })
            });
            */
            console.log("Новый глобальный рекорд отправлен на сервер:", newScore);
        } catch (error) {
            console.error("Ошибка сохранения рекорда:", error);
        }
    }

    // Запускаем загрузку рекорда при открытии страницы
    fetchGlobalHighScore();

    // --- КЛАССЫ ---
    // (Код классов Enemy, RepairItem, Particle остался без изменений)
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
        score = 0; lives = maxLives; isGameOver = false;
        enemies = []; particles = []; repairItems = [];
        spawnTimer = 0; spawnInterval = 60; repairTimer = 0; gameSpeedMultiplier = 1;
        overlay.classList.add('hidden');
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
        
        // Отрисовка двух рекордов
        ctx.fillStyle = '#aaa'; 
        ctx.fillText(`Ваш рекорд: ${localHighScore}`, 20, 95);
        
        // Глобальный рекорд
        ctx.fillStyle = '#00E676'; // Неоново-зеленый
        ctx.fillText(`🌍 РЕКОРД САЙТА: ${globalHighScore}`, 20, 125);
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
        
        // Проверяем ЛОКАЛЬНЫЙ рекорд
        if (score > localHighScore) {
            localHighScore = score;
            localStorage.setItem('citadelHighScore', localHighScore); 
            recordMessage += `<br><span style="font-size:1.1rem; color:#aaa;">Вы побили свой рекорд!</span>`;
        }
        
        // Проверяем ГЛОБАЛЬНЫЙ рекорд
        // Проверка isNaN нужна, чтобы не сломаться, если сервер еще загружается ("...")
        if (!isNaN(globalHighScore) && score > globalHighScore) {
            globalHighScore = score;
            saveGlobalHighScore(score); // Отправляем на сервер!
            recordMessage += `<br><span style="font-size:1.3rem; color:#00E676; text-shadow: 0 0 10px #00E676;">👑 ВЫ ПОБИЛИ РЕКОРД САЙТА! 👑</span>`;
        }

        overlayTitle.innerHTML = `Ворота пробиты!<br><span style="font-size:1.5rem; color:#ff5252;">Счет: ${score}</span>${recordMessage}`;
        startBtn.textContent = 'Держать оборону снова';
        overlay.classList.remove('hidden');
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

    startBtn.addEventListener('click', initGame);
    draw(); 
});

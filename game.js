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
    
    // Рекорд из памяти
    let highScore = parseInt(localStorage.getItem('citadelHighScore')) || 0; 
    
    let enemies = [];
    let particles = [];
    let repairItems = []; // Массив для падающих ящиков с ремонтом
    
    // Таймеры спавна
    let spawnTimer = 0;
    let spawnInterval = 60;
    let gameSpeedMultiplier = 1;

    let repairTimer = 0;
    let repairInterval = 500; // Примерно 8 секунд до первого ящика

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

        update() {
            this.y += this.speed;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);

            const w = this.width;
            const h = this.height;

            // Голова (тело)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(w * 0.1, h * 0.3);
            ctx.lineTo(w * 0.5, 0);       
            ctx.lineTo(w * 0.9, h * 0.3); 
            ctx.lineTo(w, h * 0.8);       
            ctx.lineTo(w * 0.5, h);       
            ctx.lineTo(0, h * 0.8);       
            ctx.closePath();
            ctx.fill();

            // Глаза
            ctx.fillStyle = this.isBoss ? '#ffff00' : '#ff1744'; 
            ctx.beginPath();
            ctx.moveTo(w * 0.2, h * 0.4);
            ctx.lineTo(w * 0.4, h * 0.35);
            ctx.lineTo(w * 0.45, h * 0.55);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(w * 0.8, h * 0.4);
            ctx.lineTo(w * 0.6, h * 0.35);
            ctx.lineTo(w * 0.55, h * 0.55);
            ctx.closePath();
            ctx.fill();

            // Рот
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(w * 0.25, h * 0.75);
            ctx.lineTo(w * 0.75, h * 0.75);
            ctx.lineTo(w * 0.5, h * 0.95);
            ctx.closePath();
            ctx.fill();

            // Клыки
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(w * 0.35, h * 0.75, w * 0.05, h * 0.08); 
            ctx.fillRect(w * 0.6, h * 0.75, w * 0.05, h * 0.08);  

            // Полоска HP Босса
            if (this.isBoss) {
                ctx.fillStyle = '#333'; 
                ctx.fillRect(0, -12, this.width, 6); 
                ctx.fillStyle = '#4caf50'; 
                ctx.fillRect(0, -12, this.width * (this.hp / this.maxHp), 6);
            }
            ctx.restore();
        }
    }

    // НОВЫЙ КЛАСС: Ящик для ремонта
    class RepairItem {
        constructor() {
            this.width = 35;
            this.height = 35;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            this.speed = (1.5 + Math.random()) * gameSpeedMultiplier; // Падает чуть быстрее обычных врагов
        }

        update() {
            this.y += this.speed;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // Деревянный ящик
            ctx.fillStyle = '#8D6E63'; 
            ctx.fillRect(0, 0, this.width, this.height);
            
            // Темная рамка ящика
            ctx.strokeStyle = '#4E342E';
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, this.width, this.height);
            
            // Зеленый крест (аптечка/ремонт)
            ctx.fillStyle = '#00E676';
            ctx.fillRect(this.width * 0.4, this.height * 0.15, this.width * 0.2, this.height * 0.7);
            ctx.fillRect(this.width * 0.15, this.height * 0.4, this.width * 0.7, this.height * 0.2);

            ctx.restore();
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 5 + 2;
            this.speedX = (Math.random() - 0.5) * 8;
            this.speedY = (Math.random() - 0.5) * 8;
            this.color = color;
            this.life = 1.0;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= 0.05;
        }

        draw() {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.globalAlpha = 1.0;
        }
    }

    // --- ИГРОВАЯ ЛОГИКА ---

    function initGame() {
        score = 0;
        lives = maxLives;
        isGameOver = false;
        enemies = [];
        particles = [];
        repairItems = []; // Очищаем ящики
        
        spawnTimer = 0;
        spawnInterval = 60;
        repairTimer = 0;
        gameSpeedMultiplier = 1;
        
        overlay.classList.add('hidden');
        gameLoop();
    }

    function createExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function update() {
        gameSpeedMultiplier += 0.0005;
        spawnInterval = Math.max(20, 60 - score * 0.4);

        // Спавн врагов
        spawnTimer++;
        if (spawnTimer >= spawnInterval) {
            let spawnBoss = (score > 10 && Math.random() < 0.1);
            enemies.push(new Enemy(spawnBoss));
            spawnTimer = 0;
        }

        // Спавн ящиков с ремонтом
        repairTimer++;
        if (repairTimer >= repairInterval) {
            repairItems.push(new RepairItem());
            repairTimer = 0;
            // Следующий ящик появится через 400 - 800 кадров (примерно 7 - 13 секунд)
            repairInterval = Math.floor(Math.random() * 400) + 400; 
        }

        // Обновление частиц
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        // Обновление ящиков
        for (let i = repairItems.length - 1; i >= 0; i--) {
            let item = repairItems[i];
            item.update();
            // Удаляем, если ящик упал (он разбивается без урона для стены)
            if (item.y > canvas.height) {
                repairItems.splice(i, 1);
            }
        }

        // Обновление врагов
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

        // Рисуем всё на экране
        repairItems.forEach(item => item.draw());
        enemies.forEach(enemy => enemy.draw());
        particles.forEach(p => p.draw());

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`💀 Убито: ${score}`, 20, 35);
        
        ctx.fillStyle = wallColor;
        ctx.fillText(`🛡️ Прочность: ${Math.max(0, lives)}/${maxLives}`, 20, 65);
        
        ctx.fillStyle = '#ffd700'; 
        ctx.fillText(`🏆 Рекорд: ${highScore}`, 20, 95);
    }

    function gameLoop() {
        if (isGameOver) {
            endGame();
            return;
        }
        update();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        cancelAnimationFrame(animationId);
        
        let recordMessage = "";
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('citadelHighScore', highScore); 
            recordMessage = `<br><span style="font-size:1.2rem; color:#4caf50;">🎉 НОВЫЙ РЕКОРД!</span>`;
        } else {
            recordMessage = `<br><span style="font-size:1rem; color:#aaa;">(Ваш рекорд: ${highScore})</span>`;
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
        
        let hitSomething = false; // Чтобы за один клик не сбить сразу двух перекрывающихся юнитов

        // 1. Сначала проверяем клики по ящикам ремонта (они важнее)
        for (let i = repairItems.length - 1; i >= 0; i--) {
            const item = repairItems[i];
            if (clickX >= item.x && clickX <= item.x + item.width &&
                clickY >= item.y && clickY <= item.y + item.height) {
                
                // Восстанавливаем жизнь
                if (lives < maxLives) lives++; 
                
                // Эффект зеленых искр (лечение)
                createExplosion(item.x + item.width/2, item.y + item.height/2, '#00E676', 20);
                repairItems.splice(i, 1);
                hitSomething = true;
                break;
            }
        }

        if (hitSomething) return; // Если попали по ящику, гоблинов не бьем этим же кликом

        // 2. Проверяем клики по гоблинам
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            if (clickX >= enemy.x && clickX <= enemy.x + enemy.width &&
                clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                
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

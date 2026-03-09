document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('startGameBtn');
    const overlayTitle = document.getElementById('overlayTitle');

    // Настройки игры
    let score = 0;
    let lives = 5;
    let isGameOver = false;
    let animationId;
    
    // Загружаем рекорд из памяти браузера
    let highScore = parseInt(localStorage.getItem('citadelHighScore')) || 0; 
    
    let enemies = [];
    let particles = [];
    
    // Спавн врагов
    let spawnTimer = 0;
    let spawnInterval = 60;
    let gameSpeedMultiplier = 1;

    // --- КЛАССЫ ---

    class Enemy {
        constructor(isBoss = false) {
            this.isBoss = isBoss;
            
            // Размер bounding box (для физики и кликов)
            this.width = isBoss ? 80 : 40;
            this.height = isBoss ? 80 : 40;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            
            this.hp = isBoss ? 5 : 1; 
            this.maxHp = this.hp;
            
            let baseSpeed = isBoss ? 0.7 : (1 + Math.random() * 2);
            this.speed = baseSpeed * gameSpeedMultiplier;
            
            // Цвета кожи гоблинов
            this.color = isBoss ? '#827717' : '#2e7d32'; // Босс более темный/оливковый
        }

        update() {
            this.y += this.speed;
        }

        // --- ИЗМЕНЕНО: Процедурная отрисовка гоблина ---
        draw() {
            // Сохраняем состояние контекста для безопасной трансформации координат
            ctx.save();
            ctx.translate(this.x, this.y); // Переносим начало координат в левый верхний угол врага

            const w = this.width;
            const h = this.height;

            // 1. Рисуем голову (тело)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            // Pointy head / face shape
            ctx.moveTo(w * 0.1, h * 0.3); // Left cheek top
            ctx.lineTo(w * 0.5, 0);         // Top of head pointy
            ctx.lineTo(w * 0.9, h * 0.3); // Right cheek top
            ctx.lineTo(w, h * 0.8);        // Right jaw
            ctx.lineTo(w * 0.5, h);         // Chin
            ctx.lineTo(0, h * 0.8);        // Left jaw
            ctx.closePath();
            ctx.fill();

            // 2. Злые светящиеся глаза
            ctx.fillStyle = this.isBoss ? '#ffff00' : '#ff1744'; // Босс желтый, обычный красный
            ctx.beginPath();
            // Левый глаз (сердитый наклон)
            ctx.moveTo(w * 0.2, h * 0.4);
            ctx.lineTo(w * 0.4, h * 0.35);
            ctx.lineTo(w * 0.45, h * 0.55);
            ctx.closePath();
            ctx.fill();
            // Правый глаз
            ctx.beginPath();
            ctx.moveTo(w * 0.8, h * 0.4);
            ctx.lineTo(w * 0.6, h * 0.35);
            ctx.lineTo(w * 0.55, h * 0.55);
            ctx.closePath();
            ctx.fill();

            // 3. Агрессивный рот (оскал)
            ctx.fillStyle = '#000000'; // Черный оскал
            ctx.beginPath();
            ctx.moveTo(w * 0.25, h * 0.75);
            ctx.lineTo(w * 0.75, h * 0.75);
            ctx.lineTo(w * 0.5, h * 0.95);
            ctx.closePath();
            ctx.fill();

            // Tiny white teeth (only for visible оскал)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(w * 0.35, h * 0.75, w * 0.05, h * 0.08); // Tooth 1
            ctx.fillRect(w * 0.6, h * 0.75, w * 0.05, h * 0.08);  // Tooth 2

            // 4. Полоска HP для Босса (рисуем *поверх* гоблина внутри translated context)
            if (this.isBoss) {
                // Background bar (relative coords y=-12 above translated origin)
                ctx.fillStyle = '#333'; 
                ctx.fillRect(0, -12, this.width, 6); 
                // Current HP
                ctx.fillStyle = '#4caf50'; 
                ctx.fillRect(0, -12, this.width * (this.hp / this.maxHp), 6);
            }

            // Восстанавливаем контекст
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
        lives = 5;
        isGameOver = false;
        enemies = [];
        particles = [];
        spawnTimer = 0;
        spawnInterval = 60;
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

        spawnTimer++;
        if (spawnTimer >= spawnInterval) {
            let spawnBoss = (score > 10 && Math.random() < 0.1);
            enemies.push(new Enemy(spawnBoss));
            spawnTimer = 0;
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            enemy.update();

            if (enemy.y + enemy.height >= canvas.height - 20) {
                lives -= enemy.isBoss ? 3 : 1; 
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height, '#ff9800', 30);
                enemies.splice(i, 1);
                
                if (lives <= 0) {
                    isGameOver = true;
                }
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
        ctx.fillRect(0, canvas.height - 20, canvas.width * (Math.max(0, lives) / 5), 3); 

        enemies.forEach(enemy => enemy.draw());
        particles.forEach(p => p.draw());

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`💀 Убито: ${score}`, 20, 35);
        
        ctx.fillStyle = wallColor;
        ctx.fillText(`🛡️ Прочность: ${Math.max(0, lives)}/5`, 20, 65);
        
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

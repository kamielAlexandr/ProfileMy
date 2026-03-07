document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('startGameBtn');
    const overlayTitle = document.getElementById('overlayTitle');

    // Настройки игры
    let score = 0;
    let lives = 5; // Прочность стены (жизни)
    let isGameOver = false;
    let animationId;
    
    let enemies = [];
    let particles = [];
    
    // Спавн врагов
    let spawnTimer = 0;
    let spawnInterval = 60;
    let gameSpeedMultiplier = 1;

    // --- КЛАССЫ ---

    // Класс Врага (Гоблин или Босс)
    class Enemy {
        constructor(isBoss = false) {
            this.isBoss = isBoss;
            
            // Босс в 2 раза больше
            this.width = isBoss ? 80 : 40;
            this.height = isBoss ? 80 : 40;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            
            // Здоровье (клики для убийства)
            this.hp = isBoss ? 5 : 1; 
            this.maxHp = this.hp;
            
            // Скорость (Боссы идут медленнее)
            let baseSpeed = isBoss ? 0.7 : (1 + Math.random() * 2);
            this.speed = baseSpeed * gameSpeedMultiplier;
            
            // Цвет: Боссы красные, обычные зеленые
            this.color = isBoss ? '#b71c1c' : '#2e7d32'; 
        }

        update() {
            this.y += this.speed;
        }

        draw() {
            // Тело
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Глаза и Полоска HP для Босса
            ctx.fillStyle = '#fff';
            if (this.isBoss) {
                // Глаза босса
                ctx.fillRect(this.x + 16, this.y + 20, 16, 16);
                ctx.fillRect(this.x + 48, this.y + 20, 16, 16);
                
                // Полоска здоровья над боссом
                ctx.fillStyle = '#333'; // Фон полоски
                ctx.fillRect(this.x, this.y - 12, this.width, 6);
                ctx.fillStyle = '#4caf50'; // Само здоровье
                ctx.fillRect(this.x, this.y - 12, this.width * (this.hp / this.maxHp), 6);
            } else {
                // Глаза обычного гоблина
                ctx.fillRect(this.x + 8, this.y + 10, 8, 8);
                ctx.fillRect(this.x + 24, this.y + 10, 8, 8);
            }
        }
    }

    // Класс Частиц (взрыв)
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
        lives = 5; // Сбрасываем жизни при старте
        isGameOver = false;
        enemies = [];
        particles = [];
        spawnTimer = 0;
        spawnInterval = 60;
        gameSpeedMultiplier = 1;
        
        overlay.classList.add('hidden');
        gameLoop();
    }

    // Функция создания взрыва
    function createExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function update() {
        gameSpeedMultiplier += 0.0005; // Постепенное ускорение
        spawnInterval = Math.max(20, 60 - score * 0.4); // Уменьшаем интервал спавна

        spawnTimer++;
        if (spawnTimer >= spawnInterval) {
            // Шанс 10% на появление Босса (только если счет > 10)
            let spawnBoss = (score > 10 && Math.random() < 0.1);
            enemies.push(new Enemy(spawnBoss));
            spawnTimer = 0;
        }

        // Обновление частиц (с конца, чтобы безопасно удалять)
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }

        // Проверяем врагов (идем с конца массива)
        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            enemy.update();

            // Если гоблин ударился о стену Цитадели (низ экрана)
            if (enemy.y + enemy.height >= canvas.height - 20) {
                // Босс отнимает 3 жизни, обычный - 1
                lives -= enemy.isBoss ? 3 : 1; 
                
                // Взрыв о стену
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height, '#ff9800', 30);
                
                enemies.splice(i, 1); // Удаляем врага
                
                // Проверка на проигрыш
                if (lives <= 0) {
                    isGameOver = true;
                }
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Цвет стены меняется в зависимости от жизней
        let wallColor = lives > 3 ? '#4caf50' : (lives > 1 ? '#ff9800' : '#f44336');
        
        // Рисуем стену
        ctx.fillStyle = '#333';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        // Линия прочности поверх стены
        ctx.fillStyle = wallColor;
        ctx.fillRect(0, canvas.height - 20, canvas.width * (Math.max(0, lives) / 5), 3); 

        // Рисуем сущности
        enemies.forEach(enemy => enemy.draw());
        particles.forEach(p => p.draw());

        // Отрисовка интерфейса (UI)
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`💀 Убито: ${score}`, 20, 35);
        
        ctx.fillStyle = wallColor;
        ctx.fillText(`🛡️ Прочность ворот: ${Math.max(0, lives)}/5`, 20, 65);
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
        overlayTitle.innerHTML = `Ворота пробиты!<br><span style="font-size:1.5rem; color:#ff5252;">Повержено врагов: ${score}</span>`;
        startBtn.textContent = 'Держать оборону снова';
        overlay.classList.remove('hidden');
    }

    // --- УПРАВЛЕНИЕ (КЛИКИ) ---
    canvas.addEventListener('mousedown', (e) => {
        if (isGameOver) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            // Если попали по врагу
            if (clickX >= enemy.x && clickX <= enemy.x + enemy.width &&
                clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                
                enemy.hp--; // Отнимаем здоровье
                
                // Маленький эффект попадания
                createExplosion(clickX, clickY, '#fff', 5);
                
                // Если убили
                if (enemy.hp <= 0) {
                    // Большой взрыв (для босса частиц больше)
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, enemy.isBoss ? 50 : 15);
                    
                    score += enemy.isBoss ? 5 : 1; // За босса даем 5 очков
                    enemies.splice(i, 1);
                }
                
                break; // За один клик бьем только одного врага
            }
        }
    });

    startBtn.addEventListener('click', initGame);
    draw(); // Рисуем первый кадр при загрузке страницы
});

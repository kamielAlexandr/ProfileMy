document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('startGameBtn');
    const overlayTitle = document.getElementById('overlayTitle');

    // Настройки игры
    let score = 0;
    let isGameOver = false;
    let animationId;
    
    let enemies = [];
    let particles = [];
    
    // Спавн врагов
    let spawnTimer = 0;
    let spawnInterval = 60; // Каждые 60 кадров (около 1 сек)
    let gameSpeedMultiplier = 1;

    // --- КЛАССЫ ---

    // Класс Врага (Гоблина)
    class Enemy {
        constructor() {
            this.width = 40;
            this.height = 40;
            // Появляется случайным образом по ширине экрана
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height; // За пределами экрана сверху
            // Скорость зависит от прогресса игры
            this.speed = (1 + Math.random() * 2) * gameSpeedMultiplier;
            this.color = '#2e7d32'; // Зеленый гоблинский цвет
        }

        update() {
            this.y += this.speed;
        }

        draw() {
            // Тело гоблина
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Злые красные глаза
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(this.x + 8, this.y + 10, 8, 8);
            ctx.fillRect(this.x + 24, this.y + 10, 8, 8);
        }
    }

    // Класс Частиц (для эффекта взрыва при клике)
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 5 + 2;
            this.speedX = (Math.random() - 0.5) * 6;
            this.speedY = (Math.random() - 0.5) * 6;
            this.color = color;
            this.life = 1.0; // Прозрачность
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= 0.05; // Постепенно исчезает
        }

        draw() {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.globalAlpha = 1.0; // Возвращаем прозрачность
        }
    }

    // --- ИГРОВАЯ ЛОГИКА ---

    function initGame() {
        score = 0;
        isGameOver = false;
        enemies = [];
        particles = [];
        spawnTimer = 0;
        spawnInterval = 60;
        gameSpeedMultiplier = 1;
        
        overlay.classList.add('hidden'); // Прячем меню
        gameLoop(); // Запускаем цикл
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function update() {
        // Усложнение игры со временем
        gameSpeedMultiplier += 0.0005;
        spawnInterval = Math.max(20, 60 - score * 0.5); // Спавн быстрее с ростом очков

        // Спавн новых гоблинов
        spawnTimer++;
        if (spawnTimer >= spawnInterval) {
            enemies.push(new Enemy());
            spawnTimer = 0;
        }

        // Обновление частиц
        particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) particles.splice(index, 1);
        });

        // Обновление врагов
        enemies.forEach((enemy, index) => {
            enemy.update();

            // Если гоблин дошел до низа экрана — конец игры
            if (enemy.y + enemy.height >= canvas.height) {
                isGameOver = true;
            }
        });
    }

    function draw() {
        // Очищаем экран (рисуем темный фон)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Рисуем стену Цитадели внизу
        ctx.fillStyle = '#424242';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        ctx.fillStyle = '#ffb300';
        ctx.font = '14px Arial';
        ctx.fillText('Стена Цитадели', 10, canvas.height - 5);

        // Рисуем сущности
        enemies.forEach(enemy => enemy.draw());
        particles.forEach(p => p.draw());

        // Отрисовка счета
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText(`Убито гоблинов: ${score}`, 20, 40);
    }

    function gameLoop() {
        if (isGameOver) {
            endGame();
            return;
        }

        update();
        draw();
        
        // Встроенный метод браузера для плавной анимации (обычно 60 FPS)
        animationId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        cancelAnimationFrame(animationId);
        overlayTitle.innerHTML = `Цитадель пала!<br><span style="font-size:1.5rem; color:#ff5252;">Ваш счет: ${score}</span>`;
        startBtn.textContent = 'Играть снова';
        overlay.classList.remove('hidden');
    }

    // --- УПРАВЛЕНИЕ ---

    // Обработка кликов (стрельба)
    canvas.addEventListener('mousedown', (e) => {
        if (isGameOver) return;

        // Вычисляем точные координаты клика с учетом масштабирования canvas через CSS
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Проверяем попадание по врагам (идем с конца массива, чтобы убивать верхних визуально)
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            // Простая проверка коллизии точки и прямоугольника (AABB)
            if (clickX >= enemy.x && clickX <= enemy.x + enemy.width &&
                clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                
                // Создаем эффект взрыва
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color);
                
                // Удаляем убитого гоблина и даем очко
                enemies.splice(i, 1);
                score++;
                
                break; // За один клик убиваем только одного
            }
        }
    });

    // Запуск по кнопке
    startBtn.addEventListener('click', initGame);
    
    // Рисуем начальный экран (просто пустой фон)
    draw();
});

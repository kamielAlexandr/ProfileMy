document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('farmCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Элементы интерфейса
    const coinsUI = document.getElementById('farmCoinsUI');
    const seedBtns = document.querySelectorAll('.seed-btn');

    // База данных семян (конфиги)
    const SEEDS = {
        wheat:   { icon: '🌾', cost: 2,  reward: 5,  growTime: 3000 },  // 3 секунды
        tomato:  { icon: '🍅', cost: 5,  reward: 15, growTime: 6000 },  // 6 секунд
        pumpkin: { icon: '🎃', cost: 15, reward: 50, growTime: 12000 }  // 12 секунд
    };

    // Игровое состояние
    let coins = parseInt(localStorage.getItem('farmCoins')) || 20;
    let selectedSeed = 'wheat'; // Какое семя выбрано для посадки
    let animationId;

    // Обновление UI
    function updateUI() {
        coinsUI.textContent = coins;
        localStorage.setItem('farmCoins', coins); // Сохраняем монеты в браузере
    }
    updateUI();

    // Обработка кликов по кнопкам семян
    seedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем класс active у всех
            seedBtns.forEach(b => b.classList.remove('active'));
            // Добавляем нажатой
            btn.classList.add('active');
            // Запоминаем выбор
            selectedSeed = btn.dataset.seed;
        });
    });

    // --- ЛОГИКА ГРЯДОК ---
    const cols = 4;
    const rows = 3;
    const plotWidth = canvas.width / cols;
    const plotHeight = canvas.height / rows;
    const plots = [];

    // Создаем сетку
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            plots.push({
                col: c,
                row: r,
                x: c * plotWidth,
                y: r * plotHeight,
                state: 'empty', // 'empty', 'growing', 'ready'
                cropType: null,
                plantTime: 0,
                growDuration: 0
            });
        }
    }

    // Всплывающие цифры (+монеты, -монеты)
    let popups = [];
    class PopupText {
        constructor(x, y, text, color) {
            this.x = x; this.y = y; this.text = text; this.color = color;
            this.life = 1.0;
        }
        update() { this.y -= 1; this.life -= 0.02; }
        draw() {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y);
            ctx.restore();
        }
    }

    // --- ИГРОВОЙ ЦИКЛ ---
    function update() {
        const now = Date.now();
        
        // Проверяем, выросло ли что-то
        plots.forEach(plot => {
            if (plot.state === 'growing') {
                if (now - plot.plantTime >= plot.growDuration) {
                    plot.state = 'ready'; // Урожай созрел!
                }
            }
        });

        // Обновляем всплывающие тексты
        for (let i = popups.length - 1; i >= 0; i--) {
            popups[i].update();
            if (popups[i].life <= 0) popups.splice(i, 1);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рисуем грядки
        plots.forEach(plot => {
            // Земля (чередуем цвета шахматкой для красоты)
            ctx.fillStyle = (plot.col + plot.row) % 2 === 0 ? '#6D4C41' : '#5D4037';
            ctx.fillRect(plot.x, plot.y, plotWidth, plotHeight);

            // Внутренняя рамочка грядки
            ctx.strokeStyle = '#3E2723';
            ctx.lineWidth = 2;
            ctx.strokeRect(plot.x + 5, plot.y + 5, plotWidth - 10, plotHeight - 10);

            const centerX = plot.x + plotWidth / 2;
            const centerY = plot.y + plotHeight / 2;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (plot.state === 'growing') {
                // Вычисляем процент роста для размера иконки
                const elapsed = Date.now() - plot.plantTime;
                const progress = Math.min(1, elapsed / plot.growDuration);
                
                ctx.font = '40px Arial';
                if (progress < 0.5) {
                    ctx.fillText('🌱', centerX, centerY); // Только проклюнулось
                } else {
                    ctx.fillText('🌿', centerX, centerY); // Подросло
                }
                
                // Рисуем полоску роста (прогресс-бар)
                const barWidth = 60;
                ctx.fillStyle = '#333';
                ctx.fillRect(centerX - barWidth/2, plot.y + plotHeight - 20, barWidth, 6);
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(centerX - barWidth/2, plot.y + plotHeight - 20, barWidth * progress, 6);
            } 
            else if (plot.state === 'ready') {
                // Готовый урожай (анимируем размер "пульсацией")
                const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(scale, scale);
                ctx.font = '50px Arial';
                ctx.fillText(SEEDS[plot.cropType].icon, 0, 0);
                ctx.restore();
                
                // Зеленая подсветка готовности
                ctx.shadowColor = '#00E676';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = '#00E676';
                ctx.strokeRect(plot.x + 5, plot.y + 5, plotWidth - 10, plotHeight - 10);
                ctx.shadowBlur = 0;
            }
        });

        // Рисуем всплывающие цифры
        popups.forEach(p => p.draw());
    }

    function gameLoop() {
        update();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    // --- КЛИК ПО ГРЯДКАМ (ПОСАДКА / СБОР) ---
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Находим, по какой грядке кликнули
        const clickedCol = Math.floor(clickX / plotWidth);
        const clickedRow = Math.floor(clickY / plotHeight);
        
        const plot = plots.find(p => p.col === clickedCol && p.row === clickedRow);
        if (!plot) return;

        const centerX = plot.x + plotWidth / 2;

        if (plot.state === 'empty') {
            // Попытка посадить
            const seedData = SEEDS[selectedSeed];
            if (coins >= seedData.cost) {
                coins -= seedData.cost;
                updateUI();
                
                plot.state = 'growing';
                plot.cropType = selectedSeed;
                plot.plantTime = Date.now();
                plot.growDuration = seedData.growTime;
                
                popups.push(new PopupText(centerX, plot.y + 30, `-${seedData.cost} 🪙`, '#ff5252'));
            } else {
                popups.push(new PopupText(centerX, plot.y + 30, `Нет денег!`, '#ff5252'));
            }
        } 
        else if (plot.state === 'ready') {
            // Сбор урожая
            const reward = SEEDS[plot.cropType].reward;
            coins += reward;
            updateUI();
            
            plot.state = 'empty';
            plot.cropType = null;
            
            popups.push(new PopupText(centerX, plot.y + 30, `+${reward} 🪙`, '#ffd700'));
        }
    });

    // Запускаем
    gameLoop();
});

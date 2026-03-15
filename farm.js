// ЖЕСТКАЯ ЗАЩИТА ОТ ДВОЙНОГО ЗАПУСКА
if (window.farmInitialized) {
    console.warn("Ферма уже запущена.");
} else {
    window.farmInitialized = true;

    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('farmCanvas');
        if (!canvas) return; // Если мы не на странице фермы - отключаемся

        const ctx = canvas.getContext('2d');
        let animationId;

        // === БЕЗОПАСНАЯ ЗАГРУЗКА ИЗ КЭША (САМОИСЦЕЛЕНИЕ) ===
        function safeLoad(key, defaultObj) {
            try {
                let data = localStorage.getItem(key);
                if (!data || data === "undefined" || data === "null") return defaultObj;
                let parsed = JSON.parse(data);
                // Если данные сломаны, возвращаем стандартные
                if (typeof parsed !== 'object' || parsed === null) return defaultObj;
                return parsed;
            } catch (e) {
                console.error(`Кэш сломан для ${key}. Восстанавливаем данные по умолчанию.`);
                return defaultObj;
            }
        }

        // --- СОСТОЯНИЕ ИГРОКА ---
        let player = {
            coins: parseInt(localStorage.getItem('farmCoins')) || 100, // 100 монет на старте
            xp: parseInt(localStorage.getItem('farmXp')) || 0,
            inventory: safeLoad('farmInventory', { wheat: 5, tomato: 0, pumpkin: 0, magic: 0 }),
            upgrades: safeLoad('farmUpgrades', { autoWater: false, greenhouse: false })
        };

        // Защита, если в инвентаре вообще нет пшеницы (из-за багов)
        if (player.inventory.wheat === undefined) player.inventory.wheat = 5;

        let selectedSeed = 'wheat';
        let activeCanvasRoom = 'gardenRoom'; 

        // --- БАЗА ДАННЫХ СЕМЯН И УЛУЧШЕНИЙ ---
        const SEEDS = {
            wheat:   { id: 'wheat', name: 'Пшеница', icon: '🌾', cost: 5, reward: 15, growTime: 5000, witherTime: 10000, waterNeeds: 1 },
            tomato:  { id: 'tomato', name: 'Томаты', icon: '🍅', cost: 15, reward: 40, growTime: 10000, witherTime: 15000, waterNeeds: 2 },
            pumpkin: { id: 'pumpkin', name: 'Тыква', icon: '🎃', cost: 40, reward: 120, growTime: 20000, witherTime: 30000, waterNeeds: 3 },
            magic:   { id: 'magic', name: 'Маг. Корень', icon: '🌺', cost: 150, reward: 500, growTime: 40000, witherTime: 60000, waterNeeds: 4, type: 'greenhouse' }
        };

        const UPGRADES = {
            autoWater:  { id: 'autoWater', name: 'Автополив', icon: '🚿', desc: 'Земля больше не пересыхает.', cost: 500 },
            greenhouse: { id: 'greenhouse', name: 'Ключ от Теплицы', icon: '🔑', desc: 'Открывает новую локацию.', cost: 1000 }
        };

        // --- ИНИЦИАЛИЗАЦИЯ ПОЛЕЙ ---
        let plots = safeLoad('farmPlots', null);
        if (!plots || !Array.isArray(plots) || plots.length === 0) {
            plots = [];
            // Огород (3x3)
            for(let r=0; r<3; r++) {
                for(let c=0; c<3; c++) {
                    plots.push({ id: `garden_${r}_${c}`, room: 'gardenRoom', col: c, row: r, x: c*200, y: r*133, width: 200, height: 133, state: 'empty', seedId: null, plantTime: 0, lastWatered: 0, watersGiven: 0 });
                }
            }
            // Теплица (2x2)
            for(let r=0; r<2; r++) {
                for(let c=0; c<2; c++) {
                    plots.push({ id: `green_${r}_${c}`, room: 'greenhouseRoom', col: c, row: r, x: c*300, y: r*200, width: 300, height: 200, state: 'empty', seedId: null, plantTime: 0, lastWatered: 0, watersGiven: 0 });
                }
            }
        }

        // --- СОХРАНЕНИЕ ---
        function saveData() {
            try {
                localStorage.setItem('farmCoins', player.coins);
                localStorage.setItem('farmXp', player.xp);
                localStorage.setItem('farmInventory', JSON.stringify(player.inventory));
                localStorage.setItem('farmUpgrades', JSON.stringify(player.upgrades));
                localStorage.setItem('farmPlots', JSON.stringify(plots));
            } catch(e) { console.error("Ошибка сохранения данных фермы", e); }
        }

        // --- UI И ИНТЕРФЕЙС ---
        const uiCoins = document.getElementById('farmCoinsUI');
        const uiXp = document.getElementById('farmXpUI');
        const invContainer = document.getElementById('inventoryUI');
        const shopContainer = document.getElementById('seedShopUI');
        const upgradesContainer = document.getElementById('upgradesUI');
        const navGreenhouse = document.getElementById('navGreenhouse');

        function renderUI() {
            if (uiCoins) uiCoins.textContent = player.coins;
            if (uiXp) uiXp.textContent = player.xp;

            if (player.upgrades.greenhouse && navGreenhouse) {
                navGreenhouse.textContent = '🌿 Теплица';
                navGreenhouse.style.color = '#fff';
            }

            // Отрисовка Инвентаря
            if (invContainer) {
                invContainer.innerHTML = '';
                let hasSeeds = false;
                for (let key in player.inventory) {
                    if (player.inventory[key] > 0 && SEEDS[key]) {
                        hasSeeds = true;
                        const seed = SEEDS[key];
                        const div = document.createElement('div');
                        div.className = `inv-slot ${selectedSeed === key ? 'active' : ''}`;
                        div.innerHTML = `${seed.icon} ${seed.name}: <b>${player.inventory[key]}</b>`;
                        div.onclick = () => { selectedSeed = key; renderUI(); };
                        invContainer.appendChild(div);
                    }
                }
                if (!hasSeeds) {
                    invContainer.innerHTML = '<p style="color:#ff5252; padding:10px;">У вас нет семян. Купите их в Магазине!</p>';
                }
            }

            // Отрисовка Магазина
            if (shopContainer) {
                shopContainer.innerHTML = '';
                for (let key in SEEDS) {
                    const seed = SEEDS[key];
                    if (seed.type === 'greenhouse' && !player.upgrades.greenhouse) continue; 
                    
                    const card = document.createElement('div');
                    card.className = 'shop-card';
                    card.innerHTML = `
                        <h3>${seed.icon}</h3>
                        <h4 style="color:#fff; margin-bottom:5px;">${seed.name}</h4>
                        <p>Доход: +${seed.reward} 🪙<br>Рост: ${seed.growTime/1000} сек.</p>
                        <button ${player.coins < seed.cost ? 'disabled' : ''}>Купить за ${seed.cost} 🪙</button>
                    `;
                    card.querySelector('button').onclick = () => {
                        if (player.coins >= seed.cost) {
                            player.coins -= seed.cost;
                            player.inventory[key] = (player.inventory[key] || 0) + 1;
                            saveData(); renderUI();
                        }
                    };
                    shopContainer.appendChild(card);
                }
            }

            // Отрисовка Дома
            if (upgradesContainer) {
                upgradesContainer.innerHTML = '';
                for (let key in UPGRADES) {
                    const upg = UPGRADES[key];
                    const hasUpg = player.upgrades[key];
                    const card = document.createElement('div');
                    card.className = `shop-card ${hasUpg ? 'purchased' : ''}`;
                    card.innerHTML = `
                        <h3>${upg.icon}</h3>
                        <h4 style="color:#fff; margin-bottom:5px;">${upg.name}</h4>
                        <p>${upg.desc}</p>
                        ${hasUpg ? '<button disabled>Куплено</button>' : `<button ${player.coins < upg.cost ? 'disabled' : ''}>Купить за ${upg.cost} 🪙</button>`}
                    `;
                    if (!hasUpg) {
                        card.querySelector('button').onclick = () => {
                            if (player.coins >= upg.cost) {
                                player.coins -= upg.cost;
                                player.upgrades[key] = true;
                                saveData(); renderUI();
                            }
                        };
                    }
                    upgradesContainer.appendChild(card);
                }
            }
        }

        // Всплывающие цифры
        let popups = [];
        class PopupText {
            constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; }
            update() { this.y -= 1; this.life -= 0.02; }
            draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
        }

        // --- НАДЕЖНАЯ ЛОГИКА ВКЛАДОК КОМНАТ ---
        const roomBtns = document.querySelectorAll('.room-btn');
        roomBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                
                // Защита для теплицы
                if (target === 'greenhouseRoom' && !player.upgrades.greenhouse) {
                    alert("🔒 Теплица закрыта! Сначала купите Ключ в Доме.");
                    return;
                }

                // Сбрасываем все кнопки и комнаты
                roomBtns.forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.room-content').forEach(c => c.style.display = 'none');
                
                // Активируем нужную
                btn.classList.add('active');
                
                // Если это Огород или Теплица - включаем Canvas
                if (target === 'gardenRoom' || target === 'greenhouseRoom') {
                    const canvasRoom = document.getElementById('gardenRoom');
                    if (canvasRoom) canvasRoom.style.display = 'block'; 
                    activeCanvasRoom = target;
                } else {
                    // Иначе включаем HTML комнату (Дом, Магазин)
                    const htmlRoom = document.getElementById(target);
                    if (htmlRoom) htmlRoom.style.display = 'block';
                }
                
                renderUI();
            });
        });

        // --- ЛОГИКА РОСТА CANVAS ---
        function updateCanvas() {
            const now = Date.now();
            plots.forEach(plot => {
                if (plot.state === 'growing' || plot.state === 'thirsty') {
                    const seed = SEEDS[plot.seedId];
                    if (!seed) return; // Защита от битых семян
                    
                    const timeAlive = now - plot.plantTime;

                    if (player.upgrades.autoWater && plot.state === 'thirsty') {
                        plot.state = 'growing'; plot.watersGiven++;
                    }

                    let waterInterval = seed.growTime / (seed.waterNeeds + 1);
                    if (!player.upgrades.autoWater && plot.state === 'growing' && timeAlive > (plot.watersGiven + 1) * waterInterval) {
                        if (plot.watersGiven < seed.waterNeeds) plot.state = 'thirsty'; 
                    }

                    if (plot.state === 'growing' && timeAlive >= seed.growTime) {
                        plot.state = 'ready'; plot.readyTime = now; 
                    }
                } 
                else if (plot.state === 'ready') {
                    const seed = SEEDS[plot.seedId];
                    if (seed && (now - plot.readyTime) >= seed.witherTime) plot.state = 'withered';
                }
            });

            for (let i = popups.length - 1; i >= 0; i--) {
                popups[i].update();
                if (popups[i].life <= 0) popups.splice(i, 1);
            }
        }

        // --- ОТРИСОВКА CANVAS ---
        function drawCanvas() {
            ctx.fillStyle = activeCanvasRoom === 'gardenRoom' ? '#4E342E' : '#263238'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            plots.filter(p => p.room === activeCanvasRoom).forEach(plot => {
                if (plot.state === 'empty') ctx.fillStyle = '#6D4C41';
                else if (plot.state === 'thirsty') ctx.fillStyle = '#8D6E63'; 
                else ctx.fillStyle = '#3E2723'; 

                ctx.fillRect(plot.x, plot.y, plot.width, plot.height);
                ctx.strokeStyle = '#271915'; ctx.lineWidth = 4;
                ctx.strokeRect(plot.x + 4, plot.y + 4, plot.width - 8, plot.height - 8);

                const cx = plot.x + plot.width / 2;
                const cy = plot.y + plot.height / 2;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

                if (plot.state === 'thirsty') {
                    ctx.font = '30px Arial'; ctx.fillText('💧', cx, cy - 20);
                    ctx.font = '20px Arial'; ctx.fillStyle = '#fff'; ctx.fillText('Полейте!', cx, cy + 20);
                } 
                else if (plot.state === 'growing') {
                    const seed = SEEDS[plot.seedId];
                    if (seed) {
                        const progress = Math.min(1, (Date.now() - plot.plantTime) / seed.growTime);
                        ctx.font = '40px Arial'; ctx.fillText(progress < 0.5 ? '🌱' : '🌿', cx, cy);
                        ctx.fillStyle = '#111'; ctx.fillRect(cx - 30, plot.y + plot.height - 20, 60, 8);
                        ctx.fillStyle = '#4CAF50'; ctx.fillRect(cx - 30, plot.y + plot.height - 20, 60 * progress, 8);
                    }
                } 
                else if (plot.state === 'ready') {
                    const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
                    ctx.font = '50px Arial'; ctx.fillText(SEEDS[plot.seedId]?.icon || '?', 0, 0);
                    ctx.restore();
                    ctx.strokeStyle = '#00E676'; ctx.lineWidth = 3; 
                    ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);
                }
                else if (plot.state === 'withered') {
                    ctx.font = '40px Arial'; ctx.fillText('🥀', cx, cy); 
                    ctx.font = '16px Arial'; ctx.fillStyle = '#ff5252'; ctx.fillText('Сгнило', cx, cy + 30);
                }
            });

            popups.forEach(p => p.draw());
        }

        function gameLoop() {
            updateCanvas();
            drawCanvas();
            animationId = requestAnimationFrame(gameLoop);
        }

        // --- ВЗАИМОДЕЙСТВИЕ С ГРЯДКАМИ ---
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

            const plot = plots.find(p => p.room === activeCanvasRoom && clickX >= p.x && clickX <= p.x + p.width && clickY >= p.y && clickY <= p.y + p.height);
            if (!plot) return;

            const cx = plot.x + plot.width / 2;

            if (plot.state === 'empty') {
                if (player.inventory[selectedSeed] > 0) {
                    const seedData = SEEDS[selectedSeed];
                    if (seedData.type === 'greenhouse' && activeCanvasRoom !== 'greenhouseRoom') {
                        popups.push(new PopupText(cx, plot.y + 40, `Только для теплицы!`, '#ff5252'));
                        return;
                    }
                    player.inventory[selectedSeed]--;
                    plot.state = 'growing'; plot.seedId = selectedSeed; plot.plantTime = Date.now(); plot.watersGiven = 0;
                    saveData(); renderUI();
                } else {
                    popups.push(new PopupText(cx, plot.y + 40, `Нет семян!`, '#ff5252'));
                }
            } 
            else if (plot.state === 'thirsty') {
                plot.state = 'growing'; plot.watersGiven++; saveData();
                popups.push(new PopupText(cx, plot.y + 40, `💦 Полито`, '#2196F3'));
            }
            else if (plot.state === 'ready') {
                const reward = SEEDS[plot.seedId]?.reward || 0;
                player.coins += reward; player.xp += 10; 
                plot.state = 'empty'; plot.seedId = null; saveData(); renderUI();
                popups.push(new PopupText(cx, plot.y + 40, `+${reward} 🪙`, '#ffd700'));
            }
            else if (plot.state === 'withered') {
                plot.state = 'empty'; plot.seedId = null; saveData();
                popups.push(new PopupText(cx, plot.y + 40, `Очищено`, '#aaa'));
            }
        });

        // Запуск
        renderUI();
        gameLoop();
        // Сохраняем прогресс каждые 3 секунды, чтобы не грузить браузер
        setInterval(saveData, 3000);
    });
}

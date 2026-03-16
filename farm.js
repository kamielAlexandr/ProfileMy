if (window.farmInitialized) {
    console.warn("Ферма уже запущена.");
} else {
    window.farmInitialized = true;

    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('farmCanvas');
        if (!canvas) return; 

        const ctx = canvas.getContext('2d');
        let animationId;

        // === БЕЗОПАСНАЯ ЗАГРУЗКА ===
        function safeLoad(key, defaultObj) {
            try {
                let data = localStorage.getItem(key);
                if (!data || data === "undefined" || data === "null") return defaultObj;
                let parsed = JSON.parse(data);
                if (typeof parsed !== 'object' || parsed === null) return defaultObj;
                return parsed;
            } catch (e) {
                return defaultObj;
            }
        }

        // --- СОСТОЯНИЕ ИГРОКА ---
        let player = {
            coins: parseInt(localStorage.getItem('farmCoins')) || 100, 
            xp: parseInt(localStorage.getItem('farmXp')) || 0,
            inventory: safeLoad('farmInventory', { wheat: 5 }),
            upgrades: safeLoad('farmUpgrades', { exp1: false, exp2: false, exp3: false, autoWater: false, greenhouse: false })
        };
        if (player.inventory.wheat === undefined) player.inventory.wheat = 5;

        let selectedSeed = 'wheat';
        let activeCanvasRoom = 'gardenRoom'; 

        // --- БАЗА СЕМЯН ---
        const SEEDS = {
            wheat:      { id: 'wheat', name: 'Пшеница', icon: '🌾', cost: 5, reward: 15, growTime: 5000, witherTime: 15000, waterNeeds: 1 },
            carrot:     { id: 'carrot', name: 'Морковь', icon: '🥕', cost: 12, reward: 30, growTime: 8000, witherTime: 20000, waterNeeds: 1 },
            potato:     { id: 'potato', name: 'Картофель', icon: '🥔', cost: 25, reward: 60, growTime: 12000, witherTime: 30000, waterNeeds: 2 },
            onion:      { id: 'onion', name: 'Лук', icon: '🧅', cost: 45, reward: 100, growTime: 18000, witherTime: 40000, waterNeeds: 2 },
            garlic:     { id: 'garlic', name: 'Чеснок', icon: '🧄', cost: 80, reward: 180, growTime: 25000, witherTime: 50000, waterNeeds: 2 },
            tomato:     { id: 'tomato', name: 'Томаты', icon: '🍅', cost: 150, reward: 350, growTime: 35000, witherTime: 60000, waterNeeds: 3 },
            corn:       { id: 'corn', name: 'Кукуруза', icon: '🌽', cost: 280, reward: 650, growTime: 45000, witherTime: 80000, waterNeeds: 3 },
            cabbage:    { id: 'cabbage', name: 'Капуста', icon: '🥬', cost: 500, reward: 1200, growTime: 60000, witherTime: 120000, waterNeeds: 3 },
            chili:      { id: 'chili', name: 'Перец Чили', icon: '🌶️', cost: 900, reward: 2200, growTime: 90000, witherTime: 150000, waterNeeds: 4 },
            eggplant:   { id: 'eggplant', name: 'Баклажан', icon: '🍆', cost: 1500, reward: 3800, growTime: 120000, witherTime: 200000, waterNeeds: 4 },
            strawberry: { id: 'strawberry', name: 'Клубника', icon: '🍓', cost: 2500, reward: 6500, growTime: 180000, witherTime: 300000, waterNeeds: 4 },
            melon:      { id: 'melon', name: 'Дыня', icon: '🍈', cost: 4500, reward: 12000, growTime: 240000, witherTime: 400000, waterNeeds: 5 },
            watermelon: { id: 'watermelon', name: 'Арбуз', icon: '🍉', cost: 8000, reward: 22000, growTime: 300000, witherTime: 500000, waterNeeds: 5 },
            pumpkin:    { id: 'pumpkin', name: 'Тыква', icon: '🎃', cost: 15000, reward: 45000, growTime: 420000, witherTime: 600000, waterNeeds: 6 },
            magic_root: { id: 'magic_root', name: 'Маг. Корень', icon: '🌺', cost: 25000, reward: 80000, growTime: 600000, witherTime: 900000, waterNeeds: 5, type: 'greenhouse' },
            blood_rose: { id: 'blood_rose', name: 'Роза Крови', icon: '🌹', cost: 50000, reward: 170000, growTime: 900000, witherTime: 1200000, waterNeeds: 6, type: 'greenhouse' },
            void_berry: { id: 'void_berry', name: 'Ягода Пустоты', icon: '🫐', cost: 100000, reward: 350000, growTime: 1200000, witherTime: 1800000, waterNeeds: 7, type: 'greenhouse' },
            moon_flower:{ id: 'moon_flower', name: 'Лунный Цвет', icon: '💮', cost: 250000, reward: 900000, growTime: 1800000, witherTime: 2400000, waterNeeds: 8, type: 'greenhouse' },
            star_lotus: { id: 'star_lotus', name: 'Звездный Лотос', icon: '🪷', cost: 600000, reward: 2200000, growTime: 2400000, witherTime: 3000000, waterNeeds: 10, type: 'greenhouse' },
            dragon_fruit:{ id: 'dragon_fruit', name: 'Плод Дракона', icon: '🐉', cost: 1500000, reward: 6000000, growTime: 3600000, witherTime: 5000000, waterNeeds: 15, type: 'greenhouse' }
        };

        // --- УЛУЧШЕНИЯ ---
        const UPGRADES = {
            exp1:       { id: 'exp1', name: 'Расширение 4x2', icon: '📜', desc: 'Увеличивает огород до 8 грядок.', cost: 5000 },
            exp2:       { id: 'exp2', name: 'Расширение 4x3', icon: '📜', desc: 'Увеличивает огород до 12 грядок. (Нужно 4x2)', cost: 25000, req: 'exp1' },
            exp3:       { id: 'exp3', name: 'Расширение 5x4', icon: '📜', desc: 'Увеличивает огород до 20 грядок. (Нужно 4x3)', cost: 100000, req: 'exp2' },
            autoWater:  { id: 'autoWater', name: 'Автополив', icon: '🚿', desc: 'Автоматическая система орошения.', cost: 50000 },
            greenhouse: { id: 'greenhouse', name: 'Теплица', icon: '🔑', desc: 'Открывает элитные грядки.', cost: 150000 }
        };

        let plots = safeLoad('farmPlots', []);

        // --- ДИНАМИЧЕСКАЯ СЕТКА ---
        function getGardenGrid() {
            if (player.upgrades.exp3) return { c: 5, r: 4 };
            if (player.upgrades.exp2) return { c: 4, r: 3 };
            if (player.upgrades.exp1) return { c: 4, r: 2 };
            return { c: 3, r: 2 }; 
        }

        function rebuildGrid() {
            const grid = getGardenGrid();
            const pw = canvas.width / grid.c;
            const ph = canvas.height / grid.r;

            for(let r = 0; r < grid.r; r++) {
                for(let c = 0; c < grid.c; c++) {
                    let id = `garden_${r}_${c}`;
                    let exists = plots.find(p => p.id === id);
                    if (!exists) plots.push({ id: id, room: 'gardenRoom', col: c, row: r, state: 'empty', seedId: null, plantTime: 0, lastWatered: 0, watersGiven: 0 });
                }
            }

            for(let r=0; r<2; r++) {
                for(let c=0; c<2; c++) {
                    let id = `green_${r}_${c}`;
                    let exists = plots.find(p => p.id === id);
                    if (!exists) plots.push({ id: id, room: 'greenhouseRoom', col: c, row: r, state: 'empty', seedId: null, plantTime: 0, lastWatered: 0, watersGiven: 0 });
                }
            }

            plots.forEach(p => {
                if(p.room === 'gardenRoom') {
                    p.width = pw; p.height = ph;
                    p.x = p.col * pw; p.y = p.row * ph;
                } else if (p.room === 'greenhouseRoom') {
                    p.width = canvas.width / 2; p.height = canvas.height / 2;
                    p.x = p.col * p.width; p.y = p.row * p.height;
                }
            });
        }
        rebuildGrid();

        function saveData() {
            try {
                localStorage.setItem('farmCoins', player.coins);
                localStorage.setItem('farmXp', player.xp);
                localStorage.setItem('farmInventory', JSON.stringify(player.inventory));
                localStorage.setItem('farmUpgrades', JSON.stringify(player.upgrades));
                localStorage.setItem('farmPlots', JSON.stringify(plots));
            } catch(e) {}
        }

        // =========================================
        // СЕТЕВОЙ КОД SUPABASE
        // =========================================
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
            } catch (e) { console.warn(e); }
        }
        
        async function fetchFarmLeaderboard() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/farm_leaderboard?select=coins,nickname&order=coins.desc&limit=5`, { 
                    method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } 
                });
                const data = await response.json();
                const list = document.getElementById('farmLeaderboardList');
                if (data && data.length > 0 && list) {
                    list.innerHTML = ''; 
                    data.forEach((entry, index) => {
                        const li = document.createElement('li'); 
                        let medal = `${index + 1}.`; if (index === 0) medal = '🥇'; if (index === 1) medal = '🥈'; if (index === 2) medal = '🥉';
                        li.innerHTML = `<span class="rank">${medal}</span> <span class="name">${entry.nickname || "Аноним"}</span> <span class="score">${entry.coins.toLocaleString()} 🪙</span>`;
                        list.appendChild(li);
                    });
                }
            } catch (e) {}
        }

        async function syncFarmLeaderboard() {
            const btn = document.getElementById('syncLeaderboardBtn');
            if (btn) btn.textContent = "⏳ Сохранение...";
            
            try {
                await checkCurrentPlayer(); 
                const response = await fetch(`${SUPABASE_URL}/rest/v1/farm_leaderboard`, { 
                    method: 'POST', 
                    headers: { 
                        'apikey': SUPABASE_ANON_KEY, 
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 
                        'Content-Type': 'application/json', 
                        'Prefer': 'return=minimal' 
                    }, 
                    body: JSON.stringify({ coins: player.coins, nickname: currentPlayerName }) 
                });
                
                // ЕСЛИ БАЗА ДАННЫХ ОТВЕРГЛА ЗАПРОС:
                if (!response.ok) {
                    const errInfo = await response.json().catch(() => ({}));
                    console.error("Детали ошибки от Supabase:", errInfo);
                    throw new Error("База данных не приняла данные!");
                }
                
                if (btn) {
                    btn.textContent = "✔️ Успешно!";
                    btn.style.backgroundColor = "#4caf50";
                }
                setTimeout(() => { if (btn) { btn.innerHTML = "🏆 Сохранить в Топ"; btn.style.backgroundColor = ""; } }, 2000);
                
                fetchFarmLeaderboard(); 
            } catch (e) { 
                console.error(e);
                if (btn) {
                    btn.textContent = "❌ Ошибка (жми F12)";
                    btn.style.backgroundColor = "#ff5252";
                }
                setTimeout(() => { if (btn) { btn.innerHTML = "🏆 Сохранить в Топ"; btn.style.backgroundColor = ""; } }, 3000);
            }
        }

        const syncBtn = document.getElementById('syncLeaderboardBtn');
        if (syncBtn) syncBtn.addEventListener('click', syncFarmLeaderboard);
        checkCurrentPlayer(); fetchFarmLeaderboard();

        // --- ИНТЕРФЕЙС И РЕНДЕР ---
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
                navGreenhouse.textContent = '🌿 Теплица'; navGreenhouse.style.color = '#fff';
            }

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
                if (!hasSeeds) invContainer.innerHTML = '<p style="color:#ff5252; padding:10px;">Инвентарь пуст. Загляните в Торговую лавку!</p>';
            }

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
                        <p>Доход: +${seed.reward} 🪙<br>Рост: ${seed.growTime >= 60000 ? (seed.growTime/60000).toFixed(1)+' мин.' : (seed.growTime/1000)+' сек.'}</p>
                        <button ${player.coins < seed.cost ? 'disabled' : ''}>Купить: ${seed.cost} 🪙</button>
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

            if (upgradesContainer) {
                upgradesContainer.innerHTML = '';
                for (let key in UPGRADES) {
                    const upg = UPGRADES[key];
                    const hasUpg = player.upgrades[key];
                    if (upg.req && !player.upgrades[upg.req]) continue;

                    const card = document.createElement('div');
                    card.className = `shop-card ${hasUpg ? 'purchased' : ''}`;
                    card.innerHTML = `
                        <h3>${upg.icon}</h3>
                        <h4 style="color:#fff; margin-bottom:5px;">${upg.name}</h4>
                        <p>${upg.desc}</p>
                        ${hasUpg ? '<button disabled>Установлено</button>' : `<button ${player.coins < upg.cost ? 'disabled' : ''}>Купить: ${upg.cost} 🪙</button>`}
                    `;
                    if (!hasUpg) {
                        card.querySelector('button').onclick = () => {
                            if (player.coins >= upg.cost) {
                                player.coins -= upg.cost;
                                player.upgrades[key] = true;
                                rebuildGrid(); 
                                saveData(); renderUI();
                            }
                        };
                    }
                    upgradesContainer.appendChild(card);
                }
            }
        }

        let popups = [];
        class PopupText {
            constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; }
            update() { this.y -= 1.5; this.life -= 0.02; }
            draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(this.text, this.x, this.y); ctx.restore(); }
        }

        const roomBtns = document.querySelectorAll('.room-btn');
        roomBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target === 'greenhouseRoom' && !player.upgrades.greenhouse) { alert("🔒 Купите Ключ от Теплицы в Доме!"); return; }

                roomBtns.forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.room-content').forEach(c => c.style.display = 'none');
                btn.classList.add('active');
                
                if (target === 'gardenRoom' || target === 'greenhouseRoom') {
                    document.getElementById('gardenRoom').style.display = 'block'; 
                    activeCanvasRoom = target;
                } else {
                    document.getElementById(target).style.display = 'block';
                }
                renderUI();
            });
        });

        // --- ЛОГИКА ХОЛСТА ---
        function updateCanvas() {
            const now = Date.now();
            plots.forEach(plot => {
                if (plot.state === 'growing' || plot.state === 'thirsty') {
                    const seed = SEEDS[plot.seedId];
                    if (!seed) return; 
                    
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

        function drawCanvas() {
            ctx.fillStyle = activeCanvasRoom === 'gardenRoom' ? '#4E342E' : '#1A237E'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            plots.filter(p => p.room === activeCanvasRoom).forEach(plot => {
                if (plot.state === 'empty') ctx.fillStyle = '#6D4C41';
                else if (plot.state === 'thirsty') ctx.fillStyle = '#A1887F'; 
                else ctx.fillStyle = '#3E2723'; 

                ctx.fillRect(plot.x, plot.y, plot.width, plot.height);
                ctx.strokeStyle = '#271915'; ctx.lineWidth = 4;
                ctx.strokeRect(plot.x + 4, plot.y + 4, plot.width - 8, plot.height - 8);

                const cx = plot.x + plot.width / 2;
                const cy = plot.y + plot.height / 2;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

                if (plot.state === 'thirsty') {
                    ctx.font = '30px Arial'; ctx.fillText('💧', cx, cy - 20);
                    ctx.font = '16px Arial'; ctx.fillStyle = '#fff'; ctx.fillText('Полейте', cx, cy + 20);
                } 
                else if (plot.state === 'growing') {
                    const seed = SEEDS[plot.seedId];
                    if (seed) {
                        const progress = Math.min(1, (Date.now() - plot.plantTime) / seed.growTime);
                        ctx.font = '30px Arial'; ctx.fillText(progress < 0.5 ? '🌱' : '🌿', cx, cy - 10);
                        ctx.fillStyle = '#111'; ctx.fillRect(cx - 30, cy + 20, 60, 8);
                        ctx.fillStyle = '#4CAF50'; ctx.fillRect(cx - 30, cy + 20, 60 * progress, 8);
                    }
                } 
                else if (plot.state === 'ready') {
                    const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
                    ctx.font = '45px Arial'; ctx.fillText(SEEDS[plot.seedId]?.icon || '?', 0, 0);
                    ctx.restore();
                    ctx.strokeStyle = '#00E676'; ctx.lineWidth = 3; 
                    ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);
                }
                else if (plot.state === 'withered') {
                    ctx.font = '40px Arial'; ctx.fillText('🥀', cx, cy); 
                }
            });

            popups.forEach(p => p.draw());
        }

        function gameLoop() {
            updateCanvas(); drawCanvas();
            animationId = requestAnimationFrame(gameLoop);
        }

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
                        popups.push(new PopupText(cx, plot.y + 40, `Только в теплице!`, '#ff5252')); return;
                    }
                    if (seedData.type !== 'greenhouse' && activeCanvasRoom === 'greenhouseRoom') {
                        popups.push(new PopupText(cx, plot.y + 40, `Здесь только магия!`, '#ff5252')); return;
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

        renderUI();
        gameLoop();
        setInterval(saveData, 3000);
    });
}

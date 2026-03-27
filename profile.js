document.addEventListener('DOMContentLoaded', async () => {
    // 1. Инициализация Supabase
    const SUPABASE_URL = 'https://bgzxdpjfsodndxroieay.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_7lewcPQCbnoXmkcMLu_Hlw_dnfCXZka';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. Проверка авторизации
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
        // Если не авторизован - выкидываем на логин
        window.location.href = 'login.html';
        return;
    }

    // 3. Формируем базовые данные из Auth
    const userEmail = user.email;
    const nickname = user.user_metadata?.username || userEmail.split('@')[0];
    
    // Обновляем базовый UI сразу, чтобы пользователь не ждал
    document.getElementById('userEmail').textContent = userEmail;
    document.getElementById('userName').textContent = nickname;
    document.getElementById('userAvatar').textContent = nickname.charAt(0).toUpperCase();

    // 4. Синхронизация с таблицей 'profiles'
    await syncAndLoadProfile(user.id, nickname, supabase);

    // 5. Отрисовка достижений
    renderAchievements();

    // 6. Логика кнопки выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }
});

// ФУНКЦИЯ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ
async function syncAndLoadProfile(userId, nickname, supabase) {
    try {
        // Пытаемся найти профиль в таблице profiles
        let { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // Если профиля еще нет (ошибка PGRST116 означает "строка не найдена")
        if (!profile) {
            console.log("Профиль не найден, создаем новый...");
            const newProfile = {
                id: userId,
                username: nickname,
                platform_coins: 0,
                platform_level: 1
            };
            
            const { data: insertedProfile, insertError } = await supabase
                .from('profiles')
                .insert([newProfile])
                .select()
                .single();
                
            if (!insertError) profile = insertedProfile;
        }

        // Если профиль успешно получен или создан - обновляем UI
        if (profile) {
            document.getElementById('userName').textContent = profile.username;
            document.getElementById('userCoins').textContent = profile.platform_coins;
            document.getElementById('userLevel').textContent = profile.platform_level;
        }

    } catch (err) {
        console.error("Ошибка при загрузке профиля:", err);
    }
}

// ФУНКЦИЯ ОТРИСОВКИ ДОСТИЖЕНИЙ
function renderAchievements() {
    // В будущем мы тоже будем тянуть их из базы, но пока оставляем LocalStorage
    const allAchievements = [
        { id: 'first_blood', icon: '🩸', title: 'Первая кровь', desc: 'Убить 1 гоблина' },
        { id: 'first_archer', icon: '🏹', title: 'Острый глаз', desc: 'Нанять первого лучника' },
        { id: 'spikes_1', icon: '🗡️', title: 'Шипы и боль', desc: 'Построить ров 1 уровня' },
        { id: 'bloodbath', icon: '☠️', title: 'Кровавая баня', desc: 'Улучшить ров до 2 уровня' },
        { id: 'repairman', icon: '🧱', title: 'Ремонтная бригада', desc: 'Починить стену' },
        { id: 'boss_slayer', icon: '👹', title: 'Убийца великанов', desc: 'Убить первого Босса' },
        { id: 'arrow_storm', icon: '🌧️', title: 'Шквальный огонь', desc: 'Нанять 5 лучников' },
        { id: 'wealthy', icon: '💰', title: 'Толстосум', desc: 'Накопить 100 монет' },
        { id: 'hundred_skulls', icon: '💯', title: 'Сотня черепов', desc: 'Счет: 100 в одной игре' },
        { id: 'impenetrable', icon: '🏰', title: 'Неприступная Цитадель', desc: 'Счет: 300 в одной игре' }
    ];

    let unlocked = [];
    try { unlocked = JSON.parse(localStorage.getItem('citadelAchievements')) || []; } catch(e) {}

    const container = document.getElementById('achievementsContainer');
    if (!container) return;
    
    container.innerHTML = ''; // Очищаем перед отрисовкой

    allAchievements.forEach(ach => {
        let isUnlocked = unlocked.includes(ach.id);
        let card = document.createElement('div');
        // Класс .achievement-card и .unlocked берутся из твоего глобального style.css
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-info">
                <h4>${ach.title}</h4>
                <p>${ach.desc}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

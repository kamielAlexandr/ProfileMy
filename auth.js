document.addEventListener('DOMContentLoaded', async () => {
    // 1. Инициализация Supabase
    const SUPABASE_URL = 'https://bgzxdpjfsodndxroieay.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_7lewcPQCbnoXmkcMLu_Hlw_dnfCXZka';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ==========================================
    // ГЛОБАЛЬНАЯ ПРОВЕРКА АВТОРИЗАЦИИ (Для всех страниц)
    // ==========================================
    const authNavItem = document.getElementById('authNavItem');
    
    if (authNavItem) {
        // Проверяем, есть ли активная сессия у пользователя
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            // Если вошел: меняем кнопку "Войти" на "Профиль" и "Выйти"
            authNavItem.innerHTML = `
                <a href="profile.html" style="color: var(--accent-color);">Личный кабинет</a>
                <a href="#" id="logoutBtn" style="color: #ff5252; margin-left: 15px;">Выйти</a>
            `;
            
            // Вешаем обработчик на кнопку "Выйти"
            const logoutBtn = document.getElementById('logoutBtn');
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabase.auth.signOut(); // Разлогиниваем в БД
                window.location.reload(); // Перезагружаем страницу
            });
        }
    }

    // ==========================================
    // ЛОГИКА СТРАНИЦЫ ВХОДА (Только для login.html)
    // ==========================================
    const authForm = document.getElementById('authForm');
    if (authForm) {
        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');
        const authError = document.getElementById('authError');
        
        const toggleModeBtn = document.getElementById('toggleMode');
        const authTitle = document.getElementById('authTitle');
        const authSubtitle = document.getElementById('authSubtitle');
        const submitBtn = document.getElementById('submitBtn');
        const toggleText = document.getElementById('toggleText');

        let isLoginMode = true; 

        function showError(message) {
            authError.textContent = message;
            authError.classList.remove('hidden');
        }

        if (toggleModeBtn) {
            toggleModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isLoginMode = !isLoginMode;
                authError.classList.add('hidden'); 
                
                if (isLoginMode) {
                    authTitle.textContent = 'Вход в Цитадель';
                    authSubtitle.textContent = 'Введите свои данные для доступа к играм.';
                    submitBtn.textContent = 'Войти';
                    toggleText.textContent = 'Еще не в гильдии?';
                    toggleModeBtn.textContent = 'Зарегистрироваться';
                } else {
                    authTitle.textContent = 'Новый герой';
                    authSubtitle.textContent = 'Создайте аккаунт, чтобы сохранять прогресс.';
                    submitBtn.textContent = 'Создать аккаунт';
                    toggleText.textContent = 'Уже есть аккаунт?';
                    toggleModeBtn.textContent = 'Войти';
                }
            });
        }

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            authError.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Ожидание магии...';

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                if (isLoginMode) {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    window.location.href = 'profile.html'; // После входа кидаем в профиль
                } else {
                    const { data, error } = await supabase.auth.signUp({ email, password });
                    if (error) throw error;
                    alert('Регистрация успешна! Теперь вы находитесь в системе.');
                    window.location.href = 'profile.html'; 
                }
            } catch (error) {
                showError(error.message === 'Invalid login credentials' ? 'Неверный email или пароль' : error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт';
            }
        });
    }
});

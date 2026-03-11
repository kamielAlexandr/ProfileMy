document.addEventListener('DOMContentLoaded', () => {
    // 1. Инициализация Supabase
    const SUPABASE_URL = 'https://bgzxdpjfsodndxroieay.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_7lewcPQCbnoXmkcMLu_Hlw_dnfCXZka';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. Элементы формы
    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const authError = document.getElementById('authError');
    
    // Элементы переключения режимов (Вход <-> Регистрация)
    const toggleModeBtn = document.getElementById('toggleMode');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const submitBtn = document.getElementById('submitBtn');
    const toggleText = document.getElementById('toggleText');

    let isLoginMode = true; // По умолчанию режим входа

    // 3. Функция отображения ошибок
    function showError(message) {
        authError.textContent = message;
        authError.classList.remove('hidden');
    }

    // 4. Переключение между Регистрацией и Входом
    if (toggleModeBtn) {
        toggleModeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authError.classList.add('hidden'); // Прячем ошибки при переключении
            
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

    // 5. Обработка формы
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Останавливаем перезагрузку страницы
            authError.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Ожидание магии...';

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                if (isLoginMode) {
                    // ЛОГИКА ВХОДА
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password,
                    });
                    if (error) throw error;
                    
                    alert('Успешный вход! Добро пожаловать.');
                    window.location.href = 'index.html'; // Перекидываем на главную
                    
                } else {
                    // ЛОГИКА РЕГИСТРАЦИИ
                    const { data, error } = await supabase.auth.signUp({
                        email: email,
                        password: password,
                    });
                    if (error) throw error;
                    
                    alert('Регистрация успешна! Теперь вы можете войти.');
                    window.location.href = 'index.html'; // Перекидываем на главную
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

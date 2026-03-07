document.addEventListener('DOMContentLoaded', () => {
    console.log('Сайт KamielStudio успешно загружен!');
    
    // --- Логика Лайтбокса (увеличение картинок) ---
    
    // 1. Создаем HTML-элементы для всплывающего окна
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <span class="lightbox-close">&times;</span>
        <img src="" alt="Увеличенный скриншот">
    `;
    document.body.appendChild(lightbox); // Добавляем в конец страницы

    const lightboxImg = lightbox.querySelector('img');
    const closeBtn = lightbox.querySelector('.lightbox-close');

    // 2. Находим все картинки внутри блоков скриншотов
    const images = document.querySelectorAll('.screenshot-placeholder img');

    // 3. Вешаем обработчик клика на каждую картинку
    images.forEach(img => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src; // Передаем ссылку кликнутой картинки
            lightbox.classList.add('active'); // Показываем окно
            document.body.style.overflow = 'hidden'; // Запрещаем прокрутку сайта на фоне
        });
    });

    // 4. Функция закрытия
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto'; // Возвращаем прокрутку
    };

    // Закрытие по крестику
    closeBtn.addEventListener('click', closeLightbox);

    // Закрытие по клику на темный фон (вокруг картинки)
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Закрытие по кнопке Esc на клавиатуре
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // --- Обработчик для кнопки репетитора (на будущее) ---
    const contactBtn = document.querySelector('.contact-btn');
    if(contactBtn) {
        contactBtn.addEventListener('click', () => {
            alert('Свяжитесь со мной в Telegram: @твой_ник');
        });
    }
});

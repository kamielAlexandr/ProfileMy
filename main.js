document.addEventListener('DOMContentLoaded', () => {
    console.log('Сайт KamielStudio успешно загружен!');
    
    // Пример интерактива: обработчик для кнопки записи на занятия
    const contactBtn = document.querySelector('.contact-btn');
    if(contactBtn) {
        contactBtn.addEventListener('click', () => {
            alert('Здесь можно добавить ссылку на твой Telegram или форму обратной связи!');
        });
    }
});

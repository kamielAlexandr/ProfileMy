// Обертка, которая ждет загрузки страницы
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM полностью загружен. Инициализируем бота...");

    const sections: any = {
        prog: { title: "Программирование", text: "Магия Python, C++ и C#." },
        oge: { title: "Подготовка к ОГЭ", text: "Свитки с алгоритмами для 9 класса." },
        ege: { title: "Подготовка к ЕГЭ", text: "Битва с финальным боссом школы." },
        games: { 
            title: "Мои Игровые Проекты", 
            text: `
                <div class="game-container">
                    <div class="game-card">
                        <h3>Герои Древних Земель (TG)</h3>
                        <p>RPG-бот: спасайте мир от монстров.</p>
                    </div>
                    <div class="game-card highlight">
                        <h3>Goblins: Last Stand (Godot)</h3>
                        <p>RTS: Выживание гоблинов против "героев".</p>
                    </div>
                </div>
            ` 
        }
    };

    // Ищем элементы ВНУТРИ обработчика
    const menuItems = document.querySelectorAll('#main-menu li');
    const appArea = document.getElementById('app');
    const aboutBox = document.querySelector('.about-me') as HTMLElement;

    if (menuItems.length === 0) {
        console.error("Критическая ошибка: Элементы меню не найдены! Проверь ID в HTML.");
    }

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = (item as HTMLElement).getAttribute('data-section');
            console.log("Клик по секции:", sectionId);
            
            if (sectionId && appArea) {
                if (aboutBox) aboutBox.style.display = 'none';
                
                const data = sections[sectionId];
                appArea.innerHTML = `
                    <h2>${data.title}</h2>
                    <div>${data.text}</div>
                    <button id="back-btn" style="margin-top:20px; cursor:pointer;">На главную</button>
                `;

                // Кнопка назад
                document.getElementById('back-btn')?.addEventListener('click', () => {
                    location.reload();
                });
            }
        });
    });
});
// Обертка, которая ждет загрузки страницы
window.addEventListener('DOMContentLoaded', function () {
    console.log("DOM полностью загружен. Инициализируем бота...");
    var sections = {
        prog: { title: "Программирование", text: "Магия Python, C++ и C#." },
        oge: { title: "Подготовка к ОГЭ", text: "Свитки с алгоритмами для 9 класса." },
        ege: { title: "Подготовка к ЕГЭ", text: "Битва с финальным боссом школы." },
        games: {
            title: "Мои Игровые Проекты",
            text: "\n                <div class=\"game-container\">\n                    <div class=\"game-card\">\n                        <h3>\u0413\u0435\u0440\u043E\u0438 \u0414\u0440\u0435\u0432\u043D\u0438\u0445 \u0417\u0435\u043C\u0435\u043B\u044C (TG)</h3>\n                        <p>RPG-\u0431\u043E\u0442: \u0441\u043F\u0430\u0441\u0430\u0439\u0442\u0435 \u043C\u0438\u0440 \u043E\u0442 \u043C\u043E\u043D\u0441\u0442\u0440\u043E\u0432.</p>\n                    </div>\n                    <div class=\"game-card highlight\">\n                        <h3>Goblins: Last Stand (Godot)</h3>\n                        <p>RTS: \u0412\u044B\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u0433\u043E\u0431\u043B\u0438\u043D\u043E\u0432 \u043F\u0440\u043E\u0442\u0438\u0432 \"\u0433\u0435\u0440\u043E\u0435\u0432\".</p>\n                    </div>\n                </div>\n            "
        }
    };
    // Ищем элементы ВНУТРИ обработчика
    var menuItems = document.querySelectorAll('#main-menu li');
    var appArea = document.getElementById('app');
    var aboutBox = document.querySelector('.about-me');
    if (menuItems.length === 0) {
        console.error("Критическая ошибка: Элементы меню не найдены! Проверь ID в HTML.");
    }
    menuItems.forEach(function (item) {
        item.addEventListener('click', function () {
            var _a;
            var sectionId = item.getAttribute('data-section');
            console.log("Клик по секции:", sectionId);
            if (sectionId && appArea) {
                if (aboutBox)
                    aboutBox.style.display = 'none';
                var data = sections[sectionId];
                appArea.innerHTML = "\n                    <h2>".concat(data.title, "</h2>\n                    <div>").concat(data.text, "</div>\n                    <button id=\"back-btn\" style=\"margin-top:20px; cursor:pointer;\">\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E</button>\n                ");
                // Кнопка назад
                (_a = document.getElementById('back-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () {
                    location.reload();
                });
            }
        });
    });
});

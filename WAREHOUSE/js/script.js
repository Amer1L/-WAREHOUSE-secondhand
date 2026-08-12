const categories = document.querySelectorAll(".category.active");

console.log("WAREHOUSE запущен");

categories.forEach(category => {

    category.addEventListener("click", () => {

        categories.forEach(item => {
            item.classList.remove("selected");
        });

        category.classList.add("selected");

        console.log(
            "Выбрана категория:",
            category.dataset.category
        );

    });

});

// Авто-подсветка выбранной категории
document.addEventListener("DOMContentLoaded", function() {
    var catButtons = document.querySelectorAll(".category");
    catButtons.forEach(function(btn) {
        // Проверяем совпадение data-cat с выбранной категорией из URL
        if (btn.getAttribute("data-cat") === selectedCategory) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
});
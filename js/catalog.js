var API_URL = "https://script.google.com/macros/s/AKfycbxOEUZvRxWAuGRbQKLwXDUr0jep6Y_V3nBvz7aL2Z43f_zsK-xseCnl03iL8ImObgww/exec";

var urlParams = new URLSearchParams(window.location.search);
var selectedCategory = urlParams.get("category") || "all";

var allProducts = [];
var cart = JSON.parse(localStorage.getItem("user_cart") || "[]");
var currentImageIndex = 0;
var currentProductImages = [];

// Ссылка-заглушка, если картинка не загрузится
var FALLBACK_IMAGE = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500";

document.addEventListener("DOMContentLoaded", function() {
    updateCartUI();

    var productsContainer = document.querySelector("#products");
    if (!productsContainer) return;

    var catButtons = document.querySelectorAll(".category, .category-btn");
    catButtons.forEach(function(btn) {
        if (btn.getAttribute("data-cat") === selectedCategory) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    productsContainer.innerHTML = "<p style='color: #888; text-align: center; width: 100%; grid-column: 1/-1;'>Загрузка товаров...</p>";

    // Принудительно запрашиваем свежие данные из Google Таблицы
    fetch(API_URL)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            allProducts = filterValidProducts(data);
            renderProducts(allProducts, productsContainer);
        })
        .catch(function(err) {
            console.error("Ошибка загрузки:", err);
            productsContainer.innerHTML = "<p style='color: hotpink; text-align: center; width: 100%; grid-column: 1/-1;'>Ошибка загрузки товаров.</p>";
        });

    setupModalEvents();
});

function filterValidProducts(products) {
    return products.filter(function(product) {
        var name = String(product["НАЗВАНИЕ"] || "").trim();
        var id = String(product["0000"] || product["ID"] || "").trim();
        return name !== "" || id !== "";
    });
}

function renderProducts(products, container) {
    container.innerHTML = "";

    var visibleProducts = products;
    if (selectedCategory !== "all") {
        visibleProducts = products.filter(function(product) {
            var cat = String(product["КАТЕГОРИЯ"] || "").toLowerCase();
            return cat.includes(selectedCategory.toLowerCase());
        });
    }

    if (visibleProducts.length === 0) {
        container.innerHTML = "<p style='color: #888; text-align: center; width: 100%; grid-column: 1/-1;'>Товары не найдены</p>";
        return;
    }

    visibleProducts.forEach(function(product) {
        var card = document.createElement("article");
        card.className = "product-card";

        var id = product["0000"] || product["ID"] || "";
        var name = product["НАЗВАНИЕ"] || "Без названия";
        var price = product["ЦЕНА"] || 0;
        var size = product["РАЗМЕР"] || "M";
        var measurements = product["ДЛИНА/ШИРИНА"] || "";
        
        var rawPhoto = String(product["ФОТО"] || "").trim();
        var photos = rawPhoto ? rawPhoto.split(",") : [FALLBACK_IMAGE];
        var mainImage = photos[0].trim() || FALLBACK_IMAGE;

        card.innerHTML = 
            '<div class="product-image-wrap">' +
                '<img src="' + mainImage + '" alt="' + name + '" class="product-img" onerror="this.src=\'' + FALLBACK_IMAGE + '\'">' +
                '<span class="product-badge">' + size + '</span>' +
            '</div>' +
            '<div class="product-details">' +
                '<h3 class="product-title">' + name + '</h3>' +
                (measurements ? '<p class="product-measurements">Замеры: ' + measurements + '</p>' : '') +
                '<div class="product-bottom">' +
                    '<span class="product-price">' + price + ' ₽</span>' +
                    '<button class="buy-btn" data-id="' + id + '">СМОТРЕТЬ</button>' +
                '</div>' +
            '</div>';

        card.addEventListener("click", function() { openProduct(id); });
        container.appendChild(card);
    });
}
    function openProduct(id) {
    var item = allProducts.find(function(p) { return (p["0000"] == id) || (p["ID"] == id); });
    if (!item) return;

    var rawPhoto = String(item["ФОТО"] || "").trim();
    currentProductImages = rawPhoto ? rawPhoto.split(",").map(function(s) { return s.trim(); }) : [FALLBACK_IMAGE];
    currentImageIndex = 0;

    document.getElementById("modal-title").innerText = item["НАЗВАНИЕ"] || "Без названия";
    document.getElementById("modal-price").innerText = (item["ЦЕНА"] || 0) + " ₽";
    document.getElementById("modal-size").innerText = item["РАЗМЕР"] || "Не указан";
    document.getElementById("modal-measurements").innerText = item["ДЛИНА/ШИРИНА"] || "По запросу";
    document.getElementById("modal-desc").innerText = item["ОПИСАНИЕ"] || "Описание отсутствует.";
    
    updateModalImage();

    var addToCartBtn = document.getElementById("modal-buy-btn");
    if (addToCartBtn) {
        addToCartBtn.innerText = "ДОБАВИТЬ В КОРЗИНУ";
        addToCartBtn.onclick = function() {
            addToCart(item);
            document.getElementById("product-modal").classList.remove("active");
            openCartModal();
        };
    }

    document.getElementById("product-modal").classList.add("active");
}

function updateModalImage() {
    var imgEl = document.getElementById("modal-img");
    var counterEl = document.getElementById("gallery-counter");
    if (imgEl && currentProductImages.length > 0) {
        imgEl.onerror = function() { this.src = FALLBACK_IMAGE; };
        imgEl.src = currentProductImages[currentImageIndex];
    }
    if (counterEl) {
        counterEl.innerText = (currentImageIndex + 1) + " / " + currentProductImages.length;
    }
}

function prevImage() {
    if (currentProductImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + currentProductImages.length) % currentProductImages.length;
    updateModalImage();
}

function nextImage() {
    if (currentProductImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentProductImages.length;
    updateModalImage();
}

// --- КОРЗИНА ---

function addToCart(item) {
    var id = item["0000"] || item["ID"] || "";
    
    var exists = cart.some(function(p) { return p.id === id; });
    if (exists) {
        alert("Эта вещь уже в вашей корзине!");
        return;
    }

    var rawPhoto = String(item["ФОТО"] || "").trim();
    var firstPhoto = rawPhoto ? rawPhoto.split(",")[0].trim() : FALLBACK_IMAGE;

    cart.push({
        id: id,
        name: item["НАЗВАНИЕ"] || "Без названия",
        price: item["ЦЕНА"] || 0,
        size: item["РАЗМЕР"] || "-",
        cell: item["ЯЧЕЙКА"] || "A1",
        image: firstPhoto
    });

    saveCart();
    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter(function(item) { return item.id !== id; });
    saveCart();
    updateCartUI();
    renderCartItems();
}

function saveCart() {
    localStorage.setItem("user_cart", JSON.stringify(cart));
}

function updateCartUI() {
    var cartBadge = document.querySelector("#cart-count");
    if (cartBadge) {
        cartBadge.innerText = cart.length;
    }
}

function renderCartItems() {
    var cartListContainer = document.getElementById("cart-items-list");
    var cartTotalEl = document.getElementById("cart-total-price");
    var cartFooter = document.getElementById("cart-footer");

    if (!cartListContainer) return;

    cartListContainer.innerHTML = "";
    var total = 0;

    if (cart.length === 0) {
        cartListContainer.innerHTML = "<p style='color: #888; text-align: center; padding: 25px 0;'>Корзина пуста 🛒</p>";
        if (cartFooter) cartFooter.style.display = "none";
        if (cartTotalEl) cartTotalEl.innerText = "0 ₽";
        return;
    }

    if (cartFooter) cartFooter.style.display = "block";
        cart.forEach(function(item) {
        total += Number(item.price);
        var div = document.createElement("div");
        div.className = "cart-item";
        
        div.innerHTML = 
            '<div class="cart-item-info">' +
                '<img src="' + item.image + '" class="cart-item-img" onerror="this.src=\'' + FALLBACK_IMAGE + '\'">' +
                '<div>' +
                    '<div class="cart-item-title">' + item.name + '</div>' +
                    '<div class="cart-item-sub">Размер: ' + item.size + ' | ' + item.price + ' ₽</div>' +
                '</div>' +
            '</div>' +
            '<button onclick="removeFromCart(\'' + item.id + '\')" class="cart-remove-btn" title="Удалить">✕</button>';
        
        cartListContainer.appendChild(div);
    });

    if (cartTotalEl) cartTotalEl.innerText = total + " ₽";
}

function openCartModal() {
    renderCartItems();
    var cartModal = document.getElementById("cart-modal");
    if (cartModal) cartModal.classList.add("active");
}

function checkoutOrder() {
    if (cart.length === 0) {
        alert("Корзина пуста!");
        return;
    }

    // Собираем данные
    var fio = document.getElementById("cart-fio").value.trim();
    var phone = document.getElementById("cart-phone").value.trim();
    var tg = document.getElementById("cart-tg").value.trim();
    var delivery = document.getElementById("cart-delivery").value;
    var address = document.getElementById("cart-address").value.trim();
    var payment = document.getElementById("cart-payment").value;
    var comment = document.getElementById("cart-comment").value.trim();

    // Валидация
    if (!fio || !phone || !tg) {
        alert("Пожалуйста, заполните ФИО, телефон и Telegram!");
        return;
    }

    if (delivery === "Доставка" && !address) {
        alert("Пожалуйста, укажите адрес доставки!");
        return;
    }

    var checkoutBtn = document.getElementById("checkout-btn");
    checkoutBtn.disabled = true;
    checkoutBtn.innerText = "Отправка...";

    var payload = {
        fio: fio,
        phone: phone,
        tg: tg,
        delivery: delivery,
        address: (delivery === "Доставка" ? address : "---"),
        payment: payment,
        comment: comment || "Нет комментария",
        items: cart
    };

    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(function() {
        alert("Заказ успешно оформлен! Мы свяжемся с вами.");
        cart = [];
        saveCart();
        updateCartUI();
        document.getElementById("cart-modal").classList.remove("active");
    })
    .catch(function(err) {
        console.error("Ошибка заказа:", err);
        alert("Ошибка при отправке заказа.");
    })
    .finally(function() {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = "ОФОРМИТЬ ЗАКАЗ";
    });
}

function setupModalEvents() {
    var modal = document.getElementById("product-modal");
    var closeBtn = document.querySelector("#product-modal .modal-close");

    if (closeBtn) closeBtn.onclick = function() { modal.classList.remove("active"); };
    if (modal) modal.onclick = function(e) { if (e.target === modal) modal.classList.remove("active"); };

    var cartModal = document.getElementById("cart-modal");
    var cartCloseBtn = document.getElementById("cart-close");
    var cartTrigger = document.getElementById("cart-trigger");

    if (cartTrigger) cartTrigger.onclick = openCartModal;
    if (cartCloseBtn) cartCloseBtn.onclick = function() { cartModal.classList.remove("active"); };
    if (cartModal) cartModal.onclick = function(e) { if (e.target === cartModal) cartModal.classList.remove("active"); };
}

function toggleAddressField() {
    var delivery = document.getElementById("cart-delivery").value;
    var addressInput = document.getElementById("cart-address");
    addressInput.style.display = (delivery === "Доставка") ? "block" : "none";
}
/* ===============================================
   IWBLH - Interactive Scripts
   =============================================== */

// Product Database (will be loaded from API)
var PRODUCTS = PRODUCTS || {};
var API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await fetchProducts();
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
    initCart();

    // If on product page, initialize it
    if (document.getElementById('productDetail')) {
        initProduct();
    }

    // If on checkout page, render it
    if (document.getElementById('checkoutItems')) {
        renderCheckoutSummary();

        // Prefill email
        const user = JSON.parse(sessionStorage.getItem('moda_impeto_user'));
        if (user && user.email) {
            const emailInput = document.getElementById('email');
            if (emailInput) emailInput.value = user.email;
        }
    }

    // If on order history page, initialize it
    if (document.getElementById('orderHistoryList')) {
        initOrderHistory();
    }
}

async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        // Convert array to object keyed by ID for compatibility
        PRODUCTS = products.reduce((acc, p) => {
            acc[p.id] = p;
            if (p._id) acc[p._id] = p; // Also index by MongoDB _id for cart compatibility
            return acc;
        }, {});

        // Render products if on index page
        if (document.getElementById('storefrontContainer')) {
            let lines = [];
            try {
                const linesRes = await fetch('/api/lines');
                if (linesRes.ok) {
                    lines = await linesRes.json();
                }
            } catch (e) {
                console.error('Failed to fetch lines', e);
            }
            renderStorefront(products, lines);
        } else if (document.getElementById('products')) {
            // For other pages that might still use the old container
            renderProducts(products);
        }
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

function renderProductCardHTML(p) {
    return `
        <article class="product-card fade-in ${p.isSoldOut ? 'sold-out' : ''}">
          <a href="product.html?id=${p.id}" class="product-card__link">
            <div class="product-card__image">
              <img src="${p.image}" alt="${p.name}" loading="lazy">
              ${p.isSoldOut ? '<div class="sold-out-badge">SOLD OUT</div>' : ''}
            </div>
            <div class="product-card__info">
              <span class="product-card__category">${p.category}</span>
              <h3 class="product-card__name">${p.name}</h3>
              <p class="product-card__price">¥${p.price.toLocaleString()}</p>
            </div>
          </a>
          <div class="product-card__overlay">
            ${p.isSoldOut
                ? '<button class="btn btn--disabled" disabled>SOLD OUT</button>'
                : `<button class="btn btn--primary add-to-cart" data-id="${p.id}" onclick="event.preventDefault(); addToCart(${p.id}); showFeedback(this)">ADD TO CART</button>`
            }
          </div>
        </article>
    `;
}

function renderProducts(products) {
    const grid = document.querySelector('.products__grid');
    if (grid) {
        grid.innerHTML = products.map(p => renderProductCardHTML(p)).join('');
        initScrollAnimations();
    }
}

function renderStorefront(products, lines) {
    const container = document.getElementById('storefrontContainer');
    if (!container) return;
    
    let html = '';
    
    // 1. Featured Product
    const featuredProduct = products.find(p => p.isFeatured && !p.isSoldOut) || products.find(p => p.isFeatured);
    if (featuredProduct) {
        html += `
            <div class="featured-product fade-in" style="margin-bottom: 60px; text-align: center;">
                <p class="section__subtitle text-accent" style="margin-bottom: 10px;">FEATURED</p>
                <a href="product.html?id=${featuredProduct.id}" style="text-decoration: none; display: block;">
                    <img src="${featuredProduct.image}" alt="${featuredProduct.name}" style="width: 100%; max-width: 600px; height: auto; border-radius: 4px; margin-bottom: 20px;">
                    <h2 class="section__title" style="margin-bottom: 10px; font-size: 2rem;">${featuredProduct.name}</h2>
                    <p style="color: var(--color-gray); font-size: 1.2rem;">¥${featuredProduct.price.toLocaleString()}</p>
                </a>
            </div>
        `;
    }

    // 2. Lines
    // Make sure ANOTHER is included if there are products with no line or line 'ANOTHER'
    const existingLineNames = lines.map(l => l.name);
    if (!existingLineNames.includes('ANOTHER')) {
        lines.push({ name: 'ANOTHER', description: 'Other collection', order: 9999 });
    }

    lines.forEach(line => {
        const lineProducts = products.filter(p => (p.lineId || 'ANOTHER') === line.name);
        if (lineProducts.length > 0) {
            html += `
                <div class="line-section" style="margin-bottom: 80px;">
                    <div class="section__header fade-in">
                        <p class="section__subtitle text-accent">COLLECTION</p>
                        <h2 class="section__title" style="font-size: 2.5rem;">${line.name}</h2>
                        ${line.description ? `<p style="color: var(--color-gray); margin-top: 10px;">${line.description}</p>` : ''}
                    </div>
                    <div class="products__grid">
                        ${lineProducts.map(p => renderProductCardHTML(p)).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
    initScrollAnimations();
}

/* ===============================================
   Navigation
   =============================================== */
function initNavigation() {
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav__links');

    // Scroll effect
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Mobile toggle
    navToggle?.addEventListener('click', () => {
        navLinks?.classList.toggle('active');
        navToggle.classList.toggle('active');
    });


}

/* ===============================================
   Cart Logic
   =============================================== */
function getCartKey() {
    const user = JSON.parse(sessionStorage.getItem('moda_impeto_user'));
    return user ? `moda_impeto_cart_${user._id || user.id}` : 'moda_impeto_cart_guest';
}

function initCart() {
    updateCartCount();

    // Note: .add-to-cart buttons use inline onclick handlers in renderProducts()
    // No need to add event listeners here to avoid double-adding items

    // If on cart page, render it
    if (document.getElementById('cartItems')) {
        renderCart();
    }
}

function mergeGuestCart(userId) {
    const guestKey = 'moda_impeto_cart_guest';
    const userKey = `moda_impeto_cart_${userId}`;

    const guestCart = JSON.parse(localStorage.getItem(guestKey));
    if (!guestCart || Object.keys(guestCart).length === 0) return;

    let userCart = JSON.parse(localStorage.getItem(userKey)) || {};

    Object.values(guestCart).forEach(item => {
        if (userCart[item.id]) {
            userCart[item.id].quantity += item.quantity;
        } else {
            userCart[item.id] = item;
        }
    });

    localStorage.setItem(userKey, JSON.stringify(userCart));
    localStorage.removeItem(guestKey);
}

function addToCart(productId) {
    if (PRODUCTS[productId] && PRODUCTS[productId].isSoldOut) {
        alert('この商品は売り切れです。');
        return;
    }
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (cart[productId]) {
        cart[productId].quantity += 1;
    } else {
        cart[productId] = {
            id: productId,
            quantity: 1,
            size: document.getElementById('selectedSize')?.value || 'M' // Default size
        };
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartCount();

    // Show feedback is handled by inline onclick or listener
}

function updateCartCount() {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || {};
    const count = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);

    // Update all cart count badges - match actual HTML selectors
    document.querySelectorAll('#cartCount, .nav__cart-count, .cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;

    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || {};
    const items = Object.values(cart);

    if (items.length === 0) {
        cartContainer.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><a href="index.html" class="btn btn--outline">Continue Shopping</a></div>';
        updateCartTotals(0);
        return;
    }

    let subtotal = 0;
    cartContainer.innerHTML = Object.entries(cart).map(([key, item]) => {
        const product = PRODUCTS[item.id];

        // Handle missing products (e.g. deleted from DB)
        if (!product) {
            return `
            <div class="cart-item fade-in visible error-item">
                <div class="cart-item__image">
                    <div style="width: 100px; height: 100px; background: #333; display: flex; align-items: center; justify-content: center; color: #666;">
                        N/A
                    </div>
                </div>
                <div class="cart-item__details">
                    <h3 class="cart-item__name" style="color: #ff4444;">Product Unavailable</h3>
                    <p class="cart-item__price">¥0</p>
                    <p class="cart-item__size">Size: ${item.size || '-'}</p>
                    <div class="cart-item__actions">
                        <button class="remove-btn" onclick="removeFromCart('${key}')">Remove</button>
                    </div>
                </div>
            </div>
            `;
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        return `
        <div class="cart-item fade-in visible">
            <div class="cart-item__image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="cart-item__details">
                <h3 class="cart-item__name">${product.name}</h3>
                <p class="cart-item__price">¥${product.price.toLocaleString()}</p>
                <p class="cart-item__size">Size: ${item.size || 'M'}</p>
                <div class="cart-item__actions">
                    <div class="quantity-controls">
                        <button onclick="updateQuantity('${key}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${key}', 1)">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart('${key}')">Remove</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    updateCartTotals(subtotal);
}

function updateQuantity(productId, change) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (cart[productId]) {
        cart[productId].quantity += change;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
        localStorage.setItem(cartKey, JSON.stringify(cart));
        renderCart(); // Re-render cart page
        updateCartCount(); // Update header badge
    }
}

function removeFromCart(productId) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (cart[productId]) {
        delete cart[productId];
        localStorage.setItem(cartKey, JSON.stringify(cart));
        renderCart();
        updateCartCount();
    }
}

function updateCartTotals(subtotal) {
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');

    if (subtotalEl) subtotalEl.textContent = `¥${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `¥${subtotal.toLocaleString()}`;
}


function renderCheckoutSummary() {
    const container = document.getElementById('checkoutItems');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const totalEl = document.getElementById('checkoutTotal');
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (Object.keys(cart).length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    let html = '';
    let subtotal = 0;

    Object.values(cart).forEach(item => {
        const product = PRODUCTS[item.id];
        if (product) {
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            html += `
                <div class="summary-item">
                    <div class="summary-item__image">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="summary-item__details">
                        <p class="summary-item__name">${product.name} x ${item.quantity}</p>
                        <p class="summary-item__price">¥${itemTotal.toLocaleString()}</p>
                    </div>
                </div>
            `;
        }
    });

    if (container) container.innerHTML = html;
    if (subtotalEl) subtotalEl.textContent = `¥${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `¥${subtotal.toLocaleString()}`;
}

/* ===============================================
   Payment Method Logic
   =============================================== */
/* ===============================================
   Payment Method Logic (Refactored for PayPal Only)
   =============================================== */
// No toggle needed as PayPal is the only option

/* ===============================================
   PayPal Logic
   =============================================== */
function initPayPal() {
    if (typeof paypal === 'undefined') {

        setTimeout(initPayPal, 500);
        return;
    }

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'black',
            shape: 'rect',
            label: 'paypal'
        },
        onInit: function (data, actions) {
            actions.disable(); // Disable by default

            const form = document.getElementById('checkoutForm');

            const validateForm = () => {
                const email = document.getElementById('email').value;
                const firstName = document.getElementById('firstName').value;
                const lastName = document.getElementById('lastName').value;
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const state = document.getElementById('state').value;
                const zipCode = document.getElementById('zipCode').value;
                const phone = document.getElementById('phone').value;
                const country = document.getElementById('country').value;
                const agreePolicy = document.getElementById('agreePolicy').checked;
                
                const wrapper = document.getElementById('paypal-wrapper');

                if (email && firstName && lastName && address && city && state && zipCode && phone && country && agreePolicy) {
                    actions.enable();
                    if (wrapper) wrapper.style.pointerEvents = 'none'; // Pass clicks to PayPal
                } else {
                    actions.disable();
                    if (wrapper) wrapper.style.pointerEvents = 'auto'; // Catch clicks on wrapper
                }
            };

            // Add listeners to all inputs
            form.querySelectorAll('input, select').forEach(item => {
                item.addEventListener('change', validateForm);
                item.addEventListener('keyup', validateForm);
            });
            
            // Custom click handler for disabled state
            const wrapper = document.getElementById('paypal-wrapper');
            if (wrapper) {
                wrapper.addEventListener('click', () => {
                    const country = document.getElementById('country').value;
                    const isJP = country === 'JP';
                    const agreePolicy = document.getElementById('agreePolicy').checked;
                    
                    if (!agreePolicy) {
                        showToast(isJP ? '利用規約と各種ポリシーに同意するチェックを入れてください。' : 'Please check the box to agree to the Terms of Service and policies.');
                    } else {
                        showToast(isJP ? '配送先情報をすべて正しく入力してください。' : 'Please fill out all required shipping information correctly.');
                    }
                });
            }
        },
        createOrder: function (data, actions) {
            // Calculate total
            const cartKey = getCartKey();
            let cart = JSON.parse(localStorage.getItem(cartKey)) || {};
            let subtotal = 0;
            Object.values(cart).forEach(item => {
                const product = PRODUCTS[item.id];
                if (product) subtotal += product.price * item.quantity;
            });

            if (subtotal <= 0) {
                showToast('カートが空か、商品情報の読み込みに失敗しました。');
                // This might still happen if cart was cleared in another tab, but unlikely
                return Promise.reject(new Error('Invalid subtotal'));
            }

            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: subtotal.toString(),
                        currency_code: 'JPY'
                    }
                }]
            });
        },
        onApprove: function (data, actions) {
            return actions.order.capture().then(async function (details) {
                // Successful capture!


                // Save order to our backend
                const orderData = collectOrderData('paypal', details.id);
                await saveOrderToBackend(orderData);
            });
        },
        onError: function (err) {
            console.error('PayPal Error:', err);
            showToast('PayPal決済中にエラーが発生しました。');
        }
    }).render('#paypal-button-container');
}

/* ===============================================
   Shared Order Logic
   =============================================== */
function collectOrderData(paymentMethod, paymentId) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};
    let subtotal = 0;
    const items = Object.values(cart).map(item => {
        const product = PRODUCTS[item.id];
        subtotal += product.price * item.quantity;
        return {
            productId: item.id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            image: product.image,
            size: item.size
        };
    });

    const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const user = JSON.parse(localStorage.getItem('moda_impeto_user'));

    return {
        orderId: orderId,
        userId: user ? user.id : undefined,
        customer: {
            email: document.getElementById('email').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            address: document.getElementById('address').value,
            apartment: document.getElementById('apartment').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zipCode: document.getElementById('zipCode').value,
            country: document.getElementById('country').value,
            phone: document.getElementById('phone').value
        },
        items: items,
        totalAmount: subtotal,
        paymentMethod: paymentMethod,
        paymentIntentId: paymentId,
        paymentStatus: 'paid',
        status: 'Processing' // Or Pending
    };
}

async function saveOrderToBackend(orderData) {
    const overlay = document.getElementById('successOverlay');
    const orderNumberEl = document.getElementById('orderNumber');

    try {
        const token = sessionStorage.getItem('moda_impeto_user_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const orderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });

        if (!orderRes.ok) throw new Error('Order save failed');

        const newOrder = await orderRes.json();

        // Show Success
        if (orderNumberEl) {
            orderNumberEl.textContent = `#${newOrder.orderId}`;
        }

        // Save Order ID to LocalStorage (for guest tracking)
        let myOrders = JSON.parse(localStorage.getItem('moda_impeto_my_orders')) || [];
        if (!myOrders.includes(newOrder.orderId)) {
            myOrders.push(newOrder.orderId);
            localStorage.setItem('moda_impeto_my_orders', JSON.stringify(myOrders));
        }

        // Clear Cart
        const cartKey = getCartKey();
        localStorage.removeItem(cartKey);
        updateCartCount();

        // Show success overlay
        overlay.classList.add('active');

    } catch (err) {
        console.error('Failed to save order:', err);
        alert('注文の保存に失敗しました。サポートにお問い合わせください。');
    }
}

/* ===============================================
   Checkout Logic (PayPal Only)
   =============================================== */
async function initCheckout() {
    try {
        const countrySelect = document.getElementById('country');
        const stateSelect = document.getElementById('state');
        const shippingNotice = document.querySelector('.shipping-notice');
        
        if (countrySelect && stateSelect) {
            countrySelect.addEventListener('change', () => {
                if (countrySelect.value === 'US') {
                    shippingNotice.innerHTML = 'ℹ️ Currently, we only ship to the contiguous United States (excluding Hawaii and Alaska).<br><br><span style="font-size: 0.85rem; color: var(--color-gray);"><strong>About Customs:</strong> Orders under $800 are generally exempt from US customs duties (De Minimis rule). If duties apply, they are collected directly by the carrier.</span>';
                    stateSelect.innerHTML = `
                        <option value="" disabled selected>Select State</option>
                        <option value="AL">Alabama</option><option value="AZ">Arizona</option><option value="AR">Arkansas</option><option value="CA">California</option><option value="CO">Colorado</option><option value="CT">Connecticut</option><option value="DE">Delaware</option><option value="FL">Florida</option><option value="GA">Georgia</option><option value="ID">Idaho</option><option value="IL">Illinois</option><option value="IN">Indiana</option><option value="IA">Iowa</option><option value="KS">Kansas</option><option value="KY">Kentucky</option><option value="LA">Louisiana</option><option value="ME">Maine</option><option value="MD">Maryland</option><option value="MA">Massachusetts</option><option value="MI">Michigan</option><option value="MN">Minnesota</option><option value="MS">Mississippi</option><option value="MO">Missouri</option><option value="MT">Montana</option><option value="NE">Nebraska</option><option value="NV">Nevada</option><option value="NH">New Hampshire</option><option value="NJ">New Jersey</option><option value="NM">New Mexico</option><option value="NY">New York</option><option value="NC">North Carolina</option><option value="ND">North Dakota</option><option value="OH">Ohio</option><option value="OK">Oklahoma</option><option value="OR">Oregon</option><option value="PA">Pennsylvania</option><option value="RI">Rhode Island</option><option value="SC">South Carolina</option><option value="SD">South Dakota</option><option value="TN">Tennessee</option><option value="TX">Texas</option><option value="UT">Utah</option><option value="VT">Vermont</option><option value="VA">Virginia</option><option value="WA">Washington</option><option value="WV">West Virginia</option><option value="WI">Wisconsin</option><option value="WY">Wyoming</option><option value="DC">Washington D.C.</option>
                    `;
                    // Layout changes for US
                    document.getElementById('email').tabIndex = 1;

                    document.getElementById('wrap-country').style.order = "1";
                    document.getElementById('wrap-country').style.gridColumn = "1 / -1";
                    document.getElementById('country').tabIndex = 2;

                    document.getElementById('wrap-firstName').style.order = "2";
                    document.getElementById('firstName').placeholder = "First Name";
                    document.getElementById('firstName').tabIndex = 3;
                    
                    document.getElementById('wrap-lastName').style.order = "3";
                    document.getElementById('lastName').placeholder = "Last Name";
                    document.getElementById('lastName').tabIndex = 4;
                    
                    document.getElementById('wrap-address').style.order = "4";
                    document.getElementById('address').placeholder = "Address";
                    document.getElementById('address').tabIndex = 5;
                    
                    document.getElementById('wrap-apartment').style.order = "5";
                    document.getElementById('apartment').placeholder = "Apartment, suite, etc. (optional)";
                    document.getElementById('apartment').tabIndex = 6;
                    
                    document.getElementById('wrap-city').style.order = "6";
                    document.getElementById('wrap-city').style.gridColumn = ""; // Reset for US
                    document.getElementById('city').placeholder = "City";
                    document.getElementById('city').tabIndex = 7;
                    
                    document.getElementById('wrap-state').style.order = "7";
                    document.getElementById('state').tabIndex = 8;
                    
                    document.getElementById('wrap-zipCode').style.order = "8";
                    document.getElementById('zipCode').placeholder = "ZIP Code";
                    document.getElementById('zipCode').tabIndex = 9;
                    
                    document.getElementById('wrap-phone').style.order = "9";
                    document.getElementById('phone').placeholder = "Phone Number";
                    document.getElementById('phone').tabIndex = 10;
                    
                    document.getElementById('wrap-notice').style.order = "10";
                    
                    document.getElementById('agreePolicy').tabIndex = 11;
                } else if (countrySelect.value === 'JP') {
                    shippingNotice.innerHTML = 'ℹ️ 日本全国へ配送可能です。';
                    stateSelect.innerHTML = `
                        <option value="" disabled selected>都道府県を選択 / Select Prefecture</option>
                        <option value="Hokkaido">北海道</option><option value="Aomori">青森県</option><option value="Iwate">岩手県</option><option value="Miyagi">宮城県</option><option value="Akita">秋田県</option><option value="Yamagata">山形県</option><option value="Fukushima">福島県</option><option value="Ibaraki">茨城県</option><option value="Tochigi">栃木県</option><option value="Gunma">群馬県</option><option value="Saitama">埼玉県</option><option value="Chiba">千葉県</option><option value="Tokyo">東京都</option><option value="Kanagawa">神奈川県</option><option value="Niigata">新潟県</option><option value="Toyama">富山県</option><option value="Ishikawa">石川県</option><option value="Fukui">福井県</option><option value="Yamanashi">山梨県</option><option value="Nagano">長野県</option><option value="Gifu">岐阜県</option><option value="Shizuoka">静岡県</option><option value="Aichi">愛知県</option><option value="Mie">三重県</option><option value="Shiga">滋賀県</option><option value="Kyoto">京都府</option><option value="Osaka">大阪府</option><option value="Hyogo">兵庫県</option><option value="Nara">奈良県</option><option value="Wakayama">和歌山県</option><option value="Tottori">鳥取県</option><option value="Shimane">島根県</option><option value="Okayama">岡山県</option><option value="Hiroshima">広島県</option><option value="Yamaguchi">山口県</option><option value="Tokushima">徳島県</option><option value="Kagawa">香川県</option><option value="Ehime">愛媛県</option><option value="Kochi">高知県</option><option value="Fukuoka">福岡県</option><option value="Saga">佐賀県</option><option value="Nagasaki">長崎県</option><option value="Kumamoto">熊本県</option><option value="Oita">大分県</option><option value="Miyazaki">宮崎県</option><option value="Kagoshima">鹿児島県</option><option value="Okinawa">沖縄県</option>
                    `;
                    // Layout changes for JP
                    document.getElementById('email').tabIndex = 1;

                    document.getElementById('wrap-country').style.order = "1";
                    document.getElementById('wrap-country').style.gridColumn = "1 / -1";
                    document.getElementById('country').tabIndex = 2;
                    
                    document.getElementById('wrap-lastName').style.order = "2";
                    document.getElementById('lastName').placeholder = "姓 (Last Name)";
                    document.getElementById('lastName').tabIndex = 3;
                    
                    document.getElementById('wrap-firstName').style.order = "3";
                    document.getElementById('firstName').placeholder = "名 (First Name)";
                    document.getElementById('firstName').tabIndex = 4;
                    
                    document.getElementById('wrap-zipCode').style.order = "4";
                    document.getElementById('zipCode').placeholder = "郵便番号 (ZIP Code)";
                    document.getElementById('zipCode').tabIndex = 5;
                    
                    document.getElementById('wrap-state').style.order = "5";
                    document.getElementById('state').tabIndex = 6;
                    
                    document.getElementById('wrap-city').style.order = "6";
                    document.getElementById('wrap-city').style.gridColumn = "1 / -1"; // Make full width for JP
                    document.getElementById('city').placeholder = "市区町村 (City)";
                    document.getElementById('city').tabIndex = 7;
                    
                    document.getElementById('wrap-address').style.order = "7";
                    document.getElementById('address').placeholder = "丁目・番地・号 (Address)";
                    document.getElementById('address').tabIndex = 8;
                    
                    document.getElementById('wrap-apartment').style.order = "8";
                    document.getElementById('apartment').placeholder = "建物名・部屋番号など (Apartment, suite, optional)";
                    document.getElementById('apartment').tabIndex = 9;
                    
                    document.getElementById('wrap-phone').style.order = "9";
                    document.getElementById('phone').placeholder = "電話番号 (Phone Number)";
                    document.getElementById('phone').tabIndex = 10;
                    
                    document.getElementById('wrap-notice').style.order = "10";
                    
                    document.getElementById('agreePolicy').tabIndex = 11;
                }
            });
            // trigger change to remove AK and HI from initial load
            countrySelect.dispatchEvent(new Event('change'));
        }

        // Fetch PayPal client ID from server
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        const paypalClientId = config.paypalClientId;

        // Load PayPal SDK dynamically
        if (paypalClientId) {
            if (!document.querySelector('script[src*="paypal.com/sdk/js"]')) {
                const script = document.createElement('script');
                script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=JPY`;
                script.async = true;
                script.onload = () => initPayPal();
                document.head.appendChild(script);
            } else {
                initPayPal();
            }
        } else {
            console.warn('PayPal Client ID not configured');
        }

    } catch (err) {
        console.error('Error initializing Checkout:', err);
    }
}

/* ===============================================
   Product Detail Logic
   =============================================== */
// Product Detail Page Logic
async function initProduct() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        // Not on product page, just return or handle accordingly
        return;
    }

    try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (!res.ok) throw new Error('Product not found');
        const product = await res.json();
        const container = document.getElementById('productDetail');

        if (container) {
            // Check if sizes exist
            const hasSizes = product.sizes && product.sizes.length > 0;
            let sizeHtml = '';

            if (hasSizes) {
                sizeHtml = `
                    <div class="size-selector">
                        <p class="size-label">Select Size:</p>
                        <div class="size-options">
                            ${product.sizes.map(size => `<button class="size-btn" data-size="${size}" onclick="selectSize(this, '${size}')">${size}</button>`).join('')}
                        </div>
                        <input type="hidden" id="selectedSize" value="">
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="product-detail fade-in visible">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.name}" class="product-detail-image">
                    </div>
                    <div class="product-info">
                        <p class="product-category text-accent">${product.category}</p>
                        <h1 class="product-name">${product.name}</h1>
                        <p class="product-price">¥${product.price.toLocaleString()}</p>
                        
                        ${sizeHtml}

                        <div class="product-description">
                            <p>${product.description}</p>
                        </div>
                        
                        ${product.isSoldOut
                    ? '<button class="btn btn--disabled" disabled style="width: 100%; cursor: not-allowed; opacity: 0.6;">SOLD OUT</button>'
                    : `<button class="btn btn--primary add-to-cart-btn" onclick="addToCart('${product._id}' || ${product.id})">ADD TO CART</button>`
                }
                        
                        <div class="product-meta">
                            <p>Free Express Shipping Worldwide</p>
                            <p>Complimentary Gift Packaging</p>
                        </div>
                    </div>
                </div>
            `;

            // Re-initialize PRODUCTS cache for addToCart
            if (typeof PRODUCTS !== 'undefined') {
                PRODUCTS[product._id] = product;
                PRODUCTS[product.id] = product; // Fallback
            }
        }
    } catch (err) {
        console.error(err);
        const container = document.getElementById('productDetail');
        if (container) container.innerHTML = '<p>Product not found.</p>';
    }
}

// Global scope size selector
window.selectSize = function (btn, size) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('selectedSize').value = size;
};

// Override addToCart to handle size
window.addToCart = function (productId) {
    // Ensure PRODUCTS is available or fetch it? 
    // Assuming PRODCUTS is populated by loadProducts or initProduct
    const product = (typeof PRODUCTS !== 'undefined') ? PRODUCTS[productId] : null;

    if (!product) {
        console.error('Product not found in cache');
        return;
    }

    if (product.isSoldOut) {
        alert('この商品は売り切れです。');
        return;
    }

    let size = null;
    if (product.sizes && product.sizes.length > 0) {
        const sizeInput = document.getElementById('selectedSize');
        // If we are on product detail page
        if (sizeInput) {
            size = sizeInput.value;
            if (!size) {
                alert('サイズを選択してください。');
                return;
            }
        } else {
            // From listing page - if product has sizes, redirect to detail page
            window.location.href = `product.html?id=${productId}`;
            return;
        }
    }

    let cart = JSON.parse(localStorage.getItem(getCartKey())) || {};

    // Create unique key for product + size
    const cartKey = size ? `${productId}_${size}` : productId;

    if (cart[cartKey]) {
        cart[cartKey].quantity += 1;
    } else {
        cart[cartKey] = {
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            size: size
        };
    }

    localStorage.setItem(getCartKey(), JSON.stringify(cart));
    updateCartCount();

    // Show feedback
    const btn = document.querySelector(`.add-to-cart[data-id="${productId}"]`) || document.querySelector('.add-to-cart-btn');
    if (btn) showFeedback(btn);
};

function showFeedback(btn) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Added to Cart';
    btn.classList.add('added');
    btn.style.background = 'linear-gradient(135deg, #32cd32 0%, #228b22 100%)';
    btn.style.borderColor = '#32cd32';

    // Cart icon bounce animation
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.classList.add('cart-bounce');
        setTimeout(() => cartCount.classList.remove('cart-bounce'), 600);
    }

    // Show toast notification
    showToast('Added to Cart!');

    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('added');
        btn.style.background = '';
        btn.style.borderColor = '';
    }, 2000);
}

function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.cart-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" style="fill: #32cd32; margin-right: 10px;">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>${message}</span>
        <a href="cart.html" style="margin-left: 15px; color: #fff; text-decoration: underline;">View Cart</a>
    `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ===============================================
   Scroll Animations
   =============================================== */
function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => observer.observe(el));
}
/* ===============================================
   Smooth Scroll
   =============================================== */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href === '#' || !href.startsWith('#')) return;

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();
                const navHeight = document.getElementById('nav').offsetHeight;
                const targetPosition = target.offsetTop - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                document.querySelector('.nav__links')?.classList.remove('active');
                document.getElementById('navToggle')?.classList.remove('active');
            }
        });
    });
}

/* ===============================================
   Cookie Banner Logic
   =============================================== */
function initCookieBanner() {
    if (!localStorage.getItem('cookie_consent')) {
        const banner = document.createElement('div');
        banner.innerHTML = `
            <div style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); color: #fff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; border-top: 1px solid var(--color-gray-dark); font-family: 'Alte haas grotesk', sans-serif;">
                <div>
                    <p style="margin: 0; font-size: 0.9rem; line-height: 1.4;">We use cookies to improve your experience on our site and to analyze web traffic. By continuing to use our site, you consent to our <a href="privacy.html" style="color: #fff; text-decoration: underline;">Privacy Policy</a>.</p>
                </div>
                <div style="display: flex; gap: 10px; margin-left: 20px;">
                    <button id="acceptCookies" style="background: var(--color-white); color: var(--color-black); border: none; padding: 8px 16px; cursor: pointer; font-family: inherit; font-size: 0.9rem;">Accept</button>
                    <button id="rejectCookies" style="background: transparent; color: var(--color-white); border: 1px solid var(--color-white); padding: 8px 16px; cursor: pointer; font-family: inherit; font-size: 0.9rem;">Reject</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        
        document.getElementById('acceptCookies').addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'accepted');
            banner.remove();
        });
        document.getElementById('rejectCookies').addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'rejected');
            banner.remove();
        });
    }
}
document.addEventListener('DOMContentLoaded', initCookieBanner);

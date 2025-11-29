// Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const subtotalAmount = document.getElementById('subtotalAmount');
    const totalAmount = document.getElementById('totalAmount');
    const headerCartCount = document.getElementById('headerCartCount');
    const applyDiscount = document.getElementById('applyDiscount');
    const proceedCheckout = document.getElementById('proceedCheckout');

    // Sample cart data (in real app, this would come from localStorage/API)
    let cart = JSON.parse(localStorage.getItem('footLocker_cart')) || [
        {
            id: 1,
            brand: "ADIDAS",
            name: "Adizero Evo SI Men's Shoes - White",
            price: 8500.00,
            size: "UK 12.5",
            image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=ADIDAS+EVO",
            quantity: 1
        }
    ];

    // Initialize cart page
    function initializeCart() {
        updateCartDisplay();
        updateCartCount();
        calculateTotals();
    }

    // Update cart display
    function updateCartDisplay() {
        if (cart.length === 0) {
            cartItems.style.display = 'none';
            emptyCart.style.display = 'block';
        } else {
            cartItems.style.display = 'flex';
            emptyCart.style.display = 'none';
            renderCartItems();
        }
    }

    // Render cart items
    function renderCartItems() {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-brand">${item.brand}</div>
                    <h3 class="cart-item-name">${item.name}</h3>
                    <p class="cart-item-size">Size: ${item.size}</p>
                </div>
                <div class="cart-item-price">
                    ₱${item.price.toLocaleString()}
                </div>
                <div class="cart-item-quantity">
                    <div class="quantity-label">QTY</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-subtotal">
                    ₱${(item.price * item.quantity).toLocaleString()}
                </div>
                <div class="cart-item-actions">
                    <button class="action-btn wishlist" onclick="moveToWishlist(${item.id})">
                        <i class="fas fa-heart"></i>
                        Move to Wishlist
                    </button>
                    <button class="action-btn" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Update cart quantity
    function updateCartQuantity(itemId, change) {
        const item = cart.find(cartItem => cartItem.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(itemId);
            } else {
                saveCart();
                renderCartItems();
                calculateTotals();
                updateCartCount();
            }
        }
    }

    // Remove from cart
    function removeFromCart(itemId) {
        if (confirm('Are you sure you want to remove this item from your cart?')) {
            cart = cart.filter(item => item.id !== itemId);
            saveCart();
            updateCartDisplay();
            calculateTotals();
            updateCartCount();
        }
    }

    // Move to wishlist
    function moveToWishlist(itemId) {
        const item = cart.find(cartItem => cartItem.id === itemId);
        if (item) {
            // Add to wishlist logic here
            const favorites = JSON.parse(localStorage.getItem('footLocker_favorites')) || [];
            const existingItem = favorites.find(fav => fav.id === itemId);
            
            if (!existingItem) {
                favorites.push({
                    ...item,
                    quantity: 1
                });
                localStorage.setItem('footLocker_favorites', JSON.stringify(favorites));
            }
            
            // Remove from cart
            removeFromCart(itemId);
            alert('Item moved to wishlist!');
        }
    }

    // Calculate totals
    function calculateTotals() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal; // Add shipping, tax, discounts here
        
        subtotalAmount.textContent = `₱${subtotal.toLocaleString()}`;
        totalAmount.textContent = `₱${total.toLocaleString()}`;
    }

    // Update cart count in header
    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (headerCartCount) {
            headerCartCount.textContent = totalItems;
        }
    }

    // Apply discount
    function applyDiscountCode() {
        const discountCode = document.getElementById('discountCode').value.trim();
        if (!discountCode) {
            alert('Please enter a discount code');
            return;
        }
        
        // In real app, validate discount code with backend
        if (discountCode.toUpperCase() === 'SAVE10') {
            alert('Discount code applied! 10% off your order.');
            // Apply discount logic here
        } else {
            alert('Invalid discount code');
        }
    }

    // Proceed to checkout
    function proceedToCheckout() {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        
        // In real app, redirect to checkout page
        alert('Proceeding to checkout!');
        console.log('Checkout items:', cart);
        // window.location.href = 'checkout.html';
    }

    // Save cart to localStorage
    function saveCart() {
        localStorage.setItem('footLocker_cart', JSON.stringify(cart));
    }

    // Event listeners
    applyDiscount.addEventListener('click', applyDiscountCode);
    proceedCheckout.addEventListener('click', proceedToCheckout);

    // Enter key for discount code
    document.getElementById('discountCode').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyDiscountCode();
        }
    });

    // Make functions global for onclick handlers
    window.updateCartQuantity = updateCartQuantity;
    window.removeFromCart = removeFromCart;
    window.moveToWishlist = moveToWishlist;

    // Initialize
    initializeCart();
});
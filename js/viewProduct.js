// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCn721TvxMu3R6JX5fpYTXemZPB6alHQX0",
    authDomain: "shoehub-711f9.firebaseapp.com",
    projectId: "shoehub-711f9",
    storageBucket: "shoehub-711f9.firebasestorage.app",
    messagingSenderId: "719905522600",
    appId: "1:719905522600:web:3ad4f4c2213b25a5a5d39d"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Store current product globally
let currentProduct = null;
let isProductInFavorites = false;

// Main function to load product
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded - initializing product view');
    
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        showError('Product ID not specified');
        return;
    }
    
    // Load product data
    loadProductData(productId);
    
    // Update auth UI
    updateAuthUI();
    
    // Setup event listeners
    setupEventListeners();
});

async function loadProductData(productId) {
    const container = document.getElementById('productContainer');
    
    try {
        // Show loading state
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px;">
                <i class="fas fa-spinner fa-spin fa-3x" style="color: #d50000; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 16px;">Loading product details...</p>
            </div>
        `;
        
        console.log('Loading product ID:', productId);
        
        // Get product from Firestore
        const productRef = db.collection('products').doc(productId);
        const doc = await productRef.get();
        
        if (!doc.exists) {
            showError('Product not found');
            return;
        }
        
        const productData = doc.data();
        
        // Convert price to number if it's stored as string
        let productPrice = productData.price;
        if (typeof productPrice === 'string') {
            productPrice = parseFloat(productPrice.replace(/[^0-9.-]+/g, ''));
        }
        
        currentProduct = { 
            id: doc.id, 
            ...productData,
            price: productPrice || 0 // Use actual price or 0 if not available
        };
        
        console.log('Product loaded:', currentProduct);
        console.log('Product price:', currentProduct.price, 'Type:', typeof currentProduct.price);
        
        // Check if product is in favorites for logged-in user
        const user = auth.currentUser;
        if (user) {
            isProductInFavorites = await checkIfInFavorites(user.uid, productId);
            console.log('Is product in favorites?', isProductInFavorites);
        }
        
        // Display product
        displayProduct(currentProduct);
        
    } catch (error) {
        console.error('Error loading product:', error);
        showError('Error loading product: ' + error.message);
    }
}

// Check if product is in user's favorites
async function checkIfInFavorites(userId, productId) {
    try {
        const favoritesRef = db.collection('favorites')
            .where('userId', '==', userId)
            .where('productId', '==', productId)
            .limit(1);
        
        const snapshot = await favoritesRef.get();
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking favorites:', error);
        return false;
    }
}

function displayProduct(product) {
    const container = document.getElementById('productContainer');
    const breadcrumb = document.getElementById('currentProduct');
    
    // Update breadcrumb
    breadcrumb.textContent = product.name || 'Product';
    
    // Update page title
    document.title = `${product.name} - ShoeHub`;
    
    // Generate size options HTML - use actual sizes or defaults
    const sizeOptions = (product.sizes || ['US 8', 'US 9', 'US 9.5', 'US 10', 'US 11', 'US 12'])
        .map(size => `
            <div class="size-option" data-size="${size}">
                ${size}
            </div>
        `).join('');
    
    // Generate thumbnails HTML (using actual product image)
    const thumbnailsHTML = Array(4).fill(0).map((_, index) => `
        <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${product.image || 'https://via.placeholder.com/60x60?text=Thumb'}" 
                 alt="${product.name} ${index + 1}">
        </div>
    `).join('');
    
    // Use ACTUAL product price, not hardcoded
    const actualPrice = product.price || 0;
    const displayPrice = formatPrice(actualPrice);
    
    // Favorites button HTML - with dynamic icon based on favorites status
    const favoritesIcon = isProductInFavorites ? 'fas' : 'far';
    const favoritesTooltip = isProductInFavorites ? 'Remove from Favorites' : 'Add to Favorites';
    const favoritesColor = isProductInFavorites ? '#d50000' : '#666';
    
    const favoritesButtonHTML = `
        <button class="favorite-btn" id="favoriteBtn" title="${favoritesTooltip}">
            <i class="${favoritesIcon} fa-heart" style="color: ${favoritesColor};"></i>
        </button>
    `;
    
    // Use ACTUAL product data
    container.innerHTML = `
        <!-- Left Column: Product Images -->
        <div class="product-image-section">
            <div class="main-product-image" id="mainImageContainer">
                <img src="${product.image || 'https://via.placeholder.com/500x400?text=No+Image'}" 
                     alt="${product.name}" 
                     id="mainProductImage">
                <!-- Favorites Button on Image -->
                ${favoritesButtonHTML}
            </div>
            <div class="image-thumbnails" id="thumbnailsContainer">
                ${thumbnailsHTML}
            </div>
        </div>
        
        <!-- Right Column: Product Details -->
        <div class="product-details-section">
            <div class="product-brand">${product.brand || 'Brand'}</div>
            <h1 class="product-name" id="productName">${product.name || "Product Name"}</h1>
            
            <div class="product-category">
                ${product.gender || 'Unisex'} | ${product.sku || 'SKU-001'}
            </div>
            
            <div class="product-price">
                <span class="price-icon">📌</span>
                <span id="productPrice">${displayPrice}</span>
            </div>
            
            <div class="product-rating">
                <div class="stars">
                    ★★★★★
                </div>
                <span class="rating-text">${product.rating || 0} (${product.reviews || 0})</span>
                <a href="#" class="write-review">Write a review</a>
            </div>
            
            <div class="size-section">
                <label class="size-label">Size</label>
                <div class="size-options" id="sizeOptions">
                    ${sizeOptions}
                </div>
            </div>
            
            <div class="quantity-section">
                <label class="size-label">Quantity</label>
                <div class="quantity-selector">
                    <input type="number" 
                           class="quantity-input" 
                           id="quantityInput" 
                           value="1" 
                           min="1" 
                           max="${product.stock || 10}"
                           onchange="validateQuantity(this)">
                </div>
            </div>
            
            <div class="action-buttons">
                <button class="buy-now-btn" id="buyNowBtn">
                    <i class="fas fa-bolt"></i> BUY NOW
                </button>
                <button class="add-to-cart-btn" id="addToCartBtn">
                    <i class="fas fa-shopping-cart"></i> ADD TO CART
                </button>
                <button class="favorite-action-btn" id="favoriteActionBtn">
                    <i class="${favoritesIcon} fa-heart"></i> ${isProductInFavorites ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES'}
                </button>
            </div>
        </div>
    `;
    
    // Initialize interactions
    initializeProductInteractions(product.id);
}

function formatPrice(price) {
    // Ensure price is a number
    const numericPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    
    // Format as Philippine Peso
    return '₱' + numericPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function initializeProductInteractions(productId) {
    // Size selection
    const sizeOptions = document.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        option.addEventListener('click', function() {
            sizeOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Select first size by default
    if (sizeOptions.length > 0) {
        sizeOptions[0].click();
    }
    
    // Thumbnail clicks
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImage = document.getElementById('mainProductImage');
    
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (mainImage) {
                const thumbnailImg = this.querySelector('img');
                if (thumbnailImg) {
                    mainImage.src = thumbnailImg.src;
                }
            }
        });
    });
    
    // Buy Now button
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function() {
            buyNow(productId);
        });
    }
    
    // Add to Cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            addToCartFromProductPage();
        });
    }
    
    // Favorites button on image
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', function() {
            toggleFavorite(productId, this);
        });
    }
    
    // Favorites action button
    const favoriteActionBtn = document.getElementById('favoriteActionBtn');
    if (favoriteActionBtn) {
        favoriteActionBtn.addEventListener('click', function() {
            toggleFavorite(productId, this);
        });
    }
}

function validateQuantity(input) {
    const min = parseInt(input.min);
    const max = parseInt(input.max);
    let value = parseInt(input.value);
    
    if (isNaN(value) || value < min) {
        value = min;
    } else if (value > max) {
        value = max;
    }
    
    input.value = value;
}

// Add to Cart from product page
async function addToCartFromProductPage() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add items to cart');
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    const selectedSizeElement = document.querySelector('.size-option.selected');
    const selectedSize = selectedSizeElement?.dataset.size;
    const quantity = parseInt(document.getElementById('quantityInput')?.value) || 1;
    
    if (!selectedSize) {
        alert('Please select a size');
        return;
    }
    
    if (!currentProduct) {
        alert('Product information not available. Please refresh the page.');
        return;
    }
    
    try {
        // Create cart item
        const cartItem = {
            id: currentProduct.id,
            productId: currentProduct.id,
            name: currentProduct.name,
            brand: currentProduct.brand,
            price: currentProduct.price || 0,
            image: currentProduct.image || '',
            quantity: quantity,
            size: selectedSize
        };
        
        // Get existing cart
        let cart = JSON.parse(localStorage.getItem('footLocker_cart') || '[]');
        
        // Check if product already exists in cart with same size
        const existingIndex = cart.findIndex(item => 
            (item.id === currentProduct.id || item.productId === currentProduct.id) && 
            item.size === selectedSize
        );
        
        if (existingIndex > -1) {
            // Update quantity if item exists
            cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + quantity;
        } else {
            // Add new item to cart
            cart.push(cartItem);
        }
        
        // Save to localStorage
        localStorage.setItem('footLocker_cart', JSON.stringify(cart));
        
        // Also sync to Firestore if data service is available
        if (typeof firebaseDataService !== 'undefined' && firebaseDataService.addToCart) {
            await firebaseDataService.addToCart(user.uid, currentProduct.id, quantity, selectedSize);
        }
        
        showSuccessMessage(`Added ${quantity} item${quantity > 1 ? 's' : ''} to cart successfully!`);
        
        // Update cart count in header
        updateCartCount();
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding to cart. Please try again.');
    }
}

// Toggle favorites function
async function toggleFavorite(productId, buttonElement = null) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add items to favorites');
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    try {
        if (isProductInFavorites) {
            // Remove from favorites
            await removeFromFavorites(user.uid, productId);
            isProductInFavorites = false;
            showMessage('Removed from favorites', 'success');
        } else {
            // Add to favorites
            await addToFavorites(user.uid, productId);
            isProductInFavorites = true;
            showMessage('Added to favorites', 'success');
        }
        
        // Update UI
        updateFavoriteButtons();
        
        // Update favorites count in header
        if (typeof updateFavoritesCount === 'function') {
            updateFavoritesCount();
        }
        
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showMessage('Error updating favorites', 'error');
    }
}

// Add to favorites
async function addToFavorites(userId, productId) {
    try {
        await db.collection('favorites').add({
            userId: userId,
            productId: productId,
            addedAt: new Date().toISOString(),
            productName: currentProduct?.name || 'Unknown Product',
            productImage: currentProduct?.image || '',
            productPrice: currentProduct?.price || 0
        });
        return true;
    } catch (error) {
        throw error;
    }
}

// Remove from favorites
async function removeFromFavorites(userId, productId) {
    try {
        const snapshot = await db.collection('favorites')
            .where('userId', '==', userId)
            .where('productId', '==', productId)
            .get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        return true;
    } catch (error) {
        throw error;
    }
}

// Update favorite buttons UI
function updateFavoriteButtons() {
    // Update image favorites button
    const imageFavoriteBtn = document.getElementById('favoriteBtn');
    if (imageFavoriteBtn) {
        const icon = imageFavoriteBtn.querySelector('i');
        if (icon) {
            icon.className = isProductInFavorites ? 'fas fa-heart' : 'far fa-heart';
            icon.style.color = isProductInFavorites ? '#d50000' : '#666';
            imageFavoriteBtn.title = isProductInFavorites ? 'Remove from Favorites' : 'Add to Favorites';
        }
    }
    
    // Update action favorites button
    const actionFavoriteBtn = document.getElementById('favoriteActionBtn');
    if (actionFavoriteBtn) {
        const icon = actionFavoriteBtn.querySelector('i');
        if (icon) {
            icon.className = isProductInFavorites ? 'fas fa-heart' : 'far fa-heart';
        }
        actionFavoriteBtn.innerHTML = `<i class="${isProductInFavorites ? 'fas' : 'far'} fa-heart"></i> ${isProductInFavorites ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES'}`;
    }
}

// Update favorites count in header
async function updateFavoritesCount() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const snapshot = await db.collection('favorites')
            .where('userId', '==', user.uid)
            .get();
        
        const count = snapshot.size;
        const favoritesCountElement = document.getElementById('favoritesCount');
        
        if (favoritesCountElement) {
            favoritesCountElement.textContent = count > 99 ? '99+' : count;
            favoritesCountElement.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error updating favorites count:', error);
    }
}

async function buyNow(productId) {
    console.log('=== BUY NOW CLICKED ===');
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to purchase products');
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    const selectedSizeElement = document.querySelector('.size-option.selected');
    const selectedSize = selectedSizeElement?.dataset.size;
    const quantity = parseInt(document.getElementById('quantityInput')?.value) || 1;
    
    if (!selectedSize) {
        alert('Please select a size');
        return;
    }
    
    // Get current product data
    if (!currentProduct) {
        alert('Product information not available. Please refresh the page.');
        return;
    }
    
    try {
        // Use ACTUAL product price from currentProduct
        let rawPrice = currentProduct.price;
        console.log('Actual product price:', rawPrice, 'Type:', typeof rawPrice);
        
        // Ensure price is a number
        if (typeof rawPrice === 'string') {
            rawPrice = parseFloat(rawPrice.replace(/[^0-9.-]+/g, ''));
        }
        
        // If price is invalid, show error instead of using default
        if (isNaN(rawPrice) || rawPrice <= 0) {
            alert('Error: Product price is not available. Please contact support.');
            return;
        }
        
        console.log('Price to use in checkout:', rawPrice);
        
        // Create checkout data with ACTUAL product price
        const checkoutData = {
            product: {
                id: currentProduct.id,
                name: currentProduct.name,
                brand: currentProduct.brand,
                price: rawPrice, // ACTUAL price
                image: currentProduct.image,
                size: selectedSize,
                quantity: quantity
            },
            user: {
                uid: user.uid,
                email: user.email
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('Checkout data prepared:', checkoutData);
        
        // Store checkout data
        sessionStorage.setItem('checkoutProduct', JSON.stringify(checkoutData));
        localStorage.setItem('lastCheckout', JSON.stringify(checkoutData));
        
        // Show confirmation with ACTUAL price
        const subtotal = rawPrice * quantity;
        const shipping = 150.00;
        const total = subtotal + shipping;
        
        const confirmMessage = `Proceed to checkout?\n\nProduct: ${currentProduct.name}\nSize: ${selectedSize}\nQuantity: ${quantity}\nPrice: ₱${rawPrice.toFixed(2)} each\nSubtotal: ₱${subtotal.toFixed(2)}\nShipping: ₱${shipping.toFixed(2)}\nTotal: ₱${total.toFixed(2)}`;
        
        if (confirm(confirmMessage)) {
            window.location.href = 'checkout.html';
        }
        
    } catch (error) {
        console.error('Error in buy now:', error);
        alert('Error processing your order. Please try again.');
    }
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
    
    if (!document.querySelector('#messageAnimations')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'messageAnimations';
        styleSheet.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
}

function updateCartCount() {
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        try {
            const cart = JSON.parse(localStorage.getItem('footLocker_cart') || '[]');
            const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            cartCountElement.textContent = count > 99 ? '99+' : count;
            cartCountElement.style.display = count > 0 ? 'flex' : 'none';
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    }
}

function showError(message) {
    const container = document.getElementById('productContainer');
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px;">
            <i class="fas fa-exclamation-circle fa-3x" style="color: #d50000; margin-bottom: 20px;"></i>
            <h3 style="color: #d50000; margin-bottom: 10px;">Error</h3>
            <p style="color: #666; margin-bottom: 20px;">${message}</p>
            <a href="index.html" style="display: inline-block; padding: 10px 20px; background: #d50000; color: white; text-decoration: none; border-radius: 4px;">
                <i class="fas fa-arrow-left"></i> Back to Products
            </a>
        </div>
    `;
}

function updateAuthUI() {
    auth.onAuthStateChanged((user) => {
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (user) {
            console.log('User logged in:', user.email);
            if (authButtons) authButtons.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userEmail) userEmail.textContent = user.email;
            
            // Check if product is in favorites when user logs in
            if (currentProduct) {
                checkIfInFavorites(user.uid, currentProduct.id)
                    .then(result => {
                        isProductInFavorites = result;
                        updateFavoriteButtons();
                        if (typeof updateFavoritesCount === 'function') {
                            updateFavoritesCount();
                        }
                    })
                    .catch(error => console.error('Error checking favorites:', error));
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    auth.signOut().then(() => {
                        window.location.reload();
                    });
                });
            }
            
            updateCartCount();
            if (typeof updateFavoritesCount === 'function') {
                updateFavoritesCount();
            }
        } else {
            console.log('User not logged in');
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            isProductInFavorites = false;
            updateFavoriteButtons();
        }
    });
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    window.location.href = `index.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
}

// Make functions available globally
window.buyNow = buyNow;
window.addToCart = addToCartFromProductPage;
window.validateQuantity = validateQuantity;
window.toggleFavorite = toggleFavorite;

console.log('viewProduct.js loaded - Product page functionality ready');
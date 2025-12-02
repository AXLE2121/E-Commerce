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
        
        // Display product
        displayProduct(currentProduct);
        
    } catch (error) {
        console.error('Error loading product:', error);
        showError('Error loading product: ' + error.message);
    }
}

function displayProduct(product) {
    const container = document.getElementById('productContainer');
    const breadcrumb = document.getElementById('currentProduct');
    
    // Update breadcrumb
    breadcrumb.textContent = product.name || 'Product';
    
    // Update page title
    document.title = `${product.name} - Foot Locker`;
    
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
    
    // Use ACTUAL product data
    container.innerHTML = `
        <!-- Left Column: Product Images -->
        <div class="product-image-section">
            <div class="main-product-image" id="mainImageContainer">
                <img src="${product.image || 'https://via.placeholder.com/500x400?text=No+Image'}" 
                     alt="${product.name}" 
                     id="mainProductImage">
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
                <button class="add-to-cart-btn" onclick="addToCart('${product.id}')">
                    <i class="fas fa-shopping-cart"></i> ADD TO CART
                </button>
            </div>
            
            <!-- Debug info (remove in production) -->
            <div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; font-size: 12px;">
                <strong>Product ID:</strong> ${product.id}<br>
                <strong>Actual Price:</strong> ${actualPrice} (${typeof actualPrice})
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

async function addToCart(productId) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add items to cart');
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    const selectedSize = document.querySelector('.size-option.selected')?.dataset.size;
    const quantity = parseInt(document.getElementById('quantityInput')?.value) || 1;
    
    if (!selectedSize) {
        alert('Please select a size');
        return;
    }
    
    try {
        await addToCartDirect(productId, quantity, selectedSize);
        showSuccessMessage('Added to cart successfully!');
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding to cart. Please try again.');
    }
}

async function addToCartDirect(productId, quantity, size) {
    try {
        const cartItem = {
            userId: auth.currentUser.uid,
            productId: productId,
            productName: currentProduct?.name || 'Unknown Product',
            productPrice: currentProduct?.price || 0, // ACTUAL price
            productImage: currentProduct?.image || '',
            quantity: quantity,
            size: size,
            addedAt: new Date().toISOString()
        };
        
        // Save to local storage
        let cart = JSON.parse(localStorage.getItem('footLocker_cart') || '[]');
        const existingIndex = cart.findIndex(item => 
            item.productId === productId && 
            item.size === size
        );
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push(cartItem);
        }
        
        localStorage.setItem('footLocker_cart', JSON.stringify(cart));
        
        return true;
    } catch (error) {
        throw error;
    }
}

function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 25px;
        background: #4caf50;
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
            const count = cart.reduce((total, item) => total + item.quantity, 0);
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
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    auth.signOut().then(() => {
                        window.location.reload();
                    });
                });
            }
            
            updateCartCount();
        } else {
            console.log('User not logged in');
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
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
window.addToCart = addToCart;
window.validateQuantity = validateQuantity;

// Debug function
window.debugProductData = function() {
    console.log('=== CURRENT PRODUCT DATA ===');
    console.log('Current product:', currentProduct);
    console.log('Product ID:', currentProduct?.id);
    console.log('Product name:', currentProduct?.name);
    console.log('Product price:', currentProduct?.price, 'Type:', typeof currentProduct?.price);
    
    if (currentProduct) {
        alert(`Product Data:\nID: ${currentProduct.id}\nName: ${currentProduct.name}\nPrice: ${currentProduct.price}\nType: ${typeof currentProduct.price}`);
    }
};
// data.js - Complete Firestore integration with Clickable Products
console.log('data.js loaded - Firestore version');

let products = [];
let currentFilters = {
    brand: []
};
let currentSort = 'relevance';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing products...');
    
    // Check if user is authenticated and products grid exists
    const hasProductGrid = document.getElementById('productGrid');
    
    if (hasProductGrid) {
        // Wait for Firebase to initialize
        setTimeout(() => {
            initializeProducts();
            
            // Initialize counters
            updateCartCount();
            updateFavoritesCount();
        }, 1500);
    }
    
    // Listen for auth state changes to update counters
    firebase.auth().onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        
        // Update cart count
        updateCartCount();
        
        // Update favorites count
        updateFavoritesCount();
    });
});

// Initialize products from Firestore
async function initializeProducts() {
    console.log('Initializing products from Firestore...');
    
    try {
        // Initialize Firebase if needed
        if (!firebase.apps.length) {
            console.log('Firebase not initialized, initializing...');
            const firebaseConfig = {
                apiKey: "AIzaSyCn721TvxMu3R6JX5fpYTXemZPB6alHQX0",
                authDomain: "shoehub-711f9.firebaseapp.com",
                projectId: "shoehub-711f9",
                storageBucket: "shoehub-711f9.firebasestorage.app",
                messagingSenderId: "719905522600",
                appId: "1:719905522600:web:3ad4f4c2213b25a9a5d39d"
            };
            firebase.initializeApp(firebaseConfig);
        }
        
        // Get Firestore instance
        const db = firebase.firestore();
        
        // Get all products
        const snapshot = await db.collection('products').get();
        
        if (snapshot.empty) {
            console.log('No products found in Firestore');
            products = getSampleProducts();
        } else {
            products = [];
            snapshot.forEach(doc => {
                products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log(`Loaded ${products.length} products from Firestore`);
        }
        
        // Update brand filter counts
        updateBrandFilters();
        
        // Render products
        filterAndRenderProducts();
        
        // Initialize event listeners
        initializeEventListeners();
        
    } catch (error) {
        console.error('Error loading products:', error);
        console.log('Using sample products as fallback');
        products = getSampleProducts();
        updateBrandFilters();
        filterAndRenderProducts();
        initializeEventListeners();
    }
}

// Update brand filter options with counts
function updateBrandFilters() {
    const brandSection = document.querySelector('.filter-section');
    if (!brandSection) return;
    
    // Get all brand checkboxes
    const brandOptions = brandSection.querySelectorAll('.filter-option');
    
    brandOptions.forEach(option => {
        const checkbox = option.querySelector('input[type="checkbox"]');
        const brandValue = checkbox.value;
        
        // Count products for this brand
        const brandCount = products.filter(p => 
            p.brand && p.brand.toUpperCase() === brandValue
        ).length;
        
        // Update label
        const label = option.querySelector('label');
        if (label) {
            label.innerHTML = `
                <input type="checkbox" data-filter="brand" value="${brandValue}">
                ${brandValue} (${brandCount})
            `;
        }
    });
}

// Filter and render products
function filterAndRenderProducts() {
    console.log('Filtering and rendering products...');
    console.log('Total products:', products.length);
    
    let filteredProducts = [...products];
    
    // Apply brand filter
    if (currentFilters.brand.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
            currentFilters.brand.includes(product.brand)
        );
    }
    
    console.log('After filtering:', filteredProducts.length);
    
    // Apply sorting
    filteredProducts = sortProducts(filteredProducts, currentSort);
    
    // Render to DOM
    renderProductsToDOM(filteredProducts);
}

// Sort products
function sortProducts(productsToSort, sortType) {
    const sorted = [...productsToSort];
    
    switch (sortType) {
        case 'price-low':
            return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        case 'price-high':
            return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        case 'newest':
            return sorted.sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    return b.createdAt.seconds - a.createdAt.seconds;
                }
                return 0;
            });
        default:
            return sorted;
    }
}

// Render products to DOM
function renderProductsToDOM(filteredProducts) {
    const productGrid = document.getElementById('productGrid');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!productGrid) return;
    
    // Update results count
    if (resultsCount) {
        resultsCount.textContent = `Showing ${filteredProducts.length} results`;
    }
    
    // Clear grid
    productGrid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Products Found</h3>
                <p>Try adjusting your filters.</p>
                <button onclick="clearFilters()" style="margin-top: 15px; padding: 10px 20px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Clear Filters
                </button>
            </div>
        `;
        return;
    }
    
    // Create product cards
    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        productGrid.innerHTML += productCard;
    });
    
    // After rendering, attach click events to product cards
    attachProductCardClickEvents();
}

// Create product card HTML - SIMPLIFIED VERSION
function createProductCard(product) {
    const user = firebase.auth().currentUser;
    const isLoggedIn = !!user;
    
    // Format price to match the screenshot (P4,995.00 format)
    const formattedPrice = product.price ? 
        `P${product.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
        'P0.00';
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                     alt="${product.name || 'Product'}" 
                     loading="lazy"
                     style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
                <div class="product-badge">
                    <span class="rating-badge">
                        <i class="fas fa-star"></i> ${product.rating || 4.5}
                    </span>
                    <span class="category-badge">${product.category || 'Shoes'}</span>
                </div>
            </div>
            <div class="product-info">
                <span class="product-brand">${product.brand || 'Brand'}</span>
                <h3 class="product-name">${product.name || 'Product Name'}</h3>
                <p class="product-desc">${product.description ? (product.description.substring(0, 60) + (product.description.length > 60 ? '...' : '')) : 'No description available'}</p>
                <div class="product-footer">
                    <div class="product-price">${formattedPrice}</div>
                </div>
            </div>
        </div>
    `;
}

// Attach click events to product cards
function attachProductCardClickEvents() {
    const productCards = document.querySelectorAll('.product-card');
    
    console.log(`Attaching click events to ${productCards.length} product cards...`);
    
    productCards.forEach(card => {
        // Remove existing event listeners to avoid duplicates
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        // Add click event to the new card
        newCard.addEventListener('click', function(event) {
            // Don't navigate if clicking on the add to cart button
            if (event.target.closest('.add-to-cart-btn')) {
                return;
            }
            
            const productId = this.getAttribute('data-product-id');
            if (productId) {
                console.log('Product clicked, navigating to:', productId);
                navigateToViewProduct(productId);
            }
        });
        
        // Add hover effects
        newCard.style.cursor = 'pointer';
        newCard.style.transition = 'transform 0.2s, box-shadow 0.2s';
        
        newCard.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
        });
        
        newCard.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
    
    // Attach click events to add to cart buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent card click when button is clicked
            const productId = this.getAttribute('data-product-id');
            if (productId) {
                addToCart(productId);
            }
        });
    });
}

// Navigate to viewProduct.html
function navigateToViewProduct(productId) {
    console.log('Navigating to viewProduct.html with ID:', productId);
    window.location.href = `viewProduct.html?id=${productId}`;
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Filter checkboxes
    document.querySelectorAll('input[data-filter]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const filterType = e.target.dataset.filter;
            const value = e.target.value;
            const isChecked = e.target.checked;
            
            if (isChecked) {
                if (!currentFilters[filterType].includes(value)) {
                    currentFilters[filterType].push(value);
                }
            } else {
                currentFilters[filterType] = currentFilters[filterType].filter(item => item !== value);
            }
            
            filterAndRenderProducts();
        });
    });
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            filterAndRenderProducts();
        });
    }
    
    // Brand search
    const brandSearch = document.getElementById('brandSearch');
    if (brandSearch) {
        brandSearch.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            const brandOptions = document.querySelectorAll('.filter-option');
            
            brandOptions.forEach(option => {
                const label = option.textContent.toLowerCase();
                if (label.includes(searchTerm)) {
                    option.style.display = 'block';
                } else {
                    option.style.display = 'none';
                }
            });
        }, 300));
    }
    
    // Main search bar
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length >= 2) {
                const filtered = products.filter(product => 
                    (product.name && product.name.toLowerCase().includes(query)) ||
                    (product.brand && product.brand.toLowerCase().includes(query)) ||
                    (product.description && product.description.toLowerCase().includes(query))
                );
                
                renderProductsToDOM(filtered);
            } else if (query.length === 0) {
                filterAndRenderProducts();
            }
        }, 500));
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Clear all filters
function clearFilters() {
    currentFilters = { brand: [] };
    
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset sort
    if (document.getElementById('sortSelect')) {
        document.getElementById('sortSelect').value = 'relevance';
    }
    currentSort = 'relevance';
    
    filterAndRenderProducts();
}

// Add to cart function
async function addToCart(productId) {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        alert('Please login to add items to cart');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Get product details from Firestore
        const db = firebase.firestore();
        const productDoc = await db.collection('products').doc(productId).get();
        
        if (!productDoc.exists) {
            showMessage('Product not found', 'error');
            return;
        }
        
        const productData = productDoc.data();
        
        // Create cart item
        const cartItem = {
            id: productId,
            productId: productId,
            name: productData.name || 'Unknown Product',
            brand: productData.brand || 'Brand',
            price: productData.price || 0,
            image: productData.image || '',
            quantity: 1,
            size: null // Default size, can be selected in product page
        };
        
        // Get existing cart
        let cart = JSON.parse(localStorage.getItem('footLocker_cart') || '[]');
        
        // Check if product already exists in cart
        const existingIndex = cart.findIndex(item => 
            (item.id === productId || item.productId === productId) && 
            item.size === cartItem.size
        );
        
        if (existingIndex > -1) {
            // Update quantity if item exists
            cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
        } else {
            // Add new item to cart
            cart.push(cartItem);
        }
        
        // Save to localStorage
        localStorage.setItem('footLocker_cart', JSON.stringify(cart));
        
        // Also sync to Firestore if data service is available
        if (typeof firebaseDataService !== 'undefined' && firebaseDataService.addToCart) {
            await firebaseDataService.addToCart(user.uid, productId);
        }
        
        showMessage('Added to cart successfully!', 'success');
        updateCartCount();
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showMessage('Error adding to cart', 'error');
    }
}

// Update cart count
async function updateCartCount() {
    const cartBadge = document.querySelector('.cart-btn .icon-badge');
    if (!cartBadge) return;
    
    const user = firebase.auth().currentUser;
    
    try {
        if (user && typeof firebaseDataService !== 'undefined' && firebaseDataService.getUserCart) {
            // Use Firestore for logged-in users
            const cartItems = await firebaseDataService.getUserCart(user.uid);
            const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
            
            cartBadge.textContent = totalItems > 99 ? '99+' : totalItems;
            if (totalItems > 0) {
                cartBadge.style.display = 'flex';
            } else {
                cartBadge.style.display = 'none';
            }
        } else {
            // Use localStorage for non-logged-in users or fallback
            const cart = JSON.parse(localStorage.getItem('footLocker_cart') || '[]');
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            
            cartBadge.textContent = totalItems > 99 ? '99+' : totalItems;
            if (totalItems > 0) {
                cartBadge.style.display = 'flex';
            } else {
                cartBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        cartBadge.style.display = 'none';
    }
}

// Update favorites count
async function updateFavoritesCount() {
    const favoritesBadge = document.querySelector('.favorites-btn .icon-badge');
    if (!favoritesBadge) {
        console.log('Favorites badge not found');
        return;
    }
    
    const user = firebase.auth().currentUser;
    
    if (!user) {
        // User not logged in, hide count
        favoritesBadge.textContent = '0';
        favoritesBadge.style.display = 'none';
        console.log('User not logged in, hiding favorites badge');
        return;
    }
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('favorites')
            .where('userId', '==', user.uid)
            .get();
        
        const count = snapshot.size;
        favoritesBadge.textContent = count > 99 ? '99+' : count;
        
        if (count > 0) {
            favoritesBadge.style.display = 'flex';
            favoritesBadge.style.visibility = 'visible';
        } else {
            favoritesBadge.style.display = 'none';
        }
        
        console.log('Favorites count updated:', count, 'Display:', favoritesBadge.style.display);
    } catch (error) {
        console.error('Error updating favorites count:', error);
        favoritesBadge.style.display = 'none';
    }
}

// Refresh all counters
function refreshAllCounters() {
    updateCartCount();
    updateFavoritesCount();
}

// Set up periodic counter refresh
setInterval(refreshAllCounters, 30000); // Refresh every 30 seconds

// Show message function
function showMessage(message, type = 'success') {
    // Remove existing message
    const existingMsg = document.querySelector('.global-message');
    if (existingMsg) existingMsg.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `global-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        ${type === 'success' ? 'background: #4caf50;' : 'background: #f44336;'}
    `;
    
    // Add animation styles if not present
    if (!document.querySelector('#messageAnimations')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'messageAnimations';
        styleSheet.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Sample data for fallback
function getSampleProducts() {
    return [
        {
            id: "1",
            brand: "NIKE",
            name: "P-6000 Men's Sneakers Shoes - Phantom",
            price: 4995.00,
            description: "Modern sneakers with retro design elements, perfect for everyday wear. Features responsive cushioning and durable materials.",
            gender: "Men",
            category: "Sneakers",
            image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
            rating: 4.7,
            reviews: 140,
            featured: true,
            stock: 15,
            sizes: ["8", "9", "9.5", "10", "11", "12"],
            colors: ["Phantom", "Black", "White"],
            sku: "0803-NIKCD6404018"
        },
        {
            id: "2",
            brand: "ADIDAS",
            name: "Ultraboost 22 Running Shoes",
            price: 5495.00,
            description: "Premium running shoes with Boost technology for maximum energy return and comfort.",
            gender: "Unisex",
            category: "Running",
            image: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=400&h=300&fit=crop",
            rating: 4.9,
            reviews: 210,
            featured: true,
            stock: 8,
            sizes: ["7", "8", "9", "10", "11"],
            colors: ["Core Black", "Grey", "White"],
            sku: "0803-ADICD6404019"
        },
        {
            id: "3",
            brand: "NIKE",
            name: "Air Force 1 '07 Low Top",
            price: 4295.00,
            description: "The classic basketball shoe with crisp leather and iconic style. Timeless design for any occasion.",
            gender: "Unisex",
            category: "Lifestyle",
            image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop",
            rating: 4.7,
            reviews: 89,
            featured: true,
            stock: 12,
            sizes: ["7", "8", "9", "10", "11", "12"],
            colors: ["White", "Black"],
            sku: "0803-NIKCD6404020"
        },
        {
            id: "4",
            brand: "ADIDAS",
            name: "Superstar Classic Shoes",
            price: 3995.00,
            description: "Iconic shell-toe design with three stripes. A timeless classic that never goes out of style.",
            gender: "Unisex",
            category: "Casual",
            image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=300&fit=crop",
            rating: 4.6,
            reviews: 150,
            featured: true,
            stock: 20,
            sizes: ["7", "8", "9", "10", "11"],
            colors: ["Black/White", "White", "Red"],
            sku: "0803-ADICD6404021"
        }
    ];
}

// Make functions globally available
window.clearFilters = clearFilters;
window.addToCart = addToCart;
window.initializeProducts = initializeProducts;
window.navigateToViewProduct = navigateToViewProduct;
window.updateCartCount = updateCartCount;
window.updateFavoritesCount = updateFavoritesCount;
window.refreshAllCounters = refreshAllCounters;

// Export for testing
window.products = products;

console.log('data.js loaded - Products are now clickable with counters!');
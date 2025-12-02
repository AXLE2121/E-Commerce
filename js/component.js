// components.js - Updated for Firestore
const productGrid = document.getElementById('productGrid');
const resultsCount = document.getElementById('resultsCount');
const sortSelect = document.getElementById('sortSelect');
const brandSearch = document.getElementById('brandSearch');

// Create enhanced product card HTML
function createProductCard(product) {
    const isLoggedIn = firebase.auth().currentUser;
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <div class="product-badge">
                    ${product.rating ? `<span class="rating-badge"><i class="fas fa-star"></i> ${product.rating}</span>` : ''}
                    ${product.category ? `<span class="category-badge">${product.category}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="quick-view-btn" onclick="quickViewProduct('${product.id}')" title="Quick View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="favorite-btn" onclick="toggleFavorite('${product.id}')" title="${isLoggedIn ? 'Add to Favorites' : 'Login to Add Favorite'}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-brand">${product.brand}</span>
                <h3 class="product-name">${product.name}</h3>
                ${product.description ? `<p class="product-desc">${product.description.substring(0, 60)}...</p>` : ''}
                <div class="product-footer">
                    <div class="product-price">$${product.price}</div>
                    <button class="add-to-cart-btn" onclick="addToCart('${product.id}')" ${!isLoggedIn ? 'disabled title="Login to Add to Cart"' : ''}>
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
                ${product.reviews ? `<div class="product-reviews"><i class="fas fa-comment"></i> ${product.reviews} reviews</div>` : ''}
            </div>
        </div>
    `;
}

// Render products to the grid
function renderProducts(productsToRender) {
    if (!productGrid) return;
    
    if (productsToRender.length === 0) {
        productGrid.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <p>No products found matching your filters.</p>
                <button onclick="clearFilters()" style="margin-top: 10px; padding: 8px 16px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-filter"></i> Clear Filters
                </button>
            </div>
        `;
        return;
    }

    const productsHTML = productsToRender.map(product => createProductCard(product)).join('');
    productGrid.innerHTML = productsHTML;
    
    // Update results count
    if (resultsCount) {
        resultsCount.textContent = `Showing ${productsToRender.length} results`;
    }
}

// Filter products based on current filters
function filterProducts() {
    let filteredProducts = [...products];

    // Apply gender filter
    if (currentFilters.gender.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
            currentFilters.gender.includes(product.gender)
        );
    }

    // Apply brand filter
    if (currentFilters.brand.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
            currentFilters.brand.includes(product.brand)
        );
    }

    // Apply sorting
    filteredProducts = sortProducts(filteredProducts, currentSort);

    renderProducts(filteredProducts);
}

// Sort products
function sortProducts(productsToSort, sortType) {
    const sortedProducts = [...productsToSort];
    
    switch (sortType) {
        case 'price-low':
            return sortedProducts.sort((a, b) => a.price - b.price);
        case 'price-high':
            return sortedProducts.sort((a, b) => b.price - a.price);
        case 'newest':
            // Assuming newer products have higher IDs or timestamps
            return sortedProducts.sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    return b.createdAt - a.createdAt;
                }
                return b.id - a.id;
            });
        case 'rating':
            return sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'relevance':
        default:
            return sortedProducts;
    }
}

// Update filters
function updateFilters(filterType, value, isChecked) {
    if (isChecked) {
        if (!currentFilters[filterType].includes(value)) {
            currentFilters[filterType].push(value);
        }
    } else {
        currentFilters[filterType] = currentFilters[filterType].filter(item => item !== value);
    }
    
    filterProducts();
}

// Clear all filters
function clearFilters() {
    currentFilters = {
        gender: [],
        brand: []
    };
    
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset sort
    if (sortSelect) {
        sortSelect.value = 'relevance';
    }
    currentSort = 'relevance';
    
    filterProducts();
}

// Initialize event listeners
function initializeEventListeners() {
    // Filter checkboxes
    document.querySelectorAll('input[data-filter]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const filterType = e.target.dataset.filter;
            const value = e.target.value;
            updateFilters(filterType, value, e.target.checked);
        });
    });

    // Sort select
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            filterProducts();
        });
    }

    // Brand search
    if (brandSearch) {
        brandSearch.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            if (searchTerm) {
                const filtered = products.filter(product => 
                    product.brand.toLowerCase().includes(searchTerm)
                );
                renderProducts(filtered);
            } else {
                filterProducts();
            }
        }, 300));
    }

    // Product search in header
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value;
            if (query.length >= 2) {
                try {
                    const results = await searchProducts(query);
                    if (productGrid) {
                        renderProducts(results);
                    }
                } catch (error) {
                    console.error('Search error:', error);
                }
            } else if (query.length === 0) {
                filterProducts();
            }
        }, 500));
    }
}

// Debounce function for search
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

// Product interaction functions
async function toggleFavorite(productId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showLoginRequiredModal();
        return;
    }
    
    try {
        const isInFavorites = await firebaseDataService.isProductInFavorites(user.uid, productId);
        
        if (isInFavorites) {
            await firebaseDataService.removeFromFavorites(user.uid, productId);
            showMessage('Removed from favorites', 'success');
        } else {
            await firebaseDataService.addToFavorites(user.uid, productId);
            showMessage('Added to favorites', 'success');
        }
        
        // Update UI
        const favoriteBtn = document.querySelector(`[onclick="toggleFavorite('${productId}')"]`);
        if (favoriteBtn) {
            favoriteBtn.innerHTML = isInFavorites ? 
                '<i class="far fa-heart"></i>' : 
                '<i class="fas fa-heart" style="color: #d50000;"></i>';
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showMessage('Error updating favorites', 'error');
    }
}

async function addToCart(productId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showLoginRequiredModal();
        return;
    }
    
    try {
        await firebaseDataService.addToCart(user.uid, productId);
        showMessage('Added to cart', 'success');
        
        // Update cart count
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        showMessage('Error adding to cart', 'error');
    }
}

async function quickViewProduct(productId) {
    try {
        const product = await firebaseDataService.getProductById(productId);
        if (product) {
            showQuickViewModal(product);
        }
    } catch (error) {
        console.error('Error in quick view:', error);
    }
}

// Quick view modal
function showQuickViewModal(product) {
    const modalHTML = `
        <div class="quick-view-modal" id="quickViewModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Quick View</h3>
                    <button class="modal-close" onclick="closeModal('quickViewModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="quick-view-grid">
                        <div class="quick-view-image">
                            <img src="${product.image}" alt="${product.name}">
                        </div>
                        <div class="quick-view-details">
                            <span class="product-brand">${product.brand}</span>
                            <h2 class="product-name">${product.name}</h2>
                            ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                            <div class="product-price">$${product.price}</div>
                            
                            ${product.sizes ? `
                                <div class="size-selector">
                                    <label>Size:</label>
                                    <div class="size-options">
                                        ${product.sizes.map(size => `
                                            <button class="size-option">${size}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="quick-view-actions">
                                <button class="add-to-cart-btn large" onclick="addToCart('${product.id}')">
                                    <i class="fas fa-shopping-cart"></i> Add to Cart
                                </button>
                                <button class="favorite-btn" onclick="toggleFavorite('${product.id}')">
                                    <i class="fas fa-heart"></i> Favorite
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('quickViewModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
    
    // Add CSS if not already added
    addQuickViewStyles();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function addQuickViewStyles() {
    const styles = `
        .quick-view-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        }
        
        .quick-view-modal .modal-content {
            background: white;
            width: 90%;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 12px;
            animation: slideUp 0.3s ease;
        }
        
        .quick-view-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            padding: 20px;
        }
        
        .quick-view-image img {
            width: 100%;
            border-radius: 8px;
        }
        
        .quick-view-details {
            padding: 20px;
        }
        
        .size-selector {
            margin: 20px 0;
        }
        
        .size-options {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        
        .size-option {
            padding: 8px 12px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .size-option:hover,
        .size-option.active {
            border-color: #d50000;
            background: #ffebee;
            color: #d50000;
        }
        
        .quick-view-actions {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
        
        .add-to-cart-btn.large {
            flex: 1;
            padding: 15px;
            font-size: 16px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 768px) {
            .quick-view-grid {
                grid-template-columns: 1fr;
            }
            
            .quick-view-modal .modal-content {
                width: 95%;
                max-height: 80vh;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    if (!document.querySelector('#quickViewStyles')) {
        styleSheet.id = 'quickViewStyles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// Update cart count
async function updateCartCount() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const cartItems = await firebaseDataService.getUserCart(user.uid);
        const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // Update all cart badges
        document.querySelectorAll('.cart-btn .icon-badge').forEach(badge => {
            badge.textContent = totalItems;
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Show message
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
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Add animation styles
const animationStyles = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
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

if (!document.querySelector('#animationStyles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'animationStyles';
    styleSheet.textContent = animationStyles;
    document.head.appendChild(styleSheet);
}

// Make functions globally available
window.clearFilters = clearFilters;
window.toggleFavorite = toggleFavorite;
window.addToCart = addToCart;
window.quickViewProduct = quickViewProduct;

// Add this function to make product cards clickable
function makeProductCardsClickable() {
    document.addEventListener('click', function(e) {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
            const productId = productCard.dataset.productId;
            if (productId) {
                window.location.href = `product.html?id=${productId}`;
            }
        }
    });
}

// Call this in your initialization
makeProductCardsClickable();
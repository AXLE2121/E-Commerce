// data.js - Complete Firestore integration
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
        }, 1500);
    }
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
}

// Create product card HTML
function createProductCard(product) {
    const user = firebase.auth().currentUser;
    const isLoggedIn = !!user;
    
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
                    <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
                    <button class="add-to-cart-btn" onclick="addToCart('${product.id}')" ${!isLoggedIn ? 'disabled style="opacity: 0.5; cursor: not-allowed;" title="Login to Add to Cart"' : ''}>
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
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
function addToCart(productId) {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        alert('Please login to add items to cart');
        window.location.href = 'login.html';
        return;
    }
    
    alert(`Added product ${productId} to cart!`);
    // Here you would typically call firebaseDataService.addToCart()
}

// Sample data for fallback
function getSampleProducts() {
    return [
        {
            id: "1",
            brand: "NIKE",
            name: "Air Jordan 1 Retro High",
            price: 170.00,
            description: "Classic basketball shoes with premium leather construction",
            gender: "Unisex",
            category: "Basketball",
            image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
            rating: 4.8,
            reviews: 125,
            featured: true
        },
        {
            id: "2",
            brand: "ADIDAS",
            name: "Ultraboost 22",
            price: 180.00,
            description: "Running shoes with responsive cushioning and energy return",
            gender: "Men",
            category: "Running",
            image: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?w-400&h=300&fit=crop",
            rating: 4.9,
            reviews: 210,
            featured: true
        },
        {
            id: "3",
            brand: "NIKE",
            name: "Air Force 1 '07",
            price: 100.00,
            description: "The classic basketball shoe with crisp leather and iconic style",
            gender: "Unisex",
            category: "Lifestyle",
            image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop",
            rating: 4.7,
            reviews: 89,
            featured: true
        },
        {
            id: "4",
            brand: "ADIDAS",
            name: "Superstar",
            price: 85.00,
            description: "Classic shell-toe design with iconic three stripes",
            gender: "Unisex",
            category: "Casual",
            image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=300&fit=crop",
            rating: 4.6,
            reviews: 150,
            featured: true
        }
    ];
}

// Make functions globally available
window.clearFilters = clearFilters;
window.addToCart = addToCart;
window.initializeProducts = initializeProducts;

// Export for testing
window.products = products;
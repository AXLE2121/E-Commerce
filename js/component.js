// DOM elements
const productGrid = document.getElementById('productGrid');
const resultsCount = document.getElementById('resultsCount');
const sortSelect = document.getElementById('sortSelect');
const brandSearch = document.getElementById('brandSearch');

// Create product card HTML
function createProductCard(product) {
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-info">
                <span class="product-brand">${product.brand}</span>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">$${product.price}</div>
            </div>
        </div>
    `;
}

// Render products to the grid
function renderProducts(productsToRender) {
    if (productsToRender.length === 0) {
        productGrid.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1;">
                <p>No products found matching your filters.</p>
                <button onclick="clearFilters()" style="margin-top: 10px; padding: 8px 16px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Clear Filters
                </button>
            </div>
        `;
        return;
    }

    const productsHTML = productsToRender.map(product => createProductCard(product)).join('');
    productGrid.innerHTML = productsHTML;
    
    // Update results count
    resultsCount.textContent = `Showing ${productsToRender.length} results`;
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
            return sortedProducts.sort((a, b) => b.id - a.id);
        case 'relevance':
        default:
            return sortedProducts;
    }
}

// Update filters when checkbox is changed
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
    sortSelect.value = 'relevance';
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
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterProducts();
    });

    // Brand search
    brandSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        // You can implement brand search functionality here
        console.log('Searching brands:', searchTerm);
    });

    // Product search in header
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', (e) => {
        // You can implement product search functionality here
        console.log('Searching products:', e.target.value);
    });
}
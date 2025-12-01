// data.js - Simple version for Firestore integration
console.log('data.js loaded - Firestore version');

let products = [];
let currentFilters = {
    gender: [],
    brand: []
};
let currentSort = 'relevance';

// Check if page has product grid
const hasProductGrid = document.getElementById('productGrid') || document.querySelector('.product-grid');

// Load products from Firestore
async function loadProducts() {
    console.log('loadProducts called');
    
    try {
        if (typeof firebaseDataService === 'undefined') {
            console.error('firebaseDataService is not defined!');
            console.log('Checking Firebase availability:', typeof firebase, typeof firebase.firestore);
            
            // Initialize Firebase if not already done
            if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
                console.log('Initializing Firebase in data.js');
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
            
            // Create a simple data service if firebaseDataService doesn't exist
            const db = firebase.firestore();
            const snapshot = await db.collection('products').limit(20).get();
            
            if (snapshot.empty) {
                console.log('No products found in Firestore');
                products = getSampleProducts();
            } else {
                products = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`Loaded ${products.length} products from Firestore directly`);
            }
        } else {
            // Use the existing firebaseDataService
            console.log('Using firebaseDataService');
            products = await firebaseDataService.getAllProducts();
            console.log(`Loaded ${products.length} products via firebaseDataService`);
        }
        
        if (products.length === 0) {
            console.log('No products found, using sample data');
            products = getSampleProducts();
        }
        
        console.log('Total products available:', products.length);
        
        // Initialize filters and render
        initializeFilters();
        filterProducts();
        
        return products;
        
    } catch (error) {
        console.error('Error loading products:', error);
        console.error('Error details:', error.message);
        
        // Fallback to sample data
        products = getSampleProducts();
        console.log('Using sample products after error:', products.length);
        
        if (hasProductGrid) {
            initializeFilters();
            filterProducts();
        }
        
        return products;
    }
}

// Initialize filters
function initializeFilters() {
    console.log('Initializing filters');
    
    // Get unique brands from products
    const brands = [...new Set(products.map(p => p.brand))];
    console.log('Available brands:', brands);
    
    // Update brand filter options
    const brandSection = document.querySelector('.filter-section');
    if (brandSection) {
        const brandOptions = brandSection.querySelectorAll('.filter-option');
        brandOptions.forEach(option => {
            const checkbox = option.querySelector('input[type="checkbox"]');
            const brandValue = checkbox.value;
            const brandCount = products.filter(p => p.brand === brandValue).length;
            
            // Update the label text with count
            const label = option.querySelector('label');
            if (label) {
                label.innerHTML = `
                    <input type="checkbox" data-filter="brand" value="${brandValue}">
                    ${brandValue} (${brandCount})
                `;
            }
        });
    }
    
    // Initialize event listeners
    if (typeof initializeEventListeners === 'function') {
        initializeEventListeners();
    }
}

// Sample data for fallback
function getSampleProducts() {
    return [
        {
            id: "1",
            brand: "NIKE",
            name: "Air Jordan 1 Retro High",
            price: 170,
            description: "Classic basketball shoes with premium leather construction",
            gender: "Unisex",
            category: "Basketball",
            image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
            sizes: ["7", "8", "9", "10", "11", "12"],
            colors: ["Black/Red", "White/Black", "Blue"],
            stock: 50,
            rating: 4.8,
            reviews: 125,
            featured: true
        },
        {
            id: "2",
            brand: "ADIDAS",
            name: "Ultraboost 22",
            price: 180,
            description: "Running shoes with responsive cushioning and energy return",
            gender: "Men",
            category: "Running",
            image: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=400&h=300&fit=crop",
            sizes: ["8", "9", "10", "11", "12", "13"],
            colors: ["Black", "White", "Solar Red"],
            stock: 40,
            rating: 4.9,
            reviews: 210,
            featured: true
        },
        {
            id: "3",
            brand: "NIKE",
            name: "Air Force 1 '07",
            price: 100,
            description: "The classic basketball shoe with crisp leather and iconic style",
            gender: "Unisex",
            category: "Lifestyle",
            image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop",
            sizes: ["6", "7", "8", "9", "10", "11"],
            colors: ["White", "Black", "Triple White"],
            stock: 75,
            rating: 4.7,
            reviews: 89,
            featured: true
        }
    ];
}

// Filter products function
function filterProducts() {
    console.log('filterProducts called');
    console.log('Current filters:', currentFilters);
    console.log('Products available:', products.length);
    
    if (!products || products.length === 0) {
        console.log('No products to filter');
        renderProducts([]);
        return;
    }
    
    let filteredProducts = [...products];
    
    // Apply brand filter
    if (currentFilters.brand.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
            currentFilters.brand.includes(product.brand)
        );
    }
    
    console.log('Products after filtering:', filteredProducts.length);
    
    // Apply sorting
    filteredProducts = sortProducts(filteredProducts, currentSort);
    
    // Render products
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
            return sortedProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        default:
            return sortedProducts;
    }
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
    if (document.getElementById('sortSelect')) {
        document.getElementById('sortSelect').value = 'relevance';
    }
    currentSort = 'relevance';
    
    filterProducts();
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

// Make functions globally available
window.clearFilters = clearFilters;
window.updateFilters = updateFilters;
window.loadProducts = loadProducts;

// Auto-load products when page loads if there's a product grid
if (hasProductGrid) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, loading products...');
        setTimeout(() => {
            loadProducts();
        }, 500); // Small delay to ensure Firebase is initialized
    });
}
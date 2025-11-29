// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Foot Locker App Initialized');
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Render initial products
    filterProducts();
    
    // Add some interactive features
    addInteractiveFeatures();
});

// Additional interactive features
function addInteractiveFeatures() {
    // Add click handlers to product cards
    document.addEventListener('click', function(e) {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
            const productId = productCard.dataset.productId;
            const product = products.find(p => p.id === parseInt(productId));
            if (product) {
                alert(`Selected: ${product.brand} - ${product.name}\nPrice: $${product.price}`);
                // You can replace this with a modal or product detail page
            }
        }
    });

    // Add hover effects to navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Make functions globally available for HTML onclick handlers
window.clearFilters = clearFilters;
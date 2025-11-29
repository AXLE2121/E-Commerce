// Favorites functionality
document.addEventListener('DOMContentLoaded', function() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const emptyFavorites = document.getElementById('emptyFavorites');
    const totalFavorites = document.getElementById('totalFavorites');
    const favoritesCount = document.getElementById('favoritesCount');

    // Sample favorites data (in real app, this would come from localStorage/API)
    let favorites = JSON.parse(localStorage.getItem('footLocker_favorites')) || [
        {
            id: 1,
            brand: "ADIDAS",
            name: "ADIZERO EVO SL MEN'S SHOES WHITE",
            price: 8500.00,
            image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=ADIDAS+EVO",
            quantity: 1
        }
    ];

    // Initialize favorites page
    function initializeFavorites() {
        updateFavoritesDisplay();
        updateFavoritesCount();
    }

    // Update favorites display
    function updateFavoritesDisplay() {
        if (favorites.length === 0) {
            favoritesGrid.style.display = 'none';
            emptyFavorites.style.display = 'block';
        } else {
            favoritesGrid.style.display = 'grid';
            emptyFavorites.style.display = 'none';
            renderFavorites();
        }
        
        totalFavorites.textContent = favorites.length;
        updateTotalValue();
    }

    // Render favorites items
    function renderFavorites() {
        favoritesGrid.innerHTML = favorites.map(item => `
            <div class="favorite-item" data-item-id="${item.id}">
                <div class="favorite-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="favorite-item-details">
                    <div class="favorite-item-header">
                        <div class="favorite-item-brand">${item.brand}</div>
                        <h3 class="favorite-item-name">${item.name}</h3>
                        <div class="favorite-item-price">₱${item.price.toLocaleString()}</div>
                    </div>
                    <div class="favorite-item-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        </div>
                        <div class="item-actions">
                            <button class="remove-btn" onclick="removeFromFavorites(${item.id})">
                                <i class="fas fa-trash"></i>
                                Remove
                            </button>
                            <button class="add-to-cart-btn" onclick="addToCartFromFavorites(${item.id})">
                                <i class="fas fa-shopping-cart"></i>
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update quantity
    function updateQuantity(itemId, change) {
        const item = favorites.find(fav => fav.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromFavorites(itemId);
            } else {
                saveFavorites();
                renderFavorites();
                updateTotalValue();
            }
        }
    }

    // Remove from favorites
    function removeFromFavorites(itemId) {
        favorites = favorites.filter(fav => fav.id !== itemId);
        saveFavorites();
        updateFavoritesDisplay();
        updateFavoritesCount();
    }

    // Add to cart from favorites
    function addToCartFromFavorites(itemId) {
        const item = favorites.find(fav => fav.id === itemId);
        if (item) {
            // Add to cart logic here
            alert(`Added ${item.name} to cart!`);
            // In real app: addToCart(item);
        }
    }

    // Clear all favorites
    function clearAllFavorites() {
        if (confirm('Are you sure you want to remove all items from your favorites?')) {
            favorites = [];
            saveFavorites();
            updateFavoritesDisplay();
            updateFavoritesCount();
        }
    }

    // Add all to cart
    function addAllToCart() {
        if (favorites.length === 0) return;
        
        // Add all items to cart logic here
        alert(`Added ${favorites.length} items to cart!`);
        // In real app: favorites.forEach(item => addToCart(item));
    }

    // Update total value
    function updateTotalValue() {
        const total = favorites.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.querySelector('.stat-item:nth-child(2) .stat-number').textContent = 
            `₱${total.toLocaleString()}`;
    }

    // Update favorites count in header
    function updateFavoritesCount() {
        const totalItems = favorites.reduce((sum, item) => sum + item.quantity, 0);
        if (favoritesCount) {
            favoritesCount.textContent = totalItems;
        }
    }

    // Save favorites to localStorage
    function saveFavorites() {
        localStorage.setItem('footLocker_favorites', JSON.stringify(favorites));
    }

    // Event listeners
    document.querySelector('.clear-all').addEventListener('click', clearAllFavorites);
    document.querySelector('.move-to-cart').addEventListener('click', addAllToCart);

    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.classList[1];
            alert(`Share wishlist on ${platform} would be implemented here!`);
        });
    });

    // Wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.wishlist-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Make functions global for onclick handlers
    window.updateQuantity = updateQuantity;
    window.removeFromFavorites = removeFromFavorites;
    window.addToCartFromFavorites = addToCartFromFavorites;

    // Initialize
    initializeFavorites();
});
// favorites.js - Updated for Firestore
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // User is logged in, initialize favorites from Firestore
            console.log('User logged in, loading favorites...');
            await initializeFavorites(user.uid);
        } else {
            // User is not logged in
            console.log('User not logged in, favorites functionality disabled');
            disableFavoritesPage();
        }
    });
});

async function initializeFavorites(userId) {
    try {
        // Get favorites from Firestore
        const favorites = await firebaseDataService.getUserFavorites(userId);
        
        // Update UI
        updateFavoritesDisplay(favorites);
        updateFavoritesCount(favorites.length);
        
        // Initialize event listeners
        initializeEventListeners(userId, favorites);
    } catch (error) {
        console.error('Error initializing favorites:', error);
        showErrorMessage('Failed to load favorites. Please try again.');
    }
}

function updateFavoritesDisplay(favorites) {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const emptyFavorites = document.getElementById('emptyFavorites');
    const totalFavorites = document.getElementById('totalFavorites');
    
    if (!favoritesGrid || !emptyFavorites) return;
    
    if (favorites.length === 0) {
        favoritesGrid.style.display = 'none';
        emptyFavorites.style.display = 'block';
    } else {
        favoritesGrid.style.display = 'grid';
        emptyFavorites.style.display = 'none';
        renderFavorites(favorites);
    }
    
    if (totalFavorites) {
        totalFavorites.textContent = favorites.length;
    }
    
    // Update total value
    updateTotalValue(favorites);
}

function renderFavorites(favorites) {
    const favoritesGrid = document.getElementById('favoritesGrid');
    if (!favoritesGrid) return;
    
    favoritesGrid.innerHTML = favorites.map(item => `
        <div class="favorite-item" data-item-id="${item.id}">
            <div class="favorite-item-image">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
            </div>
            <div class="favorite-item-details">
                <div class="favorite-item-header">
                    <div class="favorite-item-brand">${item.brand}</div>
                    <h3 class="favorite-item-name">${item.name}</h3>
                    <div class="favorite-item-price">$${item.price}</div>
                </div>
                ${item.description ? `<p class="favorite-item-desc">${item.description.substring(0, 80)}...</p>` : ''}
                <div class="favorite-item-actions">
                    <div class="item-actions">
                        <button class="remove-btn" onclick="removeFromFavorites('${item.id}')">
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>
                        <button class="add-to-cart-btn" onclick="addToCartFromFavorites('${item.id}')">
                            <i class="fas fa-shopping-cart"></i>
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateTotalValue(favorites) {
    const total = favorites.reduce((sum, item) => sum + item.price, 0);
    const totalValueElement = document.querySelector('.stat-item:nth-child(2) .stat-number');
    if (totalValueElement) {
        totalValueElement.textContent = `$${total.toLocaleString()}`;
    }
}

async function removeFromFavorites(productId) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        await firebaseDataService.removeFromFavorites(user.uid, productId);
        
        // Remove from UI
        const favoriteItem = document.querySelector(`[data-item-id="${productId}"]`);
        if (favoriteItem) {
            favoriteItem.remove();
        }
        
        // Update counts
        const currentFavorites = await firebaseDataService.getUserFavorites(user.uid);
        updateFavoritesCount(currentFavorites.length);
        updateTotalValue(currentFavorites);
        
        showMessage('Removed from favorites', 'success');
    } catch (error) {
        console.error('Error removing from favorites:', error);
        showMessage('Error removing from favorites', 'error');
    }
}

async function addToCartFromFavorites(productId) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        await firebaseDataService.addToCart(user.uid, productId);
        showMessage('Added to cart', 'success');
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        showMessage('Error adding to cart', 'error');
    }
}

async function clearAllFavorites() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    if (!confirm('Are you sure you want to remove all items from your favorites?')) {
        return;
    }
    
    try {
        // Get all favorites
        const favorites = await firebaseDataService.getUserFavorites(user.uid);
        
        // Remove each one
        for (const favorite of favorites) {
            await firebaseDataService.removeFromFavorites(user.uid, favorite.id);
        }
        
        // Update UI
        updateFavoritesDisplay([]);
        updateFavoritesCount(0);
        
        showMessage('All favorites cleared', 'success');
    } catch (error) {
        console.error('Error clearing favorites:', error);
        showMessage('Error clearing favorites', 'error');
    }
}

async function addAllToCart() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const favorites = await firebaseDataService.getUserFavorites(user.uid);
        
        // Add each to cart
        for (const favorite of favorites) {
            await firebaseDataService.addToCart(user.uid, favorite.id);
        }
        
        showMessage(`Added ${favorites.length} items to cart`, 'success');
        updateCartCount();
    } catch (error) {
        console.error('Error adding all to cart:', error);
        showMessage('Error adding to cart', 'error');
    }
}

function updateFavoritesCount(count) {
    const favoritesCount = document.getElementById('favoritesCount');
    if (favoritesCount) {
        favoritesCount.textContent = count;
    }
}

function initializeEventListeners(userId, favorites) {
    document.querySelector('.clear-all')?.addEventListener('click', clearAllFavorites);
    document.querySelector('.move-to-cart')?.addEventListener('click', addAllToCart);
}

function disableFavoritesPage() {
    // Show login required message
    const favoritesContent = document.querySelector('.favorites-content');
    if (favoritesContent) {
        favoritesContent.innerHTML = `
            <div class="login-required-message">
                <i class="fas fa-lock"></i>
                <h3>Login Required</h3>
                <p>Please login to view and manage your favorites.</p>
                <div class="message-actions">
                    <a href="login.html" class="action-btn">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                    <a href="register.html" class="action-btn secondary">
                        <i class="fas fa-user-plus"></i> Register
                    </a>
                </div>
            </div>
        `;
    }
}

function showErrorMessage(message) {
    const favoritesContent = document.querySelector('.favorites-content');
    if (favoritesContent) {
        favoritesContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Favorites</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="action-btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Make functions globally available
window.removeFromFavorites = removeFromFavorites;
window.addToCartFromFavorites = addToCartFromFavorites;
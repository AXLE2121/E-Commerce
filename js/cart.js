// cart.js - Fixed version with checkout navigation
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User logged in, loading cart...');
            loadUserCart();
            updateCartCount();
        } else {
            console.log('User not logged in');
            // auth-check.js will handle the modal
            disableCartPage();
        }
    });
    
    // Setup checkout button event listener
    setTimeout(() => {
        const checkoutBtn = document.getElementById('proceedCheckout');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', proceedToCheckout);
        }
    }, 1000);
});

let cartItems = [];
let selectedItems = new Set();

async function loadUserCart() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        // Try to get cart from Firestore first
        const db = firebase.firestore();
        const cartSnapshot = await db.collection('cart')
            .where('userId', '==', user.uid)
            .get();
        
        if (!cartSnapshot.empty) {
            cartItems = [];
            for (const doc of cartSnapshot.docs) {
                const cartItem = doc.data();
                const productDoc = await db.collection('products').doc(cartItem.productId).get();
                
                if (productDoc.exists) {
                    cartItems.push({
                        cartId: doc.id,
                        productId: cartItem.productId,
                        product: {
                            id: productDoc.id,
                            ...productDoc.data()
                        },
                        quantity: cartItem.quantity || 1,
                        size: cartItem.size || 'Not selected',
                        color: cartItem.color || 'Default',
                        price: productDoc.data().price || 0
                    });
                }
            }
        } else {
            // Fallback to localStorage
            const localCart = JSON.parse(localStorage.getItem('footLocker_cart')) || [];
            cartItems = localCart;
        }
        
        renderCartItems();
        updateSelectedInfo();
        
    } catch (error) {
        console.error('Error loading cart:', error);
        // Fallback to localStorage
        const localCart = JSON.parse(localStorage.getItem('footLocker_cart')) || [];
        cartItems = localCart;
        renderCartItems();
        updateSelectedInfo();
    }
}

function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '';
        emptyCart.style.display = 'block';
        return;
    }
    
    emptyCart.style.display = 'none';
    
    cartItemsContainer.innerHTML = cartItems.map((item, index) => {
        const isSelected = selectedItems.has(index);
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        
        return `
            <div class="cart-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="toggleItemSelection(${index}, this.checked)">
                
                <div class="item-content">
                    <img src="${item.product?.image || 'https://via.placeholder.com/80x80?text=No+Image'}" 
                         alt="${item.product?.name || 'Product'}" 
                         class="item-image">
                    
                    <div class="item-details">
                        <div style="font-weight: bold; color: #d50000; font-size: 14px;">
                            ${item.product?.brand || ''}
                        </div>
                        <h3 style="margin: 5px 0; font-size: 16px;">${item.product?.name || 'Product Name'}</h3>
                        
                        <div style="color: #666; font-size: 14px;">
                            <div>Size: ${item.size || 'Not selected'}</div>
                            <div>Color: ${item.color || 'Default'}</div>
                            <div style="margin-top: 5px;">
                                <strong>Price:</strong> ₱${(item.price || 0).toFixed(2)} each
                            </div>
                        </div>
                        
                        <div class="quantity-controls" style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                            <button class="quantity-btn" onclick="updateQuantity(${index}, ${(item.quantity || 1) - 1})" ${(item.quantity || 1) <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity-display" style="font-weight: bold;">${item.quantity || 1}</span>
                            <button class="quantity-btn" onclick="updateQuantity(${index}, ${(item.quantity || 1) + 1})">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="item-actions">
                    <div style="font-weight: bold; font-size: 18px; color: #d50000;">
                        ₱${itemTotal.toFixed(2)}
                    </div>
                    <button class="action-btn remove-btn" onclick="removeItem(${index})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleItemSelection(index, isSelected) {
    if (isSelected) {
        selectedItems.add(index);
    } else {
        selectedItems.delete(index);
    }
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllItems');
    selectAllCheckbox.checked = selectedItems.size === cartItems.length && cartItems.length > 0;
    
    updateSelectedInfo();
    updateCheckoutButton();
}

function toggleSelectAll(isSelected) {
    if (isSelected) {
        // Select all items
        selectedItems = new Set(cartItems.map((_, index) => index));
    } else {
        // Deselect all items
        selectedItems.clear();
    }
    
    // Update individual checkboxes
    document.querySelectorAll('.item-checkbox').forEach((checkbox, index) => {
        checkbox.checked = isSelected;
    });
    
    updateSelectedInfo();
    updateCheckoutButton();
}

function deselectAll() {
    selectedItems.clear();
    document.getElementById('selectAllItems').checked = false;
    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    updateSelectedInfo();
    updateCheckoutButton();
}

function updateSelectedInfo() {
    const selectedInfo = document.getElementById('selectedItemsInfo');
    const selectedCount = document.getElementById('selectedCount');
    const selectedSubtotal = document.getElementById('selectedSubtotal');
    const checkoutBtn = document.getElementById('proceedCheckout');
    
    if (selectedItems.size > 0) {
        selectedInfo.classList.add('active');
        selectedCount.textContent = `${selectedItems.size} ${selectedItems.size === 1 ? 'item' : 'items'}`;
        
        // Calculate subtotal for selected items
        let subtotal = 0;
        selectedItems.forEach(index => {
            const item = cartItems[index];
            subtotal += (item.price || 0) * (item.quantity || 1);
        });
        
        selectedSubtotal.textContent = `₱${subtotal.toFixed(2)}`;
        
        // Enable checkout button
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('checkout-disabled');
        
    } else {
        selectedInfo.classList.remove('active');
        selectedSubtotal.textContent = '₱0.00';
        
        // Disable checkout button
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('checkout-disabled');
    }
    
    // Update estimated total
    updateTotals();
}

function updateTotals() {
    const shippingFee = document.getElementById('shippingFee');
    const estimatedTotal = document.getElementById('estimatedTotal');
    const selectedSubtotal = document.getElementById('selectedSubtotal');
    
    const subtotalText = selectedSubtotal.textContent.replace('₱', '').replace(',', '');
    const subtotal = parseFloat(subtotalText) || 0;
    const shipping = selectedItems.size > 0 ? 150.00 : 0;
    
    shippingFee.textContent = `₱${shipping.toFixed(2)}`;
    estimatedTotal.textContent = `₱${(subtotal + shipping).toFixed(2)}`;
}

function updateCheckoutButton() {
    const checkoutBtn = document.getElementById('proceedCheckout');
    const selectedSubtotal = document.getElementById('selectedSubtotal');
    
    if (selectedItems.size > 0) {
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('checkout-disabled');
        
        const subtotalText = selectedSubtotal.textContent.replace('₱', '').replace(',', '');
        const subtotal = parseFloat(subtotalText) || 0;
        
        if (subtotal > 0) {
            checkoutBtn.innerHTML = `<i class="fas fa-lock"></i> PROCEED TO CHECKOUT (₱${(subtotal + 150).toFixed(2)})`;
        }
    } else {
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('checkout-disabled');
        checkoutBtn.innerHTML = `<i class="fas fa-lock"></i> PROCEED TO CHECKOUT`;
    }
}

async function updateQuantity(index, newQuantity) {
    if (newQuantity < 1) return;
    
    cartItems[index].quantity = newQuantity;
    
    // Update in Firestore if user is logged in
    const user = firebase.auth().currentUser;
    if (user) {
        try {
            const db = firebase.firestore();
            const cartItem = cartItems[index];
            
            if (cartItem.cartId) {
                await db.collection('cart').doc(cartItem.cartId).update({
                    quantity: newQuantity,
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error updating quantity in Firestore:', error);
        }
    }
    
    // Update localStorage
    localStorage.setItem('footLocker_cart', JSON.stringify(cartItems));
    
    renderCartItems();
    updateSelectedInfo();
    updateCartCount();
}

async function removeItem(index) {
    const item = cartItems[index];
    
    // Remove from Firestore if user is logged in
    const user = firebase.auth().currentUser;
    if (user && item.cartId) {
        try {
            const db = firebase.firestore();
            await db.collection('cart').doc(item.cartId).delete();
        } catch (error) {
            console.error('Error removing item from Firestore:', error);
        }
    }
    
    // Remove from local array
    cartItems.splice(index, 1);
    
    // Remove from selected items
    selectedItems.delete(index);
    
    // Reindex selected items
    const newSelectedItems = new Set();
    selectedItems.forEach(oldIndex => {
        if (oldIndex > index) {
            newSelectedItems.add(oldIndex - 1);
        } else if (oldIndex < index) {
            newSelectedItems.add(oldIndex);
        }
    });
    selectedItems = newSelectedItems;
    
    // Update localStorage
    localStorage.setItem('footLocker_cart', JSON.stringify(cartItems));
    
    renderCartItems();
    updateSelectedInfo();
    updateCartCount();
}

function proceedToCheckout() {
    console.log('Proceed to checkout clicked');
    
    if (selectedItems.size === 0) {
        alert('Please select at least one item to checkout');
        return;
    }
    
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please login to proceed to checkout');
        window.location.href = 'login.html?redirect=cart.html';
        return;
    }
    
    // Prepare checkout data
    const selectedProducts = [];
    let totalAmount = 0;
    
    selectedItems.forEach(index => {
        const item = cartItems[index];
        selectedProducts.push({
            id: item.productId,
            name: item.product?.name || 'Product',
            brand: item.product?.brand || 'Brand',
            price: item.price || 0,
            image: item.product?.image || '',
            size: item.size || 'Not selected',
            quantity: item.quantity || 1,
            color: item.color || 'Default'
        });
        
        totalAmount += (item.price || 0) * (item.quantity || 1);
    });
    
    // Create checkout data
    const checkoutData = {
        products: selectedProducts,
        user: {
            uid: user.uid,
            email: user.email
        },
        totals: {
            subtotal: totalAmount,
            shipping: 150.00,
            total: totalAmount + 150.00
        },
        timestamp: new Date().toISOString(),
        type: 'cart' // Indicates this is from cart (multiple products)
    };
    
    console.log('Checkout data prepared:', checkoutData);
    
    // Save to sessionStorage and localStorage
    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    localStorage.setItem('lastCheckout', JSON.stringify(checkoutData));
    
    // Show confirmation
    const confirmMessage = `Proceed to checkout with ${selectedItems.size} item(s)?\n\nTotal: ₱${(totalAmount + 150).toFixed(2)}`;
    
    if (confirm(confirmMessage)) {
        // Navigate to checkout page
        window.location.href = 'checkout.html';
    }
}

function updateCartCount() {
    const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    console.log('Updating cart count:', totalItems);
    
    // Update header badge
    const badge = document.getElementById('headerCartCount');
    if (badge) {
        badge.textContent = totalItems > 99 ? '99+' : totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // Update all cart badges on the page
    document.querySelectorAll('.cart-btn .icon-badge').forEach(badge => {
        badge.textContent = totalItems > 99 ? '99+' : totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    });
    
    // Also update favorites count if needed
    updateFavoritesCount();
}

async function updateFavoritesCount() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const db = firebase.firestore();
        const favoritesSnapshot = await db.collection('favorites')
            .where('userId', '==', user.uid)
            .get();
        
        const favoritesCount = favoritesSnapshot.size;
        
        // Update all favorites badges on the page
        document.querySelectorAll('.favorites-btn .icon-badge').forEach(badge => {
            badge.textContent = favoritesCount > 99 ? '99+' : favoritesCount;
            badge.style.display = favoritesCount > 0 ? 'flex' : 'none';
        });
        
    } catch (error) {
        console.error('Error updating favorites count:', error);
    }
}

function disableCartPage() {
    // Disable all interactive elements
    const interactiveElements = document.querySelectorAll('button, input, a');
    interactiveElements.forEach(el => {
        if (!el.classList.contains('auth-btn')) { // Keep login/register buttons
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.5';
        }
    });
    
    // Show message
    const cartContainer = document.querySelector('.cart-container');
    if (cartContainer) {
        cartContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px;">
                <i class="fas fa-lock fa-3x" style="color: #d50000; margin-bottom: 20px;"></i>
                <h3 style="color: #d50000;">Login Required</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    Please login to view your shopping cart.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <a href="login.html" class="action-btn" style="background: #d50000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                    <a href="register.html" class="action-btn" style="background: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-user-plus"></i> Register
                    </a>
                </div>
            </div>
        `;
    }
}

// Make functions available globally
window.toggleItemSelection = toggleItemSelection;
window.toggleSelectAll = toggleSelectAll;
window.deselectAll = deselectAll;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.proceedToCheckout = proceedToCheckout;
// my-orders.js - My Orders Page
document.addEventListener('DOMContentLoaded', function() {
    console.log('My Orders page loaded');
    
    // Check authentication and load orders
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User logged in, loading orders...');
            loadUserOrders(user);
            updateOrdersCount();
        } else {
            console.log('User not logged in');
            showLoginRequired();
        }
    });
});

async function loadUserOrders(user) {
    const ordersList = document.getElementById('ordersList');
    const noOrders = document.getElementById('noOrders');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    try {
        const db = firebase.firestore();
        
        // Get orders from Firestore
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (ordersSnapshot.empty) {
            loadingSpinner.style.display = 'none';
            noOrders.style.display = 'block';
            return;
        }
        
        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Found ${orders.length} orders`);
        
        // Display orders
        displayOrders(orders);
        
        // Hide loading spinner
        loadingSpinner.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading orders:', error);
        loadingSpinner.style.display = 'none';
        ordersList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Orders</h3>
                <p>There was an error loading your orders. Please try again.</p>
                <button onclick="location.reload()" class="retry-btn">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    
    ordersList.innerHTML = orders.map(order => {
        // Format date
        let orderDate = 'N/A';
        try {
            if (order.createdAt) {
                const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                orderDate = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            console.log('Error formatting date:', e);
        }
        
        // Calculate total
        const total = order.totals?.total || 0;
        
        // Get status class
        const statusClass = getStatusClass(order.status || 'pending');
        
        // Generate products HTML
        const productsHTML = (order.products || []).map(product => `
            <div class="product-item">
                <div class="product-image">
                    <img src="${product.image || 'https://via.placeholder.com/70x70?text=Product'}" 
                         alt="${product.name}">
                </div>
                <div class="product-details">
                    <div class="product-name">${product.name}</div>
                    <div class="product-info">
                        <span>${product.brand || ''}</span>
                        <span>Size: ${product.size || 'N/A'}</span>
                        <span class="product-quantity">Qty: ${product.quantity || 1}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order.orderId || order.id.substring(0, 8)}</div>
                        <div class="order-date">${orderDate}</div>
                    </div>
                    <div class="order-status ${statusClass}">
                        ${(order.status || 'pending').toUpperCase()}
                    </div>
                </div>
                
                <div class="order-products">
                    ${productsHTML || '<p>No products found</p>'}
                </div>
                
                <div class="order-total">
                    Total: ₱${total.toFixed(2)}
                </div>
                
                <div class="order-actions">
                    <button class="action-btn view-btn" onclick="viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="action-btn track-btn" onclick="trackOrder('${order.id}')">
                        <i class="fas fa-truck"></i> Track Order
                    </button>
                    <button class="action-btn reorder-btn" onclick="reorderItems('${order.id}')">
                        <i class="fas fa-redo"></i> Reorder
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'shipped': 'status-shipped',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled'
    };
    return statusMap[status.toLowerCase()] || 'status-pending';
}

function viewOrderDetails(orderId) {
    // Navigate to order details page or show modal
    window.location.href = `order-details.html?orderId=${orderId}`;
}

function trackOrder(orderId) {
    alert(`Order tracking for ${orderId} would be implemented here.`);
}

async function reorderItems(orderId) {
    try {
        const db = firebase.firestore();
        const orderDoc = await db.collection('orders').doc(orderId).get();
        
        if (orderDoc.exists) {
            const order = orderDoc.data();
            const user = firebase.auth().currentUser;
            
            if (!user) {
                alert('Please login to reorder items.');
                return;
            }
            
            // Add all products from order to cart
            for (const product of order.products || []) {
                await firebaseDataService.addToCart(
                    user.uid,
                    product.id,
                    product.quantity || 1,
                    product.size
                );
            }
            
            alert('Items added to cart successfully!');
            
            // Update cart count
            updateCartCount();
            
            // Redirect to cart
            setTimeout(() => {
                window.location.href = 'cart.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Error reordering items:', error);
        alert('Error adding items to cart. Please try again.');
    }
}

function showLoginRequired() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const loginRequired = document.getElementById('loginRequired');
    
    loadingSpinner.style.display = 'none';
    loginRequired.style.display = 'block';
}

async function updateOrdersCount() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const db = firebase.firestore();
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .get();
        
        const ordersCount = ordersSnapshot.size;
        
        console.log('Orders count:', ordersCount);
        
        // Update all orders badges
        document.querySelectorAll('.orders-btn .icon-badge').forEach(badge => {
            badge.textContent = ordersCount > 99 ? '99+' : ordersCount;
            badge.style.display = ordersCount > 0 ? 'flex' : 'none';
        });
        
    } catch (error) {
        console.error('Error updating orders count:', error);
    }
}

// Update cart count for header
async function updateCartCount() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const cartItems = await firebaseDataService.getUserCart(user.uid);
        const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // Update all cart badges
        document.querySelectorAll('.cart-btn .icon-badge').forEach(badge => {
            badge.textContent = totalItems > 99 ? '99+' : totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Make functions globally available
window.viewOrderDetails = viewOrderDetails;
window.trackOrder = trackOrder;
window.reorderItems = reorderItems;
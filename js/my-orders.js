// my-orders.js - Updated with enhanced view details
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
        
        let ordersSnapshot;
        
        try {
            // Try with composite index first
            ordersSnapshot = await db.collection('orders')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .get();
        } catch (indexError) {
            console.log('Composite index error, using simple query...');
            
            // Fallback: Get all orders and sort locally
            ordersSnapshot = await db.collection('orders')
                .where('userId', '==', user.uid)
                .get();
        }
        
        if (ordersSnapshot.empty) {
            loadingSpinner.style.display = 'none';
            noOrders.style.display = 'block';
            return;
        }
        
        const orders = [];
        ordersSnapshot.forEach(doc => {
            const orderData = doc.data();
            orders.push({
                id: doc.id,
                ...orderData
            });
        });
        
        // Sort by date if we didn't get ordered results
        if (!ordersSnapshot.query.orderBy) {
            orders.sort((a, b) => {
                const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
                const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
                return dateB - dateA; // Newest first
            });
        }
        
        console.log(`Found ${orders.length} orders`, orders);
        
        // Display orders
        displayOrders(orders);
        
        // Hide loading spinner
        loadingSpinner.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading orders:', error);
        loadingSpinner.style.display = 'none';
        
        // Try alternative approach
        try {
            // Get orders from user's subcollection
            const db = firebase.firestore();
            const userOrdersSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('orders')
                .get();
            
            if (!userOrdersSnapshot.empty) {
                const orders = [];
                userOrdersSnapshot.forEach(doc => {
                    orders.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Sort by date
                orders.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                });
                
                console.log(`Found ${orders.length} orders in user subcollection`);
                displayOrders(orders);
            } else {
                noOrders.style.display = 'block';
            }
        } catch (secondError) {
            console.error('Error with alternative approach:', secondError);
            ordersList.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-circle fa-3x" style="color: #f44336; margin-bottom: 20px;"></i>
                    <h3 style="color: #f44336; margin-bottom: 10px;">Error Loading Orders</h3>
                    <p style="color: #666; margin-bottom: 20px;">There was an error loading your orders. Please try again.</p>
                    <div style="font-size: 12px; color: #999; margin-bottom: 20px;">
                        Error: ${error.message}
                    </div>
                    <button onclick="location.reload()" class="retry-btn" style="padding: 10px 20px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders" style="text-align: center; padding: 40px;">
                <i class="fas fa-shopping-bag fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: #666;">No Orders Found</h3>
                <p style="color: #999;">You haven't placed any orders yet.</p>
            </div>
        `;
        return;
    }
    
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
        const total = order.totals?.total || 
                     (order.totals ? (order.totals.subtotal + order.totals.shipping + (order.totals.serviceFee || 0)) : 0);
        
        // Get status class
        const status = order.status || 'pending';
        const statusClass = getStatusClass(status);
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        
        // Generate products HTML (show max 2 products)
        const products = order.products || [];
        let productsHTML = '';
        
        if (products.length > 0) {
            const displayProducts = products.slice(0, 2);
            productsHTML = displayProducts.map(product => `
                <div class="product-item">
                    <div class="product-image">
                        <img src="${product.image || product.productImage || 'https://via.placeholder.com/70x70?text=Product'}" 
                             alt="${product.name || 'Product'}">
                    </div>
                    <div class="product-details">
                        <div class="product-name">${product.name || product.productName || 'Product'}</div>
                        <div class="product-info">
                            <span>${product.brand || ''}</span>
                            <span>Size: ${product.size || 'N/A'}</span>
                            <span class="product-quantity">Qty: ${product.quantity || 1}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            if (products.length > 2) {
                productsHTML += `<div style="text-align: center; padding: 10px; color: #666; font-size: 14px;">+ ${products.length - 2} more items</div>`;
            }
        } else {
            productsHTML = '<p style="color: #666; text-align: center;">No products information available</p>';
        }
        
        const orderNumber = order.orderId || `ORDER-${order.id.substring(0, 8).toUpperCase()}`;
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div>
                        <div class="order-id">${orderNumber}</div>
                        <div class="order-date">${orderDate}</div>
                    </div>
                    <div class="order-status ${statusClass}">
                        ${statusText}
                    </div>
                </div>
                
                <div class="order-products">
                    ${productsHTML}
                </div>
                
                <div class="order-total">
                    Total: ₱${total.toFixed(2)}
                </div>
                
                <button class="view-details-btn" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i> View Order Details
                </button>
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
        'cancelled': 'status-cancelled',
        'pending_payment': 'status-pending',
        'completed': 'status-delivered'
    };
    return statusMap[status.toLowerCase()] || 'status-pending';
}

function viewOrderDetails(orderId) {
    // Create a detailed modal to show order details
    const modalHTML = `
        <div class="order-details-modal" id="orderDetailsModal">
            <div class="order-details-content">
                <div class="order-details-header">
                    <h3><i class="fas fa-file-invoice"></i> Order Details</h3>
                    <button class="order-details-close" onclick="closeOrderDetails()">&times;</button>
                </div>
                <div class="order-details-body">
                    <div id="orderDetailsContent">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading order details...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('orderDetailsModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Prevent scrolling of background
    document.body.style.overflow = 'hidden';
    
    // Load order details
    loadOrderDetails(orderId);
}

async function loadOrderDetails(orderId) {
    try {
        const db = firebase.firestore();
        const content = document.getElementById('orderDetailsContent');
        
        // Try main orders collection first
        let orderDoc = await db.collection('orders').doc(orderId).get();
        
        if (!orderDoc.exists) {
            // Try user's orders subcollection
            const user = firebase.auth().currentUser;
            orderDoc = await db.collection('users').doc(user.uid).collection('orders').doc(orderId).get();
        }
        
        if (orderDoc.exists) {
            const order = orderDoc.data();
            
            // Format dates
            let orderDate = 'N/A';
            let updatedDate = 'N/A';
            
            try {
                if (order.createdAt) {
                    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                    orderDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                
                if (order.updatedAt) {
                    const date = order.updatedAt.toDate ? order.updatedAt.toDate() : new Date(order.updatedAt);
                    updatedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } catch (e) {
                console.log('Error formatting dates:', e);
            }
            
            // Get status
            const status = order.status || 'pending';
            const statusClass = getStatusClass(status);
            const statusText = status.charAt(0).toUpperCase() + status.slice(1);
            
            // Calculate totals
            const subtotal = order.totals?.subtotal || 0;
            const shipping = order.totals?.shipping || 0;
            const serviceFee = order.totals?.serviceFee || 0;
            const total = order.totals?.total || (subtotal + shipping + serviceFee);
            
            // Generate products HTML
            const products = order.products || [];
            const productsHTML = products.map(product => {
                const productName = product.name || product.productName || 'Product';
                const productBrand = product.brand || '';
                const productSize = product.size || 'N/A';
                const productQuantity = product.quantity || 1;
                const productPrice = product.price || 0;
                const productTotal = productPrice * productQuantity;
                
                return `
                    <div class="product-detail-item">
                        <div class="product-detail-image">
                            <img src="${product.image || product.productImage || 'https://via.placeholder.com/80x80?text=Product'}" 
                                 alt="${productName}">
                        </div>
                        <div class="product-detail-info">
                            <div class="product-detail-name">${productName}</div>
                            <div class="product-detail-meta">
                                <span>Brand: ${productBrand}</span>
                                <span>Size: ${productSize}</span>
                                <span>Quantity: ${productQuantity}</span>
                            </div>
                            <div class="product-detail-price">
                                ₱${productPrice.toFixed(2)} each • Total: ₱${productTotal.toFixed(2)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Customer info
            const customer = order.customer || {};
            const shippingAddress = customer.shippingAddress || {};
            
            // Payment info
            const payment = order.payment || {};
            
            content.innerHTML = `
                <div class="order-info-section">
                    <div class="info-card">
                        <h4><i class="fas fa-info-circle"></i> Order Information</h4>
                        <div class="info-row">
                            <span class="info-label">Order ID:</span>
                            <span class="info-value">${order.orderId || orderId}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Order Date:</span>
                            <span class="info-value">${orderDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Last Updated:</span>
                            <span class="info-value">${updatedDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value"><span class="order-status ${statusClass}">${statusText}</span></span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h4><i class="fas fa-user"></i> Customer Information</h4>
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${customer.firstName || ''} ${customer.lastName || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${customer.email || order.userEmail || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone:</span>
                            <span class="info-value">${customer.phone || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h4><i class="fas fa-truck"></i> Shipping Address</h4>
                        <div class="info-row">
                            <span class="info-label">Address:</span>
                            <span class="info-value">${shippingAddress.street || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">City:</span>
                            <span class="info-value">${shippingAddress.city || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">ZIP Code:</span>
                            <span class="info-value">${shippingAddress.zipCode || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h4><i class="fas fa-credit-card"></i> Payment Information</h4>
                        <div class="info-row">
                            <span class="info-label">Method:</span>
                            <span class="info-value">${(payment.method || 'N/A').toUpperCase()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value">${payment.status || 'N/A'}</span>
                        </div>
                        ${payment.gcashPhone ? `
                        <div class="info-row">
                            <span class="info-label">GCash Phone:</span>
                            <span class="info-value">${payment.gcashPhone}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="products-section">
                    <h4><i class="fas fa-box"></i> Order Items (${products.length})</h4>
                    ${productsHTML || '<p style="color: #666; text-align: center;">No products found</p>'}
                </div>
                
                <div class="order-totals-section">
                    <h4><i class="fas fa-calculator"></i> Order Summary</h4>
                    <div class="total-row">
                        <span class="total-label">Subtotal:</span>
                        <span class="total-amount">₱${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Shipping Fee:</span>
                        <span class="total-amount">₱${shipping.toFixed(2)}</span>
                    </div>
                    ${serviceFee > 0 ? `
                    <div class="total-row">
                        <span class="total-label">Service Fee:</span>
                        <span class="total-amount">₱${serviceFee.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <span class="total-label">Total Amount:</span>
                        <span class="total-amount">₱${total.toFixed(2)}</span>
                    </div>
                </div>
                
                ${order.notes ? `
                <div class="order-notes">
                    <h4><i class="fas fa-sticky-note"></i> Order Notes</h4>
                    <p>${order.notes}</p>
                </div>
                ` : ''}
            `;
        } else {
            content.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-circle fa-3x" style="color: #f44336; margin-bottom: 20px;"></i>
                    <h3 style="color: #f44336; margin-bottom: 10px;">Order Not Found</h3>
                    <p style="color: #666; margin-bottom: 20px;">The order you're looking for could not be found.</p>
                    <button onclick="closeOrderDetails()" style="padding: 10px 20px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        const content = document.getElementById('orderDetailsContent');
        content.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color: #f44336; margin-bottom: 20px;"></i>
                <h3 style="color: #f44336; margin-bottom: 10px;">Error Loading Details</h3>
                <p style="color: #666; margin-bottom: 20px;">There was an error loading order details. Please try again.</p>
                <div style="font-size: 12px; color: #999; margin-bottom: 20px;">
                    ${error.message}
                </div>
                <button onclick="closeOrderDetails()" style="padding: 10px 20px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
    }
}

function closeOrderDetails() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
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
        let ordersCount = 0;
        
        // Try main orders collection
        try {
            const ordersSnapshot = await db.collection('orders')
                .where('userId', '==', user.uid)
                .get();
            ordersCount = ordersSnapshot.size;
        } catch (error) {
            console.log('Error counting orders in main collection:', error);
            
            // Try user's orders subcollection
            const userOrdersSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('orders')
                .get();
            ordersCount = userOrdersSnapshot.size;
        }
        
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

document.addEventListener('DOMContentLoaded', function() {
    // Also update the header badge when on my-orders page
    updateOrdersCount();
});

async function updateOrdersCountForPage() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const db = firebase.firestore();
        
        // Use EXACTLY the same logic as auth-check.js
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .get();
        
        const ordersCount = ordersSnapshot.size;
        
        console.log('My Orders page - Orders count:', ordersCount);
        
        // Update badge on this page
        document.querySelectorAll('.orders-btn .icon-badge').forEach(badge => {
            badge.textContent = ordersCount > 99 ? '99+' : ordersCount;
            badge.style.display = ordersCount > 0 ? 'flex' : 'none';
        });
        
        // Store in localStorage for consistency
        localStorage.setItem('user_orders_count', ordersCount.toString());
        
    } catch (error) {
        console.error('Error updating orders count on my-orders page:', error);
    }
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase auth
    setTimeout(() => {
        if (firebase.auth().currentUser) {
            updateOrdersCountForPage();
        }
    }, 1000);
});

// Make functions globally available
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetails = closeOrderDetails;
window.loadOrderDetails = loadOrderDetails;
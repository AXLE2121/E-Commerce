// order-confirmation.js - COMPLETE FIXED VERSION
console.log('=== ORDER CONFIRMATION LOADED ===');

// Global variables
let currentUser = null;
let isFirebaseReady = false;

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    
    if (!orderId) {
        showError('No order ID found. Please check your confirmation link.');
        return;
    }
    
    console.log('Order ID from URL:', orderId);
    
    // First, try to show order from localStorage/sessionStorage immediately
    showOrderImmediately(orderId);
    
    // Then initialize Firebase and try to get more details
    initializeFirebaseAndLoadOrder(orderId);
});

// Function to show order immediately from local storage
function showOrderImmediately(orderId) {
    console.log('Attempting to show order immediately...');
    
    // Try multiple storage locations
    const orderData = 
        JSON.parse(sessionStorage.getItem('lastOrderData')) ||
        JSON.parse(localStorage.getItem(`order_${orderId}`)) ||
        JSON.parse(sessionStorage.getItem('checkoutProduct')) ||
        JSON.parse(localStorage.getItem('lastCheckout'));
    
    if (orderData) {
        console.log('Found order data in storage:', orderData);
        displayOrderConfirmation(orderData, orderId, false); // false = from storage
    } else {
        console.log('No order data found in storage');
        showLoadingState();
    }
}

// Initialize Firebase and load order
async function initializeFirebaseAndLoadOrder(orderId) {
    console.log('Initializing Firebase...');
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        return;
    }
    
    // Wait for Firebase to be ready
    setTimeout(async () => {
        try {
            console.log('Checking Firebase apps:', firebase.apps.length);
            
            if (firebase.apps.length === 0) {
                console.error('Firebase not initialized');
                return;
            }
            
            isFirebaseReady = true;
            
            // Set up auth listener
            firebase.auth().onAuthStateChanged(async (user) => {
                console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'No user');
                currentUser = user;
                
                if (user) {
                    console.log('User authenticated, fetching from Firestore...');
                    await fetchOrderFromFirestore(orderId);
                } else {
                    console.log('User not authenticated, using local data');
                    // Already shown from local storage
                }
            });
            
        } catch (error) {
            console.error('Error in Firebase init:', error);
        }
    }, 1000);
}

// Fetch order from Firestore
async function fetchOrderFromFirestore(orderId) {
    if (!currentUser) {
        console.log('No user, cannot fetch from Firestore');
        return;
    }
    
    console.log('Fetching order from Firestore for user:', currentUser.uid);
    
    try {
        const db = firebase.firestore();
        
        // Try multiple queries to find the order
        let orderData = null;
        let orderDoc = null;
        
        // 1. Try main orders collection
        console.log('Searching main orders collection...');
        const ordersSnapshot = await db.collection('orders')
            .where('orderId', '==', orderId)
            .where('userId', '==', currentUser.uid)
            .limit(1)
            .get();
        
        if (!ordersSnapshot.empty) {
            orderDoc = ordersSnapshot.docs[0];
            orderData = orderDoc.data();
            console.log('Found order in main collection');
        } else {
            // 2. Try user's orders subcollection
            console.log('Searching user orders subcollection...');
            const userOrderDoc = await db.collection('users')
                .doc(currentUser.uid)
                .collection('orders')
                .doc(orderId)
                .get();
            
            if (userOrderDoc.exists) {
                orderDoc = userOrderDoc;
                orderData = userOrderDoc.data();
                console.log('Found order in user subcollection');
            }
        }
        
        if (orderData) {
            console.log('Order data from Firestore:', orderData);
            displayOrderConfirmation(orderData, orderId, true); // true = from Firestore
            
            // Save to localStorage for future access
            localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
        } else {
            console.log('Order not found in Firestore');
            // Order will already be shown from localStorage if available
        }
        
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        console.error('Error details:', error.code, error.message);
        
        // Show error but don't interrupt the user experience
        const container = document.getElementById('confirmationContainer');
        if (container && !container.innerHTML.includes('Order Confirmed')) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background: #ffebee; color: #c62828; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 14px;';
            errorDiv.innerHTML = `<i class="fas fa-info-circle"></i> Note: Could not load latest order status. Showing cached data.`;
            container.appendChild(errorDiv);
        }
    }
}

// Display order confirmation - MAIN FUNCTION (MUST BE DEFINED)
function displayOrderConfirmation(orderData, orderId, fromFirestore = false) {
    console.log('Displaying order confirmation, from Firestore:', fromFirestore);
    
    const container = document.getElementById('confirmationContainer');
    if (!container) {
        console.error('Container not found!');
        return;
    }
    
    // Extract data safely
    let products = [];
    let customer = {};
    let payment = {};
    let totals = {};
    let status = 'pending';
    
    if (Array.isArray(orderData.products)) {
        products = orderData.products;
    } else if (orderData.product) {
        products = [orderData.product];
    } else if (orderData) {
        products = [orderData];
    }
    
    customer = orderData.customer || {};
    payment = orderData.payment || {};
    totals = orderData.totals || {};
    status = orderData.status || 'pending';
    
    // Calculate totals if not provided
    if (!totals.total && products.length > 0) {
        totals.subtotal = products.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
        totals.shipping = totals.shipping || 150;
        totals.serviceFee = totals.serviceFee || 0;
        totals.total = totals.subtotal + totals.shipping + totals.serviceFee;
    }
    
    // Format date
    const orderDate = orderData.createdAt ? 
        new Date(orderData.createdAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 
        new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    
    // Generate HTML
    container.innerHTML = `
        <div class="confirmation-header" style="text-align: center; margin-bottom: 40px;">
            <div class="confirmation-icon" style="width: 80px; height: 80px; background: #4caf50; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i class="fas fa-check fa-2x" style="color: white;"></i>
            </div>
            <h1 style="color: #4caf50; margin-bottom: 10px;">Order Confirmed!</h1>
            <p style="color: #666; font-size: 18px;">Thank you for your purchase${customer.firstName ? `, ${customer.firstName}` : ''}!</p>
            ${fromFirestore ? 
                '<p style="color: #666; font-size: 14px; background: #e8f5e8; padding: 5px 10px; border-radius: 4px; display: inline-block;"><i class="fas fa-sync"></i> Live data from your account</p>' : 
                '<p style="color: #666; font-size: 14px;"><i class="fas fa-info-circle"></i> Showing order details from confirmation</p>'
            }
        </div>
        
        <div class="confirmation-details" style="background: #f9f9f9; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <h2 style="margin-bottom: 20px; color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Order Summary</h2>
            
            <!-- Order Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: #666; font-size: 14px; margin-bottom: 5px;">ORDER NUMBER</h3>
                    <p style="font-size: 18px; font-weight: bold; color: #333; word-break: break-all;">${orderId}</p>
                </div>
                <div>
                    <h3 style="color: #666; font-size: 14px; margin-bottom: 5px;">ORDER DATE</h3>
                    <p style="font-size: 16px; color: #333;">${orderDate}</p>
                </div>
                <div>
                    <h3 style="color: #666; font-size: 14px; margin-bottom: 5px;">PAYMENT METHOD</h3>
                    <p style="font-size: 16px; color: #333;">
                        ${payment.method === 'cod' ? 'Cash on Delivery' : 
                          payment.method === 'gcash' ? 'GCash' : 
                          payment.method === 'card' ? 'Credit/Debit Card' : 
                          payment.method || 'Not specified'}
                    </p>
                </div>
                <div>
                    <h3 style="color: #666; font-size: 14px; margin-bottom: 5px;">ORDER STATUS</h3>
                    <p style="font-size: 16px; color: #d50000; font-weight: bold;">
                        ${getStatusBadge(status)}
                    </p>
                </div>
            </div>
            
            <!-- Customer Info -->
            ${customer.firstName || customer.email ? `
            <div style="margin-bottom: 30px; padding: 20px; background: white; border-radius: 8px;">
                <h3 style="color: #333; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user"></i> Customer Information
                </h3>
                ${customer.firstName ? `<p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${customer.firstName} ${customer.lastName || ''}</p>` : ''}
                ${customer.email ? `<p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${customer.email}</p>` : ''}
                ${customer.phone ? `<p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${customer.phone}</p>` : ''}
                ${customer.shippingAddress ? `
                    <p style="margin: 5px 0; color: #666;"><strong>Shipping Address:</strong></p>
                    <p style="margin: 5px 0; color: #666; padding-left: 20px;">
                        ${customer.shippingAddress.street || ''}<br>
                        ${customer.shippingAddress.city || ''}, ${customer.shippingAddress.zipCode || ''}<br>
                        ${customer.shippingAddress.country || 'Philippines'}
                    </p>
                ` : ''}
            </div>
            ` : ''}
            
            <!-- Order Items -->
            <div style="margin-bottom: 30px;">
                <h3 style="color: #333; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-box"></i> Order Items (${products.length})
                </h3>
                ${products.map(item => `
                    <div style="display: flex; align-items: center; padding: 15px; background: white; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e0e0e0;">
                        <div style="width: 80px; height: 80px; margin-right: 15px; flex-shrink: 0;">
                            <img src="${item.image || 'https://via.placeholder.com/80x80?text=Product'}" 
                                 alt="${item.name || 'Product'}" 
                                 style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <p style="font-weight: bold; color: #d50000; font-size: 14px; margin-bottom: 5px;">${item.brand || ''}</p>
                                    <h4 style="font-size: 16px; margin-bottom: 5px;">${item.name || 'Product'}</h4>
                                    <p style="color: #666; font-size: 14px; margin-bottom: 5px;">
                                        ${item.size ? `Size: ${item.size} | ` : ''}
                                        Qty: ${item.quantity || 1}
                                    </p>
                                </div>
                                <div style="font-weight: bold; font-size: 18px; color: #333; text-align: right;">
                                    ₱${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                    ${item.quantity > 1 ? `<br><span style="font-size: 12px; color: #666;">₱${(item.price || 0).toFixed(2)} each</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Order Totals -->
            <div style="border-top: 2px solid #e0e0e0; padding-top: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666;">Subtotal</span>
                    <span style="font-weight: bold;">₱${(totals.subtotal || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666;">Shipping</span>
                    <span style="font-weight: bold;">₱${(totals.shipping || 150).toFixed(2)}</span>
                </div>
                ${(totals.serviceFee || 0) > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666;">Service Fee</span>
                    <span style="font-weight: bold;">₱${(totals.serviceFee || 0).toFixed(2)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; font-size: 20px;">
                    <span style="font-weight: bold;">Total Amount</span>
                    <span style="font-weight: bold; color: #d50000;">₱${(totals.total || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        <!-- Next Steps -->
        <div style="background: #e8f5e8; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #2e7d32; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-info-circle"></i> What Happens Next?
            </h3>
            <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
                <li>You will receive an order confirmation email shortly</li>
                <li>Your order will be processed within 24 hours</li>
                ${payment.method === 'cod' ? 
                    '<li>Our delivery partner will contact you to schedule delivery</li>' : 
                    '<li>For GCash/Card payments, please complete the payment process</li>'
                }
                ${currentUser ? 
                    '<li>You can track your order status in "My Orders" section</li>' : 
                    '<li><a href="login.html" style="color: #d50000; text-decoration: none;">Login</a> to track your order status</li>'
                }
                <li>Expected delivery: 3-5 business days</li>
            </ul>
        </div>
        
        <!-- GCash Instructions -->
        ${payment.method === 'gcash' ? `
        <div style="background: #e3f2fd; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #1976d2; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-mobile-alt"></i> GCash Payment Instructions
            </h3>
            <ol style="color: #666; line-height: 1.6; padding-left: 20px;">
                <li>Open your GCash app</li>
                <li>Go to "Send Money" or "Pay Bills"</li>
                <li>Send payment to: <strong>FOOT LOCKER MERCHANT</strong></li>
                <li>Amount: <strong>₱${(totals.total || 0).toFixed(2)}</strong></li>
                <li>Reference: <strong>${orderId}</strong></li>
                <li>Save your transaction receipt</li>
                <li>Email the receipt to: support@footlocker.com</li>
            </ol>
        </div>
        ` : ''}
        
        <!-- Actions -->
        <div style="text-align: center; margin-top: 40px;">
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <a href="index.html" class="primary-btn" style="display: inline-block; padding: 12px 24px; background: #d50000; color: white; text-decoration: none; border-radius: 6px;">
                    <i class="fas fa-home"></i> Continue Shopping
                </a>
                ${currentUser ? `

                ` : `
                    <a href="login.html" class="secondary-btn" style="display: inline-block; padding: 12px 24px; background: #333; color: white; text-decoration: none; border-radius: 6px;">
                        <i class="fas fa-sign-in-alt"></i> Login to Track Order
                    </a>
                `}
            </div>
        </div>
    `;
}

// Helper function for status badge
function getStatusBadge(status) {
    const statusMap = {
        'pending': '⏳ Pending',
        'processing': '🔄 Processing',
        'shipped': '🚚 Shipped',
        'delivered': '✅ Delivered',
        'cancelled': '❌ Cancelled'
    };
    return statusMap[status.toLowerCase()] || status;
}

// Show loading state
function showLoadingState() {
    const container = document.getElementById('confirmationContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-spinner fa-spin fa-3x" style="color: #d50000; margin-bottom: 20px;"></i>
                <p style="color: #666; font-size: 16px;">Loading your order details...</p>
            </div>
        `;
    }
}

// Show error
function showError(message) {
    const container = document.getElementById('confirmationContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color: #e53935; margin-bottom: 20px;"></i>
                <h3 style="color: #e53935; margin-bottom: 10px;">Error</h3>
                <p style="color: #666; margin-bottom: 20px;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <a href="index.html" style="display: inline-block; padding: 10px 20px; background: #d50000; color: white; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-home"></i> Back to Home
                    </a>
                </div>
            </div>
        `;
    }
}
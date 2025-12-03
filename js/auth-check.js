// auth-check.js - Fixed for consistent orders count
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to initialize
    setTimeout(() => {
        checkAuthStatus();
    }, 100);
});

// Initialize Firebase if needed
function initializeFirebase() {
    if (!firebase.apps.length) {
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
    return firebase.auth();
}

// Function to check authentication status
function checkAuthStatus() {
    // Initialize Firebase and get auth instance
    const auth = initializeFirebase();
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is logged in:', user.email);
            updateHeaderForLoggedInUser(user);
            updateCartCount();
            updateFavoritesCount();
            updateOrdersCount(); // Update orders count
            
            // Check if email is verified (optional)
            if (!user.emailVerified && (window.location.pathname.includes('favorites') || window.location.pathname.includes('cart'))) {
                showVerificationNotice();
            }
        } else {
            // User is not signed in
            console.log('User not logged in');
            
            // Clear badge counts for logged out users
            document.querySelectorAll('.icon-badge').forEach(badge => {
                badge.textContent = '0';
                badge.style.display = 'none';
            });
            
            // Check if we're on favorites, cart, or my-orders page
            const currentPage = window.location.pathname;
            if (currentPage.includes('favorites.html') || 
                currentPage.includes('cart.html') ||
                currentPage.includes('my-orders.html')) {
                showLoginRequiredModal();
            }
        }
    });
}

// Function to update header for logged-in users
function updateHeaderForLoggedInUser(user) {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userEmail) userEmail.textContent = user.email;
    
    // Add logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            firebase.auth().signOut().then(() => {
                window.location.reload();
            });
        });
    }
}

// Function to update orders count - CONSISTENT VERSION
async function updateOrdersCount() {
    const auth = initializeFirebase();
    const user = auth.currentUser;
    if (!user) {
        // Clear orders count if no user
        document.querySelectorAll('.orders-btn .icon-badge').forEach(badge => {
            badge.textContent = '0';
            badge.style.display = 'none';
        });
        return;
    }
    
    console.log('Updating orders count for user:', user.uid, user.email);
    
    try {
        const db = firebase.firestore();
        let ordersCount = 0;
        
        // ONLY use one consistent approach
        // Approach: Get orders from the main orders collection where userId matches
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .get();
        
        ordersCount = ordersSnapshot.size;
        
        console.log('Orders count from main collection:', ordersCount);
        console.log('Found orders:', Array.from(ordersSnapshot.docs).map(doc => ({
            id: doc.id,
            orderId: doc.data().orderId,
            userId: doc.data().userId,
            userEmail: doc.data().userEmail
        })));
        
        // Update all orders badges on the page
        document.querySelectorAll('.orders-btn .icon-badge').forEach(badge => {
            badge.textContent = ordersCount > 99 ? '99+' : ordersCount;
            badge.style.display = ordersCount > 0 ? 'flex' : 'none';
        });
        
        // Also store the count in localStorage for consistency
        localStorage.setItem('user_orders_count', ordersCount.toString());
        
    } catch (error) {
        console.error('Error updating orders count:', error);
        
        // Try fallback: check localStorage for cached count
        const cachedCount = localStorage.getItem('user_orders_count');
        if (cachedCount) {
            const ordersCount = parseInt(cachedCount);
            document.querySelectorAll('.orders-btn .icon-badge').forEach(badge => {
                badge.textContent = ordersCount > 99 ? '99+' : ordersCount;
                badge.style.display = ordersCount > 0 ? 'flex' : 'none';
            });
        } else {
            // Set to 0 on error
            document.querySelectorAll('.orders-btn .icon-badge').forEach(badge => {
                badge.textContent = '0';
                badge.style.display = 'none';
            });
        }
    }
}

// Function to update cart count
async function updateCartCount() {
    const auth = initializeFirebase();
    const user = auth.currentUser;
    if (!user) {
        // Clear cart count if no user
        document.querySelectorAll('.cart-btn .icon-badge').forEach(badge => {
            badge.textContent = '0';
            badge.style.display = 'none';
        });
        return;
    }
    
    try {
        let cartCount = 0;
        
        // Try to get cart from Firestore first
        const db = firebase.firestore();
        const cartSnapshot = await db.collection('cart')
            .where('userId', '==', user.uid)
            .get();
        
        if (!cartSnapshot.empty) {
            cartSnapshot.forEach(doc => {
                const cartItem = doc.data();
                cartCount += cartItem.quantity || 1;
            });
        } else {
            // Fallback to localStorage
            const localCart = JSON.parse(localStorage.getItem('footLocker_cart')) || [];
            cartCount = localCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        }
        
        console.log('Cart count:', cartCount);
        
        // Update all cart badges
        document.querySelectorAll('.cart-btn .icon-badge').forEach(badge => {
            badge.textContent = cartCount > 99 ? '99+' : cartCount;
            badge.style.display = cartCount > 0 ? 'flex' : 'none';
        });
        
    } catch (error) {
        console.error('Error updating cart count:', error);
        // Fallback to localStorage
        const localCart = JSON.parse(localStorage.getItem('footLocker_cart')) || [];
        const cartCount = localCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        document.querySelectorAll('.cart-btn .icon-badge').forEach(badge => {
            badge.textContent = cartCount > 99 ? '99+' : cartCount;
            badge.style.display = cartCount > 0 ? 'flex' : 'none';
        });
    }
}

// Function to update favorites count
async function updateFavoritesCount() {
    const auth = initializeFirebase();
    const user = auth.currentUser;
    if (!user) {
        // Clear favorites count if no user
        document.querySelectorAll('.favorites-btn .icon-badge').forEach(badge => {
            badge.textContent = '0';
            badge.style.display = 'none';
        });
        return;
    }
    
    try {
        const db = firebase.firestore();
        const favoritesSnapshot = await db.collection('favorites')
            .where('userId', '==', user.uid)
            .get();
        
        const favoritesCount = favoritesSnapshot.size;
        
        // Update all favorites badges
        document.querySelectorAll('.favorites-btn .icon-badge').forEach(badge => {
            badge.textContent = favoritesCount > 99 ? '99+' : favoritesCount;
            badge.style.display = favoritesCount > 0 ? 'flex' : 'none';
        });
        
    } catch (error) {
        console.error('Error updating favorites count:', error);
    }
}

// Function to verify orders consistency
window.verifyOrdersCount = async function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please login first');
        return;
    }
    
    const db = firebase.firestore();
    
    // Check all possible order locations
    console.log('=== VERIFYING ORDERS COUNT ===');
    
    // 1. Check main orders collection by userId
    const mainOrders = await db.collection('orders')
        .where('userId', '==', user.uid)
        .get();
    console.log('Main collection (userId):', mainOrders.size);
    
    // 2. Check main orders collection by userEmail
    const emailOrders = await db.collection('orders')
        .where('userEmail', '==', user.email)
        .get();
    console.log('Main collection (userEmail):', emailOrders.size);
    
    // 3. Check user's orders subcollection
    let userSubcollectionOrders = 0;
    try {
        const userOrders = await db.collection('users')
            .doc(user.uid)
            .collection('orders')
            .get();
        userSubcollectionOrders = userOrders.size;
        console.log('User subcollection:', userSubcollectionOrders);
    } catch (e) {
        console.log('User subcollection error:', e.message);
    }
    
    // Show results
    const message = `
        Orders Count Verification:
        
        Main Collection (by userId): ${mainOrders.size}
        Main Collection (by email): ${emailOrders.size}
        User Subcollection: ${userSubcollectionOrders}
        
        Total Unique Orders: ${mainOrders.size + emailOrders.size + userSubcollectionOrders}
        
        Your badge shows: ${document.querySelector('.orders-btn .icon-badge')?.textContent || 'N/A'}
    `;
    
    console.log(message);
    alert(message);
    
    // Update badge to show correct count
    const correctCount = mainOrders.size; // Use main collection count
    document.querySelectorAll('.orders-btn .icon-badge').forEach(badge => {
        badge.textContent = correctCount;
        badge.style.display = correctCount > 0 ? 'flex' : 'none';
    });
    
    // Save to localStorage
    localStorage.setItem('user_orders_count', correctCount.toString());
};

// Function to show login required modal
function showLoginRequiredModal() {
    // Create modal HTML
    const modalHTML = `
        <div class="login-required-modal" id="loginRequiredModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Login Required</h3>
                    <button class="modal-close" onclick="closeLoginModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-icon">
                        <i class="fas fa-lock"></i>
                    </div>
                    <p>You need to be logged in to access this feature.</p>
                    <p>Please login or create an account to continue.</p>
                </div>
                <div class="modal-footer">
                    <a href="login.html?redirect=${window.location.pathname}" class="modal-btn login-modal-btn">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                    <a href="register.html" class="modal-btn register-modal-btn">
                        <i class="fas fa-user-plus"></i> Register
                    </a>
                    <button class="modal-btn cancel-modal-btn" onclick="closeLoginModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add CSS for modal
    addModalStyles();
    
    // Prevent scrolling of background
    document.body.style.overflow = 'hidden';
}

// Function to close modal
function closeLoginModal() {
    const modal = document.getElementById('loginRequiredModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
        
        // Redirect to home page after closing modal
        if (!window.location.pathname.includes('index.html') && 
            !window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('register.html')) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 300);
        }
    }
}

// Function to show verification notice
function showVerificationNotice() {
    const noticeHTML = `
        <div class="verification-notice">
            <i class="fas fa-exclamation-circle"></i>
            <span>Please verify your email to access all features. 
                  <a href="verify-email.html">Verify Now</a>
            </span>
        </div>
    `;
    
    const mainContainer = document.querySelector('.favorites-main-container') || 
                         document.querySelector('.cart-main-container') ||
                         document.querySelector('.orders-main-container');
    if (mainContainer) {
        mainContainer.insertAdjacentHTML('afterbegin', noticeHTML);
    }
}

// Function to add modal styles
function addModalStyles() {
    const modalStyles = `
        .login-required-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        
        .modal-header {
            background: #d50000;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 20px;
        }
        
        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
        }
        
        .modal-body {
            padding: 30px 20px;
            text-align: center;
        }
        
        .modal-icon {
            font-size: 48px;
            color: #d50000;
            margin-bottom: 20px;
        }
        
        .modal-body p {
            margin: 10px 0;
            color: #666;
            line-height: 1.5;
        }
        
        .modal-footer {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
        }
        
        .modal-btn {
            padding: 12px;
            border-radius: 6px;
            text-decoration: none;
            text-align: center;
            font-weight: 500;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .login-modal-btn {
            background: #d50000;
            color: white;
        }
        
        .login-modal-btn:hover {
            background: #b71c1c;
        }
        
        .register-modal-btn {
            background: #333;
            color: white;
        }
        
        .register-modal-btn:hover {
            background: #555;
        }
        
        .cancel-modal-btn {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ddd;
            cursor: pointer;
        }
        
        .cancel-modal-btn:hover {
            background: #e0e0e0;
        }
        
        .verification-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px 15px;
            margin: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #856404;
            font-size: 14px;
        }
        
        .verification-notice i {
            color: #856404;
        }
        
        .verification-notice a {
            color: #d50000;
            text-decoration: none;
            font-weight: 500;
        }
        
        .verification-notice a:hover {
            text-decoration: underline;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
            }
            
            .modal-footer {
                flex-direction: column;
            }
        }
    `;
    
    // Check if styles already exist
    if (!document.querySelector('#modalStyles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'modalStyles';
        styleSheet.textContent = modalStyles;
        document.head.appendChild(styleSheet);
    }
}

// Make functions globally available
window.closeLoginModal = closeLoginModal;
window.updateCartCount = updateCartCount;
window.updateFavoritesCount = updateFavoritesCount;
window.updateOrdersCount = updateOrdersCount;
window.verifyOrdersCount = verifyOrdersCount;

// Add periodic check for consistency
setInterval(() => {
    if (firebase.auth().currentUser) {
        // Update orders count every 30 seconds to ensure consistency
        updateOrdersCount();
    }
}, 30000);
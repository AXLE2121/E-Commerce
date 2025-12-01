// cart.js - Only for logged-in users
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is logged in, initialize cart
            console.log('User logged in, initializing cart...');
            initializeCart();
        } else {
            // User is not logged in - auth-check.js will handle the modal
            console.log('User not logged in, cart functionality disabled');
            disableCartPage();
        }
    });
});

function disableCartPage() {
    // Disable all buttons
    const buttons = document.querySelectorAll('.checkout-btn, .browse-btn, .quantity-btn, .action-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    // Show message
    const cartContainer = document.querySelector('.cart-container');
    if (cartContainer) {
        const disabledHTML = `
            <div class="login-required-message" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-lock" style="font-size: 48px; color: #d50000; margin-bottom: 20px;"></i>
                <h3>Login Required</h3>
                <p>Please login to view and manage your shopping cart.</p>
                <div class="message-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <a href="login.html" class="action-btn" style="background: #d50000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                    <a href="register.html" class="action-btn" style="background: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-user-plus"></i> Register
                    </a>
                </div>
            </div>
        `;
        cartContainer.innerHTML = disabledHTML;
    }
}

// Sample cart data
let cart = JSON.parse(localStorage.getItem('footLocker_cart')) || [];

// Initialize cart page - only for logged-in users
function initializeCart() {
    updateCartDisplay();
    updateCartCount();
    calculateTotals();
    
    // Event listeners only for logged-in users
    document.getElementById('proceedCheckout').addEventListener('click', proceedToCheckout);
    // Add other event listeners as needed
}

// Rest of your existing cart.js code remains the same...
// [Keep all your existing functions like updateCartDisplay, renderCartItems, etc.]
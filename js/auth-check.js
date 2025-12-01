// auth-check.js - Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to initialize
    setTimeout(() => {
        checkAuthStatus();
    }, 100);
});

// Function to check authentication status
function checkAuthStatus() {
    // Get auth instance
    const auth = firebase.auth();
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is logged in:', user.email);
            updateHeaderForLoggedInUser(user);
            
            // Check if email is verified (optional)
            if (!user.emailVerified && window.location.pathname.includes('favorites') || window.location.pathname.includes('cart')) {
                showVerificationNotice();
            }
        } else {
            // User is not signed in
            console.log('User is not logged in');
            
            // Check if we're on favorites or cart page
            const currentPage = window.location.pathname;
            if (currentPage.includes('favorites.html') || currentPage.includes('cart.html')) {
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
                         document.querySelector('.cart-main-container');
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
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);
}

// Make functions globally available
window.closeLoginModal = closeLoginModal;
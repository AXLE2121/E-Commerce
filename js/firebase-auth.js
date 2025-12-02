// firebase-auth.js
// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyCn721TvxMu3R6JX5fpYTXemZPB6alHQX0",
    authDomain: "shoehub-711f9.firebaseapp.com",
    projectId: "shoehub-711f9",
    storageBucket: "shoehub-711f9.firebasestorage.app",
    messagingSenderId: "719905522600",
    appId: "1:719905522600:web:3ad4f4c2213b25a9a5d39d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements - Login Page
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');

// DOM elements - Reset Password Page
const resetpasswordForm = document.getElementById('resetpasswordForm');
const emailresetInput = document.getElementById('email');
const resetBtn = document.getElementById('resetBtn');

// DOM elements - Register Page
const registerForm = document.getElementById('registerForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const addressInput = document.getElementById('address');
const phoneInput = document.getElementById('phone');
const registerEmailInput = document.getElementById('email');
const registerPasswordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerBtn = document.getElementById('registerBtn');

// Common elements
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');

// Error message styles
const errorStyle = `
    .error-message {
        background-color: #ffebee;
        color: #c62828;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 20px;
        border-left: 4px solid #c62828;
        font-size: 14px;
    }
    
    .success-message {
        background-color: #e8f5e8;
        color: #2e7d32;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 20px;
        border-left: 4px solid #2e7d32;
        font-size: 14px;
    }
    
    .loading {
        text-align: center;
        padding: 15px;
        color: #666;
        font-size: 16px;
    }
    
    .auth-submit-btn:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    
    .auth-submit-btn:disabled:hover {
        background-color: #cccccc;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = errorStyle;
document.head.appendChild(styleSheet);

// Show message function
function showMessage(message, type = 'error') {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.className = type === 'error' ? 'error-message' : 'success-message';
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, type === 'error' ? 5000 : 3000);
    }
}

// Show loading state
function setLoading(isLoading, button) {
    if (button) {
        if (isLoading) {
            button.disabled = true;
            button.textContent = button.id === 'loginBtn' ? 'SIGNING IN...' : 'CREATING ACCOUNT...';
            if (loadingIndicator) loadingIndicator.style.display = 'block';
        } else {
            button.disabled = false;
            button.textContent = button.id === 'loginBtn' ? 'LOGIN' : 'CREATE ACCOUNT';
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }
}

// Email validation function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Password validation function
function validatePassword(password) {
    return password.length >= 6;
}

// Check if user is admin
async function checkIfAdmin(userId) {
    try {
        // Method 1: Check user document in Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Check if user has admin role or is the default admin email
            if (userData.role === 'admin' || userData.email === 'admin@footlocker.com') {
                return true;
            }
        }
        
        // Method 2: Check against admin email list (for development)
        const user = auth.currentUser;
        if (user && user.email === 'admin@footlocker.com') {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// ========== LOGIN FUNCTIONALITY ==========
if (loginForm && emailInput && passwordInput && loginBtn) {
    console.log('Login form elements found');

    // Login function
    function loginUser(email, password) {
        console.log('Attempting login with:', email);
        setLoading(true, loginBtn);
        
        auth.signInWithEmailAndPassword(email, password)
            .then(async (userCredential) => {
                // Signed in successfully
                const user = userCredential.user;
                console.log('✅ Login successful for user:', user.email);
                
                // Check if email is verified
                if (!user.emailVerified) {
                    // If email not verified, show message and sign out
                    showMessage('Please verify your email address before logging in. Check your inbox for the verification email.', 'error');
                    return auth.signOut().then(() => {
                        setLoading(false, loginBtn);
                        // Optionally redirect to verification page
                        setTimeout(() => {
                            window.location.href = 'verify-email.html';
                        }, 3000);
                    });
                }
                
                // Check if user is admin
                const isAdmin = await checkIfAdmin(user.uid);
                
                // Show success message
                showMessage('Login successful! Redirecting...', 'success');
                
                // Wait a moment to show the success message, then redirect
                setTimeout(() => {
                    if (isAdmin) {
                        console.log('🔄 Admin user detected, redirecting to admin panel...');
                        window.location.href = 'admin.html';
                    } else {
                        console.log('🔄 Regular user, redirecting to homepage...');
                        window.location.href = 'index.html';
                    }
                }, 1500);
            })
            .catch((error) => {
                setLoading(false, loginBtn);
                console.error('❌ Login error:', error);
                const errorCode = error.code;
                const errorMessageText = error.message;
                
                console.log('Error code:', errorCode);
                console.log('Error message:', errorMessageText);
                
                // Handle different error types
                switch (errorCode) {
                    case 'auth/invalid-email':
                        showMessage('Please enter a valid email address.');
                        break;
                    case 'auth/user-disabled':
                        showMessage('This account has been disabled.');
                        break;
                    case 'auth/user-not-found':
                        showMessage('No account found with this email.');
                        break;
                    case 'auth/wrong-password':
                        showMessage('Incorrect password. Please try again.');
                        break;
                    case 'auth/too-many-requests':
                        showMessage('Too many failed attempts. Please try again later.');
                        break;
                    default:
                        showMessage('Login failed: ' + errorMessageText);
                }
            });
    }

    // Form submission handler for login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        console.log('Form data - Email:', email, 'Password length:', password.length);
        
        // Basic validation
        if (!email || !password) {
            showMessage('Please fill in all fields.');
            return;
        }
        
        if (!validateEmail(email)) {
            showMessage('Please enter a valid email address.');
            return;
        }
        
        loginUser(email, password);
    });
} else {
    console.log('Login form elements not found');
    if (!loginForm) console.log('loginForm missing');
    if (!emailInput) console.log('emailInput missing');
    if (!passwordInput) console.log('passwordInput missing');
    if (!loginBtn) console.log('loginBtn missing');
}

// ========== RESET PASSSSWORD FUNCTIONALITY ==========
if (resetpasswordForm && emailresetInput) {

  function sendEmail(email) {
    auth.sendPasswordResetEmail(email)
      .then(() => {
        showMessage('Email sent. Check your inbox or spam.', 'success');
      })
      .catch(() => {
        showMessage("Failed to send email. Please try again later or contact the admin.", "error");
      });
  }

  resetpasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Reset password form submitted');

    const email = emailresetInput.value.trim();

    if (!email) {
      showMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      showMessage('Please enter a valid email address.');
      return;
    }

    sendEmail(email);
  });
}
else{
    console.log('Reset password form elements not found');
    if (!emailresetInput) console.log('emailresetInput missing');
}

// ========== REGISTRATION FUNCTIONALITY ==========
if (registerForm) {
    // Save user data to Firestore
    function saveUserData(userId, userData) {
        return db.collection('users').doc(userId).set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            address: userData.address,
            phone: userData.phone,
            email: userData.email,
            emailVerified: false,
            role: 'user', // Default role is 'user'
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // Send email verification
    function sendEmailVerification(user) {
        return user.sendEmailVerification().then(() => {
            console.log('Email verification sent to:', user.email);
            return true;
        });
    }

    // Register function with email verification
    function registerUser(userData) {
        setLoading(true, registerBtn);
        
        auth.createUserWithEmailAndPassword(userData.email, userData.password)
            .then((userCredential) => {
                // Signed up successfully
                const user = userCredential.user;
                console.log('User registered:', user);
                
                // Save user data to Firestore
                return saveUserData(user.uid, userData).then(() => {
                    // Send email verification
                    return sendEmailVerification(user);
                });
            })
            .then(() => {
                // Show verification message instead of redirecting
                showVerificationMessage(userData.email);
                
                // Sign out the user until they verify their email
                return auth.signOut();
            })
            .catch((error) => {
                setLoading(false, registerBtn);
                const errorCode = error.code;
                
                // Handle different error types
                switch (errorCode) {
                    case 'auth/email-already-in-use':
                        showMessage('This email is already registered. Please use a different email or login.');
                        break;
                    case 'auth/invalid-email':
                        showMessage('Please enter a valid email address.');
                        break;
                    case 'auth/weak-password':
                        showMessage('Password should be at least 6 characters long.');
                        break;
                    case 'auth/operation-not-allowed':
                        showMessage('Email/password accounts are not enabled. Please contact support.');
                        break;
                    default:
                        showMessage('Registration failed: ' + error.message);
                }
            });
    }

    // Show verification message
    function showVerificationMessage(email) {
        // Hide the form and show verification message
        registerForm.style.display = 'none';
        document.querySelector('.auth-switch').style.display = 'none';
        
        const verificationHTML = `
            <div class="verification-message">
                <div class="verification-icon">
                    <i class="fas fa-envelope"></i>
                </div>
                <h3>Verify Your Email Address</h3>
                <p>We've sent a verification email to:</p>
                <p class="verification-email">${email}</p>
                <p>Please check your inbox and click the verification link to activate your account.</p>
                <div class="verification-actions">
                    <button class="resend-btn" id="resendBtn">
                        <i class="fas fa-redo"></i> Resend Verification Email
                    </button>
                    <a href="login.html" class="login-link-btn">
                        <i class="fas fa-sign-in-alt"></i> Go to Login
                    </a>
                </div>
                <div class="verification-note">
                    <p><strong>Note:</strong> If you don't see the email, check your spam folder.</p>
                </div>
            </div>
        `;
        
        const authFormContainer = document.querySelector('.auth-form-container');
        authFormContainer.insertAdjacentHTML('beforeend', verificationHTML);
        
        // Add resend functionality
        document.getElementById('resendBtn').addEventListener('click', function() {
            const user = auth.currentUser;
            if (user) {
                sendEmailVerification(user).then(() => {
                    showMessage('Verification email sent again!', 'success');
                }).catch(error => {
                    showMessage('Error sending verification email: ' + error.message);
                });
            } else {
                showMessage('Please try logging in first to resend verification.');
            }
        });
    }

        document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to initialize
    setTimeout(() => {
        if (firebase.auth) {
            // Set persistence to LOCAL (remembers user across tabs/sessions)
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('✅ Auth persistence set to LOCAL');
                    
                    // Check current auth state
                    firebase.auth().onAuthStateChanged((user) => {
                        if (user) {
                            console.log('✅ User is authenticated:', user.email);
                            console.log('✅ User UID:', user.uid);
                        } else {
                            console.log('⚠️ No user authenticated');
                        }
                    });
                })
                .catch((error) => {
                    console.error('❌ Error setting auth persistence:', error);
                });
        }
    }, 500);
});

    // Form submission handler for registration
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userData = {
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            address: addressInput.value.trim(),
            phone: phoneInput.value.trim(),
            email: registerEmailInput.value.trim(),
            password: registerPasswordInput.value
        };
        
        const confirmPassword = confirmPasswordInput.value;
        
        // Validation
        if (!userData.firstName || !userData.lastName || !userData.email || !userData.password || !confirmPassword) {
            showMessage('Please fill in all required fields.');
            return;
        }
        
        if (!validateEmail(userData.email)) {
            showMessage('Please enter a valid email address.');
            return;
        }
        
        if (!validatePassword(userData.password)) {
            showMessage('Password must be at least 6 characters long.');
            return;
        }
        
        if (userData.password !== confirmPassword) {
            showMessage('Passwords do not match. Please try again.');
            return;
        }
        
        registerUser(userData);
    });

    // Password strength indicator for register page
    if (registerPasswordInput) {
        const strengthText = document.querySelector('.strength-text');
        
        registerPasswordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 'No Password';
            let color = '#d50000';
            
            if (password.length > 0) {
                if (password.length < 6) {
                    strength = 'Weak';
                    color = '#d50000';
                } else if (password.length < 10) {
                    strength = 'Medium';
                    color = '#ff9800';
                } else {
                    strength = 'Strong';
                    color = '#4caf50';
                }
            }
            
            if (strengthText) {
                strengthText.textContent = strength;
                strengthText.style.color = color;
            }
        });
    }
}

// Password visibility toggle
function togglePasswordVisibility() {
    const passwordField = document.getElementById('password');
    if (passwordField) {
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);
        
        // Toggle eye icon
        const eyeIcon = document.querySelector('.fa-eye');
        if (eyeIcon) {
            eyeIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        }
    }
}

// Add this for better debugging
console.log('Firebase Auth JS loaded successfully');
console.log('Firebase app initialized:', firebase.app().name);
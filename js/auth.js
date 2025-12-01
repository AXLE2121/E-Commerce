// auth.js - Updated version
document.addEventListener('DOMContentLoaded', function() {
    // Remove the existing login form submission since we're handling it in firebase-auth.js
    // Only keep functionality that doesn't conflict with Firebase auth
    
    // Password strength indicator (for register page)
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    
    passwordInputs.forEach((passwordInput, index) => {
        const strengthText = document.querySelector('.strength-text');
        
        if (strengthText && index === 0) { // Only for first password field
            passwordInput.addEventListener('input', function() {
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
                
                strengthText.textContent = strength;
                strengthText.style.color = color;
            });
        }
    });
    
    // Social login buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.classList.contains('google-btn') ? 'Google' : 'Facebook';
            alert(`${platform} login would be implemented here!`);
        });
    });

     console.log('Auth.js loaded - non-Firebase functionality');
});
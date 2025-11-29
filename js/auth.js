// Auth functionality
document.addEventListener('DOMContentLoaded', function() {
    // Password strength indicator
    const passwordInput = document.querySelector('input[type="password"]');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput && strengthText) {
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
    
    // Form submission
    const loginForm = document.querySelector('.auth-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Add login logic here
            alert('Login functionality would be implemented here!');
        });
    }
    
    const registerForm = document.querySelector('.auth-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = this.querySelector('input[type="password"]').value;
            const confirmPassword = this.querySelectorAll('input[type="password"]')[1].value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            // Add registration logic here
            alert('Registration functionality would be implemented here!');
        });
    }
    
    // Social login buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.classList.contains('google-btn') ? 'Google' : 'Facebook';
            alert(`${platform} login would be implemented here!`);
        });
    });
});
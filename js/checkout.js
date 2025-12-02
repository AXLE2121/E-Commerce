// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCn721TvxMu3R6JX5fpYTXemZPB6alHQX0",
    authDomain: "shoehub-711f9.firebaseapp.com",
    projectId: "shoehub-711f9",
    storageBucket: "shoehub-711f9.firebasestorage.app",
    messagingSenderId: "719905522600",
    appId: "1:719905522600:web:3ad4f4c2213b25a5a5d39d"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Helper function for consistent currency formatting
function formatCurrency(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) {
        console.warn('Invalid amount for formatting:', amount);
        return '₱0.00';
    }
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return '₱' + numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Load product from sessionStorage and display order summary
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== CHECKOUT PAGE LOADED ===');
    console.log('Checking for checkout data...');
    
    // Check what's in storage
    const checkoutData = JSON.parse(sessionStorage.getItem('checkoutProduct'));
    const localStorageData = JSON.parse(localStorage.getItem('lastCheckout'));
    
    console.log('Session Storage data:', checkoutData);
    console.log('Local Storage data:', localStorageData);
    
    // Try sessionStorage first, then localStorage
    let dataToUse = null;
    
    if (checkoutData && checkoutData.product) {
        dataToUse = checkoutData;
        console.log('✅ Using sessionStorage data');
    } else if (localStorageData && localStorageData.product) {
        dataToUse = localStorageData;
        console.log('✅ Using localStorage data');
    }
    
    if (dataToUse) {
        console.log('✅ Product data found:', dataToUse.product);
        console.log('✅ Product price:', dataToUse.product.price, 'Type:', typeof dataToUse.product.price);
        console.log('✅ Product name:', dataToUse.product.name);
        console.log('✅ Product quantity:', dataToUse.product.quantity);
        
        // Display order summary
        displayOrderSummary(dataToUse.product);
        updateUserInfo(dataToUse.user);
    } else {
        console.error('❌ No checkout data found!');
        showError('No product selected. Please go back and select a product.');
    }
    
    // Initialize payment method
    selectPayment('gcash'); // Default to GCash
    
    // Format phone number inputs
    setupPhoneFormatting();
    
    // Format card number
    setupCardFormatting();
});

function displayOrderSummary(product) {
    console.log('=== DISPLAYING ORDER SUMMARY ===');
    console.log('Product object received:', product);
    
    const orderItems = document.getElementById('orderItems');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const serviceFeeElement = document.getElementById('serviceFee');
    const totalElement = document.getElementById('total');
    
    if (!orderItems || !subtotalElement || !shippingElement || !serviceFeeElement || !totalElement) {
        console.error('❌ Order summary elements not found!');
        return;
    }
    
    // Extract and validate price
    let price = product.price;
    console.log('1. Raw price from product:', price, 'Type:', typeof price);
    
    // Convert to number if it's a string
    if (typeof price === 'string') {
        console.log('2. Price is a string, converting to number...');
        // Remove all non-numeric characters except decimal point
        price = price.toString().replace(/[^0-9.-]+/g, '');
        price = parseFloat(price);
        console.log('3. Converted price:', price);
    }
    
    // If still not a valid number, show error instead of using default
    if (isNaN(price) || price <= 0) {
        console.error('❌ Invalid price after conversion:', price);
        showError('Error: Product price is invalid. Please go back and select the product again.');
        return; // Don't continue with invalid price
    }
    
    // Ensure quantity is a number
    const quantity = parseInt(product.quantity) || 1;
    
    // Calculate totals
    const subtotal = price * quantity;
    const shipping = 150.00; // Fixed shipping fee
    const serviceFee = 0.00; // No service fee for now (COD adds ₱50 later)
    const total = subtotal + shipping + serviceFee;
    
    console.log('4. Final calculations:');
    console.log('   - Unit Price:', price);
    console.log('   - Quantity:', quantity);
    console.log('   - Subtotal:', subtotal);
    console.log('   - Shipping:', shipping);
    console.log('   - Total:', total);
    
    // Display the product details in orderItems
    orderItems.innerHTML = `
        <div class="order-item">
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/80x80?text=No+Image'}" 
                     alt="${product.name || 'Product'}"
                     style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">
            </div>
            <div class="product-details" style="flex: 1; margin-left: 15px;">
                <div style="font-weight: bold; color: #d50000; font-size: 14px;">${product.brand || ''}</div>
                <div style="font-weight: bold; margin: 5px 0; font-size: 16px;">${product.name || 'Product Name'}</div>
                <div style="color: #666; font-size: 14px;">
                    <div>Size: ${product.size || 'Not selected'}</div>
                    <div>Quantity: ${quantity}</div>
                    <div style="margin-top: 5px; font-weight: bold; color: #333; font-size: 16px;">${formatCurrency(price)} each</div>
                </div>
            </div>
        </div>
    `;
    
    // Update totals
    subtotalElement.textContent = formatCurrency(subtotal);
    shippingElement.textContent = formatCurrency(shipping);
    serviceFeeElement.textContent = formatCurrency(serviceFee);
    totalElement.textContent = formatCurrency(total);
    
    console.log('✅ Order summary displayed successfully!');
    console.log('   Subtotal:', formatCurrency(subtotal));
    console.log('   Total:', formatCurrency(total));
    
    // Add debug info (remove in production)
    const debugInfo = document.createElement('div');
    debugInfo.style.cssText = 'margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; font-size: 12px; color: #666;';
    debugInfo.innerHTML = `
        <strong>Debug Info:</strong><br>
        Product: ${product.name}<br>
        Price: ${price} (${typeof price})<br>
        Quantity: ${quantity}<br>
        Calculated Subtotal: ${subtotal}
    `;
    orderItems.appendChild(debugInfo);
}

function updateUserInfo(user) {
    if (user && user.email) {
        // Pre-fill email if available
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.value = user.email;
        
        // Try to get user details from Firebase
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        const firstNameInput = document.getElementById('firstName');
                        const lastNameInput = document.getElementById('lastName');
                        const phoneInput = document.getElementById('phone');
                        const gcashPhoneInput = document.getElementById('gcashPhone');
                        
                        if (firstNameInput) firstNameInput.value = userData.firstName || '';
                        if (lastNameInput) lastNameInput.value = userData.lastName || '';
                        
                        // Format phone number if available
                        if (userData.phone && phoneInput) {
                            const phoneNum = userData.phone.replace('+63', '').trim();
                            phoneInput.value = formatPhoneNumber(phoneNum);
                            if (gcashPhoneInput) gcashPhoneInput.value = formatPhoneNumber(phoneNum);
                        }
                        
                        // Pre-fill address if available
                        if (userData.address) {
                            const streetAddressInput = document.getElementById('streetAddress');
                            const cityInput = document.getElementById('city');
                            const zipCodeInput = document.getElementById('zipCode');
                            
                            if (streetAddressInput) streetAddressInput.value = userData.address.street || '';
                            if (cityInput) cityInput.value = userData.address.city || '';
                            if (zipCodeInput) zipCodeInput.value = userData.address.zipCode || '';
                        }
                    }
                })
                .catch(error => {
                    console.log('No user details found in Firestore');
                });
        }
    }
}

function formatPhoneNumber(value) {
    if (!value) return '';
    
    // Remove all non-digits
    const cleaned = value.toString().replace(/\D/g, '');
    
    // Format as XXX XXX XXXX
    if (cleaned.length <= 3) {
        return cleaned;
    } else if (cleaned.length <= 6) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    } else {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    }
}

function setupPhoneFormatting() {
    // Format phone number as user types
    const phoneInputs = ['phone', 'gcashPhone'];
    
    phoneInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                
                // Limit to 10 digits (without country code)
                if (value.length > 10) {
                    value = value.slice(0, 10);
                }
                
                // Format the number
                e.target.value = formatPhoneNumber(value);
            });
            
            // Auto-fill GCash phone when regular phone is entered
            if (id === 'phone') {
                input.addEventListener('blur', function() {
                    const gcashInput = document.getElementById('gcashPhone');
                    if (gcashInput && !gcashInput.value && this.value) {
                        gcashInput.value = this.value;
                    }
                });
            }
        }
    });
}

function setupCardFormatting() {
    // Format card number
    const cardNumber = document.getElementById('cardNumber');
    if (cardNumber) {
        cardNumber.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            // Add spaces every 4 digits
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            
            // Limit to 16 digits + 3 spaces = 19 characters
            if (value.length > 19) {
                value = value.slice(0, 19);
            }
            
            e.target.value = value;
        });
    }
    
    // Format expiry date
    const expiryDate = document.getElementById('expiryDate');
    if (expiryDate) {
        expiryDate.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            // Add slash after 2 digits
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            
            // Limit to MM/YY (5 characters)
            if (value.length > 5) {
                value = value.slice(0, 5);
            }
            
            e.target.value = value;
        });
    }
}

function selectPayment(method) {
    console.log('Selecting payment method:', method);
    
    // Remove selected class from all payment options
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
        const radio = option.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });
    
    // Add selected class to clicked option
    const selectedOption = document.querySelector(`.payment-option input[value="${method}"]`);
    if (selectedOption) {
        const parent = selectedOption.closest('.payment-option');
        if (parent) {
            parent.classList.add('selected');
            selectedOption.checked = true;
        }
    }
    
    // Hide all payment details
    document.querySelectorAll('.payment-details').forEach(detail => {
        detail.classList.remove('active');
    });
    
    // Show selected payment details
    if (method === 'card') {
        const cardDetails = document.getElementById('cardDetails');
        if (cardDetails) cardDetails.classList.add('active');
        updateCODServiceFee(false);
    } else if (method === 'gcash') {
        const gcashDetails = document.getElementById('gcashDetails');
        if (gcashDetails) gcashDetails.classList.add('active');
        updateCODServiceFee(false);
    } else if (method === 'cod') {
        const codDetails = document.getElementById('codDetails');
        if (codDetails) codDetails.classList.add('active');
        updateCODServiceFee(true);
    }
}

function updateCODServiceFee(isCOD) {
    console.log('Updating COD service fee:', isCOD);
    
    const serviceFeeElement = document.getElementById('serviceFee');
    const totalElement = document.getElementById('total');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    
    if (!serviceFeeElement || !totalElement || !subtotalElement || !shippingElement) {
        console.error('Required elements not found for updating COD fee');
        return;
    }
    
    // Parse current values
    const subtotal = parseFloat(subtotalElement.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const shipping = parseFloat(shippingElement.textContent.replace(/[^0-9.-]+/g, '')) || 150.00;
    
    if (isCOD) {
        // Add ₱50 COD fee
        const codFee = 50.00;
        serviceFeeElement.textContent = formatCurrency(codFee);
        const total = subtotal + shipping + codFee;
        totalElement.textContent = formatCurrency(total);
        console.log('COD total:', total);
    } else {
        serviceFeeElement.textContent = formatCurrency(0.00);
        const total = subtotal + shipping;
        totalElement.textContent = formatCurrency(total);
        console.log('Non-COD total:', total);
    }
}

async function processCheckout() {
    console.log('=== PROCESSING CHECKOUT ===');
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to complete your purchase');
        window.location.href = 'login.html?redirect=checkout.html';
        return;
    }
    
    // Get form values
    const firstName = document.getElementById('firstName')?.value.trim();
    const lastName = document.getElementById('lastName')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const streetAddress = document.getElementById('streetAddress')?.value.trim();
    const city = document.getElementById('city')?.value.trim();
    const zipCode = document.getElementById('zipCode')?.value.trim();
    const phone = document.getElementById('phone')?.value.replace(/\s/g, '').trim();
    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    const orderNotes = document.getElementById('orderNotes')?.value.trim();
    
    // Basic validation
    if (!firstName || !lastName || !email || !streetAddress || !city || !zipCode || !phone) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate phone number (10 digits without country code)
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        alert('Please enter a valid 10-digit Philippine phone number (without 0 or +63)');
        return;
    }
    
    if (!paymentMethod) {
        alert('Please select a payment method');
        return;
    }
    
    // Get checkout data
    const checkoutData = JSON.parse(sessionStorage.getItem('checkoutProduct')) || 
                        JSON.parse(localStorage.getItem('lastCheckout'));
    
    if (!checkoutData || !checkoutData.product) {
        alert('Product information not found. Please try again.');
        return;
    }
    
    // Calculate totals from displayed values
    const subtotalText = document.getElementById('subtotal').textContent;
    const shippingText = document.getElementById('shipping').textContent;
    const serviceFeeText = document.getElementById('serviceFee').textContent;
    
    const subtotal = parseFloat(subtotalText.replace(/[^0-9.-]+/g, '')) || 0;
    const shipping = parseFloat(shippingText.replace(/[^0-9.-]+/g, '')) || 0;
    const serviceFee = parseFloat(serviceFeeText.replace(/[^0-9.-]+/g, '')) || 0;
    const total = subtotal + shipping + serviceFee;
    
    console.log('Checkout totals:', { subtotal, shipping, serviceFee, total });
    
    // Get GCash phone number if selected
    let gcashPhoneNumber = null;
    if (paymentMethod.value === 'gcash') {
        const gcashPhone = document.getElementById('gcashPhone')?.value.replace(/\s/g, '').trim();
        if (gcashPhone) {
            gcashPhoneNumber = '+63' + gcashPhone;
        }
    }
    
    // Create order object
    const order = {
        orderId: 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        userId: user.uid,
        userEmail: user.email,
        customer: {
            firstName,
            lastName,
            email,
            phone: '+63' + phone,
            shippingAddress: {
                street: streetAddress,
                city,
                zipCode
            }
        },
        products: [checkoutData.product],
        payment: {
            method: paymentMethod.value,
            gcashPhone: gcashPhoneNumber,
            status: paymentMethod.value === 'cod' ? 'pending' : 'pending_payment'
        },
        totals: {
            subtotal,
            shipping,
            serviceFee,
            total
        },
        status: 'pending',
        notes: orderNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        // Save order to Firestore
        const orderRef = await db.collection('orders').add(order);
        console.log('Order saved with ID:', orderRef.id);
        
        // Clear checkout data
        sessionStorage.removeItem('checkoutProduct');
        localStorage.removeItem('lastCheckout');
        
        // Show success message
        let message = `Order placed successfully!\n\nOrder ID: ${order.orderId}\nTotal: ${formatCurrency(total)}\n\n`;
        
        if (paymentMethod.value === 'gcash') {
            message += `GCash Payment Instructions:\n`;
            message += `1. Send payment to: FOOT LOCKER MERCHANT\n`;
            message += `2. Amount: ${formatCurrency(total)}\n`;
            message += `3. Reference: ${order.orderId}\n`;
            message += `4. Save your transaction receipt\n\n`;
            message += `Your order will be processed after payment confirmation.`;
        } else if (paymentMethod.value === 'cod') {
            message += `Your order will be delivered within 3-5 business days.\n`;
            message += `Please prepare ${formatCurrency(total)} for cash payment upon delivery.`;
        } else {
            message += `Your payment is being processed.`;
        }
        
        alert(message);
        
        // Redirect to order confirmation page
        window.location.href = `order-confirmation.html?orderId=${order.orderId}`;
        
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Error processing your order. Please try again.');
    }
}

function showError(message) {
    const orderSummary = document.querySelector('.order-summary');
    if (orderSummary) {
        orderSummary.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color: #e53935; margin-bottom: 20px;"></i>
                <h3 style="color: #e53935; margin-bottom: 10px;">Checkout Error</h3>
                <p style="color: #666; margin-bottom: 20px;">${message}</p>
                <a href="index.html" style="display: inline-block; padding: 10px 20px; background: #d50000; color: white; text-decoration: none; border-radius: 4px;">
                    <i class="fas fa-arrow-left"></i> Back to Products
                </a>
            </div>
        `;
    } else {
        alert(message);
    }
}

// Debug function
window.debugCheckoutData = function() {
    console.log('=== CHECKOUT DEBUG ===');
    console.log('Session Storage:', JSON.parse(sessionStorage.getItem('checkoutProduct')));
    console.log('Local Storage:', JSON.parse(localStorage.getItem('lastCheckout')));
    
    const data = JSON.parse(sessionStorage.getItem('checkoutProduct')) || 
                 JSON.parse(localStorage.getItem('lastCheckout'));
    
    if (data && data.product) {
        alert(`Checkout Data:\nProduct: ${data.product.name}\nPrice: ${data.product.price}\nQuantity: ${data.product.quantity}`);
    } else {
        alert('No checkout data found!');
    }
};

// Make functions globally available
window.selectPayment = selectPayment;
window.processCheckout = processCheckout;
window.debugCheckoutData = debugCheckoutData;
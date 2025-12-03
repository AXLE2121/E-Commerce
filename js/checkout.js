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
    
    // Check for checkout data
    const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
    const localStorageData = JSON.parse(localStorage.getItem('lastCheckout'));
    
    console.log('Session Storage data:', checkoutData);
    console.log('Local Storage data:', localStorageData);
    
    // Try sessionStorage first, then localStorage
    let dataToUse = null;
    
    if (checkoutData && (checkoutData.product || checkoutData.products)) {
        dataToUse = checkoutData;
        console.log('✅ Using sessionStorage data');
    } else if (localStorageData && (localStorageData.product || localStorageData.products)) {
        dataToUse = localStorageData;
        console.log('✅ Using localStorage data');
    }
    
    if (dataToUse) {
        console.log('✅ Checkout data found:', dataToUse);
        
        if (dataToUse.type === 'cart') {
            // This is from cart (multiple products)
            displayCartOrderSummary(dataToUse);
        } else {
            // This is from single product (buy now)
            displaySingleOrderSummary(dataToUse);
        }
        
        updateUserInfo(dataToUse.user);
    } else {
        console.error('❌ No checkout data found!');
        showError('No products selected. Please go back and select products to checkout.');
    }
    
    // Initialize payment method
    selectPayment('gcash'); // Default to GCash
    
    // Format phone number inputs
    setupPhoneFormatting();
    
    // Format card number
    setupCardFormatting();
});

// Display order summary for single product
function displaySingleOrderSummary(data) {
    const orderItems = document.getElementById('orderItems');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const serviceFeeElement = document.getElementById('serviceFee');
    const totalElement = document.getElementById('total');
    
    if (!orderItems || !subtotalElement || !shippingElement || !serviceFeeElement || !totalElement) {
        console.error('❌ Order summary elements not found!');
        return;
    }
    
    const product = data.product;
    let price = product.price;
    
    // Convert to number if it's a string
    if (typeof price === 'string') {
        price = price.toString().replace(/[^0-9.-]+/g, '');
        price = parseFloat(price);
    }
    
    if (isNaN(price) || price <= 0) {
        console.error('❌ Invalid price after conversion:', price);
        showError('Error: Product price is invalid. Please go back and select the product again.');
        return;
    }
    
    const quantity = parseInt(product.quantity) || 1;
    const subtotal = price * quantity;
    const shipping = 150.00;
    const serviceFee = 0.00;
    const total = subtotal + shipping + serviceFee;
    
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
    
    subtotalElement.textContent = formatCurrency(subtotal);
    shippingElement.textContent = formatCurrency(shipping);
    serviceFeeElement.textContent = formatCurrency(serviceFee);
    totalElement.textContent = formatCurrency(total);
    
    console.log('✅ Single product order summary displayed');
}

// Display order summary for cart (multiple products)
function displayCartOrderSummary(data) {
    const orderItems = document.getElementById('orderItems');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const serviceFeeElement = document.getElementById('serviceFee');
    const totalElement = document.getElementById('total');
    
    if (!orderItems || !subtotalElement || !shippingElement || !serviceFeeElement || !totalElement) {
        console.error('❌ Order summary elements not found!');
        return;
    }
    
    const products = data.products || [];
    let subtotal = 0;
    
    if (products.length === 0) {
        showError('No products in cart. Please go back and add products.');
        return;
    }
    
    // Generate HTML for all products
    const productsHTML = products.map(product => {
        let price = product.price;
        if (typeof price === 'string') {
            price = parseFloat(price.replace(/[^0-9.-]+/g, ''));
        }
        
        if (isNaN(price)) price = 0;
        const quantity = parseInt(product.quantity) || 1;
        const productTotal = price * quantity;
        subtotal += productTotal;
        
        return `
            <div class="order-item" style="display: flex; padding: 15px; border-bottom: 1px solid #eee; align-items: center;">
                <div class="product-image">
                    <img src="${product.image || 'https://via.placeholder.com/60x60?text=No+Image'}" 
                         alt="${product.name}"
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                </div>
                <div class="product-details" style="flex: 1; margin-left: 15px;">
                    <div style="font-weight: bold; color: #d50000; font-size: 12px;">${product.brand || ''}</div>
                    <div style="font-weight: bold; margin: 2px 0; font-size: 14px;">${product.name || 'Product'}</div>
                    <div style="color: #666; font-size: 12px;">
                        <div>Size: ${product.size || 'N/A'} | Color: ${product.color || 'N/A'}</div>
                        <div>Quantity: ${quantity} × ${formatCurrency(price)}</div>
                    </div>
                </div>
                <div style="font-weight: bold; font-size: 14px; color: #333;">
                    ${formatCurrency(productTotal)}
                </div>
            </div>
        `;
    }).join('');
    
    const shipping = 150.00;
    const serviceFee = 0.00;
    const total = subtotal + shipping + serviceFee;
    
    orderItems.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #d50000;">
            Ordering ${products.length} ${products.length === 1 ? 'item' : 'items'}
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            ${productsHTML}
        </div>
    `;
    
    subtotalElement.textContent = formatCurrency(subtotal);
    shippingElement.textContent = formatCurrency(shipping);
    serviceFeeElement.textContent = formatCurrency(serviceFee);
    totalElement.textContent = formatCurrency(total);
    
    console.log('✅ Cart order summary displayed:', products.length, 'items');
}

function updateUserInfo(user) {
    if (user && user.email) {
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.value = user.email;
        
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
                        
                        if (userData.phone && phoneInput) {
                            const phoneNum = userData.phone.replace('+63', '').trim();
                            phoneInput.value = formatPhoneNumber(phoneNum);
                            if (gcashPhoneInput) gcashPhoneInput.value = formatPhoneNumber(phoneNum);
                        }
                        
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
    const cleaned = value.toString().replace(/\D/g, '');
    
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
    const phoneInputs = ['phone', 'gcashPhone'];
    
    phoneInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 10) value = value.slice(0, 10);
                e.target.value = formatPhoneNumber(value);
            });
            
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
    const cardNumber = document.getElementById('cardNumber');
    if (cardNumber) {
        cardNumber.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            if (value.length > 19) value = value.slice(0, 19);
            e.target.value = value;
        });
    }
    
    const expiryDate = document.getElementById('expiryDate');
    if (expiryDate) {
        expiryDate.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            if (value.length > 5) {
                value = value.slice(0, 5);
            }
            e.target.value = value;
        });
    }
}

function selectPayment(method) {
    console.log('Selecting payment method:', method);
    
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
        const radio = option.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });
    
    const selectedOption = document.querySelector(`.payment-option input[value="${method}"]`);
    if (selectedOption) {
        const parent = selectedOption.closest('.payment-option');
        if (parent) {
            parent.classList.add('selected');
            selectedOption.checked = true;
        }
    }
    
    document.querySelectorAll('.payment-details').forEach(detail => {
        detail.classList.remove('active');
    });
    
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
    const serviceFeeElement = document.getElementById('serviceFee');
    const totalElement = document.getElementById('total');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    
    if (!serviceFeeElement || !totalElement || !subtotalElement || !shippingElement) {
        console.error('Required elements not found for updating COD fee');
        return;
    }
    
    const subtotal = parseFloat(subtotalElement.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const shipping = parseFloat(shippingElement.textContent.replace(/[^0-9.-]+/g, '')) || 150.00;
    
    if (isCOD) {
        const codFee = 50.00;
        serviceFeeElement.textContent = formatCurrency(codFee);
        const total = subtotal + shipping + codFee;
        totalElement.textContent = formatCurrency(total);
    } else {
        serviceFeeElement.textContent = formatCurrency(0.00);
        const total = subtotal + shipping;
        totalElement.textContent = formatCurrency(total);
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
    
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        alert('Please enter a valid 10-digit Philippine phone number (without 0 or +63)');
        return;
    }
    
    if (!paymentMethod) {
        alert('Please select a payment method');
        return;
    }
    
    // Get checkout data
    const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData')) || 
                        JSON.parse(localStorage.getItem('lastCheckout'));
    
    if (!checkoutData) {
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
    
    // Get products from checkout data
    let products = [];
    if (checkoutData.type === 'cart') {
        products = checkoutData.products || [];
    } else {
        products = [checkoutData.product];
    }
    
    if (products.length === 0) {
        alert('No products found in order. Please try again.');
        return;
    }
    
    // Create order object
    const orderId = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const order = {
        orderId: orderId,
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
        products: products,
        payment: {
            method: paymentMethod.value,
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
    
    // Add GCash phone if selected
    if (paymentMethod.value === 'gcash') {
        const gcashPhone = document.getElementById('gcashPhone')?.value.replace(/\s/g, '').trim();
        if (gcashPhone) {
            order.payment.gcashPhone = '+63' + gcashPhone;
        }
    }
    
    try {
        // Save order to Firestore
        const orderRef = await db.collection('orders').add(order);
        console.log('Order saved with ID:', orderRef.id);
        
        // Also save to user's orders subcollection
        await db.collection('users').doc(user.uid).collection('orders').doc(orderId).set(order);
        
        // Clear cart for purchased items if from cart
        if (checkoutData.type === 'cart') {
            await clearPurchasedItems(user.uid, products);
        }
        
        // Clear checkout data
        sessionStorage.removeItem('checkoutData');
        localStorage.removeItem('lastCheckout');
        
        // Show success message
        let message = `Order placed successfully!\n\nOrder ID: ${orderId}\nTotal: ${formatCurrency(total)}\n\n`;
        
        if (paymentMethod.value === 'gcash') {
            message += `GCash Payment Instructions:\n`;
            message += `1. Send payment to: FOOT LOCKER MERCHANT\n`;
            message += `2. Amount: ${formatCurrency(total)}\n`;
            message += `3. Reference: ${orderId}\n`;
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
        window.location.href = `order-confirmation.html?orderId=${orderId}`;
        
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Error processing your order. Please try again.');
    }
}

async function clearPurchasedItems(userId, purchasedProducts) {
    try {
        const db = firebase.firestore();
        const cartSnapshot = await db.collection('cart')
            .where('userId', '==', userId)
            .get();
        
        const batch = db.batch();
        
        cartSnapshot.docs.forEach(doc => {
            const cartItem = doc.data();
            // Check if this cart item is in the purchased products
            const isPurchased = purchasedProducts.some(product => 
                product.id === cartItem.productId
            );
            
            if (isPurchased) {
                batch.delete(doc.ref);
            }
        });
        
        await batch.commit();
        console.log('Cleared purchased items from cart');
        
        // Also clear from localStorage
        let localCart = JSON.parse(localStorage.getItem('footLocker_cart')) || [];
        localCart = localCart.filter(localItem => {
            return !purchasedProducts.some(product => product.id === localItem.productId);
        });
        localStorage.setItem('footLocker_cart', JSON.stringify(localCart));
        
    } catch (error) {
        console.error('Error clearing purchased items:', error);
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
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <a href="index.html" style="display: inline-block; padding: 10px 20px; background: #d50000; color: white; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-arrow-left"></i> Back to Products
                    </a>
                    <a href="cart.html" style="display: inline-block; padding: 10px 20px; background: #333; color: white; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-shopping-cart"></i> View Cart
                    </a>
                </div>
            </div>
        `;
    } else {
        alert(message);
    }
}

// Debug function
window.debugCheckoutData = function() {
    console.log('=== CHECKOUT DEBUG ===');
    console.log('Session Storage:', JSON.parse(sessionStorage.getItem('checkoutData')));
    console.log('Local Storage:', JSON.parse(localStorage.getItem('lastCheckout')));
    
    const data = JSON.parse(sessionStorage.getItem('checkoutData')) || 
                 JSON.parse(localStorage.getItem('lastCheckout'));
    
    if (data) {
        if (data.type === 'cart') {
            alert(`Cart Checkout:\n${data.products?.length || 0} items\nTotal: ₱${data.totals?.total || 0}`);
        } else {
            alert(`Single Product:\n${data.product?.name}\nPrice: ${data.product?.price}`);
        }
    } else {
        alert('No checkout data found!');
    }
};

// Make functions globally available
window.selectPayment = selectPayment;
window.processCheckout = processCheckout;
window.debugCheckoutData = debugCheckoutData;
// admin.js - Admin Panel with URL-based Image Upload
console.log('admin.js loaded - Complete version with URL-based image upload');

// Global variables
let currentUser = null;
let products = [];
let orders = [];
let users = [];
let currentPage = 1;
const itemsPerPage = 10;

// DOM elements
const userInfo = document.getElementById('userInfo');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const adminNavLinks = document.querySelectorAll('.admin-nav-link');
const adminSections = document.querySelectorAll('.admin-section');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Variables for image upload
let selectedImageFile = null;
let imagePreviewUrl = null;

// Check admin authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking Firebase...');
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized');
    }
    checkAdminAuth();
    initializeEventListeners();
    setupNavigation();
    setupImageUpload();
});

// Setup image upload functionality with URL option
function setupImageUpload() {
    const imageFileInput = document.getElementById('productImageFile');
    const imageUrlInput = document.getElementById('productImageUrl');
    const imagePreview = document.getElementById('imagePreviewImg');
    const previewPlaceholder = document.querySelector('.image-preview-placeholder');
    
    // URL input handler
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', function(e) {
            const url = e.target.value.trim();
            if (url) {
                previewImageFromUrl(url);
            }
        });
        
        // Also allow blur event
        imageUrlInput.addEventListener('blur', function() {
            const url = this.value.trim();
            if (url) {
                previewImageFromUrl(url);
            }
        });
    }
    
    // File input handler (for local files - will convert to data URL)
    if (imageFileInput) {
        imageFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (!file) {
                resetImageUpload();
                return;
            }
            
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showMessage('Please select a valid image file (JPG, PNG, GIF, WebP)', 'error');
                resetImageUpload();
                return;
            }
            
            // Validate file size (5MB max for data URL)
            if (file.size > 5 * 1024 * 1024) {
                showMessage('Image size should be less than 5MB for data URL conversion', 'error');
                resetImageUpload();
                return;
            }
            
            // Convert to data URL
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreviewUrl = e.target.result;
                imagePreview.src = imagePreviewUrl;
                imagePreview.style.display = 'block';
                previewPlaceholder.style.display = 'none';
                
                // Show info
                showMessage('Image converted to data URL. Better to use URL option for production.', 'info');
            };
            reader.readAsDataURL(file);
        });
    }
}

// Preview image from URL
function previewImageFromUrl(url) {
    const imagePreview = document.getElementById('imagePreviewImg');
    const previewPlaceholder = document.querySelector('.image-preview-placeholder');
    const imageUrlInput = document.getElementById('productImageUrl');
    
    if (!url || url.trim() === '') {
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.style.display = 'none';
        }
        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'flex';
        }
        return;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        showMessage('Please enter a valid URL (e.g., https://example.com/image.jpg)', 'error');
        if (imageUrlInput) imageUrlInput.focus();
        return;
    }
    
    // Create a test image to check if it loads
    const testImage = new Image();
    testImage.onload = function() {
        // Image loaded successfully
        imagePreviewUrl = url;
        
        // Update preview
        if (imagePreview) {
            imagePreview.src = url;
            imagePreview.style.display = 'block';
        }
        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'none';
        }
        
        showMessage('✓ Image URL is valid', 'success');
    };
    
    testImage.onerror = function() {
        showMessage('❌ Cannot load image from this URL. Please check the link.', 'error');
        if (imageUrlInput) imageUrlInput.focus();
    };
    
    testImage.src = url;
}

// Reset image upload
function resetImageUpload() {
    const imageFileInput = document.getElementById('productImageFile');
    const imageUrlInput = document.getElementById('productImageUrl');
    const imagePreview = document.getElementById('imagePreviewImg');
    const previewPlaceholder = document.querySelector('.image-preview-placeholder');
    
    if (imageFileInput) imageFileInput.value = '';
    if (imageUrlInput) imageUrlInput.value = '';
    
    if (imagePreview) {
        imagePreview.src = '';
        imagePreview.style.display = 'none';
    }
    
    if (previewPlaceholder) {
        previewPlaceholder.style.display = 'flex';
    }
}

// Check if user is admin
async function checkAdminAuth() {
    showLoading(true);
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            
            // Check if user is admin
            const isAdmin = await checkIfAdmin(user.uid);
            
            if (isAdmin) {
                // User is admin, show admin panel
                updateUIForAdmin(user);
                loadDashboardData();
            } else {
                // User is not admin, redirect to home
                alert("Access denied. Admin privileges required.");
                window.location.href = "index.html";
            }
        } else {
            // No user logged in, redirect to login
            window.location.href = "login.html";
        }
        showLoading(false);
    });
}

// Check if user has admin privileges
async function checkIfAdmin(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Check if user has admin role
            if (userData.role === 'admin') {
                return true;
            }
        }
        
        // Also check by email
        const user = auth.currentUser;
        if (user && user.email === 'admin@shoehub.com') {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// Update UI for admin
function updateUIForAdmin(user) {
    if (userInfo) userInfo.style.display = 'flex';
    if (userEmail) userEmail.textContent = user.email;
    
    // Add logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }
}

// ========== PRODUCT MANAGEMENT FUNCTIONS ==========
async function handleAddProduct(e) {
    e.preventDefault();
    console.log('Adding new product...');
    
    showLoading(true);
    
    try {
        // Get form values
        const productData = {
            name: document.getElementById('productName').value.trim(),
            brand: document.getElementById('productBrand').value,
            category: document.getElementById('productCategory').value,
            gender: document.getElementById('productGender').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            description: document.getElementById('productDescription').value.trim(),
            rating: parseFloat(document.getElementById('productRating').value) || 4.5,
            reviews: parseInt(document.getElementById('productReviews').value) || 0,
            featured: document.getElementById('productFeatured').checked,
            sizes: document.getElementById('productSizes').value
                ? document.getElementById('productSizes').value.split(',').map(s => s.trim())
                : [],
            colors: document.getElementById('productColors').value
                ? document.getElementById('productColors').value.split(',').map(c => c.trim())
                : [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Get image from URL input or data URL
        const imageUrlInput = document.getElementById('productImageUrl');
        const imageFileInput = document.getElementById('productImageFile');

        if (imageUrlInput && imageUrlInput.value.trim()) {
            // Use URL from input
            productData.image = imageUrlInput.value.trim();
        } else if (imageFileInput && imageFileInput.files[0]) {
            // Use data URL from file upload
            productData.image = imagePreviewUrl || "https://via.placeholder.com/600x400/cccccc/969696?text=No+Image";
        } else {
            // Use default placeholder
            productData.image = "https://via.placeholder.com/600x400/cccccc/969696?text=No+Image";
        }
        
        // Add product to Firestore
        const productRef = await db.collection('products').add(productData);
        console.log('Product added with ID:', productRef.id);
        
        // Show success message
        showMessage('Product added successfully!', 'success');
        
        // Close modal
        closeModal('addProductModal');
        
        // Reset form
        document.getElementById('addProductForm').reset();
        resetImageUpload();
        
        // Refresh products list
        loadProducts();
        
    } catch (error) {
        console.error('Error adding product:', error);
        showMessage('Error adding product: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Edit product
async function editProduct(productId) {
    console.log('editProduct called with ID:', productId);
    showLoading(true);
    
    try {
        const productDoc = await db.collection('products').doc(productId).get();
        
        if (productDoc.exists) {
            const product = productDoc.data();
            showEditProductModal(productId, product);
        } else {
            showMessage('Product not found', 'error');
        }
    } catch (error) {
        console.error('Error editing product:', error);
        showMessage('Error loading product', 'error');
    }
    
    showLoading(false);
}

// Show edit product modal
function showEditProductModal(productId, product) {
    console.log('Showing edit modal for product:', productId);
    
    const modalHTML = `
        <form id="editProductForm">
            <input type="hidden" id="editProductId" value="${productId}">
            
            <div class="form-row">
                <div class="form-group">
                    <label>Product Name *</label>
                    <input type="text" id="editProductName" value="${product.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Brand *</label>
                    <select id="editProductBrand" required>
                        <option value="NIKE" ${product.brand === 'NIKE' ? 'selected' : ''}>NIKE</option>
                        <option value="ADIDAS" ${product.brand === 'ADIDAS' ? 'selected' : ''}>ADIDAS</option>
                        <option value="PUMA" ${product.brand === 'PUMA' ? 'selected' : ''}>PUMA</option>
                        <option value="REEBOK" ${product.brand === 'REEBOK' ? 'selected' : ''}>REEBOK</option>
                        <option value="NEW BALANCE" ${product.brand === 'NEW BALANCE' ? 'selected' : ''}>NEW BALANCE</option>
                        <option value="CONVERSE" ${product.brand === 'CONVERSE' ? 'selected' : ''}>CONVERSE</option>
                        <option value="VANS" ${product.brand === 'VANS' ? 'selected' : ''}>VANS</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Category *</label>
                    <select id="editProductCategory" required>
                        <option value="Running" ${product.category === 'Running' ? 'selected' : ''}>Running</option>
                        <option value="Basketball" ${product.category === 'Basketball' ? 'selected' : ''}>Basketball</option>
                        <option value="Lifestyle" ${product.category === 'Lifestyle' ? 'selected' : ''}>Lifestyle</option>
                        <option value="Training" ${product.category === 'Training' ? 'selected' : ''}>Training</option>
                        <option value="Sneakers" ${product.category === 'Sneakers' ? 'selected' : ''}>Sneakers</option>
                        <option value="Casual" ${product.category === 'Casual' ? 'selected' : ''}>Casual</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Gender *</label>
                    <select id="editProductGender" required>
                        <option value="Men" ${product.gender === 'Men' ? 'selected' : ''}>Men</option>
                        <option value="Women" ${product.gender === 'Women' ? 'selected' : ''}>Women</option>
                        <option value="Unisex" ${product.gender === 'Unisex' ? 'selected' : ''}>Unisex</option>
                        <option value="Kids" ${product.gender === 'Kids' ? 'selected' : ''}>Kids</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Price *</label>
                    <input type="number" id="editProductPrice" step="0.01" min="0" value="${product.price || 0}" required>
                </div>
                <div class="form-group">
                    <label>Stock Quantity *</label>
                    <input type="number" id="editProductStock" min="0" value="${product.stock || 0}" required>
                </div>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea id="editProductDescription" rows="3">${product.description || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Product Image</label>
                <div class="image-upload-container">
                    <div class="image-preview" id="editImagePreview">
                        ${product.image ? `
                            <img src="${product.image}" id="editImagePreviewImg" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                        ` : `
                            <div class="image-preview-placeholder">
                                <i class="fas fa-image"></i>
                                <p>No image selected</p>
                            </div>
                        `}
                    </div>
                    <div class="upload-controls">
                        <!-- Option 1: URL Input -->
                        <div class="url-upload-option">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Option 1: Paste Image URL</label>
                            <input type="url" 
                                   id="editProductImageUrl" 
                                   placeholder="https://example.com/image.jpg"
                                   value="${product.image && product.image.startsWith('http') ? product.image : ''}"
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;"
                                   oninput="previewEditImageFromUrl(this.value)">
                            <small style="color: #666; display: block; margin-bottom: 10px;">
                                Leave empty to keep current image
                            </small>
                        </div>
                        
                        <div class="or-separator" style="text-align: center; margin: 15px 0;">
                            <span style="background: white; padding: 0 10px; color: #666;">OR</span>
                            <hr style="border: none; border-top: 1px solid #ddd; margin-top: -8px;">
                        </div>
                        
                        <!-- Option 2: File Upload -->
                        <div class="file-upload-option">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Option 2: Upload New Image</label>
                            <input type="file" id="editProductImageFile" accept="image/*" style="display: none;">
                            <button type="button" class="secondary-btn" onclick="document.getElementById('editProductImageFile').click()" style="width: 100%;">
                                <i class="fas fa-upload"></i> Choose Local Image
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Sizes (comma separated)</label>
                    <input type="text" id="editProductSizes" value="${(product.sizes || []).join(', ')}" placeholder="7,8,9,10,11,12">
                </div>
                <div class="form-group">
                    <label>Colors (comma separated)</label>
                    <input type="text" id="editProductColors" value="${(product.colors || []).join(', ')}" placeholder="Black,White,Red">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Rating (0-5)</label>
                    <input type="number" id="editProductRating" min="0" max="5" step="0.1" value="${product.rating || 4.5}">
                </div>
                <div class="form-group">
                    <label>Review Count</label>
                    <input type="number" id="editProductReviews" min="0" value="${product.reviews || 0}">
                </div>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="editProductFeatured" ${product.featured ? 'checked' : ''}> 
                    Featured Product
                </label>
            </div>
            
            <div class="form-actions">
                <button type="button" class="secondary-btn" onclick="closeModal('editProductModal')">Cancel</button>
                <button type="submit" class="primary-btn">Update Product</button>
            </div>
        </form>
    `;
    
    // Set modal content
    const modalBody = document.querySelector('#editProductModal .modal-body');
    if (modalBody) {
        modalBody.innerHTML = modalHTML;
    }
    
    // Show modal
    document.getElementById('editProductModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Add event listener for edit form submission
    const editForm = document.getElementById('editProductForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateProduct(productId);
        });
    }
    
    // Setup edit image upload
    const editImageFileInput = document.getElementById('editProductImageFile');
    if (editImageFileInput) {
        editImageFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const editImagePreview = document.getElementById('editImagePreviewImg');
                    const editPlaceholder = document.querySelector('#editImagePreview .image-preview-placeholder');
                    if (editImagePreview) {
                        editImagePreview.src = e.target.result;
                        editImagePreview.style.display = 'block';
                    }
                    if (editPlaceholder) {
                        editPlaceholder.style.display = 'none';
                    }
                    showMessage('Image converted to data URL. Better to use URL option for production.', 'info');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Preview edit image from URL
function previewEditImageFromUrl(url) {
    const editImagePreview = document.getElementById('editImagePreviewImg');
    const editPlaceholder = document.querySelector('#editImagePreview .image-preview-placeholder');
    
    if (!url || url.trim() === '') {
        // Show placeholder if URL is empty
        if (editImagePreview) {
            editImagePreview.style.display = 'none';
        }
        if (editPlaceholder) {
            editPlaceholder.style.display = 'flex';
        }
        return;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        showMessage('Please enter a valid URL (e.g., https://example.com/image.jpg)', 'error');
        return;
    }
    
    // Create a test image to check if it loads
    const testImage = new Image();
    testImage.onload = function() {
        // Update preview
        if (editImagePreview) {
            editImagePreview.src = url;
            editImagePreview.style.display = 'block';
        }
        if (editPlaceholder) {
            editPlaceholder.style.display = 'none';
        }
    };
    
    testImage.onerror = function() {
        showMessage('Cannot load image from this URL', 'error');
    };
    
    testImage.src = url;
}

// Update product
async function updateProduct(productId) {
    showLoading(true);
    
    try {
        const productData = {
            name: document.getElementById('editProductName').value.trim(),
            brand: document.getElementById('editProductBrand').value,
            category: document.getElementById('editProductCategory').value,
            gender: document.getElementById('editProductGender').value,
            price: parseFloat(document.getElementById('editProductPrice').value),
            stock: parseInt(document.getElementById('editProductStock').value),
            description: document.getElementById('editProductDescription').value.trim(),
            rating: parseFloat(document.getElementById('editProductRating').value),
            reviews: parseInt(document.getElementById('editProductReviews').value),
            featured: document.getElementById('editProductFeatured').checked,
            sizes: document.getElementById('editProductSizes').value
                ? document.getElementById('editProductSizes').value.split(',').map(s => s.trim())
                : [],
            colors: document.getElementById('editProductColors').value
                ? document.getElementById('editProductColors').value.split(',').map(c => c.trim())
                : [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update image if changed (URL or file)
        const editImageUrlInput = document.getElementById('editProductImageUrl');
        const editImageFileInput = document.getElementById('editProductImageFile');

        if (editImageUrlInput && editImageUrlInput.value.trim()) {
            // Use new URL from input
            productData.image = editImageUrlInput.value.trim();
        } else if (editImageFileInput && editImageFileInput.files[0]) {
            // Convert file to data URL
            const file = editImageFileInput.files[0];
            const reader = new FileReader();
            
            await new Promise((resolve) => {
                reader.onload = function(e) {
                    productData.image = e.target.result;
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }
        // If neither is provided, the existing image will be kept (not included in update)
        
        await db.collection('products').doc(productId).update(productData);
        
        showMessage('Product updated successfully!', 'success');
        closeModal('editProductModal');
        loadProducts();
        
    } catch (error) {
        console.error('Error updating product:', error);
        showMessage('Error updating product: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Confirm delete product
function confirmDelete(productId) {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.dataset.productId = productId;
        modal.style.display = 'flex';
    }
}

// Delete product
async function deleteProduct(productId) {
    showLoading(true);
    
    try {
        await db.collection('products').doc(productId).delete();
        
        showMessage('Product deleted successfully!', 'success');
        closeModal('deleteModal');
        loadProducts();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showMessage('Error deleting product: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Add Product Form
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }
    
    // Product Search
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(searchProducts, 300));
    }
    
    // Select All checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', toggleSelectAll);
    }
    
    // Confirm Delete button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const productId = document.getElementById('deleteModal').dataset.productId;
            if (productId) {
                deleteProduct(productId);
            }
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

// Toggle select all checkboxes
function toggleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
    });
}

// Search products
function searchProducts(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    renderProductsTable(filteredProducts);
}

// View product details
async function viewProduct(productId) {
    try {
        const productDoc = await db.collection('products').doc(productId).get();
        if (productDoc.exists) {
            const product = productDoc.data();
            showMessage(`Viewing: ${product.name}`, 'success');
        }
    } catch (error) {
        console.error('Error viewing product:', error);
    }
}

// Setup navigation
function setupNavigation() {
    adminNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Update active nav link
            adminNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show target section
            adminSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId + 'Content') {
                    section.classList.add('active');
                    
                    // Load section data
                    switch(targetId) {
                        case 'dashboard':
                            loadDashboardData();
                            break;
                        case 'products':
                            loadProducts();
                            break;
                        case 'orders':
                            loadOrders();
                            break;
                        case 'users':
                            loadUsers();
                            break;
                        case 'analytics':
                            loadAnalytics();
                            break;
                    }
                }
            });
        });
    });
}

// ========== DASHBOARD FUNCTIONS ==========
async function loadDashboardData() {
    showLoading(true);
    
    try {
        // Load total products
        const productsSnapshot = await db.collection('products').get();
        const totalProducts = productsSnapshot.size;
        document.getElementById('totalProducts').textContent = totalProducts;
        
        // Load total orders
        const ordersSnapshot = await db.collection('orders').get();
        const totalOrders = ordersSnapshot.size;
        document.getElementById('totalOrders').textContent = totalOrders;
        
        // Load total users
        //const usersSnapshot = await db.collection('users').get();
        //const totalUsers = usersSnapshot.size;
       // document.getElementById('totalUsers').textContent = totalUsers;
        
        // Load total revenue (calculate from orders)
        //let totalRevenue = 0;
        //ordersSnapshot.forEach(doc => {
           // const order = doc.data();
            //totalRevenue += order.totals ? order.totals.total : 0;
       // });
       // document.getElementById('totalRevenue').textContent = `₱${totalRevenue.toFixed(2)}`;
        
        // Load recent products
        loadRecentProducts();
        
        // Load recent activity
        loadRecentActivity();
        
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showMessage("Error loading dashboard data: " + error.message, "error");
    }
    
    showLoading(false);
}

// Load all products
async function loadProducts() {
    showLoading(true);
    console.log('Loading products...');
    
    try {
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('Products loaded:', products.length);
        
        renderProductsTable();
        setupPagination();
        
    } catch (error) {
        console.error("Error loading products:", error);
        showMessage("Error loading products", "error");
    }
    
    showLoading(false);
}

// Render products table
function renderProductsTable(filteredProducts = products) {
    const productsTable = document.getElementById('productsTable');
    if (!productsTable) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    productsTable.innerHTML = paginatedProducts.map(product => `
        <tr>
            <td><input type="checkbox" class="product-checkbox" value="${product.id}"></td>
            <td>
                <img src="${product.image || 'https://via.placeholder.com/50'}" 
                     alt="${product.name}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;"
                     onclick="openImagePreview('${product.image}')">
            </td>
            <td>
                <strong>${product.name}</strong>
                <br>
                <small>${product.description ? product.description.substring(0, 50) + '...' : ''}</small>
            </td>
            <td>${product.brand}</td>
            <td>${product.category || 'N/A'}</td>
            <td>₱${product.price?.toFixed(2) || '0.00'}</td>
            <td>${product.stock || 0}</td>
            <td>
                <span class="status-badge ${product.stock > 0 ? 'status-active' : 'status-inactive'}">
                    ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="window.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="confirmDelete('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="action-btn view-btn" onclick="viewProduct('${product.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ========== ORDERS MANAGEMENT FUNCTIONS ==========
async function loadOrders() {
    const ordersTable = document.getElementById('ordersTable');
    if (!ordersTable) return;
    
    showLoading(true);
    
    try {
        // Get all orders from Firestore
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            ordersTable.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-shopping-bag" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                        <p>No orders yet</p>
                        <p style="color: #666; font-size: 14px;">Orders will appear here when customers make purchases</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        orders = [];
        snapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderOrdersTable(orders);
        
    } catch (error) {
        console.error("Error loading orders:", error);
        ordersTable.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #f44336; margin-bottom: 20px;"></i>
                    <p>Error loading orders</p>
                    <p style="font-size: 12px; color: #666;">${error.message}</p>
                    <button onclick="loadOrders()" style="margin-top: 10px; padding: 8px 16px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </td>
            </tr>
        `;
    }
    
    showLoading(false);
}

function renderOrdersTable(orders) {
    const ordersTable = document.getElementById('ordersTable');
    if (!ordersTable) return;
    
    ordersTable.innerHTML = orders.map(order => {
        // Format date
        let orderDate = 'N/A';
        try {
            if (order.createdAt) {
                const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                orderDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            console.log('Error formatting date:', e);
        }
        
        // Get customer info
        const customerName = order.customer ? 
            `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 
            order.customer.email || 
            'Unknown' : 
            'Unknown';
        
        // Calculate total
        const total = order.totals && order.totals.total ? order.totals.total : 0;
        
        // Get status badge
        const statusBadge = getOrderStatusBadge(order.status || 'pending');
        
        return `
            <tr data-order-id="${order.id}">
                <td>
                    <strong style="font-family: monospace;">${order.orderId || 'N/A'}</strong><br>
                    <small style="color: #666; font-size: 11px;">${order.id.substring(0, 8)}...</small>
                </td>
                <td>
                    <div style="font-weight: bold; margin-bottom: 3px;">${customerName}</div>
                    ${order.customer && order.customer.email ? 
                        `<div style="font-size: 11px; color: #666; margin-bottom: 2px;">📧 ${order.customer.email}</div>` : 
                        ''
                    }
                    ${order.customer && order.customer.phone ? 
                        `<div style="font-size: 11px; color: #666;">📱 ${order.customer.phone}</div>` : 
                        ''
                    }
                </td>
                <td style="white-space: nowrap;">${orderDate}</td>
                <td>
                    <strong style="color: #d50000;">₱${typeof total === 'number' ? total.toFixed(2) : '0.00'}</strong><br>
                    <small style="color: #666; font-size: 11px;">
                        ${order.payment ? order.payment.method.toUpperCase() : 'N/A'}
                    </small>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 5px;">
                        <button class="action-btn view-btn" onclick="viewOrderDetails('${order.id}')" title="View Details" style="background: #2196f3; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="editOrderStatus('${order.id}')" title="Edit Status" style="background: #4caf50; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteOrder('${order.id}')" title="Delete Order" style="background: #f44336; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getOrderStatusBadge(status) {
    const badges = {
        'pending': `<span class="status-badge" style="background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; padding: 3px 8px; border-radius: 12px; font-size: 11px; display: inline-block;">⏳ Pending</span>`,
        'processing': `<span class="status-badge" style="background: #cce5ff; color: #004085; border: 1px solid #b8daff; padding: 3px 8px; border-radius: 12px; font-size: 11px; display: inline-block;">🔄 Processing</span>`,
        'shipped': `<span class="status-badge" style="background: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 3px 8px; border-radius: 12px; font-size: 11px; display: inline-block;">🚚 Shipped</span>`,
        'delivered': `<span class="status-badge" style="background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; padding: 3px 8px; border-radius: 12px; font-size: 11px; display: inline-block;">✅ Delivered</span>`,
        'cancelled': `<span class="status-badge" style="background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 3px 8px; border-radius: 12px; font-size: 11px; display: inline-block;">❌ Cancelled</span>`
    };
    return badges[status.toLowerCase()] || `<span class="status-badge" style="background: #f5f5f5; color: #666; border: 1px solid #ddd; padding: 3px 8px; border-radius: 12px; font-size: 11px; display: inline-block;">${status}</span>`;
}

async function viewOrderDetails(orderId) {
    showLoading(true);
    
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        
        if (doc.exists) {
            const order = doc.data();
            showOrderDetailsModal(orderId, order);
        } else {
            showMessage('Order not found', 'error');
        }
    } catch (error) {
        console.error('Error viewing order:', error);
        showMessage('Error loading order details', 'error');
    }
    
    showLoading(false);
}

function showOrderDetailsModal(orderId, order) {
    // Format date
    let orderDate = 'N/A';
    let createdAt = 'N/A';
    
    try {
        if (order.createdAt) {
            const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            orderDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            createdAt = date.toLocaleString('en-US');
        }
    } catch (e) {
        console.log('Error formatting date:', e);
    }
    
    // Format products list
    const productsHTML = order.products ? order.products.map(product => `
        <div style="display: flex; align-items: center; padding: 10px; background: white; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e0e0e0;">
            <div style="width: 60px; height: 60px; margin-right: 15px; flex-shrink: 0;">
                <img src="${product.image || 'https://via.placeholder.com/60x60?text=Product'}" 
                     alt="${product.name}" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <p style="font-weight: bold; color: #d50000; font-size: 14px; margin-bottom: 5px;">${product.brand || ''}</p>
                        <h4 style="font-size: 16px; margin-bottom: 5px;">${product.name}</h4>
                        <p style="color: #666; font-size: 14px; margin-bottom: 5px;">
                            Size: ${product.size || 'N/A'} | 
                            Qty: ${product.quantity || 1} |
                            ₱${(product.price || 0).toFixed(2)} each
                        </p>
                    </div>
                    <div style="font-weight: bold; font-size: 16px; color: #333;">
                        ₱${((product.price || 0) * (product.quantity || 1)).toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    `).join('') : '<p>No products found</p>';
    
    // Format shipping address
    const addressHTML = order.customer && order.customer.shippingAddress ? `
        <p style="margin: 5px 0; color: #666;">
            ${order.customer.shippingAddress.street || ''}<br>
            ${order.customer.shippingAddress.city || ''}, ${order.customer.shippingAddress.zipCode || ''}<br>
            ${order.customer.shippingAddress.country || 'Philippines'}
        </p>
    ` : '<p style="color: #666;">No shipping address provided</p>';
    
    // Format payment info
    const paymentMethod = order.payment ? order.payment.method : 'N/A';
    let paymentInfo = `<p style="margin: 5px 0;"><strong>Method:</strong> ${paymentMethod.toUpperCase()}</p>`;
    
    if (order.payment && order.payment.method === 'gcash' && order.payment.gcashPhone) {
        paymentInfo += `<p style="margin: 5px 0;"><strong>GCash Phone:</strong> ${order.payment.gcashPhone}</p>`;
    }
    
    if (order.payment && order.payment.status) {
        paymentInfo += `<p style="margin: 5px 0;"><strong>Payment Status:</strong> ${order.payment.status}</p>`;
    }
    
    // Calculate totals safely
    const subtotal = order.totals && order.totals.subtotal ? order.totals.subtotal : 0;
    const shipping = order.totals && order.totals.shipping ? order.totals.shipping : 0;
    const serviceFee = order.totals && order.totals.serviceFee ? order.totals.serviceFee : 0;
    const total = order.totals && order.totals.total ? order.totals.total : subtotal + shipping + serviceFee;
    
    // Create modal HTML
    const modalHTML = `
        <div class="order-details-modal" id="orderDetailsModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Order Details</h3>
                    <button class="modal-close" onclick="closeModal('orderDetailsModal')">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div style="display: grid; gap: 20px;">
                        
                        <!-- Order Summary -->
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                                <i class="fas fa-receipt"></i> Order Summary
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <p style="margin: 5px 0;"><strong>Order ID:</strong><br><code>${order.orderId || 'N/A'}</code></p>
                                    <p style="margin: 5px 0;"><strong>Date Ordered:</strong><br>${orderDate}</p>
                                </div>
                                <div>
                                    <p style="margin: 5px 0;"><strong>Status:</strong><br>${getOrderStatusBadge(order.status || 'pending')}</p>
                                    <p style="margin: 5px 0;"><strong>Created At:</strong><br>${createdAt}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Customer Information -->
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                                <i class="fas fa-user"></i> Customer Information
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <p style="margin: 5px 0;"><strong>Name:</strong><br>${order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'N/A' : 'N/A'}</p>
                                    <p style="margin: 5px 0;"><strong>Email:</strong><br>${order.customer ? order.customer.email : 'N/A'}</p>
                                </div>
                                <div>
                                    <p style="margin: 5px 0;"><strong>Phone:</strong><br>${order.customer ? order.customer.phone : 'N/A'}</p>
                                    <p style="margin: 5px 0;"><strong>User ID:</strong><br><small style="color: #666;">${order.userId || 'N/A'}</small></p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Shipping Information -->
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                                <i class="fas fa-truck"></i> Shipping Information
                            </h4>
                            ${addressHTML}
                        </div>
                        
                        <!-- Payment Information -->
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                                <i class="fas fa-credit-card"></i> Payment Information
                            </h4>
                            <div>
                                ${paymentInfo}
                            </div>
                        </div>
                        
                        <!-- Order Items -->
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                                <i class="fas fa-box"></i> Order Items (${order.products ? order.products.length : 0})
                            </h4>
                            ${productsHTML}
                        </div>
                        
                        <!-- Order Totals -->
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                                <i class="fas fa-calculator"></i> Order Totals
                            </h4>
                            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Subtotal:</span>
                                    <span>₱${subtotal.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Shipping:</span>
                                    <span>₱${shipping.toFixed(2)}</span>
                                </div>
                                ${serviceFee > 0 ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Service Fee:</span>
                                    <span>₱${serviceFee.toFixed(2)}</span>
                                </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e0e0e0; font-size: 18px; font-weight: bold;">
                                    <span>Total:</span>
                                    <span style="color: #d50000;">₱${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Order Notes -->
                        ${order.notes ? `
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                                <i class="fas fa-sticky-note"></i> Order Notes
                            </h4>
                            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border: 1px solid #ffeaa7;">
                                <p style="margin: 0; color: #856404;">${order.notes}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                    </div>
                </div>
                <div class="modal-footer" style="padding: 20px; border-top: 1px solid #e0e0e0; background: #f8f9fa;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <button class="secondary-btn" onclick="closeModal('orderDetailsModal')" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                        <div>
                            <button class="primary-btn" onclick="editOrderStatus('${orderId}')" style="padding: 8px 16px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                                <i class="fas fa-edit"></i> Edit Status
                            </button>
                            <button class="danger-btn" onclick="deleteOrder('${orderId}')" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-trash"></i> Delete Order
                            </button>
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
    document.body.style.overflow = 'hidden';
}

async function editOrderStatus(orderId) {
    showLoading(true);
    
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        
        if (doc.exists) {
            const order = doc.data();
            showEditStatusModal(orderId, order.status || 'pending');
        } else {
            showMessage('Order not found', 'error');
        }
    } catch (error) {
        console.error('Error editing order:', error);
        showMessage('Error loading order', 'error');
    }
    
    showLoading(false);
}

function showEditStatusModal(orderId, currentStatus) {
    const statusOptions = [
        { value: 'pending', label: '⏳ Pending' },
        { value: 'processing', label: '🔄 Processing' },
        { value: 'shipped', label: '🚚 Shipped' },
        { value: 'delivered', label: '✅ Delivered' },
        { value: 'cancelled', label: '❌ Cancelled' }
    ];
    
    const modalHTML = `
        <div class="modal" id="editStatusModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div class="modal-content small" style="background: white; border-radius: 12px; width: 90%; max-width: 400px; overflow: hidden;">
                <div class="modal-header" style="background: #d50000; color: white; padding: 20px;">
                    <h3 style="margin: 0;">Update Order Status</h3>
                    <button class="modal-close" onclick="closeModal('editStatusModal')" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; position: absolute; right: 20px; top: 15px;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <form id="editStatusForm" onsubmit="event.preventDefault(); updateOrderStatus('${orderId}');">
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Select Status</label>
                            <select id="orderStatusSelect" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;">
                                ${statusOptions.map(option => `
                                    <option value="${option.value}" ${currentStatus === option.value ? 'selected' : ''}>
                                        ${option.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Status Notes (Optional)</label>
                            <textarea id="statusNotes" rows="3" placeholder="Add notes about this status change..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"></textarea>
                        </div>
                        
                        <div class="form-actions" style="display: flex; gap: 10px;">
                            <button type="button" class="secondary-btn" onclick="closeModal('editStatusModal')" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                                Cancel
                            </button>
                            <button type="submit" class="primary-btn" style="padding: 10px 20px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                                Update Status
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('editStatusModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

async function updateOrderStatus(orderId) {
    showLoading(true);
    
    try {
        const newStatus = document.getElementById('orderStatusSelect').value;
        const statusNotes = document.getElementById('statusNotes').value;
        
        const updateData = {
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add status history
        const statusHistory = {
            status: newStatus,
            notes: statusNotes,
            changedAt: new Date().toISOString(),
            changedBy: currentUser.email
        };
        
        // Get current order to append history
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (orderDoc.exists) {
            const orderData = orderDoc.data();
            const existingHistory = orderData.statusHistory || [];
            updateData.statusHistory = [...existingHistory, statusHistory];
        }
        
        await db.collection('orders').doc(orderId).update(updateData);
        
        showMessage('Order status updated successfully!', 'success');
        closeModal('editStatusModal');
        
        // Refresh orders table
        loadOrders();
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showMessage('Error updating order status: ' + error.message, 'error');
    }
    
    showLoading(false);
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        await db.collection('orders').doc(orderId).delete();
        showMessage('Order deleted successfully!', 'success');
        
        // Refresh orders table
        loadOrders();
        
        // Close any open modals
        closeModal('orderDetailsModal');
        
    } catch (error) {
        console.error('Error deleting order:', error);
        showMessage('Error deleting order: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// ========== USERS MANAGEMENT ==========
async function loadUsers() {
    const usersTable = document.getElementById('usersTable');
    if (!usersTable) return;
    
    showLoading(true);
    
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            usersTable.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderUsersTable(users);
        
    } catch (error) {
        console.error("Error loading users:", error);
        showMessage("Error loading users", "error");
        usersTable.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #f44336; margin-bottom: 20px;"></i>
                    <p>Error loading users</p>
                </td>
            </tr>
        `;
    }
    
    showLoading(false);
}

function renderUsersTable(users) {
    const usersTable = document.getElementById('usersTable');
    if (!usersTable) return;
    
    usersTable.innerHTML = users.map(user => {
        // Format date
        let joinDate = 'N/A';
        try {
            if (user.createdAt) {
                const date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                joinDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }
        } catch (e) {
            console.log('Error formatting date:', e);
        }
        
        // Get user role badge
        const roleBadge = user.role === 'admin' ? 
            `<span style="background: #d50000; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">ADMIN</span>` :
            `<span style="background: #666; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">USER</span>`;
        
        // Get email verification status
        const emailVerified = user.emailVerified ? 
            `<span style="color: #4caf50;"><i class="fas fa-check-circle"></i> Verified</span>` :
            `<span style="color: #ff9800;"><i class="fas fa-exclamation-circle"></i> Unverified</span>`;
        
        return `
            <tr>
                <td><small style="color: #666;">${user.id.substring(0, 8)}...</small></td>
                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                <td>${user.email}</td>
                <td>${roleBadge}</td>
                <td>${joinDate}</td>
                <td>${emailVerified}</td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 5px;">
                        <button class="action-btn edit-btn" onclick="editUserRole('${user.id}')" title="Edit Role" style="background: #4caf50; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function editUserRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const user = userDoc.data();
            const modalHTML = `
                <div class="modal" id="editUserModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                    <div class="modal-content small" style="background: white; border-radius: 12px; width: 90%; max-width: 400px; overflow: hidden;">
                        <div class="modal-header" style="background: #d50000; color: white; padding: 20px;">
                            <h3 style="margin: 0;">Edit User Role</h3>
                            <button class="modal-close" onclick="closeModal('editUserModal')" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; position: absolute; right: 20px; top: 15px;">&times;</button>
                        </div>
                        <div class="modal-body" style="padding: 20px;">
                            <p><strong>User:</strong> ${user.firstName || ''} ${user.lastName || ''}</p>
                            <p><strong>Email:</strong> ${user.email}</p>
                            
                            <div class="form-group" style="margin-top: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: bold;">User Role</label>
                                <select id="userRoleSelect" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </div>
                            
                            <div class="form-actions" style="display: flex; gap: 10px; margin-top: 20px;">
                                <button type="button" class="secondary-btn" onclick="closeModal('editUserModal')" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                                    Cancel
                                </button>
                                <button type="button" class="primary-btn" onclick="updateUserRole('${userId}')" style="padding: 10px 20px; background: #d50000; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                                    Update Role
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal
            const existingModal = document.getElementById('editUserModal');
            if (existingModal) existingModal.remove();
            
            // Add new modal
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Error editing user:', error);
        showMessage('Error loading user data', 'error');
    }
}

async function updateUserRole(userId) {
    showLoading(true);
    
    try {
        const newRole = document.getElementById('userRoleSelect').value;
        
        await db.collection('users').doc(userId).update({
            role: newRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('User role updated successfully!', 'success');
        closeModal('editUserModal');
        
        // Refresh users table
        loadUsers();
        
    } catch (error) {
        console.error('Error updating user role:', error);
        showMessage('Error updating user role: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// ========== ANALYTICS FUNCTIONS ==========
function loadAnalytics() {
    const salesCtx = document.getElementById('salesChart');
    const productsCtx = document.getElementById('productsChart');
    
    if (salesCtx) {
        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Sales',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#d50000',
                    backgroundColor: 'rgba(213, 0, 0, 0.1)',
                    fill: true
                }]
            }
        });
    }
    
    if (productsCtx) {
        new Chart(productsCtx, {
            type: 'bar',
            data: {
                labels: ['NIKE', 'ADIDAS', 'PUMA', 'REEBOK'],
                datasets: [{
                    label: 'Products Sold',
                    data: [120, 85, 60, 40],
                    backgroundColor: ['#d50000', '#2196f3', '#4caf50', '#ff9800']
                }]
            }
        });
    }
}

// ========== HELPER FUNCTIONS ==========
// Show loading state
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Show message
function showMessage(message, type = 'success') {
    // Remove existing message
    const existingMsg = document.querySelector('.global-message');
    if (existingMsg) existingMsg.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `global-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        ${type === 'success' ? 'background: #4caf50;' : 'background: #f44336;'}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show add product modal
function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// ========== ADDITIONAL FUNCTIONS NEEDED ==========
function openImagePreview(imageUrl) {
    if (imageUrl) {
        window.open(imageUrl, '_blank');
    }
}

function setupPagination() {
    // Simplified pagination - you can expand this as needed
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    if (pagination && totalPages > 1) {
        pagination.innerHTML = `
            <button onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>First</button>
            <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            <button onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>Last</button>
        `;
    }
}

function changePage(page) {
    const totalPages = Math.ceil(products.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderProductsTable();
        setupPagination();
    }
}

function applyBulkAction() {
    const action = document.getElementById('bulkAction').value;
    const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showMessage('Please select products first', 'error');
        return;
    }
    
    if (!action) {
        showMessage('Please select an action', 'error');
        return;
    }
    
    const productIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (action === 'delete') {
        if (confirm(`Are you sure you want to delete ${productIds.length} product(s)?`)) {
            // Implement bulk delete
            productIds.forEach(id => deleteProduct(id));
        }
    } else {
        showMessage(`Bulk ${action} would be implemented here`, 'info');
    }
}

function loadRecentProducts() {
    const recentTable = document.getElementById('recentProductsTable');
    if (!recentTable) return;
    
    const recentProducts = products.slice(0, 5); // Show first 5
    recentTable.innerHTML = recentProducts.map(product => `
        <tr>
            <td><small>${product.id.substring(0, 8)}...</small></td>
            <td>
                <img src="${product.image || 'https://via.placeholder.com/30'}" 
                     alt="${product.name}" 
                     style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">
            </td>
            <td>${product.name}</td>
            <td>${product.brand}</td>
            <td>₱${product.price?.toFixed(2) || '0.00'}</td>
            <td>${product.stock || 0}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct('${product.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    // Simple activity list - you can expand this with real data
    activityList.innerHTML = `
        <div class="activity-item">
            <i class="fas fa-plus-circle" style="color: #4caf50;"></i>
            <div class="activity-info">
                <p>New product added</p>
                <span>Just now</span>
            </div>
        </div>
        <div class="activity-item">
            <i class="fas fa-shopping-cart" style="color: #2196f3;"></i>
            <div class="activity-info">
                <p>New order received</p>
                <span>5 minutes ago</span>
            </div>
        </div>
        <div class="activity-item">
            <i class="fas fa-user-plus" style="color: #ff9800;"></i>
            <div class="activity-info">
                <p>New user registered</p>
                <span>1 hour ago</span>
            </div>
        </div>
    `;
}

function exportProducts() {
    showMessage('Export functionality would be implemented here', 'info');
}

// Make functions globally available
window.showLoading = showLoading;
window.showMessage = showMessage;
window.closeModal = closeModal;
window.showAddProductModal = showAddProductModal;
window.editProduct = editProduct;
window.confirmDelete = confirmDelete;
window.viewProduct = viewProduct;
window.loadOrders = loadOrders;
window.viewOrderDetails = viewOrderDetails;
window.editOrderStatus = editOrderStatus;
window.deleteOrder = deleteOrder;
window.updateOrderStatus = updateOrderStatus;
window.loadUsers = loadUsers;
window.editUserRole = editUserRole;
window.updateUserRole = updateUserRole;
window.loadProducts = loadProducts;
window.openImagePreview = openImagePreview;
window.changePage = changePage;
window.applyBulkAction = applyBulkAction;
window.previewImageFromUrl = previewImageFromUrl;
window.previewEditImageFromUrl = previewEditImageFromUrl;

console.log('✅ Admin.js loaded with URL-based image upload and all functions');
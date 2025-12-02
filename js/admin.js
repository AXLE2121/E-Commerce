// admin.js - Admin Panel with Image Upload (No Firebase Storage Version)
console.log('admin.js loaded - No Firebase Storage version');

// Global variables
let currentUser = null;
let products = [];
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
    checkAdminAuth();
    initializeEventListeners();
    setupNavigation();
    setupImageUpload();
});

// Setup image upload functionality (preview only, no upload)
function setupImageUpload() {
    const imageFileInput = document.getElementById('productImageFile');
    const imagePreview = document.getElementById('imagePreviewImg');
    const previewPlaceholder = document.querySelector('.image-preview-placeholder');
    const fileInfo = document.getElementById('fileInfo');
    
    if (imageFileInput) {
        imageFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (!file) {
                resetImageUpload();
                return;
            }
            
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                showMessage('Please select a valid image file (JPG, PNG, GIF)', 'error');
                resetImageUpload();
                return;
            }
            
            // Validate file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                showMessage('Image size should be less than 2MB', 'error');
                resetImageUpload();
                return;
            }
            
            selectedImageFile = file;
            
            // Update file info
            const fileSize = (file.size / 1024).toFixed(2);
            fileInfo.innerHTML = `
                <strong>Selected:</strong> ${file.name}<br>
                <strong>Size:</strong> ${fileSize} KB<br>
                <strong>Type:</strong> ${file.type}
            `;
            
            // Show preview
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreviewUrl = e.target.result;
                imagePreview.src = imagePreviewUrl;
                imagePreview.style.display = 'block';
                previewPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Also setup edit image upload
    const editImageFileInput = document.getElementById('editProductImageFile');
    if (editImageFileInput) {
        editImageFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const editImagePreview = document.getElementById('editImagePreviewImg');
                    if (editImagePreview) {
                        editImagePreview.src = e.target.result;
                        editImagePreview.style.display = 'block';
                        document.querySelector('#editProductModal .image-preview-placeholder').style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Reset image upload
function resetImageUpload() {
    selectedImageFile = null;
    imagePreviewUrl = null;
    
    const imageFileInput = document.getElementById('productImageFile');
    const imagePreview = document.getElementById('imagePreviewImg');
    const previewPlaceholder = document.querySelector('.image-preview-placeholder');
    const fileInfo = document.getElementById('fileInfo');
    
    if (imageFileInput) imageFileInput.value = '';
    if (imagePreview) {
        imagePreview.src = '';
        imagePreview.style.display = 'none';
    }
    if (previewPlaceholder) previewPlaceholder.style.display = 'flex';
    if (fileInfo) fileInfo.innerHTML = 'Max size: 2MB | Formats: JPG, PNG, GIF';
}

// Upload image - NO Firebase Storage (uses placeholder)
async function uploadImageToStorage(file, productId) {
    try {
        if (!file) {
            // Use default placeholder
            return "https://via.placeholder.com/600x400/cccccc/969696?text=No+Image+Selected";
        }
        
        console.log('⚠️ Firebase Storage not available - using placeholder image');
        console.log('To enable real image uploads:');
        console.log('1. Add billing to your Firebase project');
        console.log('2. Enable Firebase Storage');
        console.log('3. Update this function to use firebase.storage()');
        
        // Generate a unique placeholder URL
        const timestamp = Date.now();
        const placeholderText = encodeURIComponent('Product+Image+' + timestamp);
        const placeholderUrl = `https://via.placeholder.com/600x400/cccccc/969696?text=${placeholderText}`;
        
        return placeholderUrl;
        
    } catch (error) {
        console.error('Error in image upload:', error);
        return "https://via.placeholder.com/600x400/cccccc/969696?text=Error+Uploading";
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

// Initialize event listeners
function initializeEventListeners() {
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

// Load dashboard data
async function loadDashboardData() {
    showLoading(true);
    
    try {
        // Load total products
        const productsSnapshot = await db.collection('products').get();
        const totalProducts = productsSnapshot.size;
        document.getElementById('totalProducts').textContent = totalProducts;
        
        // Load total orders (if orders collection exists)
        const ordersSnapshot = await db.collection('orders').get();
        const totalOrders = ordersSnapshot.size;
        document.getElementById('totalOrders').textContent = totalOrders;
        
        // Load total users
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        document.getElementById('totalUsers').textContent = totalUsers;
        
        // Load total revenue (calculate from orders)
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            totalRevenue += order.total || 0;
        });
        document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
        
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
    
    try {
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
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
            <td>$${product.price?.toFixed(2) || '0.00'}</td>
            <td>${product.stock || 0}</td>
            <td>
                <span class="status-badge ${product.stock > 0 ? 'status-active' : 'status-inactive'}">
                    ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">
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

// Open image preview in modal
function openImagePreview(imageUrl) {
    const modalHTML = `
        <div class="image-preview-modal" id="imagePreviewModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Image Preview</h3>
                    <button class="modal-close" onclick="closeModal('imagePreviewModal')">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <img src="${imageUrl}" alt="Product Image" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">
                    <div style="margin-top: 15px;">
                        <a href="${imageUrl}" target="_blank" class="primary-btn" style="display: inline-block; padding: 8px 16px;">
                            <i class="fas fa-external-link-alt"></i> Open in New Tab
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('imagePreviewModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

// Load recent products for dashboard
async function loadRecentProducts() {
    const tableBody = document.getElementById('recentProductsTable');
    if (!tableBody) return;
    
    try {
        const snapshot = await db.collection('products')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        tableBody.innerHTML = snapshot.docs.map(doc => {
            const product = { id: doc.id, ...doc.data() };
            return `
                <tr>
                    <td>${product.id.substring(0, 8)}...</td>
                    <td>
                        <img src="${product.image || 'https://via.placeholder.com/40'}" 
                             alt="${product.name}" 
                             style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer;"
                             onclick="openImagePreview('${product.image}')">
                    </td>
                    <td>${product.name}</td>
                    <td>${product.brand}</td>
                    <td>$${product.price?.toFixed(2) || '0.00'}</td>
                    <td>${product.stock || 0}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error("Error loading recent products:", error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const snapshot = await db.collection('products')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        activityList.innerHTML = snapshot.docs.map(doc => {
            const product = doc.data();
            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="activity-info">
                        <p><strong>New product added:</strong> ${product.name}</p>
                        <small>${product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}</small>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error("Error loading activity:", error);
    }
}

// Handle add product form submission
async function handleAddProduct(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        // Validate required fields
        const productName = document.getElementById('productName').value;
        const productBrand = document.getElementById('productBrand').value;
        const productCategory = document.getElementById('productCategory').value;
        const productGender = document.getElementById('productGender').value;
        const productPrice = document.getElementById('productPrice').value;
        const productStock = document.getElementById('productStock').value;
        
        if (!productName || !productBrand || !productCategory || !productGender || !productPrice || !productStock) {
            showMessage('Please fill in all required fields', 'error');
            showLoading(false);
            return;
        }
        
        // Create product data without image first
        const productData = {
            name: productName,
            brand: productBrand,
            category: productCategory,
            gender: productGender,
            price: parseFloat(productPrice),
            stock: parseInt(productStock),
            description: document.getElementById('productDescription').value || '',
            sizes: document.getElementById('productSizes').value ? 
                   document.getElementById('productSizes').value.split(',').map(s => s.trim()) : [],
            colors: document.getElementById('productColors').value ? 
                    document.getElementById('productColors').value.split(',').map(c => c.trim()) : [],
            rating: parseFloat(document.getElementById('productRating').value) || 4.5,
            reviews: parseInt(document.getElementById('productReviews').value) || 0,
            featured: document.getElementById('productFeatured').checked,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // First, add product to Firestore to get an ID
        const productRef = await db.collection('products').add(productData);
        const productId = productRef.id;
        
        // Get image URL (placeholder since Firebase Storage is not available)
        let imageUrl = "https://via.placeholder.com/600x400/cccccc/969696?text=No+Image";
        
        if (selectedImageFile) {
            showLoadingMessage('Processing image...');
            imageUrl = await uploadImageToStorage(selectedImageFile, productId);
            
            // Show info message about placeholder image
            if (imageUrl.includes('placeholder')) {
                showMessage('⚠️ Using placeholder image. Firebase Storage not available.', 'info');
            }
        }
        
        // Update product with image URL
        await db.collection('products').doc(productId).update({
            image: imageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success message
        showMessage("Product added successfully!", "success");
        
        // Reset form and close modal
        document.getElementById('addProductForm').reset();
        resetImageUpload();
        closeModal('addProductModal');
        
        // Refresh products list
        loadProducts();
        loadDashboardData();
        
    } catch (error) {
        console.error("Error adding product:", error);
        showMessage("Error adding product: " + error.message, "error");
    }
    
    showLoading(false);
}

// Edit product - Load product data into edit form
async function editProduct(productId) {
    showLoading(true);
    
    try {
        const doc = await db.collection('products').doc(productId).get();
        
        if (doc.exists) {
            const product = doc.data();
            
            // Create edit form HTML
            const editFormHTML = `
                <form id="editProductForm" onsubmit="event.preventDefault(); updateProduct('${productId}');">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Product Name *</label>
                            <input type="text" id="editProductName" value="${product.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Brand *</label>
                            <select id="editProductBrand" required>
                                <option value="">Select Brand</option>
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
                                <option value="">Select Category</option>
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
                                <option value="">Select Gender</option>
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
                            <input type="number" id="editProductPrice" value="${product.price || 0}" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>Stock Quantity *</label>
                            <input type="number" id="editProductStock" value="${product.stock || 0}" min="0" required>
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
                                <div class="image-preview-placeholder" style="${product.image ? 'display: none;' : 'display: flex;'}">
                                    <i class="fas fa-image"></i>
                                    <p>Current image</p>
                                </div>
                                <img id="editImagePreviewImg" src="${product.image || ''}" style="${product.image ? 'display: block; max-width: 200px; max-height: 200px; border-radius: 8px;' : 'display: none;'}">
                            </div>
                            <div class="upload-controls">
                                <input type="file" id="editProductImageFile" accept="image/*" style="display: none;">
                                <button type="button" class="secondary-btn" onclick="document.getElementById('editProductImageFile').click()">
                                    <i class="fas fa-upload"></i> Change Image
                                </button>
                                <div class="file-info" id="editFileInfo" style="margin-top: 10px; font-size: 12px; color: #666;">
                                    Leave empty to keep current image
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Sizes (comma separated)</label>
                            <input type="text" id="editProductSizes" value="${product.sizes ? product.sizes.join(', ') : ''}" placeholder="7,8,9,10,11,12">
                        </div>
                        <div class="form-group">
                            <label>Colors (comma separated)</label>
                            <input type="text" id="editProductColors" value="${product.colors ? product.colors.join(', ') : ''}" placeholder="Black,White,Red">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Rating (0-5)</label>
                            <input type="number" id="editProductRating" value="${product.rating || 4.5}" min="0" max="5" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>Review Count</label>
                            <input type="number" id="editProductReviews" value="${product.reviews || 0}" min="0">
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
            
            // Update modal content
            const modalBody = document.querySelector('#editProductModal .modal-body');
            if (modalBody) {
                modalBody.innerHTML = editFormHTML;
            }
            
            // Show modal
            document.getElementById('editProductModal').style.display = 'flex';
        }
        
    } catch (error) {
        console.error("Error loading product for edit:", error);
        showMessage("Error loading product", "error");
    }
    
    showLoading(false);
}

// Update product
async function updateProduct(productId) {
    showLoading(true);
    
    try {
        const productData = {
            name: document.getElementById('editProductName').value,
            brand: document.getElementById('editProductBrand').value,
            category: document.getElementById('editProductCategory').value,
            gender: document.getElementById('editProductGender').value,
            price: parseFloat(document.getElementById('editProductPrice').value),
            stock: parseInt(document.getElementById('editProductStock').value),
            description: document.getElementById('editProductDescription').value || '',
            sizes: document.getElementById('editProductSizes').value ? 
                   document.getElementById('editProductSizes').value.split(',').map(s => s.trim()) : [],
            colors: document.getElementById('editProductColors').value ? 
                    document.getElementById('editProductColors').value.split(',').map(c => c.trim()) : [],
            rating: parseFloat(document.getElementById('editProductRating').value) || 4.5,
            reviews: parseInt(document.getElementById('editProductReviews').value) || 0,
            featured: document.getElementById('editProductFeatured').checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Check if new image was selected
        const editImageFile = document.getElementById('editProductImageFile')?.files[0];
        if (editImageFile) {
            showLoadingMessage('Processing new image...');
            const imageUrl = await uploadImageToStorage(editImageFile, productId);
            productData.image = imageUrl;
            
            // Show info message about placeholder image
            if (imageUrl.includes('placeholder')) {
                showMessage('⚠️ Using placeholder image. Firebase Storage not available.', 'info');
            }
        }
        
        await db.collection('products').doc(productId).update(productData);
        
        showMessage("Product updated successfully!", "success");
        closeModal('editProductModal');
        loadProducts();
        loadDashboardData();
        
    } catch (error) {
        console.error("Error updating product:", error);
        showMessage("Error updating product: " + error.message, "error");
    }
    
    showLoading(false);
}

// Confirm delete product
function confirmDelete(productId) {
    // Store product ID for deletion
    document.getElementById('deleteModal').dataset.productId = productId;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Delete product
async function deleteProduct(productId) {
    showLoading(true);
    
    try {
        // Delete product from Firestore
        await db.collection('products').doc(productId).delete();
        
        showMessage("Product deleted successfully!", "success");
        closeModal('deleteModal');
        loadProducts();
        loadDashboardData();
        
    } catch (error) {
        console.error("Error deleting product:", error);
        showMessage("Error deleting product: " + error.message, "error");
    }
    
    showLoading(false);
}

// View product details
async function viewProduct(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        
        if (doc.exists) {
            const product = doc.data();
            
            const viewModalHTML = `
                <div class="view-product-modal" id="viewProductModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Product Details</h3>
                            <button class="modal-close" onclick="closeModal('viewProductModal')">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="product-view-grid">
                                <div class="product-view-image">
                                    <img src="${product.image || 'https://via.placeholder.com/600x400'}" alt="${product.name}" style="width: 100%; border-radius: 8px;">
                                </div>
                                <div class="product-view-details">
                                    <h2>${product.name}</h2>
                                    <p><strong>Brand:</strong> ${product.brand}</p>
                                    <p><strong>Category:</strong> ${product.category}</p>
                                    <p><strong>Gender:</strong> ${product.gender}</p>
                                    <p><strong>Price:</strong> $${product.price?.toFixed(2)}</p>
                                    <p><strong>Stock:</strong> ${product.stock}</p>
                                    <p><strong>Rating:</strong> ${product.rating || 'N/A'}</p>
                                    <p><strong>Description:</strong> ${product.description || 'No description'}</p>
                                    <p><strong>Featured:</strong> ${product.featured ? 'Yes' : 'No'}</p>
                                    ${product.sizes ? `<p><strong>Sizes:</strong> ${product.sizes.join(', ')}</p>` : ''}
                                    ${product.colors ? `<p><strong>Colors:</strong> ${product.colors.join(', ')}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal
            const existingModal = document.getElementById('viewProductModal');
            if (existingModal) existingModal.remove();
            
            // Add new modal
            document.body.insertAdjacentHTML('beforeend', viewModalHTML);
            document.body.style.overflow = 'hidden';
        }
        
    } catch (error) {
        console.error("Error viewing product:", error);
        showMessage("Error loading product details", "error");
    }
}

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    
    if (searchTerm) {
        const filtered = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.brand.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
        renderProductsTable(filtered);
    } else {
        renderProductsTable(products);
    }
}

// Toggle select all checkboxes
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

// Apply bulk action
function applyBulkAction() {
    const bulkAction = document.getElementById('bulkAction').value;
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedProducts.length === 0) {
        showMessage("Please select at least one product", "error");
        return;
    }
    
    if (bulkAction === 'delete') {
        if (confirm(`Are you sure you want to delete ${selectedProducts.length} product(s)? This action cannot be undone.`)) {
            selectedProducts.forEach(productId => {
                deleteProduct(productId);
            });
        }
    } else if (bulkAction === 'publish') {
        // Implement publish functionality
        showMessage("Publish feature coming soon", "info");
    } else if (bulkAction === 'unpublish') {
        // Implement unpublish functionality
        showMessage("Unpublish feature coming soon", "info");
    }
}

// Setup pagination
function setupPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(products.length / itemsPerPage);
    
    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <button class="pagination-btn" onclick="goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <button class="pagination-btn" onclick="goToPage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
    
    pagination.innerHTML = paginationHTML;
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    renderProductsTable();
    setupPagination();
}

// Show add product modal
function showAddProductModal() {
    resetImageUpload();
    document.getElementById('addProductModal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset edit form if closing edit modal
        if (modalId === 'editProductModal') {
            const modalBody = document.querySelector('#editProductModal .modal-body');
            if (modalBody) {
                modalBody.innerHTML = '';
            }
        }
    }
}

// Show loading overlay
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Show loading with custom message
function showLoadingMessage(message) {
    if (loadingOverlay) {
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        loadingOverlay.style.display = 'flex';
    }
}

// Show message
function showMessage(message, type = 'error') {
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
        z-index: 1001;
        animation: slideInRight 0.3s ease;
        ${type === 'success' ? 'background: #4caf50;' : 
          type === 'info' ? 'background: #2196f3;' : 
          type === 'warning' ? 'background: #ff9800;' :
          'background: #f44336;'}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Debounce function for search
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

// Load orders (placeholder)
async function loadOrders() {
    const ordersTable = document.getElementById('ordersTable');
    if (!ordersTable) return;
    
    ordersTable.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <i class="fas fa-shopping-bag" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <p>No orders yet</p>
            </td>
        </tr>
    `;
}

// Load users (placeholder)
async function loadUsers() {
    const usersTable = document.getElementById('usersTable');
    if (!usersTable) return;
    
    usersTable.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
                <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <p>Users management coming soon</p>
            </td>
        </tr>
    `;
}

// Load analytics (placeholder)
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

// Export products data
function exportProducts() {
    const dataStr = JSON.stringify(products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage("Data exported successfully!", "success");
}

// Make functions globally available
window.showAddProductModal = showAddProductModal;
window.closeModal = closeModal;
window.editProduct = editProduct;
window.confirmDelete = confirmDelete;
window.viewProduct = viewProduct;
window.goToPage = goToPage;
window.applyBulkAction = applyBulkAction;
window.toggleSelectAll = toggleSelectAll;
window.exportProducts = exportProducts;
window.openImagePreview = openImagePreview;
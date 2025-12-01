// admin.js - Admin Panel Functionality

// Global variables
let currentUser = null;
let adminEmail = "admin@footlocker.com"; // Default admin email
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

// Check admin authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    initializeEventListeners();
    setupNavigation();
});

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
        // Method 1: Check user document in Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Check if user has admin role or is the default admin email
            if (userData.role === 'admin' || userData.email === adminEmail) {
                return true;
            }
        }
        
        // Method 2: Check against admin email list (for development)
        const user = auth.currentUser;
        if (user && user.email === adminEmail) {
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
        showMessage("Error loading dashboard data", "error");
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
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
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
                             style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
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
    
    // For now, show recent products as activity
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
    
    const productData = {
        name: document.getElementById('productName').value,
        brand: document.getElementById('productBrand').value,
        category: document.getElementById('productCategory').value,
        gender: document.getElementById('productGender').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').value,
        sizes: document.getElementById('productSizes').value.split(',').map(s => s.trim()),
        colors: document.getElementById('productColors').value.split(',').map(c => c.trim()),
        rating: parseFloat(document.getElementById('productRating').value),
        reviews: parseInt(document.getElementById('productReviews').value),
        featured: document.getElementById('productFeatured').checked,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        // Add product to Firestore
        await db.collection('products').add(productData);
        
        // Show success message
        showMessage("Product added successfully!", "success");
        
        // Close modal and reset form
        closeModal('addProductModal');
        document.getElementById('addProductForm').reset();
        
        // Refresh products list
        loadProducts();
        loadDashboardData();
        
    } catch (error) {
        console.error("Error adding product:", error);
        showMessage("Error adding product: " + error.message, "error");
    }
    
    showLoading(false);
}

// Edit product
async function editProduct(productId) {
    showLoading(true);
    
    try {
        const doc = await db.collection('products').doc(productId).get();
        
        if (doc.exists) {
            const product = doc.data();
            
            const editFormHTML = `
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
                        <label>Image URL *</label>
                        <input type="url" id="editProductImage" value="${product.image || ''}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Sizes (comma separated)</label>
                            <input type="text" id="editProductSizes" value="${product.sizes ? product.sizes.join(', ') : ''}">
                        </div>
                        <div class="form-group">
                            <label>Colors (comma separated)</label>
                            <input type="text" id="editProductColors" value="${product.colors ? product.colors.join(', ') : ''}">
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
            
            const modalBody = document.querySelector('#editProductModal .modal-body');
            modalBody.innerHTML = editFormHTML;
            
            // Add form submission handler
            document.getElementById('editProductForm').addEventListener('submit', (e) => {
                e.preventDefault();
                updateProduct(productId);
            });
            
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
    
    const productData = {
        name: document.getElementById('editProductName').value,
        brand: document.getElementById('editProductBrand').value,
        category: document.getElementById('editProductCategory').value,
        gender: document.getElementById('editProductGender').value,
        price: parseFloat(document.getElementById('editProductPrice').value),
        stock: parseInt(document.getElementById('editProductStock').value),
        description: document.getElementById('editProductDescription').value,
        image: document.getElementById('editProductImage').value,
        sizes: document.getElementById('editProductSizes').value.split(',').map(s => s.trim()),
        colors: document.getElementById('editProductColors').value.split(',').map(c => c.trim()),
        rating: parseFloat(document.getElementById('editProductRating').value),
        reviews: parseInt(document.getElementById('editProductReviews').value),
        featured: document.getElementById('editProductFeatured').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
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
    document.getElementById('deleteModal').style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = () => deleteProduct(productId);
}

// Delete product
async function deleteProduct(productId) {
    showLoading(true);
    
    try {
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
    // Redirect to product page or show in modal
    alert(`View product ID: ${productId}\n(Would redirect to product detail page)`);
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
        if (confirm(`Are you sure you want to delete ${selectedProducts.length} product(s)?`)) {
            selectedProducts.forEach(productId => {
                deleteProduct(productId);
            });
        }
    }
}

// Setup pagination
function setupPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(products.length / itemsPerPage);
    
    let paginationHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${i})">
                ${i}
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
    document.getElementById('addProductModal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Show loading overlay
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
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
        ${type === 'success' ? 'background: #4caf50;' : 'background: #f44336;'}
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
    
    // Uncomment and implement when you have orders collection
    /*
    try {
        const snapshot = await db.collection('orders').get();
        // Render orders table
    } catch (error) {
        console.error("Error loading orders:", error);
    }
    */
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
    // Initialize charts
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
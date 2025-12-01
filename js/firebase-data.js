// firebase-data.js - FIXED VERSION
class FirebaseDataService {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.productsCollection = 'products';
        this.usersCollection = 'users';
        this.favoritesCollection = 'favorites';
        this.cartCollection = 'cart';
    }

    // ========== PRODUCTS ==========
    async getAllProducts() {
        try {
            const snapshot = await this.db.collection(this.productsCollection).get();
            const products = snapshot.docs.map(doc => ({
                id: doc.id,  // Use Firestore document ID
                ...doc.data()
            }));
            console.log('Firestore products loaded:', products.length);
            return products;
        } catch (error) {
            console.error('Error getting products:', error);
            throw error;
        }
    }

    async getProductById(productId) {
        try {
            const doc = await this.db.collection(this.productsCollection).doc(productId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting product:', error);
            throw error;
        }
    }

    // Get products by brand (case-insensitive)
    async getProductsByBrand(brand) {
        try {
            const snapshot = await this.db.collection(this.productsCollection).get();
            const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return allProducts.filter(product => 
                product.brand.toLowerCase() === brand.toLowerCase()
            );
        } catch (error) {
            console.error('Error getting products by brand:', error);
            throw error;
        }
    }

    async getProductsByCategory(category) {
        try {
            const snapshot = await this.db.collection(this.productsCollection)
                .where('category', '==', category)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting products by category:', error);
            throw error;
        }
    }

    async searchProducts(query) {
        try {
            const snapshot = await this.db.collection(this.productsCollection).get();
            const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return allProducts.filter(product => 
                product.name.toLowerCase().includes(query.toLowerCase()) ||
                product.brand.toLowerCase().includes(query.toLowerCase()) ||
                (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
            );
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    async getFeaturedProducts(limit = 8) {
        try {
            const snapshot = await this.db.collection(this.productsCollection)
                .where('featured', '==', true)
                .limit(limit)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting featured products:', error);
            throw error;
        }
    }

    // Add new product (Admin function)
    async addProduct(productData) {
        try {
            const productRef = await this.db.collection(this.productsCollection).add({
                ...productData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Product added with ID:', productRef.id);
            return { id: productRef.id, ...productData };
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    // Update product (Admin function)
    async updateProduct(productId, productData) {
        try {
            await this.db.collection(this.productsCollection).doc(productId).update({
                ...productData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    // Delete product (Admin function)
    async deleteProduct(productId) {
        try {
            await this.db.collection(this.productsCollection).doc(productId).delete();
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // ========== USER FAVORITES ==========
    async getUserFavorites(userId) {
        try {
            const snapshot = await this.db.collection(this.favoritesCollection)
                .where('userId', '==', userId)
                .get();
            
            const favoriteIds = snapshot.docs.map(doc => doc.data().productId);
            
            const favoriteProducts = [];
            for (const productId of favoriteIds) {
                const product = await this.getProductById(productId);
                if (product) favoriteProducts.push(product);
            }
            
            return favoriteProducts;
        } catch (error) {
            console.error('Error getting user favorites:', error);
            throw error;
        }
    }

    async addToFavorites(userId, productId) {
        try {
            const favoriteRef = this.db.collection(this.favoritesCollection).doc();
            await favoriteRef.set({
                userId: userId,
                productId: productId,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error adding to favorites:', error);
            throw error;
        }
    }

    async removeFromFavorites(userId, productId) {
        try {
            const snapshot = await this.db.collection(this.favoritesCollection)
                .where('userId', '==', userId)
                .where('productId', '==', productId)
                .get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }
    }

    async isProductInFavorites(userId, productId) {
        try {
            const snapshot = await this.db.collection(this.favoritesCollection)
                .where('userId', '==', userId)
                .where('productId', '==', productId)
                .limit(1)
                .get();
            
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking favorites:', error);
            throw error;
        }
    }

    // ========== USER CART ==========
    async getUserCart(userId) {
        try {
            const snapshot = await this.db.collection(this.cartCollection)
                .where('userId', '==', userId)
                .get();
            
            const cartItems = snapshot.docs.map(doc => ({
                cartId: doc.id,
                ...doc.data()
            }));
            
            const cartWithProducts = [];
            for (const item of cartItems) {
                const product = await this.getProductById(item.productId);
                if (product) {
                    cartWithProducts.push({
                        ...item,
                        product: product
                    });
                }
            }
            
            return cartWithProducts;
        } catch (error) {
            console.error('Error getting user cart:', error);
            throw error;
        }
    }

    async addToCart(userId, productId, quantity = 1, size = null, color = null) {
        try {
            const existingItem = await this.db.collection(this.cartCollection)
                .where('userId', '==', userId)
                .where('productId', '==', productId)
                .limit(1)
                .get();
            
            if (!existingItem.empty) {
                const itemDoc = existingItem.docs[0];
                await itemDoc.ref.update({
                    quantity: firebase.firestore.FieldValue.increment(quantity),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const cartRef = this.db.collection(this.cartCollection).doc();
                await cartRef.set({
                    userId: userId,
                    productId: productId,
                    quantity: quantity,
                    size: size,
                    color: color,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error adding to cart:', error);
            throw error;
        }
    }

    async updateCartQuantity(cartItemId, quantity) {
        try {
            await this.db.collection(this.cartCollection).doc(cartItemId).update({
                quantity: quantity,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating cart:', error);
            throw error;
        }
    }

    async removeFromCart(cartItemId) {
        try {
            await this.db.collection(this.cartCollection).doc(cartItemId).delete();
            return true;
        } catch (error) {
            console.error('Error removing from cart:', error);
            throw error;
        }
    }

    async clearCart(userId) {
        try {
            const snapshot = await this.db.collection(this.cartCollection)
                .where('userId', '==', userId)
                .get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    }

    // ========== USER DATA ==========
    async getUserProfile(userId) {
        try {
            const doc = await this.db.collection(this.usersCollection).doc(userId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, data) {
        try {
            await this.db.collection(this.usersCollection).doc(userId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    // Get all users (Admin function)
    async getAllUsers() {
        try {
            const snapshot = await this.db.collection(this.usersCollection).get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }

    // Update user role (Admin function)
    async updateUserRole(userId, role) {
        try {
            await this.db.collection(this.usersCollection).doc(userId).update({
                role: role,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }

    // ========== ADMIN FUNCTIONS ==========
    async checkIfUserIsAdmin(userId) {
        try {
            const userDoc = await this.db.collection(this.usersCollection).doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                return userData.role === 'admin' || userData.email === 'admin@footlocker.com';
            }
            
            // Check if current user is admin by email
            const user = this.auth.currentUser;
            if (user && user.email === 'admin@footlocker.com') {
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Get dashboard statistics (Admin function)
    async getDashboardStats() {
        try {
            const [productsSnapshot, usersSnapshot, ordersSnapshot] = await Promise.all([
                this.db.collection(this.productsCollection).get(),
                this.db.collection(this.usersCollection).get(),
                this.db.collection('orders').get().catch(() => ({ size: 0 })) // orders might not exist
            ]);
            
            let totalRevenue = 0;
            if (ordersSnapshot.size > 0) {
                ordersSnapshot.forEach(doc => {
                    const order = doc.data();
                    totalRevenue += order.total || 0;
                });
            }
            
            return {
                totalProducts: productsSnapshot.size,
                totalUsers: usersSnapshot.size,
                totalOrders: ordersSnapshot.size || 0,
                totalRevenue: totalRevenue
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            throw error;
        }
    }

    // Get recent products (Admin function)
    async getRecentProducts(limit = 5) {
        try {
            const snapshot = await this.db.collection(this.productsCollection)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting recent products:', error);
            throw error;
        }
    }

    // Bulk delete products (Admin function)
    async bulkDeleteProducts(productIds) {
        try {
            const batch = this.db.batch();
            productIds.forEach(productId => {
                const productRef = this.db.collection(this.productsCollection).doc(productId);
                batch.delete(productRef);
            });
            
            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error bulk deleting products:', error);
            throw error;
        }
    }
}

// Create global instance
const firebaseDataService = new FirebaseDataService();

// For debugging
window.firebaseDataService = firebaseDataService;
console.log('Firebase Data Service initialized');
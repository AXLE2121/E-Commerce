// setup-admin.js - Run this once to create admin user
// This should be run from browser console or a separate setup page

async function setupAdmin() {
    const adminEmail = "admin@shoehub.com";
    const adminPassword = "Admin123"; // Change this!
    
    try {
        // Create admin user in Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(adminEmail, adminPassword);
        const user = userCredential.user;
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Create admin user document in Firestore
        await firebase.firestore().collection('users').doc(user.uid).set({
            email: adminEmail,
            firstName: "Admin",
            lastName: "User",
            role: "admin",
            emailVerified: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("✅ Admin user created successfully!");
        console.log("Email:", adminEmail);
        console.log("Password:", adminPassword);
        console.log("⚠️ Please change the password after first login!");
        
        alert("Admin user created successfully! Please check the console for credentials.");
        
    } catch (error) {
        console.error("❌ Error creating admin user:", error);
        alert("Error: " + error.message);
    }
}

// Run setup (uncomment when needed)
// setupAdmin();
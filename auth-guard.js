// This script checks if the user is logged in before loading protected pages.
// It should be included in the <head> of index.html, create-invoice.html, customers.html etc.

// Check if firebase object exists (config loaded)
if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            // No user is signed in. Redirect to login page.
            console.log("No user found. Redirecting to login.");
            // Prevent redirect loops if already on login page
            if (window.location.pathname !== '/login.html' && window.location.pathname !== '/login') {
                 window.location.href = 'login.html';
            }
        } else {
             // User is signed in. Allow page access.
             console.log("User is logged in:", user.email);
        }
    });
} else {
    // Firebase not initialized, likely a config issue or SDK not loaded
    console.error("Firebase Auth not initialized. Cannot check auth state.");
    // Optional: Redirect to an error page or show a message
    // alert("Application configuration error. Please contact support.");
    // To prevent potential loops, only redirect if not already on login
     if (window.location.pathname !== '/login.html' && window.location.pathname !== '/login') {
         // window.location.href = 'login.html'; // Or an error page
     }
}
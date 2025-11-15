document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginButton = document.getElementById('loginButton');

    // Check Firebase config
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined') {
        loginError.innerText = "Firebase config error. App cannot load.";
        if(loginButton) loginButton.disabled = true;
        return;
    }

    // Redirect if already logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // Already logged in, go to dashboard
            window.location.href = 'index.html';
        }
    });


    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        loginError.innerText = ""; 
        loginButton.disabled = true;
        loginButton.innerText = "Logging in...";

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login successful
                window.location.href = 'index.html';
            })
            .catch((error) => {
                // Login failed
                loginError.innerText = "Error: Invalid email or password.";
                console.error("Login Error:", error.code, error.message);
                loginButton.disabled = false;
                loginButton.innerText = "Login";
            });
    });
});

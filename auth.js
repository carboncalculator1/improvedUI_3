// auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    });
    
    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    });
    
    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginIdentifier').value;
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');
        
        errorElement.textContent = '';
        
        try {
            // Check if identifier is email or username
            let email = identifier;
            if (!identifier.includes('@')) {
                // It's a username, we need to get the email from Firestore
                const userDoc = await db.collection('users').where('username', '==', identifier).get();
                if (userDoc.empty) {
                    throw new Error('User not found');
                }
                email = userDoc.docs[0].data().email;
            }
            
            // Sign in with email and password
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorElement.textContent = error.message;
        }
    });
    
    // Signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorElement = document.getElementById('signupError');
        const province = document.getElementById('signupProvince').value;
        
        errorElement.textContent = '';
        
        // Validate passwords match
        if (password !== confirmPassword) {
            errorElement.textContent = 'Passwords do not match';
            return;
        }
        
        try {
            // Create user with email and password
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Store additional user data in Firestore
            await db.collection('users').doc(user.uid).set({
                username: username,
                email: email,
                province: province,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                calculations: []
            });
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorElement.textContent = error.message;
        }
    });
});

// Toggle password visibility
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = passwordInput.nextElementSibling;
    const icon = toggleButton.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

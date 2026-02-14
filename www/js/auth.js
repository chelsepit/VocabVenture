// js/auth.js - Updated for both Electron and Capacitor

// Wait for database to be ready
async function waitForDatabase() {
    let attempts = 0;
    while (!window.db || !window.db.initialized) {
        if (attempts > 50) {
            console.error('Database initialization timeout');
            return false;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    return true;
}

// Safe navigation helper
function safeNavigate(destination) {
    console.log('Navigating to:', destination);
    
    // Try router first (SPA mode)
    if (window.router && typeof window.router.navigate === 'function') {
        window.router.navigate(destination);
    }
    // Try navigateTo
    else if (window.navigateTo && typeof window.navigateTo === 'function') {
        window.navigateTo(destination);
    }
    // Fallback to direct navigation
    else {
        const pathMap = {
            'dashboard': '../dashboard/welcome-auth.html',
            'login': '../auth/login.html',
            'register': '../auth/register.html',
            'library': '../dashboard/library.html',
            'welcome': '../dashboard/welcome.html'
        };
        window.location.href = pathMap[destination] || destination;
    }
}

// Initialize auth
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Auth page loaded');
    
    // Wait for database
    const dbReady = await waitForDatabase();
    if (!dbReady) {
        showMessage('Database initialization failed. Please reload.', 'error');
        return;
    }

    // Setup form handlers
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Login Handler
async function handleLogin(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('loginName');
    const birthdateInput = document.getElementById('loginBirthdate');
    
    if (!nameInput || !birthdateInput) {
        console.error('Form inputs not found');
        return;
    }
    
    const name = nameInput.value.trim();
    const birthdate = birthdateInput.value;

    if (!name || !birthdate) {
        showMessage('Please enter both name and birthdate', 'error');
        return;
    }

    // Normalize name (capitalize properly)
    const normalizedName = normalizeName(name);

    try {
        console.log('Attempting login...');
        const result = await window.db.login(normalizedName, birthdate);

        if (result.success) {
            showMessage('Login successful!', 'success');
            
            // Store user in localStorage
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // Redirect to dashboard
            setTimeout(() => {
                safeNavigate('dashboard');
            }, 500);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please try again.', 'error');
    }
}

// Register Handler
async function handleRegister(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('registerName');
    const birthdateInput = document.getElementById('registerBirthdate');
    
    if (!nameInput || !birthdateInput) {
        console.error('Form inputs not found');
        return;
    }
    
    const name = nameInput.value.trim();
    const birthdate = birthdateInput.value;

    if (!name || !birthdate) {
        showMessage('Please enter both name and birthdate', 'error');
        return;
    }

    // Validate name format (at least first and last name)
    if (!name.includes(' ')) {
        showMessage('Please enter your first and last name', 'error');
        return;
    }

    // Normalize name
    const normalizedName = normalizeName(name);

    try {
        console.log('Attempting registration...');
        const result = await window.db.register(normalizedName, birthdate);

        if (result.success) {
            showMessage('Registration successful! Logging you in...', 'success');
            
            // Auto-login after registration
            const loginResult = await window.db.login(normalizedName, birthdate);
            
            if (loginResult.success) {
                localStorage.setItem('currentUser', JSON.stringify(loginResult.user));
                
                setTimeout(() => {
                    safeNavigate('dashboard');
                }, 1000);
            }
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed. Please try again.', 'error');
    }
}

// Normalize name (capitalize each word)
function normalizeName(name) {
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Show message to user
function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    if (!container) {
        console.log('Message:', message);
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.style.cssText = `
        padding: 12px 20px;
        margin-bottom: 15px;
        border-radius: 8px;
        font-weight: 600;
        text-align: center;
        ${type === 'error' ? 'background-color: #fee; color: #c33;' : ''}
        ${type === 'success' ? 'background-color: #efe; color: #3c3;' : ''}
        ${type === 'info' ? 'background-color: #eef; color: #33c;' : ''}
    `;
    messageDiv.textContent = message;

    container.innerHTML = '';
    container.appendChild(messageDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}
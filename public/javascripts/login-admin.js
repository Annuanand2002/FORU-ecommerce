document.addEventListener('DOMContentLoaded', () => {
  console.log("Login loaded");

  const adminLoginForm = document.getElementById('adminLoginForm');
  const usernameField = document.getElementById('username');
  const passwordField = document.getElementById('password');
  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');
  const globalErrorMessage = document.getElementById('errorMessage');
  
  [usernameField, passwordField].forEach((field) => {
    field.addEventListener('input', () => {
      usernameError.textContent = '';
      passwordError.textContent = '';
      globalErrorMessage.textContent = '';
    });
  });
  const togglePassword = document.getElementById('togglePassword');

  togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    if (passwordInput.type === 'password') {
      togglePassword.classList.remove('fa-eye-slash');
      togglePassword.classList.add('fa-eye');
    } else {
      togglePassword.classList.remove('fa-eye');
      togglePassword.classList.add('fa-eye-slash');
    }
  });

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameField.value.trim();
    const password = passwordField.value.trim();


    usernameError.textContent = '';
    passwordError.textContent = '';
    globalErrorMessage.textContent = '';

    let isValid = true;
    if (!username) {
      usernameError.textContent = 'Username is required.';
      isValid = false;
    }

    if (!password) {
      passwordError.textContent = 'Password is required.';
      isValid = false;
    }

    if (!isValid) {
      return; 
    }

    try {
      const response = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = '/admin/dashboard';
      } else {
        globalErrorMessage.textContent = data.error || 'Invalid username or password.';
      }
    } catch (error) {
      console.error('Error:', error);
      globalErrorMessage.textContent = 'An unexpected error occurred. Please try again.';
    }
  });
});


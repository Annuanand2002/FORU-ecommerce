document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  emailError.textContent = '';
  passwordError.textContent = '';

  let isValid = true;
  if (!email) {
    emailError.textContent = 'Email is required';
    isValid = false;
  }
  if (!password) {
    passwordError.textContent = 'Password is required';
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.redirectUrl;
      } else {
        if (data.message.includes('email')) {
          emailError.textContent = data.message;
        } else if (data.message.includes('password')) {
          passwordError.textContent = data.message;
        }
      }
    } catch (err) {
      console.error('Error during login:', err);
    }
  }
});

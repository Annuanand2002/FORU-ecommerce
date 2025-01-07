document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const phoneInput = document.getElementById('phone');

  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const phoneError = document.getElementById('phoneError');


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

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const phone = phoneInput.value.trim();

    nameError.textContent = '';
    emailError.textContent = '';
    passwordError.textContent = '';
    phoneError.textContent = '';

    let isValid = true;

    if (!name) {
      nameError.textContent = 'Enter your name';
      isValid = false;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!email) {
      emailError.textContent = 'Enter your email';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      emailError.textContent = 'Please enter a valid email address';
      isValid = false;
    }

    if (!password) {
      passwordError.textContent = 'Enter your password';
      isValid = false;
    } else if (password.length < 6) {
      passwordError.textContent = 'Password must be at least 6 characters long';
      isValid = false;
    }

    if (!phone) {
      phoneError.textContent = 'Enter your phone number';
      isValid = false;
    } else if (phone.length !== 10 || isNaN(phone) || Number(phone) < 0) {
      phoneError.textContent = 'Phone number must be a positive 10-digit number';
      isValid = false;
    }

    if (isValid) {
      try {
        const response = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, phone }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 400 && result.message.includes('Email already in use')) {
            emailError.textContent = result.message; // Display specific error
          } else {
            alert(result.message); // Generic error message
          }
          return;
        }

        alert(result.message); // Success message
        form.reset();
        emailError.textContent = '';

      } catch (error) {
        console.error('Error during registration:', error);
      }
    }
  });
});





document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const phoneInput = document.getElementById('phone');
  const messageDiv = document.getElementById('message');

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

    const messageDiv = document.getElementById('message');
    messageDiv.textContent = ''; 
    messageDiv.className = ''; 

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
        if (response.ok) {
          messageDiv.textContent = result.message || 'Registration successful!';
          messageDiv.classList.remove('error');
          messageDiv.classList.add('success');
          messageDiv.style.display = 'block'; 
          registerForm.reset();
        } else {

          if (response.status === 400) {
            if (result.message.includes('Email already in use')) {
              emailError.textContent = result.message; 
              phoneError.textContent = ''; 
            } else if (result.message.includes('Phone number already in use')) {
              phoneError.textContent = result.message; 
              emailError.textContent = ''; 
            } else {
              messageDiv.textContent = result.message || 'Validation error occurred.';
              messageDiv.classList.remove('success');
              messageDiv.classList.add('error');
              messageDiv.style.display = 'block'; 
            }
          } else {
            messageDiv.textContent = result.message || 'An error occurred. Please try again.';
            messageDiv.classList.remove('success');
            messageDiv.classList.add('error');
            messageDiv.style.display = 'block'; 
          }
        }

        setTimeout(() => {
          messageDiv.style.display = 'none';
        }, 10000);
      } catch (error) {
        console.error('Error during registration:', error);
        messageDiv.textContent = 'Something went wrong. Please try again later.';
        messageDiv.classList.add('error');
      }
      
    }
  });
})





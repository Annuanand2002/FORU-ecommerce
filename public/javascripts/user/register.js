document.getElementById('registerButton').addEventListener('click', async () => {
  event.preventDefault()
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorMessage = document.getElementById('errorMessage');

  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  nameError.textContent = '';
  emailError.textContent = '';
  passwordError.textContent = '';

  let isValid = true;

  if (!name) {
    nameError.textContent = 'Name is required';
    isValid = false;
    setTimeout(() => (nameError.textContent = ''), 10000);
  }

  if (!email) {
    emailError.textContent = 'Email is required';
    isValid = false;
    setTimeout(() => (emailError.textContent = ''), 10000);
  } else if (!email.includes('@')) {
    emailError.textContent = 'Email must contain @';
    isValid = false;
    setTimeout(() => (emailError.textContent = ''), 10000);
  }

  if (!password) {
    passwordError.textContent = 'Password is required';
    isValid = false;
    setTimeout(() => (passwordError.textContent = ''), 10000);
  } else {
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    if (!strongPassword.test(password)) {
      passwordError.textContent = 'Enter a strong password (at least 8 characters, including uppercase, lowercase, number, and special character).';
      isValid = false;
      setTimeout(() => (passwordError.textContent = ''), 10000);
    }
  }

  if (isValid) {
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }), 
      });

      const data = await response.json();

      if (data.exists) {
        emailError.textContent = data.message;
        setTimeout(() => (emailError.textContent = ''), 10000);
      } else if(data.success){
        window.location.href = '/'; 
      }
      else {
        errorMessage.textContent = data.message || 'Registration failed';
        setTimeout(() => (errorMessage.textContent = ''), 10000);
      }
    } catch (err) {
      console.log(err);
    }
  }
});

document.getElementById('togglePassword').addEventListener('click', (event) => {
  const inputPassword = document.getElementById('password');
  const icon = event.target; 

  if (inputPassword.type === "password") {
    inputPassword.type = "text";
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    inputPassword.type = "password";
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
});

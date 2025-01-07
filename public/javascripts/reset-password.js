const form = document.getElementById('resetPasswordForm');
  const passwordField = document.getElementById('password');
  const passwordError = document.getElementById('passwordError');

  form.addEventListener('submit', function(event) {
    let isValid = true;

    passwordError.textContent = '';

    if (!passwordField.value) {
      passwordError.textContent = 'This field is required';
      isValid = false;
    } else if (passwordField.value.length < 6) {
      passwordError.textContent = 'Please enter minimum 6 characters';
      isValid = false;
    }

    if (!isValid) {
      event.preventDefault();
    }
  });
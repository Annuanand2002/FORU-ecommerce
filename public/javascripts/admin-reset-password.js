
  document.getElementById('resetPasswordForm').addEventListener('submit', function(event) {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Clear all previous error messages
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    passwordError.textContent = '';
    confirmPasswordError.textContent = '';

    let formValid = true;

    // Check if password is empty
    if (!password) {
      event.preventDefault();
      passwordError.textContent = 'This field is required.';
      formValid = false;
    }

    // Check if confirm password is empty
    if (!confirmPassword) {
      event.preventDefault();
      confirmPasswordError.textContent = 'This field is required.';
      formValid = false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      event.preventDefault();
      confirmPasswordError.textContent = 'Passwords do not match.';
      formValid = false;
    }

    // Check password length (minimum 8 characters)
    if (password.length < 8) {
      event.preventDefault();
      passwordError.textContent = 'Password must be at least 8 characters long.';
      formValid = false;
    }

    return formValid;
  });



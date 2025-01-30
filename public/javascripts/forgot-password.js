
  function validateForm() {

    document.getElementById('emailError').textContent = '';


    const email = document.getElementById('email').value;


    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;


    if (email.trim() === '') {
      document.getElementById('emailError').textContent = 'Email is required.';
      return false;
    }

    if (!emailRegex.test(email)) {
      document.getElementById('emailError').textContent = 'Please enter a valid email address.';
      return false;
    }


    return true;
  }

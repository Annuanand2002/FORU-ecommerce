document.getElementById('add-coupon-form').addEventListener('submit', function (event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const amount = document.getElementById('amount').value.trim();
  const minAmount = document.getElementById('minAmount').value.trim();
  const expiryDate = document.getElementById('expiryDate').value.trim();
  const description = document.getElementById('description').value.trim();

  // Clear previous error messages
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  let isValid = true;

  // Validate Coupon Name (uppercase letters and numbers only, no spaces or special characters, minimum 4 characters)
  const nameRegex = /^[A-Z0-9]{4,}$/;
  if (!name) {
      document.getElementById('name-error').textContent = 'Coupon name is required.';
      isValid = false;
  } else if (!nameRegex.test(name)) {
      document.getElementById('name-error').textContent = 'Coupon name must contain at least 4 uppercase letters and numbers (no spaces or special characters).';
      isValid = false;
  }

  // Validate Amount
  if (!amount) {
      document.getElementById('amount-error').textContent = 'Discount amount is required.';
      isValid = false;
  } else if (parseFloat(amount) <= 0) {
      document.getElementById('amount-error').textContent = 'Discount amount must be greater than 0.';
      isValid = false;
  }

  // Validate Minimum Amount
  if (!minAmount) {
      document.getElementById('minAmount-error').textContent = 'Minimum purchase amount is required.';
      isValid = false;
  } else if (parseFloat(minAmount) <= 0) {
      document.getElementById('minAmount-error').textContent = 'Minimum purchase amount must be greater than 0.';
      isValid = false;
  }

  // Validate Expiry Date
  if (!expiryDate) {
      document.getElementById('expiryDate-error').textContent = 'Expiry date is required.';
      isValid = false;
  } else if (new Date(expiryDate) < new Date()) {
      document.getElementById('expiryDate-error').textContent = 'Expiry date must be in the future.';
      isValid = false;
  }

  // Validate Description
  if (!description) {
      document.getElementById('description-error').textContent = 'Description is required.';
      isValid = false;
  }

  // Submit the form if valid
  if (isValid) {
      this.submit();
  }
});